const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const PKG_ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'site');

// ── Helpers ─────────────────────────────────────────────
function exists(p) { return fs.existsSync(p); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function listEntries(p) {
  if (!exists(p)) return [];
  return fs.readdirSync(p).filter((n) => n !== '.gitkeep');
}

function isEmptyOrMissing(p) {
  return !exists(p) || listEntries(p).length === 0;
}

function countFiles(dir) {
  if (!exists(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) count++;
    else if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
  }
  return count;
}

function copyRecursive(src, dest, overwrite) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), overwrite);
    }
    return;
  }
  if (!overwrite && exists(dest)) return; // skip existing
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function removeRecursive(p) {
  if (exists(p)) fs.rmSync(p, { recursive: true, force: true });
}

function createPrompt() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(prompt, question) {
  return new Promise((resolve) => {
    prompt.question(question, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

// ── Source directories ──────────────────────────────────
const SOURCES = {
  config: path.join(PKG_ROOT, 'site', 'config.yml'),
  content: path.join(PKG_ROOT, 'content'),
  posts: path.join(PKG_ROOT, 'site', 'content', 'posts'),
  pages: path.join(PKG_ROOT, 'site', 'content', 'pages'),
  data: path.join(PKG_ROOT, 'site', 'content', 'data'),
  assets: path.join(PKG_ROOT, 'assets'),
};

function copyExampleContent(overwrite) {
  // Config
  if (exists(SOURCES.config)) {
    const dest = path.join(SITE_DIR, 'config.yml');
    if (overwrite || !exists(dest)) {
      fs.copyFileSync(SOURCES.config, dest);
    }
  }

  // Content (posts, pages, data)
  if (exists(SOURCES.posts)) {
    copyRecursive(SOURCES.posts, path.join(SITE_DIR, 'content', 'posts'), overwrite);
  }
  if (exists(SOURCES.pages)) {
    copyRecursive(SOURCES.pages, path.join(SITE_DIR, 'content', 'pages'), overwrite);
  }
  if (exists(SOURCES.data)) {
    copyRecursive(SOURCES.data, path.join(SITE_DIR, 'content', 'data'), overwrite);
  }

  // Assets
  if (exists(SOURCES.assets)) {
    copyRecursive(SOURCES.assets, path.join(SITE_DIR, 'assets'), overwrite);
  }

  // Custom themes dir
  ensureDir(path.join(SITE_DIR, 'themes', 'custom'));
}

function showSiteSummary() {
  const posts = countFiles(path.join(SITE_DIR, 'content', 'posts'));
  const pages = countFiles(path.join(SITE_DIR, 'content', 'pages'));
  const data = countFiles(path.join(SITE_DIR, 'content', 'data'));
  const assets = countFiles(path.join(SITE_DIR, 'assets'));
  const hasConfig = exists(path.join(SITE_DIR, 'config.yml'));
  console.log(`  config.yml: ${hasConfig ? 'yes' : 'no'}`);
  console.log(`  posts: ${posts} files`);
  console.log(`  pages: ${pages} files`);
  console.log(`  data: ${data} files`);
  console.log(`  assets: ${assets} files`);
}

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('Static blog workspace initializer');
  console.log('');
  console.log(`Target: ${path.relative(ROOT, SITE_DIR) || '.'}`);
  console.log('');

  const prompt = createPrompt();

  // site/ already exists with content
  if (!isEmptyOrMissing(SITE_DIR)) {
    console.log('site/ already exists:');
    showSiteSummary();
    console.log('');
    console.log('  [1] Sync examples (add missing files, keep existing)');
    console.log('  [2] Overwrite everything');
    console.log('  [3] Cancel');
    console.log('');
    const choice = await ask(prompt, 'Choose [1/2/3]: ');

    if (choice === '3' || choice === 'cancel' || choice === '') {
      prompt.close();
      console.log('\nCancelled.');
      return;
    }

    if (choice === '2' || choice === 'overwrite') {
      const confirm = await ask(prompt, 'This will replace ALL site/ content. Confirm? [y/N]: ');
      if (confirm !== 'y' && confirm !== 'yes') {
        prompt.close();
        console.log('\nCancelled.');
        return;
      }
      removeRecursive(SITE_DIR);
      ensureDir(SITE_DIR);
      copyExampleContent(true);
      prompt.close();
      console.log('\nWorkspace overwritten with example content.');
      showNextSteps();
      return;
    }

    // choice === '1' or 'sync'
    copyExampleContent(false); // don't overwrite existing
    prompt.close();
    console.log('\nExample content synced (existing files preserved).');
    showNextSteps();
    return;
  }

  // site/ doesn't exist — fresh init
  const withExamples = await ask(prompt, 'Initialize with example content? [Y/n]: ');
  const useExamples = withExamples !== 'n' && withExamples !== 'no';

  ensureDir(SITE_DIR);
  ensureDir(path.join(SITE_DIR, 'content', 'posts'));
  ensureDir(path.join(SITE_DIR, 'content', 'pages'));
  ensureDir(path.join(SITE_DIR, 'content', 'data'));
  ensureDir(path.join(SITE_DIR, 'assets'));
  ensureDir(path.join(SITE_DIR, 'themes', 'custom'));

  if (useExamples) {
    copyExampleContent(true);
    prompt.close();
    console.log('\nWorkspace initialized with example content.');
  } else {
    // Copy only config
    if (exists(SOURCES.config)) {
      fs.copyFileSync(SOURCES.config, path.join(SITE_DIR, 'config.yml'));
    }
    prompt.close();
    console.log('\nWorkspace initialized (empty).');
  }

  showNextSteps();
}

function showNextSteps() {
  console.log('');
  console.log('Next steps:');
  console.log('1. Edit site/config.yml');
  console.log('2. Write posts in site/content/posts/');
  console.log('3. Run node build.js');
  console.log('4. Run node serve.js');
  console.log('');
}

main().catch((error) => {
  console.error(`\nInitialization failed: ${error.message}`);
  process.exitCode = 1;
});
