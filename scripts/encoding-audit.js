const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = [
  'conf',
  'pages',
  'posts',
  'pages-example',
  'posts-example',
  'docker/init-data/conf',
  'docker/init-data/pages',
  'docker/init-data/posts'
];

const TEXT_FILE_RE = /\.(md|ya?ml|json|txt)$/i;
const SUSPICIOUS_MARKERS = [
  '\uFFFD',
  '闈欐',
  '鍗氬',
  '绔欑偣',
  '鏂囩珷',
  '鍙嬮摼',
  '鐬棿',
  '鍥惧簱',
  '璇存槑',
  '涓婚'
];

const failures = [];

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!TEXT_FILE_RE.test(entry.name)) continue;

    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    const text = fs.readFileSync(fullPath, 'utf8');

    const hit = SUSPICIOUS_MARKERS.find((marker) => text.includes(marker));
    if (hit) failures.push({ file: relPath, marker: hit });
  }
}

for (const target of TARGETS) {
  walk(path.join(ROOT, target));
}

if (failures.length > 0) {
  console.error('Encoding audit failed.\n');
  for (const failure of failures) {
    console.error(`- ${failure.file}  marker=${JSON.stringify(failure.marker)}`);
  }
  process.exit(1);
}

console.log('Encoding audit passed.');
