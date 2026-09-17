const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { createPaths, isPathInsideRoot } = require('./src/kernel/paths');

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
  '.md': 'text/markdown; charset=utf-8',
  // 媒体库（视频/音频）——Range 流式播放所需
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.ogv': 'video/ogg',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.opus': 'audio/ogg',
  '.wma': 'audio/x-ms-wma'
};

/**
 * 静态文件是否位于 dist 根内。
 * 实现见 kernel/paths.isPathInsideRoot（与 test 共用，路径单一）。
 */
function isInsideDist(filePath) {
  return isPathInsideRoot(DIST_DIR, filePath);
}

// ── Range 流式文件服务 ────────────────────────────────────────────────────
/**
 * 带 HTTP Range 支持的静态文件响应（只读语义：Range 属于 GET，不违反只允许 GET 的约束）。
 *
 * 行为：
 * - 无 Range         → 200 + Accept-Ranges: bytes（流式，不整读进内存）
 * - 单区间 Range     → 206 + Content-Range + 片段流式
 * - 语法合法但越界   → 416 + Content-Range: bytes 星号/总长
 * - 语法非法         → 忽略并按 200 处理（与主流服务器一致，RFC 7233 允许）
 *
 * 仅实现单区间：浏览器媒体播放器只发单区间请求，multipart/byteranges（多区间）
 * 无实际需求且显著增加复杂度（教学取舍，语义明确）。
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} filePath - 绝对路径（调用方已校验在 dist 内）
 * @param {fs.Stats} stat - 文件状态（调用方已获取，避免重复 IO）
 * @param {string} contentType - MIME 类型
 * @param {object} baseHeaders - 基础响应头（如 Cache-Control）
 */
function serveFileWithRange(req, res, filePath, stat, contentType, baseHeaders) {
  const total = stat.size;
  const headers = { ...baseHeaders, 'Accept-Ranges': 'bytes' };

  const sendFull = () => {
    res.writeHead(200, { ...headers, 'Content-Type': contentType, 'Content-Length': total });
    fs.createReadStream(filePath).pipe(res);
  };

  const rangeHeader = req.headers.range;
  if (!rangeHeader) {
    sendFull();
    return;
  }

  // 仅匹配单区间：bytes=start-end / bytes=start- / bytes=-suffixLength
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim());
  if (!match || (match[1] === '' && match[2] === '')) {
    sendFull(); // 语法非法：忽略 Range（RFC 7233 允许）
    return;
  }

  let start;
  let end;
  if (match[1] === '') {
    // 尾段请求：bytes=-N（末尾 N 字节）
    const suffixLength = parseInt(match[2], 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      sendFull();
      return;
    }
    start = Math.max(0, total - suffixLength);
    end = total - 1;
  } else {
    start = parseInt(match[1], 10);
    end = match[2] === '' ? total - 1 : Math.min(parseInt(match[2], 10), total - 1);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
    res.writeHead(416, { ...headers, 'Content-Range': `bytes */${total}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    ...headers,
    'Content-Type': contentType,
    'Content-Range': `bytes ${start}-${end}/${total}`,
    'Content-Length': end - start + 1,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
}

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
const BUILD_SCRIPT = path.join(__dirname, 'build.js'); // 构建脚本路径（唯一来源）

let debounceTimer = null;
let building = false;
let pendingRebuild = false;

/**
 * 异步执行一次构建（spawn 子进程，不阻塞事件循环）。
 *
 * 用于运行时热更新：构建期间服务器继续服务旧 dist，
 * 预览请求不会被构建阻塞（大站点 / 慢磁盘场景尤为重要）。
 *
 * @returns {Promise<boolean>} 构建是否成功（exit code === 0）
 */
function runBuildAsync() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [BUILD_SCRIPT], { stdio: 'inherit', cwd: ROOT });
    child.once('error', () => resolve(false));
    child.once('close', (code) => resolve(code === 0));
  });
}

function scheduleRebuild() {
  if (building) {
    pendingRebuild = true;
    return;
  }
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runRebuild, DEBOUNCE_MS);
}

async function runRebuild() {
  building = true;
  const t0 = Date.now();
  const ok = await runBuildAsync();
  if (ok) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`  Rebuilt in ${elapsed}s`);
    const count = broadcast();
    if (count > 0) console.log(`  Reloaded ${count} client(s)`);
  } else {
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
// 启动引导阶段：服务尚未监听，此处同步构建简单可靠（无预览请求可被阻塞）。
// 运行期热更新走 runBuildAsync（异步，不阻塞请求）。
console.log('Building dist...\n');
try {
  execSync(`node "${BUILD_SCRIPT}"`, { stdio: 'inherit', cwd: ROOT });
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

  if (!filePath || !isInsideDist(filePath)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      const fallback404 = path.join(DIST_DIR, '404.html');
      if (statError && statError.code === 'ENOENT' && fs.existsSync(fallback404)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(fallback404));
        return;
      }
      const code = statError && statError.code === 'ENOENT' ? 404 : 500;
      res.writeHead(code);
      res.end(code === 404 ? 'Not Found' : 'Server Error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const baseHeaders = { 'Cache-Control': 'no-cache' };

    // HTML：需要注入热重载客户端脚本，读取全文处理（保持原路径）
    if (LIVE_RELOAD && ext === '.html') {
      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(500);
          res.end('Server Error');
          return;
        }
        const html = data.toString('utf8');
        const inject = '<script src="./__reload.js"></script>';
        const output = html.includes('</body>')
          ? html.replace('</body>', `${inject}\n</body>`)
          : `${html}\n${inject}`;
        res.writeHead(200, { ...baseHeaders, 'Content-Type': contentType });
        res.end(output);
      });
      return;
    }

    // 其余文件（含视频/音频）：Range 流式服务（支持 seek，且大文件不整读进内存）
    serveFileWithRange(req, res, filePath, stat, contentType, baseHeaders);
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
