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

// SSE 心跳：每 25s 发送注释行保持连接活跃。
// 反向代理（nginx 等）对无活动 SSE 连接默认 60s 空闲超时断开；
// 断开后 EventSource 虽会自动重连，但断开期间发生的 reload 事件会丢失，
// 表现为"网页处于监听状态却不刷新"。心跳可避免代理断开。
const SSE_HEARTBEAT_MS = 25000;
function startHeartbeat() {
  setInterval(() => {
    const dead = [];
    for (const res of sseClients) {
      try {
        res.write(':ping\n\n'); // SSE 注释行，客户端忽略
      } catch (_) {
        dead.push(res);
      }
    }
    for (const res of dead) sseClients.delete(res);
  }, SSE_HEARTBEAT_MS);
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

// 服务器行为配置（site/config.yml → dev.serve）：
//   watch.include/ignore — 监听覆盖（见 isIgnoredWatch）
//   readOnly            — 只读服务开关（默认 true：仅允许 GET/HEAD，
//                         POST/PUT/DELETE 等写方法 405 拒绝；
//                         设为 false 可放行写方法，供自定义页面等扩展场景使用）
// 配置解析失败时降级为默认行为（watch 无覆盖、readOnly 开启）。
const serveOptions = (() => {
  try {
    const { loadConfig } = require('./src/kernel/config');
    const cfg = loadConfig(ROOT, __dirname);
    const serve = cfg._raw?.dev?.serve || {};
    return {
      include: Array.isArray(serve.watch?.include) ? serve.watch.include.map(String).filter(Boolean) : [],
      ignore: Array.isArray(serve.watch?.ignore) ? serve.watch.ignore.map(String).filter(Boolean) : [],
      readOnly: serve.readOnly !== false,
    };
  } catch (_) {
    return { include: [], ignore: [], readOnly: true };
  }
})();

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

  const normWatch = (s) => String(s).replace(/\\/g, '/').toLowerCase();
  const isIgnoredWatch = (filename, eventType) => {
    // filename 为 null 时（部分文件系统/挂载/rename 事件，Node fs.watch 文档
    // 明确允许 null）：无法判断是哪个文件变化，保守触发重建（重建幂等，
    // 防抖 300ms；宁可多重建一次，不可漏更新——漏更新会导致热更新失效）
    if (!filename) return false;
    const p = normWatch(filename);
    if (serveOptions.include.some((pat) => p.includes(normWatch(pat)))) return false;
    if (serveOptions.ignore.some((pat) => p.includes(normWatch(pat)))) return true;
    // rename 事件：临时文件也保守触发。编辑器 atomic 保存 =
    // 写临时文件 + rename 覆盖，某些文件系统/事件合并只报出临时文件事件；
    // 若按后缀忽略会漏掉整次保存。防抖会合并相邻事件，多余重建无害。
    if (eventType === 'rename' && /\.(tmp|swp|bak|orig)(\.\d+)?$/i.test(p)) return false;
    return IGNORE_WATCH_RE.some((re) => re.test(p));
  };

  let watchCount = 0;
  const watched = new Set();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (isIgnoredWatch(filename, eventType)) return;
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
  // 只读服务开关（dev.serve.readOnly，默认 true）：
  // 仅允许 GET（HEAD 为 GET 的无响应体元请求，一并放行）。
  // POST/PUT/DELETE 等写方法一律 405 拒绝——静态站点默认不提供写接口；
  // 关闭（readOnly: false）后写方法按普通静态请求处理，供自定义扩展场景使用。
  if (serveOptions.readOnly && req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Allow': 'GET, HEAD',
    });
    res.end('Method Not Allowed');
    return;
  }
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
    startHeartbeat();
    console.log(`  Live reload: enabled`);
    console.log(`  Watching: ${watchCount} targets`);
    console.log(`  Debounce: ${DEBOUNCE_MS}ms`);
    console.log('');
  } else {
    console.log('  Live reload: disabled (--no-live)');
    console.log('');
  }
});
