const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── 参数解析 ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const LIVE_RELOAD = !args.includes('--no-live');
const DEBOUNCE_MS = (() => {
  const flag = args.find((a) => a.startsWith('--debounce='));
  return flag ? Math.max(100, Number(flag.split('=')[1]) || 300) : 300;
})();

const PORT = (() => {
  const num = args.find((a) => /^\d+$/.test(a));
  return num ? Number(num) : 8080;
})();

const BASE_PATH_INPUT = args.find((a) => a.startsWith('/')) || process.env.BLOG_SERVE_BASE || '/';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

// ── Base Path ─────────────────────────────────────────────────────────────
function normalizeBasePath(input) {
  const text = String(input || '/').trim();
  if (!text || text === '/') return '/';
  const withLeadingSlash = text.startsWith('/') ? text : `/${text}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const BASE_PATH = normalizeBasePath(BASE_PATH_INPUT);

function stripBasePath(urlPath) {
  let requestPath;
  try {
    requestPath = decodeURIComponent((urlPath || '/').split('?')[0]);
  } catch (_) {
    return null;
  }
  if (BASE_PATH !== '/') {
    if (requestPath === BASE_PATH.slice(0, -1)) requestPath = BASE_PATH;
    if (!requestPath.startsWith(BASE_PATH)) return null;
    requestPath = `/${requestPath.slice(BASE_PATH.length)}`;
  }
  if (requestPath === '/' || requestPath === '') requestPath = '/index.html';
  if (requestPath.endsWith('/')) requestPath += 'index.html';
  return requestPath;
}

function getFilePath(urlPath) {
  const requestPath = stripBasePath(urlPath);
  if (!requestPath) return null;
  return path.join(DIST_DIR, requestPath);
}

// ── Live Reload: SSE 客户端管理 ───────────────────────────────────────────
const MAX_SSE_CLIENTS = 10;
const sseClients = new Set();

function broadcast() {
  const dead = [];
  for (const res of sseClients) {
    try {
      res.write('event: reload\ndata: {"type":"reload"}\n\n');
    } catch (_) {
      dead.push(res);
    }
  }
  for (const res of dead) sseClients.delete(res);
  return sseClients.size;
}

// ── Live Reload: 客户端脚本（动态生成，不写入 dist/） ──────────────────────
const RELOAD_CLIENT_JS = `(function(){
  var retry=1000;
  function connect(){
    var es=new EventSource('./__reload');
    es.onopen=function(){retry=1000;};
    es.addEventListener('reload',function(){location.reload();});
    es.onerror=function(){
      es.close();
      setTimeout(function(){connect();},retry);
      retry=Math.min(retry*2,30000);
    };
  }
  connect();
})();`;

// ── Live Reload: 文件监听 + Debounce ──────────────────────────────────────
let debounceTimer = null;
let building = false;
let pendingRebuild = false;

function scheduleRebuild() {
  if (building) {
    pendingRebuild = true;
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runRebuild, DEBOUNCE_MS);
}

function runRebuild() {
  building = true;
  const t0 = Date.now();
  try {
    const buildScript = path.join(__dirname, 'build.js');
    execSync(`node "${buildScript}"`, { stdio: 'inherit', cwd: ROOT });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  Rebuilt in ${elapsed}s`);
    const count = broadcast();
    if (count > 0) console.log(`  Reloaded ${count} client(s)`);
  } catch (err) {
    console.error('  Build failed, not reloading');
  }
  building = false;
  if (pendingRebuild) {
    pendingRebuild = false;
    scheduleRebuild();
  }
}

function startWatching() {
  // 统一使用 paths.getWatchPaths()（与构建内核共享同一份监听清单，
  // 覆盖 site/、res/themes、res/locales、全部页面模板、全部 client 模块）
  const { createPaths } = require('./src/kernel/paths');
  const paths = createPaths(ROOT, __dirname);
  const { dirs, files } = paths.getWatchPaths();

  // 目录监听采用"排除式"而非扩展名白名单：
  // site/ 下所有用户可自定义内容（自定义页面 .html、自定义脚本 .js、
  // 主题 js/css、Markdown、配置、数据、资源）一律触发热更新。
  // 安全前提（防死循环 / 防误触发）：
  //   - 构建只写 dist/ 与隐藏文件 site/.auth-key，均不会命中监听
  //   - 忽略隐藏项（.git/.auth-key/.DS_Store）、编辑器临时文件、
  //     node_modules 等无关目录，避免无效重建与 watch 资源耗尽
  const IGNORE_WATCH_RE = [
    /(^|[\\/])\.[^\\/]+/,               // 隐藏文件/目录：.git、.auth-key、.DS_Store
    /(^|[\\/])node_modules([\\/]|$)/i,   // 依赖目录（若 site/ 内存在）
    /~$/,                                // 编辑器备份：xxx~
    /\.(tmp|swp|bak|orig)(\.\d+)?$/i,    // 临时/备份文件
  ];

  // 监听覆盖配置（site/config.yml → dev.serve.watch）：
  //   include: [] — 强制监听被默认规则忽略的路径片段/后缀（include 优先）
  //   ignore: []  — 追加忽略的路径片段/后缀（如缓存目录、大文件后缀）
  // 匹配规则：归一化路径包含任一模式即命中；解析失败时降级为默认行为。
  const watchOverrides = (() => {
    try {
      const { loadConfig } = require('./src/kernel/config');
      const cfg = loadConfig(ROOT, __dirname);
      const watch = cfg._raw?.dev?.serve?.watch;
      return {
        include: Array.isArray(watch?.include) ? watch.include.map(String).filter(Boolean) : [],
        ignore: Array.isArray(watch?.ignore) ? watch.ignore.map(String).filter(Boolean) : [],
      };
    } catch (_) {
      return { include: [], ignore: [] };
    }
  })();
  const normWatch = (s) => String(s).replace(/\\/g, '/').toLowerCase();
  const isIgnoredWatch = (filename) => {
    if (!filename) return true;
    const p = normWatch(filename);
    if (watchOverrides.include.some((pat) => p.includes(normWatch(pat)))) return false;
    if (watchOverrides.ignore.some((pat) => p.includes(normWatch(pat)))) return true;
    return IGNORE_WATCH_RE.some((re) => re.test(p));
  };

  let watchCount = 0;
  const watched = new Set();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (isIgnoredWatch(filename)) return;
        console.log(`  [${new Date().toLocaleTimeString()}] Changed: ${filename}`);
        scheduleRebuild();
      });
      watched.add(dir);
      watchCount++;
    } catch (_) { /* fs.watch 不支持时跳过 */ }
  }

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    try {
      fs.watch(file, () => {
        console.log(`  [${new Date().toLocaleTimeString()}] Changed: ${path.relative(ROOT, file)}`);
        scheduleRebuild();
      });
      watched.add(file);
      watchCount++;
    } catch (_) { /* 跳过 */ }
  }

  return { watchCount, watched };
}

// ── 初始构建 ──────────────────────────────────────────────────────────────
console.log('Building dist...\n');
try {
  const buildScript = path.join(__dirname, 'build.js');
  execSync(`node "${buildScript}"`, { stdio: 'inherit', cwd: ROOT });
  console.log('');
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

// Verify dist exists
if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error(`Error: dist/index.html not found at ${DIST_DIR}`);
  process.exit(1);
}

// ── HTTP 服务器 ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const urlPath = req.url;

  // ── SSE 端点：/__reload ──
  if (LIVE_RELOAD && urlPath === '/__reload') {
    if (sseClients.size >= MAX_SSE_CLIENTS) {
      res.writeHead(429, { 'Content-Type': 'text/plain' });
      res.end('Too many connections');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(':ok\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // ── 客户端脚本：/__reload.js ──
  if (LIVE_RELOAD && urlPath === '/__reload.js') {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(RELOAD_CLIENT_JS);
    return;
  }

  // ── 静态文件 ──
  const filePath = getFilePath(urlPath);
  if (!filePath) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      const fallback404 = path.join(DIST_DIR, '404.html');
      if (error.code === 'ENOENT' && fs.existsSync(fallback404)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(fallback404));
        return;
      }
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();

    // HTML 文件注入热重载客户端脚本
    if (LIVE_RELOAD && ext === '.html') {
      const html = data.toString('utf8');
      const inject = '<script src="./__reload.js"></script>';
      if (html.includes('</body>')) {
        data = Buffer.from(html.replace('</body>', `${inject}\n</body>`));
      } else {
        data = Buffer.from(html + '\n' + inject);
      }
    }

    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

// ── 启动 ──────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const previewUrl = BASE_PATH === '/' ? `http://localhost:${PORT}` : `http://localhost:${PORT}${BASE_PATH}`;
  console.log(`Serving dist on ${previewUrl}`);

  if (LIVE_RELOAD) {
    const { watchCount, watched } = startWatching();
    console.log(`  Live reload: enabled`);
    console.log(`  Watching: ${watchCount} targets`);
    console.log(`  Debounce: ${DEBOUNCE_MS}ms`);
    console.log('');
  } else {
    console.log('  Live reload: disabled (--no-live)');
    console.log('');
  }
});
