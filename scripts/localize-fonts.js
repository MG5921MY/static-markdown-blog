/**
 * 字体本地化脚本（一次性使用）：
 * 从 Google Fonts 下载 latin 子集 woff2 并生成本地 @font-face CSS，
 * 消除运行时对 fonts.googleapis.com 的外部依赖。
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'res', 'vendor', 'fonts');
const OUT_CSS = path.join(OUT_DIR, 'webfonts.css');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FAMILIES = [
  { name: 'Inter', weights: [400, 500, 600, 700] },
  { name: 'Playfair Display', weights: [400, 500, 600, 700] },
  { name: 'JetBrains Mono', weights: [400, 500] },
  { name: 'Caveat', weights: [400, 500, 600, 700] },
  { name: 'Orbitron', weights: [400, 500, 600, 700] },
];

const slug = (name) => name.replace(/\s+/g, '');

async function downloadFamily(family) {
  const familyParam = family.name.replace(/\s+/g, '+');
  const weightParam = family.weights.join(';');
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weightParam}&display=swap`;

  const res = await fetch(cssUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CSS fetch failed for ${family.name}: ${res.status}`);
  const css = await res.text();

  // Google Fonts 格式：`/* subset */ @font-face { ... }`——按组合正则提取，
  // 仅保留 latin 子集（排除 latin-ext/cyrillic/greek/vietnamese），并保留 unicode-range
  const faceRe = /\/\*\s*([a-zA-Z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\n\}/g;
  const faces = [];
  let match;
  while ((match = faceRe.exec(css)) !== null) {
    const subset = match[1].toLowerCase();
    if (subset !== 'latin') continue;
    const body = match[2];
    const weight = (body.match(/font-weight:\s*(\d+)/) || [])[1];
    const url = (body.match(/url\((https:\/\/[^)]+\.woff2)\)/) || [])[1];
    const unicodeRange = (body.match(/unicode-range:\s*([^;]+);/) || [])[1];
    if (weight && url) faces.push({ weight, url, unicodeRange });
  }

  const downloaded = [];
  for (const face of faces) {
    const fileName = `${slug(family.name)}-${face.weight}.woff2`;
    const binRes = await fetch(face.url, { headers: { 'User-Agent': UA } });
    if (!binRes.ok) throw new Error(`woff2 fetch failed: ${face.url} ${binRes.status}`);
    const buf = Buffer.from(await binRes.arrayBuffer());
    fs.writeFileSync(path.join(OUT_DIR, fileName), buf);
    downloaded.push({ weight: face.weight, fileName, bytes: buf.length, unicodeRange: face.unicodeRange });
  }
  console.log(`${family.name}: ${downloaded.map((d) => `${d.weight}=${Math.round(d.bytes / 1024)}KB`).join(', ')}`);
  return { family, faces: downloaded };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  for (const family of FAMILIES) {
    results.push(await downloadFamily(family));
  }

  // 生成 @font-face CSS（本地相对路径；font-display: swap 保持与原行为一致）
  const lines = [
    '/* 本地化网页字体（由 Google Fonts latin 子集下载并内嵌，OFL-1.1 许可）',
    ' * 生成脚本：scripts/localize-fonts.js；来源：fonts.googleapis.com',
    ' * 内嵌目的：消除运行时外部依赖（离线可用 / 隐私 / 无 CDN 请求） */',
    '',
  ];
  for (const { family, faces } of results) {
    for (const face of faces) {
      lines.push(
        '@font-face {',
        `  font-family: '${family.name}';`,
        '  font-style: normal;',
        `  font-weight: ${face.weight};`,
        '  font-display: swap;',
        `  src: url('./${face.fileName}') format('woff2');`,
        face.unicodeRange ? `  unicode-range: ${face.unicodeRange};` : '',
        '}',
        ''
      );
    }
  }
  fs.writeFileSync(OUT_CSS, lines.join('\n'), 'utf8');
  const total = results.reduce((sum, r) => sum + r.faces.reduce((s, f) => s + f.bytes, 0), 0);
  console.log(`\nwebfonts.css 生成完成（${results.reduce((s, r) => s + r.faces.length, 0)} 个 @font-face，总计 ${Math.round(total / 1024)} KB）`);
})();
