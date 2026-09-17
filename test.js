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

// ── 测试环境辅助（职责分离：进程生命周期 / 失败诊断 / 构建类执行器）──
//
// 两个构建进程并发操作 dist 会互相破坏（典型：watch 模式的 serve 响应
// 测试的源文件修改而自动重建）：表现为 EPERM/EBUSY/ENOTEMPTY（文件锁）
// 或 ENOENT（产物缺失），并级联出难排查的次级错误（auth/orphan 用例先挂）。
// 并发无法被可靠预检——干扰可在任意时刻开始——因此策略是「失败即诊断 +
// 熔断」：第一次构建失败就给出一步可操作的指引，并终止后续构建类测试。

// 等待子进程退出（2s 兜底），确保 serve 完全退出后再由后续构建类
// 测试重建 dist（消除测试自身进程与构建的任何交集）。
// 调用后调用方应将引用置空。
function stopServer(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    proc.once('exit', () => { clearTimeout(timer); resolve(); });
    proc.kill();
  });
}

// 构建失败诊断：识别两类特征并给出可操作指引
//   1. 文件锁（EPERM/EBUSY/ENOTEMPTY）——构建进程并发竞争 dist
//   2. 产物缺失（ENOENT 且路径含 dist）——dist 处于部分构建状态
// 供所有执行 build 的测试路径复用（runBuildTest / HTTP 类 catch）。
function diagnoseBuildFailure(error) {
  const msg = String((error && (error.stderr || error.message)) || '');
  const lockLike = /EPERM|EBUSY|ENOTEMPTY/i.test(msg);
  const missing = /ENOENT/i.test(msg) && /[\\/]dist[\\/]/i.test(msg);
  if (!lockLike && !missing) return;
  const line = msg.split('\n').find((l) => /EPERM|EBUSY|ENOTEMPTY|ENOENT/i.test(l)) || msg.slice(0, 200);
  console.log(`\n  ⚠ 构建失败呈现${lockLike ? '文件锁' : '产物缺失'}特征：`);
  console.log(`    ${line.trim()}`);
  console.log('    最常见原因：另一个 serve 正以 watch 模式运行，测试修改源文件会触发它自动重建，');
  console.log('    与测试自身的构建并发操作 dist（表现为文件锁或产物缺失）。');
  console.log('    处理方式：停止该 serve（或用 --no-live 启动），再重跑 node test.js\n');
}

// 构建类测试的统一执行器：捕获异常并诊断，返回是否通过（无新增失败）。
// 测试函数自身只保留「断言 + finally 清理」；调用方据返回值决定是否熔断。
function runBuildTest(name, fn) {
  const failedBefore = failed;
  try {
    fn();
  } catch (e) {
    assert(false, `${name}: ${e.message}`);
    diagnoseBuildFailure(e);
  }
  return failed === failedBefore;
}

// ── Test: 审计加固（HTML JSON / dist 路径 / 密码 / 邻居表）──
function testAuditHardening() {
  console.log('\n[Audit Hardening]');
  const { jsonForHtmlScript } = require('./src/kernel/html-json');
  const { generatePassword } = require('./src/plugins/encryption');
  const { buildReadingNeighborMap } = require('./src/kernel/content');

  const breakout = jsonForHtmlScript({ html: '</script><script>alert(1)</script>' });
  assert(!/<\/script>/i.test(breakout), 'jsonForHtmlScript: no literal </script>');
  assert(JSON.parse(breakout).html.includes('</script>'), 'jsonForHtmlScript: JSON.parse preserves value');

  // 与 serve.js 共用 kernel/paths.isPathInsideRoot（路径单一，禁止在此复制实现）
  const { isPathInsideRoot } = require('./src/kernel/paths');
  const dist = path.resolve(os.tmpdir(), 'blog-dist-audit');
  assert(isPathInsideRoot(dist, path.join(dist, 'index.html')) === true, 'isInsideDist: accepts file under dist');
  assert(isPathInsideRoot(dist, `${dist}.bak/secret`) === false, 'isInsideDist: rejects dist.bak sibling');
  assert(isPathInsideRoot(dist, path.resolve(dist, '..', 'blog-dist-audit.bak', 'x')) === false, 'isInsideDist: rejects normalized escape');

  const pw = generatePassword(32);
  assert(pw.length === 32, 'generatePassword length 32');
  assert(/^[A-Za-z0-9!@#$%^&*]+$/.test(pw), 'generatePassword charset');

  const map = buildReadingNeighborMap([{ id: 'a', date: '2026-01-01', file: 'a.md' }], null);
  assert(map.get('a')?.prev === null && map.get('a')?.next === null && map.get('a')?.readingIndex === 0,
    'neighbor map: sole post readingIndex=0 by position');
  assert(map.get('missing') === undefined, 'neighbor map: missing id is undefined (callers continue)');
}

// ── Test: Build ──────────────────────────────────────────
// 失败（构建异常或 dist 结构缺失）由 runBuildTest 统一诊断并触发熔断。
function testBuild() {
  console.log('\n[Build]');
  execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
  assert(true, 'node build.js succeeds');

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

// ── Test: prev/next 阅读序（与展示 sort 的 asc/desc 解耦）────
// 契约：上一篇 = 键值更小侧（更早日期 / 更小章节号）。
// 回归场景：主键 date 全相同 → 顺序由 file 决定；不得再按主键 order 猜方向。
function testPrevNextReadingOrder() {
  console.log('\n[Prev/Next Reading Order]');
  const { buildReadingNeighborMap } = require('./src/kernel/content');

  const chapters = [
    { id: 'idx', title: '索引', date: '2026-01-01', file: '000-index.md' },
    { id: 'ch1', title: '第一章', date: '2026-01-01', file: '001-ch1.md' },
    { id: 'ch2', title: '第二章', date: '2026-01-01', file: '002-ch2.md' },
    { id: 'ch3', title: '第三章', date: '2026-01-01', file: '003-ch3.md' },
  ];

  // 展示排序多种组合下，阅读序必须一致：idx → ch1 → ch2 → ch3
  const sortCombos = [
    { label: 'date desc + file asc', rules: [{ by: 'date', order: 'desc' }, { by: 'file', order: 'asc' }] },
    { label: 'date desc + file desc', rules: [{ by: 'date', order: 'desc' }, { by: 'file', order: 'desc' }] },
    { label: 'date asc + file asc', rules: [{ by: 'date', order: 'asc' }, { by: 'file', order: 'asc' }] },
    { label: 'date asc + file desc', rules: [{ by: 'date', order: 'asc' }, { by: 'file', order: 'desc' }] },
    { label: 'default null', rules: null },
  ];
  for (const { label, rules } of sortCombos) {
    const map = buildReadingNeighborMap(chapters, rules);
    assert(map.get('ch1')?.prev?.id === 'idx', `${label}: ch1 prev = idx`);
    assert(map.get('ch1')?.next?.id === 'ch2', `${label}: ch1 next = ch2`);
    assert(map.get('ch2')?.prev?.id === 'ch1', `${label}: ch2 prev = ch1`);
    assert(map.get('ch2')?.next?.id === 'ch3', `${label}: ch2 next = ch3`);
    assert(map.get('idx')?.prev === null, `${label}: idx prev = null`);
    assert(map.get('ch3')?.next === null, `${label}: ch3 next = null`);
  }

  // 回归：date 可区分时，上一篇 = 更早、下一篇 = 更晚（默认博客语义）
  const dated = [
    { id: 'old', title: 'Old', date: '2020-01-01', file: 'z.md' },
    { id: 'mid', title: 'Mid', date: '2022-01-01', file: 'y.md' },
    { id: 'new', title: 'New', date: '2024-01-01', file: 'x.md' },
  ];
  const datedMap = buildReadingNeighborMap(dated, [{ by: 'date', order: 'desc' }, { by: 'file', order: 'asc' }]);
  assert(datedMap.get('new')?.prev?.id === 'mid', 'dated: newest prev is older mid');
  assert(datedMap.get('new')?.next === null, 'dated: newest next is null');
  assert(datedMap.get('old')?.prev === null, 'dated: oldest prev is null');
  assert(datedMap.get('old')?.next?.id === 'mid', 'dated: oldest next is mid');
}

// ── Test: tree 分组 posts 与 content.sort 一致 ────────────
// 回归：groups[].posts 曾只按 readdir 文件名序 push、未跑 comparator，
// 导致 type:tree 目录内列表与全站展示排序不一致。
function testTreeGroupSort() {
  console.log('\n[Tree Group Sort]');
  const { scanContent } = require('./src/kernel/content');
  const tmpSite = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-tree-sort-'));
  const catRel = 'content/posts/series';
  const vol1 = path.join(tmpSite, catRel, 'vol1');
  fs.mkdirSync(vol1, { recursive: true });
  const body = '---\ntitle: T\ndate: 2026-01-01\ncategory: series\n---\nbody\n';
  // 文件名序：010 会在 002 前（无 numeric）；comparator file asc 应 002 在前
  fs.writeFileSync(path.join(vol1, '010-ch.md'), body.replace('title: T', 'title: Ch10'), 'utf8');
  fs.writeFileSync(path.join(vol1, '002-ch.md'), body.replace('title: T', 'title: Ch02'), 'utf8');
  fs.writeFileSync(path.join(tmpSite, catRel, '001-root.md'), body.replace('title: T', 'title: Root'), 'utf8');

  try {
    const config = {
      sort: [{ by: 'date', order: 'desc' }, { by: 'file', order: 'asc' }],
      sortCaseSensitive: true,
      siteRoot: tmpSite,
      _siteRoot: tmpSite,
      categories: [{ id: 'series', path: catRel, type: 'tree', name: 'Series' }],
      display: { summaryLength: 140 },
      security: { markdownHtmlFilter: true },
    };
    const { categories } = scanContent(config, {
      includeDrafts: false,
      manifest: null,
      distDir: path.join(tmpSite, 'dist'),
    });
    const groupPosts = categories.series.groups.vol1.posts.map((p) => p.file);
    assert(
      JSON.stringify(groupPosts) === JSON.stringify(['vol1/002-ch.md', 'vol1/010-ch.md']),
      `tree group posts follow content.sort file asc (got ${JSON.stringify(groupPosts)})`
    );
    const flat = categories.series.posts.map((p) => p.file);
    assert(flat[0] === '001-root.md', 'flat posts still sorted with comparator');
  } catch (e) {
    assert(false, `tree group sort: ${e.message}`);
  } finally {
    try { fs.rmSync(tmpSite, { recursive: true, force: true }); } catch (_) {}
  }
}

// ── Test: 归档/404 同日平局键 = 阅读序 readingIndex ────────
function testArchiveReadingIndexTieBreak() {
  console.log('\n[Archive ReadingIndex Tie-break]');
  const { scanContent, buildReadingNeighborMap } = require('./src/kernel/content');

  const chapters = [
    { id: 'ch10', title: 'ZZZ晚章', date: '2026-01-01', file: 'vol/010.md' },
    { id: 'ch02', title: 'AAA早章', date: '2026-01-01', file: 'vol/002.md' },
  ];
  const neighbors = buildReadingNeighborMap(chapters, [{ by: 'date', order: 'desc' }, { by: 'file', order: 'asc' }]);
  assert(neighbors.get('ch02').readingIndex < neighbors.get('ch10').readingIndex,
    'readingIndex: 002 before 010');

  // 模拟归档比较器：同日 → readingIndex 升序（标题序应让位于阅读序）
  const withIdx = [
    { id: 'ch10', title: 'ZZZ晚章', date: '2026-01-01', readingIndex: neighbors.get('ch10').readingIndex },
    { id: 'ch02', title: 'AAA早章', date: '2026-01-01', readingIndex: neighbors.get('ch02').readingIndex },
  ];
  withIdx.sort((a, b) => {
    const byDate = String(b.date || '').localeCompare(String(a.date || ''), undefined, { numeric: true });
    if (byDate !== 0) return byDate;
    const ai = Number.isFinite(a.readingIndex) ? a.readingIndex : Number.MAX_SAFE_INTEGER;
    const bi = Number.isFinite(b.readingIndex) ? b.readingIndex : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) return ai - bi;
    return String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true });
  });
  assert(withIdx[0].id === 'ch02' && withIdx[1].id === 'ch10',
    'archive tie-break: same date ordered by readingIndex not title');

  // scanContent 把 readingIndex 写到 posts 上（供 content-index）
  const tmpSite = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-ridx-'));
  const catRel = 'content/posts/chap';
  fs.mkdirSync(path.join(tmpSite, catRel, 'vol'), { recursive: true });
  const body = '---\ntitle: T\ndate: 2026-01-01\ncategory: chap\n---\nx\n';
  fs.writeFileSync(path.join(tmpSite, catRel, 'vol', '010.md'), body.replace('title: T', 'title: Late'), 'utf8');
  fs.writeFileSync(path.join(tmpSite, catRel, 'vol', '002.md'), body.replace('title: T', 'title: Early'), 'utf8');
  try {
    const { categories } = scanContent({
      sort: [{ by: 'date', order: 'desc' }, { by: 'file', order: 'asc' }],
      sortCaseSensitive: true,
      siteRoot: tmpSite,
      _siteRoot: tmpSite,
      categories: [{ id: 'chap', path: catRel, type: 'tree', name: 'Chap' }],
      display: { summaryLength: 140 },
      security: {},
    }, { includeDrafts: false, manifest: null, distDir: path.join(tmpSite, 'dist') });
    const byFile = Object.fromEntries(categories.chap.posts.map((p) => [p.file, p.readingIndex]));
    assert(
      Number.isFinite(byFile['vol/002.md']) && Number.isFinite(byFile['vol/010.md'])
        && byFile['vol/002.md'] < byFile['vol/010.md'],
      `scanContent stamps readingIndex (002 < 010), got ${JSON.stringify(byFile)}`
    );
  } catch (e) {
    assert(false, `readingIndex stamp: ${e.message}`);
  } finally {
    try { fs.rmSync(tmpSite, { recursive: true, force: true }); } catch (_) {}
  }
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

  let serverProc = null;
  try {
    // ── 文件类测试（无服务）────────────────────────────────
    // 构建基线：dist 不可用时后续断言必然误报 → 失败即终止
    if (!runBuildTest('Build', testBuild)) { printSummary(); return; }

    testAuditHardening();
    testLocales();
    testConfig();
    testConfigValidation();
    testSortComparator();
    testPrevNextReadingOrder();
    testTreeGroupSort();
    testArchiveReadingIndexTieBreak();
    testContentIndex();
    testPathmap();
    testSearchIndex();
    testFeeds();
    testAuthGating();
    testNoOldFiles();
    testHtmlTemplates();

    // ── HTTP 类测试（需要 serve）───────────────────────────
    // 失败不阻断后续构建类测试：两类测试环境依赖不同（前者需要端口与
    // 进程，后者需要能干净重建的 dist），独立失败更利于定位根因。
    console.log('\n[Starting server for HTTP tests...]');
    serverProc = spawn('node', ['serve.js', String(PORT), '--no-live'], { cwd: ROOT, stdio: 'pipe' });
    try {
      await sleep(3000);

      await testHttp();
      await testRangeRequests();
      await testNavCompleteness();
    } catch (e) {
      assert(false, `HTTP tests error: ${e.message}`);
      diagnoseBuildFailure(e);
    } finally {
      // HTTP 类结束立即停服务：收窄 serve 生命周期，确保后续构建类
      // 测试在无测试自身进程干扰的环境下重建 dist。
      await stopServer(serverProc);
      serverProc = null;
    }

    // ── 构建类测试（各自全量重建 dist；测试自身 serve 已停止）──
    // 任一失败即熔断：在不可信 dist 上继续断言只会产生级联误报。
    const buildTests = [
      ['Auth Encryption', testAuthEncryption],
      ['Auth RSS/Sitemap Gating', testAuthRssGating],
      ['Incremental Orphan Cleanup', testIncrementalOrphanCleanup],
    ];
    for (const [name, fn] of buildTests) {
      if (!runBuildTest(name, fn)) { printSummary(); return; }
    }

    printSummary();
  } finally {
    if (serverProc) serverProc.kill();
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
  if (failed > 0) {
    process.exitCode = 1;
    // 存在失败用例时总数不具可比性，跳过文档数字校验（避免次生误报）
    console.log('  （存在失败用例，README 测试数字校验已跳过）');
  } else {
    verifyReadmeTestCount(passed + failed);
  }
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
