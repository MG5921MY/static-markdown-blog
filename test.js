/**
 * Automated test suite for static blog platform.
 * Run: node test.js
 *
 * Tests build, dist structure, config, locales, feeds, search index,
 * HTML templates, nav config, old file cleanup, and HTTP endpoints.
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
}

main().catch((e) => { console.error('Test error:', e); process.exit(1); });
