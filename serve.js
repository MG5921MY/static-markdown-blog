/**
 * 博客开发服务器
 * 启动前自动构建索引，然后启动静态文件服务器
 * 
 * 使用方法：node serve.js [端口号]
 * 示例：node serve.js 8080
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = parseInt(process.argv[2]) || 8080;

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.md': 'text/markdown; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
};

// 1. 先执行构建
console.log('📦 构建索引...\n');
try {
  execSync('node build.js', { stdio: 'inherit' });
  console.log('');
} catch (e) {
  console.error('❌ 构建失败');
  process.exit(1);
}

// 2. 启动服务器
const server = http.createServer((req, res) => {
  let filePath = '.' + decodeURIComponent(req.url.split('?')[0]);
  
  // 默认文件
  if (filePath === './') filePath = './index.html';
  if (filePath.endsWith('/')) filePath += 'index.html';
  
  // 安全检查
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve('.'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 404 - 尝试返回 404.html
        fs.readFile('./404.html', (e, html) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(e ? 'Not Found' : html);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 服务器已启动`);
  console.log(`   本地访问: http://localhost:${PORT}`);
  console.log(`   按 Ctrl+C 停止\n`);
});
