const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = Number(process.argv[2]) || 8080;
const BASE_PATH_INPUT = process.argv[3] || process.env.BLOG_SERVE_BASE || '/';
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

function normalizeBasePath(input) {
  const text = String(input || '/').trim();
  if (!text || text === '/') return '/';
  const withLeadingSlash = text.startsWith('/') ? text : `/${text}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const BASE_PATH = normalizeBasePath(BASE_PATH_INPUT);

function stripBasePath(urlPath) {
  let requestPath = decodeURIComponent((urlPath || '/').split('?')[0]);
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

console.log('Building dist...\n');
try {
  execSync('node build.js', { stdio: 'inherit' });
  console.log('');
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const filePath = getFilePath(req.url);
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
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const previewUrl = BASE_PATH === '/' ? `http://localhost:${PORT}` : `http://localhost:${PORT}${BASE_PATH}`;
  console.log(`Serving dist on ${previewUrl}`);
});
