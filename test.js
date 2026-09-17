/**
 * Automated test suite for static blog platform.
 * Run: node test.js
 *
 * Tests build, dist structure, config, locales, feeds, search index,
 * HTML templates, nav config, old file cleanup, and HTTP endpoints.
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const PORT = 18099;

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, name) {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ❌ ${name}`); }
}

  function httpGet(urlPath, headers) {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${PORT}${urlPath}`, { headers: headers || {} }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      });
      req.on('error', () => resolve({ status: 0, body: '', headers: {} }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, body: '', headers: {} }); });
    });
  }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Test: Build ──────────────────────────────────────────
function testBuild() {
  console.log('\n[Build]');
  try {
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
    assert(true, 'node build.js succeeds');
  } catch (e) { assert(false, 'node build.js succeeds'); return false; }

  const required = [
    'index.html', 'post.html', 'page.html', '404.html', 'moments.html',
    'links.html', 'gallery.html', 'disclaimer.html', 'about.html',
    'site-config.json', 'content-index.json', 'pathmap.json',
    'feed.xml', 'sitemap.xml', 'search-index.json', 'favicon.ico',
    'client/core.js', 'client/nav.js', 'client/render.js', 'client/ui.js',
    'client/i18n.js', 'client/blog.js',
    'locales/zh.json', 'locales/en.json',
    'vendor/marked.min.js', 'vendor/lunr.min.js',
    'themes/graphite/theme.css', 'themes/aurora/theme.css',
    'themes/paper/theme.css', 'themes/mono/theme.css', 'themes/terminal/theme.css',
    'themes/base.css', 'assets/favicon.svg',
  ];
  for (const f of required) assert(fs.existsSync(path.join(DIST, f)), `dist/${f}`);
  return true;
}

// ── Test: Locales ────────────────────────────────────────
function testLocales() {
  console.log('\n[Locales]');
  for (const code of ['zh', 'en']) {
    const file = path.join(ROOT, 'res', 'locales', `${code}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert(data._meta?.code === code, `${code}.json _meta.code="${code}"`);
      assert(typeof data._meta?.nativeName === 'string' && data._meta.nativeName.length > 0, `${code}.json _meta.nativeName exists`);
      assert(typeof data.loading === 'string', `${code}.json has "loading"`);
      assert(typeof data.ui === 'object', `${code}.json has "ui"`);
      assert(typeof data.ui.backToTop === 'string', `${code}.json ui.backToTop`);
      assert(typeof data.ui.readMore === 'string', `${code}.json ui.readMore`);
      assert(typeof data.ui.themeAuto === 'string', `${code}.json ui.themeAuto`);
      assert(typeof data.ui.prevPost === 'string', `${code}.json ui.prevPost`);
      assert(typeof data.ui.nextPost === 'string', `${code}.json ui.nextPost`);
    } catch (e) { assert(false, `${code}.json valid: ${e.message}`); }
  }
}

// ── Test: Config ─────────────────────────────────────────
function testConfig() {
  console.log('\n[Config]');
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(DIST, 'site-config.json'), 'utf8'));
    assert(typeof cfg.site?.name === 'string' && cfg.site.name.length > 0, 'site.name');
    assert(typeof cfg.theme?.active === 'string', 'theme.active');
    assert(Array.isArray(cfg.nav) && cfg.nav.length > 0, 'nav array not empty');
    for (const item of cfg.nav) {
      assert(item.url || item.page, `nav "${item.name}" has url or page`);
    }
    assert(typeof cfg.pages !== 'undefined', 'pages exists');
    assert(typeof cfg.comments === 'object', 'comments exists');
    assert(typeof cfg.beian === 'object', 'beian exists');
  } catch (e) { assert(false, `site-config valid: ${e.message}`); }
}

// ── Test: Config validation (strict syntax + type + unknown keys) ──
function testConfigValidation() {
  console.log('\n[Config Validation]');
  const { parseYaml, validateConfig } = require('./src/kernel/config');

  // L1：不支持语法必须报错（错误信息含行号）
  const syntaxCases = [
    ['flow mapping', 'site: {name: T}'],
    ['anchor', 'base: &b\n  x: 1'],
    ['alias', 'site:\n  ref: *b'],
    ['multiline flow seq', 'nav: [a,\n  b]'],
    ['block indicator', 'desc: |2\n  line'],
  ];
  for (const [label, input] of syntaxCases) {
    let threwWithLine = false;
    try {
      parseYaml(input, { strict: true });
    } catch (e) {
      threwWithLine = /第 \d+ 行/.test(e.message);
    }
    assert(threwWithLine, `strict rejects ${label} with line number`);
  }

  // L1：已支持语法不得误伤
  const supportedCases = [
    ['inline array', 'tags: [a, b, c]'],
    ['block scalar', 'desc: |\n  line1\n  line2'],
    ['loose indent', 'site:\n  name: T\n   ok: tolerate'],
  ];
  for (const [label, input] of supportedCases) {
    let ok = true;
    try {
      parseYaml(input, { strict: true });
    } catch (_) {
      ok = false;
    }
    assert(ok, `strict allows ${label}`);
  }

  // L2：关键字段类型与数组元素校验
  const typeErrors = (input) => validateConfig(parseYaml(input)).errors;
  assert(typeErrors('nav: hello').some((e) => e.includes('"nav"')), 'type error: nav must be array');
  assert(typeErrors('theme:\n  active: 123').some((e) => e.includes('theme.active')), 'type error: theme.active must be string');
  assert(typeErrors('content:\n  categories:\n    - id: a').some((e) => e.includes('path')), 'type error: categories item missing path');
  assert(
    typeErrors('site:\n  name: T\ncontent:\n  categories:\n    - id: a\n      path: posts/a\nnav:\n  - name: Home\n    page: index').length === 0,
    'valid config has no errors'
  );

  // L3：未知顶层键——警告（不阻断）+ 相似键建议
  const { warnings } = validateConfig(parseYaml('them:\n  active: g'));
  assert(warnings.some((w) => w.includes('them') && w.includes('theme')), 'unknown key warns with suggestion');

  // content.sort 枚举校验（by / order）
  assert(
    typeErrors('content:\n  sort:\n    - by: nope\n      order: desc').some((e) => e.includes('content.sort[0].by')),
    'sort by enum validated'
  );
  assert(
    typeErrors('content:\n  sort:\n    - by: date\n      order: sideways').some((e) => e.includes('content.sort[0].order')),
    'sort order enum validated'
  );
  assert(typeErrors('content:\n  sort:\n    - by: date\n      order: asc').length === 0, 'valid sort config passes');
}

// ── Test: Sort comparator (multi-field + order) ──────────
function testSortComparator() {
  console.log('\n[Sort Config]');
  const { buildPostComparator } = require('./src/kernel/content');
  const posts = [
    { id: 'b', title: 'Beta', date: '2026-01-02', category: 'x', categoryOrder: 0, file: 'x/02-beta.md' },
    { id: 'a', title: 'Alpha', date: '2026-01-02', category: 'y', categoryOrder: 1, file: 'y/01-alpha.md' },
    { id: 'c', title: 'Gamma', date: '2026-01-01', category: 'x', categoryOrder: 0, file: 'x/10-gamma.md' },
    { id: 'd', title: 'Delta', date: '2026-01-01', category: 'x', categoryOrder: 0, file: 'x/2-delta.md' },
  ];
  const ids = (list) => list.map((p) => p.id);

  // 默认（未配置）：日期降序 + 文件名升序（数字自然序：2 < 10）
  assert(
    JSON.stringify(ids([...posts].sort(buildPostComparator(null)))) === JSON.stringify(['b', 'a', 'd', 'c']),
    'default: date desc then file asc (numeric)'
  );

  // file 排序（数字自然序：x/2 < x/10）
  assert(
    JSON.stringify(ids([...posts].sort(buildPostComparator([{ by: 'file', order: 'asc' }])))) === JSON.stringify(['b', 'd', 'c', 'a']),
    'sort by file asc uses numeric order (2 before 10)'
  );

  // category 排序 = 分类定义序（categoryOrder），非 id 字母序
  const defPosts = [
    { id: 'e', category: 'yy', categoryOrder: 0, file: 'a.md' },
    { id: 'f', category: 'aa', categoryOrder: 1, file: 'b.md' },
  ];
  assert(
    JSON.stringify(ids([...defPosts].sort(buildPostComparator([{ by: 'category', order: 'asc' }])))) === JSON.stringify(['e', 'f']),
    'category sorts by definition order (not id alphabet)'
  );

  // 单字段：标题升序 / 降序（字母序：Alpha < Beta < Delta < Gamma）
  assert(JSON.stringify(ids([...posts].sort(buildPostComparator([{ by: 'title', order: 'asc' }])))) === JSON.stringify(['a', 'b', 'd', 'c']), 'sort by title asc');
  assert(JSON.stringify(ids([...posts].sort(buildPostComparator([{ by: 'title', order: 'desc' }])))) === JSON.stringify(['c', 'd', 'b', 'a']), 'sort by title desc');

  // 多级：分类定义序升序 → 组内日期降序
  assert(
    JSON.stringify(ids([...posts].sort(buildPostComparator([{ by: 'category', order: 'asc' }, { by: 'date', order: 'desc' }])))) === JSON.stringify(['b', 'c', 'd', 'a']),
    'multi-level: category asc then date desc'
  );

  // 非法配置：全部非法回退默认 → date desc + file asc
  assert(JSON.stringify(ids([...posts].sort(buildPostComparator([{ by: 'nope' }])))) === JSON.stringify(['b', 'a', 'd', 'c']), 'invalid rules fall back to default');

  // 部分合法 + 非法规格记录警告
  const warnings = [];
  const partial = [...posts].sort(buildPostComparator([{ by: 'nope' }, { by: 'date', order: 'invalid' }], warnings));
  assert(JSON.stringify(ids(partial)) === JSON.stringify(['b', 'a', 'c', 'd']), 'partially invalid: only valid field kept (stable for ties)');
  assert(warnings.length === 2, 'normalize warns on invalid by and order');

  // 日期非零填充也能正确排序（numeric 容错）
  const looseDates = [
    { id: 'p', date: '2026-7-3', file: 'p.md' },
    { id: 'q', date: '2026-12-01', file: 'q.md' },
  ];
  assert(
    JSON.stringify(ids([...looseDates].sort(buildPostComparator([{ by: 'date', order: 'asc' }])))) === JSON.stringify(['p', 'q']),
    'numeric compare tolerates non-padded dates (7-3 before 12-01)'
  );

  // 大小写敏感度（content.sortCaseSensitive → sensitivity variant/base）
  // 断言比较器语义（与运行环境 locale 无关）：
  //   base 下 Apple 与 apple 视为相等（返回 0，排序时稳定保持输入序）
  //   variant 下两者不相等（具体先后由 locale 决定）
  const rule = [{ by: 'file', order: 'asc' }];
  const cmpBase = buildPostComparator(rule, [], false);
  const cmpSensitive = buildPostComparator(rule, [], true);
  assert(cmpBase({ file: 'Apple.md' }, { file: 'apple.md' }) === 0, 'case insensitive: Apple equals apple');
  assert(cmpSensitive({ file: 'Apple.md' }, { file: 'apple.md' }) !== 0, 'case sensitive: Apple differs from apple');
}

// ── Test: Auth gating (public outputs must not leak when auth enabled) ──
function testAuthGating() {
  console.log('\n[Auth Gating]');
  const tmpDist = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-auth-gating-'));
  const authBuild = {
    config: { auth: { enabled: true }, site: {}, deployment: {}, seo: {} },
    categories: {},
    pathMap: {},
    distDir: tmpDist,
    pkgRoot: __dirname,
  };

  try {
    // search-index：跳过 + 清理旧产物（含标题/摘要/路径的索引不得残留）
    const indexPath = path.join(tmpDist, 'search-index.json');
    fs.writeFileSync(indexPath, JSON.stringify([{ id: 'x', title: 'secret', url: 'posts/a/secret.html' }]));
    const searchResult = require('./src/plugins/search-index')(authBuild);
    assert(searchResult.skipped === true, 'search-index: skipped flag when auth enabled');
    assert(searchResult.count === 0, 'search-index: no documents generated');
    assert(!fs.existsSync(indexPath), 'search-index: old artifact removed');

    // rss：跳过 + 清理旧产物
    const feedPath = path.join(tmpDist, 'feed.xml');
    fs.writeFileSync(feedPath, '<rss>leak</rss>');
    require('./src/plugins/rss')(authBuild);
    assert(!fs.existsSync(feedPath), 'rss: old feed removed when auth enabled');

    // sitemap：跳过 + 清理旧产物
    const sitemapPath = path.join(tmpDist, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, '<urlset/>');
    require('./src/plugins/sitemap')(authBuild);
    assert(!fs.existsSync(sitemapPath), 'sitemap: old artifact removed when auth enabled');

    // robots：一律 Disallow
    require('./src/plugins/robots')(authBuild);
    const robots = fs.readFileSync(path.join(tmpDist, 'robots.txt'), 'utf8');
    assert(robots.includes('Disallow: /'), 'robots: Disallow all when auth enabled');
  } finally {
    fs.rmSync(tmpDist, { recursive: true, force: true });
  }
}

// ── Test: Content index ──────────────────────────────────
function testContentIndex() {
  console.log('\n[Content Index]');
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(DIST, 'content-index.json'), 'utf8'));
    assert(typeof idx.categories === 'object', 'has categories');
    let total = 0;
    for (const [id, cat] of Object.entries(idx.categories)) {
      assert(typeof cat.name === 'string', `cat "${id}" has name`);
      assert(Array.isArray(cat.posts), `cat "${id}" has posts`);
      total += cat.posts.length;
      for (const p of cat.posts) {
        assert(typeof p.id === 'string' && typeof p.title === 'string', `post "${p.id}" has id+title`);
      }
    }
    assert(total > 0, `${total} total posts`);
  } catch (e) { assert(false, `content-index valid: ${e.message}`); }
}

// ── Test: Pathmap ────────────────────────────────────────
function testPathmap() {
  console.log('\n[Pathmap]');
  try {
    const pm = JSON.parse(fs.readFileSync(path.join(DIST, 'pathmap.json'), 'utf8'));
    const ids = Object.keys(pm);
    assert(ids.length > 0, `${ids.length} entries`);
    for (const id of ids) {
      assert(pm[id].outputPath?.endsWith('.html'), `pathmap["${id}"].outputPath ends .html`);
    }
  } catch (e) { assert(false, `pathmap valid: ${e.message}`); }
}

// ── Test: Search index ───────────────────────────────────
function testSearchIndex() {
  console.log('\n[Search Index]');
  try {
    const docs = JSON.parse(fs.readFileSync(path.join(DIST, 'search-index.json'), 'utf8'));
    assert(Array.isArray(docs) && docs.length > 0, `${docs.length} docs`);
    for (const d of docs) {
      assert(typeof d.id === 'string' && typeof d.title === 'string' && typeof d.url === 'string', `doc "${d.id}" has id+title+url`);
    }
  } catch (e) { assert(false, `search-index valid: ${e.message}`); }
}

// ── Test: RSS/Sitemap ────────────────────────────────────
function testFeeds() {
  console.log('\n[Feeds]');
  const rss = fs.readFileSync(path.join(DIST, 'feed.xml'), 'utf8');
  assert(rss.includes('<rss'), 'feed.xml has <rss>');
  assert(rss.includes('<item>'), 'feed.xml has <item>');
  assert(rss.includes('<language>'), 'feed.xml has <language>');

  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  assert(sitemap.includes('<urlset'), 'sitemap.xml has <urlset>');
  assert(sitemap.includes('<url>'), 'sitemap.xml has <url>');
}

// ── Test: No old files ───────────────────────────────────
function testNoOldFiles() {
  console.log('\n[Cleanup]');
  for (const f of ['blog.core.js', 'blog.render.js', 'blog.ui.js', 'blog.i18n.js', 'blog.js', 'backup.js', 'OPTIMIZATION_PLAN.md']) {
    assert(!fs.existsSync(path.join(ROOT, f)), `root/${f} deleted`);
  }
}

// ── Test: HTML templates ─────────────────────────────────
function testHtmlTemplates() {
  console.log('\n[HTML Templates]');
  // Full templates (must have client scripts, color-scheme, footer)
  const fullTemplates = ['index.html', 'post.html', 'page.html', '404.html', 'moments.html', 'links.html', 'gallery.html', 'disclaimer.html'];
  for (const tpl of fullTemplates) {
    const html = fs.readFileSync(path.join(DIST, tpl), 'utf8');
    assert(html.includes('client/i18n.js'), `${tpl} → client/i18n.js`);
    assert(html.includes('client/core.js'), `${tpl} → client/core.js`);
    assert(html.includes('client/nav.js'), `${tpl} → client/nav.js`);
    assert(html.includes('client/blog.js'), `${tpl} → client/blog.js`);
    assert(!html.includes('src="./blog.core.js"'), `${tpl} no old blog.core.js`);
    assert(html.includes('name="color-scheme"'), `${tpl} has color-scheme`);
    assert(html.includes('data-template="footer"'), `${tpl} has footer template`);
  }

  // about.html is a redirect page, just check it exists and redirects
  const aboutHtml = fs.readFileSync(path.join(DIST, 'about.html'), 'utf8');
  assert(aboutHtml.includes('page.html?id=about'), 'about.html redirects to page.html?id=about');
}

// ── Test: HTTP endpoints ─────────────────────────────────
async function testHttp() {
  console.log('\n[HTTP Endpoints]');
  const endpoints = [
    '/', '/index.html', '/post.html', '/page.html', '/404.html',
    '/moments.html', '/links.html', '/gallery.html', '/disclaimer.html', '/about.html',
    '/site-config.json', '/content-index.json', '/pathmap.json',
    '/feed.xml', '/sitemap.xml', '/search-index.json',
    '/locales/zh.json', '/locales/en.json',
    '/client/core.js', '/client/nav.js', '/client/render.js',
    '/client/ui.js', '/client/i18n.js', '/client/blog.js',
    '/themes/graphite/theme.css', '/themes/base.css',
    '/vendor/marked.min.js', '/vendor/lunr.min.js',
  ];
  for (const ep of endpoints) {
    const res = await httpGet(ep);
    assert(res.status === 200, `${ep} → 200`);
    assert(res.body.length > 0, `${ep} has content`);
  }
}

// ── Test: HTTP Range（媒体流式播放基础）────────────────────
// 覆盖 serve.js 的 Range 语义：206/Content-Range/闭区间/开区间/尾段/416/非法回落。
function testRangeRequests() {
  return (async () => {
    console.log('\n[Range Requests]');
    const target = '/site-config.json';
    const full = await httpGet(target);
    const fullBytes = Buffer.from(full.body, 'utf8');
    const total = fullBytes.length;
    assert(full.headers['accept-ranges'] === 'bytes', 'no Range → Accept-Ranges: bytes');

    const r1 = await httpGet(target, { Range: 'bytes=0-99' });
    assert(r1.status === 206, 'bytes=0-99 → 206');
    assert(r1.headers['content-range'] === `bytes 0-99/${total}`, 'content-range 0-99/total');
    const r1Bytes = Buffer.from(r1.body, 'utf8');
    assert(r1Bytes.length === 100, 'range body is 100 bytes');
    assert(r1Bytes.equals(fullBytes.subarray(0, 100)), 'range body matches full content');

    const r2 = await httpGet(target, { Range: 'bytes=100-' });
    assert(r2.status === 206 && r2.headers['content-range'] === `bytes 100-${total - 1}/${total}`, 'open-ended range → rest of file');

    const r3 = await httpGet(target, { Range: 'bytes=-50' });
    assert(r3.status === 206 && r3.headers['content-range'] === `bytes ${total - 50}-${total - 1}/${total}`, 'suffix range → last 50 bytes');

    const r4 = await httpGet(target, { Range: 'bytes=999999999-' });
    assert(r4.status === 416 && r4.headers['content-range'] === `bytes */${total}`, 'out-of-range → 416');

    const r5 = await httpGet(target, { Range: 'bytes=abc' });
    assert(r5.status === 200, 'invalid Range syntax → 200 fallback');
  })();
}

// ── Test: Nav config completeness ────────────────────────
async function testNavCompleteness() {
  console.log('\n[Nav Config]');
  const res = await httpGet('/site-config.json');
  const cfg = JSON.parse(res.body);

  for (const item of cfg.nav) {
    // Each nav item must have a resolvable target
    const hasTarget = item.url || item.page;
    assert(hasTarget, `nav "${item.name}" has url or page`);

    // page: index must resolve to ./index.html
    if (item.page === 'index') {
      assert(true, `nav "${item.name}" → index (special case)`);
    }
    // page: about must have matching entry in pages
    else if (item.page) {
      const pages = cfg.pages;
      let found = false;
      if (Array.isArray(pages)) found = pages.some(p => p.id === item.page);
      else if (pages) found = !!pages[item.page];
      assert(found, `nav "${item.name}" page="${item.page}" exists in pages config`);
    }
    // url items must be safe
    else if (item.url) {
      assert(!item.url.startsWith('javascript:'), `nav "${item.name}" url is safe`);
    }
  }
}

// ── Test: Auth encryption build closure ────────────────
// 加密模式闭环：
// 1. 正文只以密文进入 dist/encrypted/*.json，content-index.json 不携带 html 全文与 sourcePath
// 2. pathmap.json 每个条目带 encrypted: true（客户端据此走解密分支）
// 3. 用同一密码解密一篇密文，断言得到可读 HTML（解密链路闭环）
function testAuthEncryption() {
  console.log('\n[Auth Encryption]');
  const configPath = path.join(ROOT, 'site', 'config.yml');
  const backup = fs.readFileSync(configPath, 'utf8');
  const authSnippet = '\n# test-only auth (removed by test suite)\nauth:\n  enabled: true\n  password: "__blog_test_pw__"\n';
  try {
    fs.writeFileSync(configPath, backup + authSnippet, 'utf8');
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });

    const encDir = path.join(DIST, 'encrypted');
    assert(fs.existsSync(encDir), 'dist/encrypted exists');
    const encFiles = fs.existsSync(encDir)
      ? fs.readdirSync(encDir).filter((f) => f.endsWith('.json'))
      : [];
    assert(encFiles.length > 0, `${encFiles.length} encrypted files`);

    for (const f of encFiles) {
      let enc = null;
      try { enc = JSON.parse(fs.readFileSync(path.join(encDir, f), 'utf8')); } catch (_) {}
      const ok = enc && typeof enc.ct === 'string' && enc.ct.length > 0
        && typeof enc.salt === 'string' && typeof enc.iv === 'string' && typeof enc.tag === 'string';
      assert(ok, `encrypted/${f} has ct/salt/iv/tag`);
      assert(enc && !enc.ct.includes('<p') && !enc.ct.includes('<h'), `encrypted/${f} ct is not plaintext`);
    }

    const idx = JSON.parse(fs.readFileSync(path.join(DIST, 'content-index.json'), 'utf8'));
    let leakedHtml = 0;
    let leakedSource = 0;
    for (const cat of Object.values(idx.categories || {})) {
      for (const p of (cat.posts || [])) {
        if (p.html !== undefined) leakedHtml++;
        if (p.sourcePath !== undefined) leakedSource++;
      }
    }
    assert(leakedHtml === 0, 'content-index.json has no html field (encrypted mode)');
    assert(leakedSource === 0, 'content-index.json has no sourcePath field');

    const pm = JSON.parse(fs.readFileSync(path.join(DIST, 'pathmap.json'), 'utf8'));
    assert(Object.keys(pm).length === encFiles.length, 'pathmap entries match encrypted files');

    // 每个 pathmap 条目必须带 encrypted: true（客户端据此走解密分支，而非 fetch 不存在的明文）
    const encryptedEntries = Object.values(pm).filter((e) => e.encrypted === true);
    assert(encryptedEntries.length === encFiles.length, 'pathmap entries marked encrypted');

    // Node 端解密闭环：用同一密码解密一篇加密文件，断言得到可读 HTML
    try {
      const crypto = require('crypto');
      const firstEnc = JSON.parse(fs.readFileSync(path.join(encDir, encFiles[0]), 'utf8'));
      const key = crypto.pbkdf2Sync('__blog_test_pw__', Buffer.from(firstEnc.salt, 'base64'), 200000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(firstEnc.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(firstEnc.tag, 'base64'));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(firstEnc.ct, 'base64')),
        decipher.final()
      ]).toString('utf8');
      assert(typeof plain === 'string' && plain.includes('<p'), 'decrypted content is readable HTML');
    } catch (e) {
      assert(false, `decrypt roundtrip: ${e.message}`);
    }
  } catch (e) {
    assert(false, `auth encryption test: ${e.message}`);
  } finally {
    fs.writeFileSync(configPath, backup, 'utf8');
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' }); // 还原非加密 dist
  }
}

// ── Test: Auth RSS/Sitemap/robots gating ───────────────
// 认证模式联动（A3）：
// 1. auth.enabled 且未 keepRss → feed.xml / sitemap.xml 不生成、
//    robots.txt Disallow 全部、页面 noindex、navActions RSS 按钮被过滤
// 2. auth.keepRss: true → feed.xml 保留、RSS 按钮保留（sitemap 仍关闭）
function testAuthRssGating() {
  console.log('\n[Auth RSS/Sitemap Gating]');
  const configPath = path.join(ROOT, 'site', 'config.yml');
  const backup = fs.readFileSync(configPath, 'utf8');
  try {
    // 1) auth enabled, keepRss 未设置 → 全部关闭
    fs.writeFileSync(configPath, backup + '\n# test-only auth (removed by test suite)\nauth:\n  enabled: true\n  password: "__blog_test_pw__"\n', 'utf8');
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });

    assert(!fs.existsSync(path.join(DIST, 'feed.xml')), 'feed.xml not generated (auth)');
    assert(!fs.existsSync(path.join(DIST, 'sitemap.xml')), 'sitemap.xml not generated (auth)');

    const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');
    assert(robots.includes('Disallow: /'), 'robots.txt disallows all (auth)');

    const cfg = JSON.parse(fs.readFileSync(path.join(DIST, 'site-config.json'), 'utf8'));
    const rssActions = (cfg.navActions || []).filter((a) => /feed\.xml$/.test(a.url || ''));
    assert(rssActions.length === 0, 'navActions RSS button filtered (auth)');

    const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    assert(indexHtml.includes('noindex, nofollow'), 'index.html noindex meta (auth)');

    // 2) auth.keepRss: true → RSS 保留（sitemap 仍关闭）
    fs.writeFileSync(configPath, backup + '\n# test-only auth (removed by test suite)\nauth:\n  enabled: true\n  password: "__blog_test_pw__"\n  keepRss: true\n', 'utf8');
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });

    assert(fs.existsSync(path.join(DIST, 'feed.xml')), 'feed.xml kept (auth.keepRss: true)');
    assert(!fs.existsSync(path.join(DIST, 'sitemap.xml')), 'sitemap.xml still closed (auth + keepRss)');

    const cfg2 = JSON.parse(fs.readFileSync(path.join(DIST, 'site-config.json'), 'utf8'));
    const rssActions2 = (cfg2.navActions || []).filter((a) => /feed\.xml$/.test(a.url || ''));
    assert(rssActions2.length === 1, 'navActions RSS button kept (auth.keepRss: true)');
  } catch (e) {
    assert(false, `auth rss gating test: ${e.message}`);
  } finally {
    fs.writeFileSync(configPath, backup, 'utf8');
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' }); // 还原非加密 dist
  }
}

// ── Test: Incremental orphan cleanup ────────────────────
// 增量构建后删除源文章，dist 中的平铺 HTML 与 SSG 目录应被清理。
function testIncrementalOrphanCleanup() {
  console.log('\n[Incremental Orphan Cleanup]');
  const tmpPost = path.join(ROOT, 'site', 'content', 'posts', 'guide', '__orphan-test__.md');
  const tmpHtml = path.join(DIST, 'posts', 'guide', '__orphan-test__.html');
  const tmpDir = path.join(DIST, 'posts', 'guide', '__orphan-test__');
  const content = '---\ntitle: Orphan Test\ndate: 2026-01-01\ncategory: guide\n---\nTemp post for orphan cleanup test.\n';
  try {
    fs.writeFileSync(tmpPost, content, 'utf8');
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
    assert(fs.existsSync(tmpHtml) && fs.existsSync(path.join(tmpDir, 'index.html')), 'temp post built with html + ssg dir');

    fs.unlinkSync(tmpPost);
    execSync('node build.js --incremental', { cwd: ROOT, stdio: 'pipe' });
    assert(!fs.existsSync(tmpHtml), 'orphan .html removed');
    assert(!fs.existsSync(tmpDir), 'orphan ssg dir removed');
  } catch (e) {
    assert(false, `orphan cleanup test: ${e.message}`);
  } finally {
    if (fs.existsSync(tmpPost)) fs.unlinkSync(tmpPost);
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' }); // 还原干净 dist
  }
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Static Blog — Automated Test Suite');
  console.log('═══════════════════════════════════════════');

  // ── 认证基线处理 ──────────────────────────────────────
  // 测试套件以非认证基线运行：若站点 config 当前启用了认证
  // （用户环境可能开启），临时禁用（仅改 auth.enabled 值），
  // 测试结束（finally）恢复原配置。认证专项测试自行管理认证配置。
  const configPath = path.join(ROOT, 'site', 'config.yml');
  let configRestore = null;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    let authIdx = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (/^auth:\s*$/.test(lines[i].trim()) && !lines[i].trim().startsWith('#')) { authIdx = i; break; }
    }
    if (authIdx !== -1) {
      for (let i = authIdx + 1; i < lines.length; i += 1) {
        if (/^\S/.test(lines[i])) break; // 遇到下一个顶层键，auth 块结束
        if (/^  enabled:\s*true(\s*#.*)?$/.test(lines[i])) {
          lines[i] = lines[i].replace('enabled: true', 'enabled: false');
          configRestore = raw;
          fs.writeFileSync(configPath, lines.join('\n'), 'utf8');
          console.log('  [Auth] site auth enabled → temporarily disabled for tests (restored afterwards)');
          break;
        }
      }
    }
  } catch (_) { /* 无法读取配置时按非认证基线处理 */ }

  try {
    // File-based tests (no server needed)
    const buildOk = testBuild();
    if (!buildOk) { process.exitCode = 1; printSummary(); return; }

    testLocales();
    testConfig();
    testConfigValidation();
    testSortComparator();
    testContentIndex();
    testPathmap();
    testSearchIndex();
    testFeeds();
    testAuthGating();
    testNoOldFiles();
    testHtmlTemplates();

    // HTTP tests (need server)
    console.log('\n[Starting server for HTTP tests...]');
    let serverProc = null;
    try {
      serverProc = spawn('node', ['serve.js', String(PORT), '--no-live'], { cwd: ROOT, stdio: 'pipe' });
      await sleep(3000);

  await testHttp();
  await testRangeRequests();
  await testNavCompleteness();

      testAuthEncryption();
      testAuthRssGating();
      testIncrementalOrphanCleanup();
    } catch (e) {
      assert(false, `HTTP tests error: ${e.message}`);
    } finally {
      if (serverProc) serverProc.kill();
    }

    printSummary();
  } finally {
    if (configRestore !== null) {
      fs.writeFileSync(configPath, configRestore, 'utf8');
      console.log('  [Auth] site config restored');
    }
  }
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  ❌ ${f}`));
  }
  if (failed > 0) process.exitCode = 1;
  verifyReadmeTestCount(passed + failed);
}

/**
 * 文档一致性校验：README 中的自动化测试数量必须与实测总数一致。
 *
 * 防止「功能一加、文档数字掉队」的历史漂移模式（曾出现 221/253 两次）。
 * 不一致时输出修正提示并以非零退出码结束（测试失败），强制同步文档。
 *
 * @param {number} total - 本次实测的断言总数（passed + failed）
 */
function verifyReadmeTestCount(total) {
  const targets = ['README.md', 'README.en.md'];
  // 覆盖两种中文语序与英文表述：
  //   自动化测试（287 项） / 运行 287 项自动化测试 / 287 automated tests
  const patterns = [
    /自动化测试[（(]\s*(\d+)\s*项/,
    /(\d+)\s*项自动化测试/,
    /(\d+)\s*automated tests/,
  ];
  const drifts = [];
  for (const file of targets) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const pattern of patterns) {
      const re = new RegExp(pattern.source, 'g');
      let match;
      while ((match = re.exec(text)) !== null) {
        const declared = Number(match[1]);
        if (declared !== total) drifts.push(`${file}: 写「${declared}」实际「${total}」`);
      }
    }
  }
  if (drifts.length > 0) {
    console.error('\n⚠ 文档漂移（测试数字不一致，请同步 README）：');
    drifts.forEach((d) => console.error(`  ${d}`));
    process.exitCode = 1;
  } else {
    console.log(`\nDocs consistency: ✅ README 测试数字与实测一致（${total}）`);
  }
}

main().catch((e) => { console.error('Test error:', e); process.exit(1); });
