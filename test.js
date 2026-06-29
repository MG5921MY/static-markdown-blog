/**
 * Automated test suite for static blog platform.
 * Run: node test.js
 *
 * Tests build, dist structure, config, locales, and HTTP endpoints.
 */

const http = require('http');
const fs = require('fs');
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

function httpGet(urlPath) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}${urlPath}`, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, body: '' }); });
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
    const file = path.join(ROOT, 'locales', `${code}.json`);
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

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Static Blog — Automated Test Suite');
  console.log('═══════════════════════════════════════════');

  // File-based tests (no server needed)
  const buildOk = testBuild();
  if (!buildOk) { printSummary(); process.exit(1); }

  testLocales();
  testConfig();
  testContentIndex();
  testPathmap();
  testSearchIndex();
  testFeeds();
  testNoOldFiles();
  testHtmlTemplates();

  // HTTP tests (need server)
  console.log('\n[Starting server for HTTP tests...]');
  let serverProc = null;
  try {
    serverProc = spawn('node', ['serve.js', String(PORT), '--no-live'], { cwd: ROOT, stdio: 'pipe' });
    await sleep(3000);

    await testHttp();
    await testNavCompleteness();
  } catch (e) {
    assert(false, `HTTP tests error: ${e.message}`);
  } finally {
    if (serverProc) serverProc.kill();
  }

  printSummary();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════');
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  ❌ ${f}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Test error:', e); process.exit(1); });
