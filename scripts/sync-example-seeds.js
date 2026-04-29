const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'examples', 'starter-modern', 'site');
const TARGET_DIR = path.join(ROOT, 'examples', 'docker-seed', 'site');

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function cleanDir(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
  ensureDir(targetPath);
}

function copyRecursive(sourcePath, targetPath) {
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    ensureDir(targetPath);
    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(targetPath, entry));
    }
    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

if (!fs.existsSync(SOURCE_DIR)) {
  throw new Error(`Starter site not found: ${SOURCE_DIR}`);
}

cleanDir(TARGET_DIR);
copyRecursive(SOURCE_DIR, TARGET_DIR);

console.log('Docker seed synchronized from examples/starter-modern/site');
