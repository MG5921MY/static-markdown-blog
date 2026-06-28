const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const PKG_ROOT = __dirname;
const STARTER_DIR = path.join(PKG_ROOT, 'examples', 'starter-modern', 'site');
const ROOT_CONTENT = path.join(PKG_ROOT, 'content');
const ROOT_ASSETS = path.join(PKG_ROOT, 'assets');
const TARGET_DIR = path.join(ROOT, 'workspace', 'site');

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function listEntries(targetPath) {
  if (!exists(targetPath)) return [];
  return fs.readdirSync(targetPath).filter((name) => name !== '.gitkeep');
}

function isMeaningfulDirectory(targetPath) {
  return listEntries(targetPath).length > 0;
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

function removeRecursive(targetPath) {
  if (exists(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function ask(prompt, question) {
  return new Promise((resolve) => {
    prompt.question(question, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

async function confirmOverwrite(prompt, targetPath) {
  console.log(`\nTarget already has content: ${targetPath}`);
  const answer = await ask(prompt, 'Overwrite workspace data? [y/N]: ');
  return answer === 'y' || answer === 'yes';
}

async function main() {
  console.log('');
  console.log('Static blog workspace initializer');
  console.log('');
  console.log(`Starter : ${path.relative(ROOT, STARTER_DIR)}`);
  console.log(`Content : ${path.relative(ROOT, ROOT_CONTENT)}`);
  console.log(`Assets  : ${path.relative(ROOT, ROOT_ASSETS)}`);
  console.log(`Target  : ${path.relative(ROOT, TARGET_DIR)}`);
  console.log('');

  if (!exists(STARTER_DIR)) {
    throw new Error(`Starter site not found: ${STARTER_DIR}`);
  }

  const prompt = createPrompt();
  const start = await ask(prompt, 'Initialize workspace/site? [Y/n]: ');
  if (start === 'n' || start === 'no') {
    prompt.close();
    console.log('\nInitialization cancelled.');
    return;
  }

  if (isMeaningfulDirectory(TARGET_DIR)) {
    const confirmed = await confirmOverwrite(prompt, TARGET_DIR);
    if (!confirmed) {
      prompt.close();
      console.log('\nInitialization cancelled.');
      return;
    }
    removeRecursive(TARGET_DIR);
  }

  ensureDir(TARGET_DIR);

  // Copy starter (config + custom themes)
  copyRecursive(STARTER_DIR, TARGET_DIR);

  // Copy repo baseline content and assets
  if (exists(ROOT_CONTENT)) copyRecursive(ROOT_CONTENT, path.join(TARGET_DIR, 'content'));
  if (exists(ROOT_ASSETS)) copyRecursive(ROOT_ASSETS, path.join(TARGET_DIR, 'assets'));

  prompt.close();

  console.log('\nWorkspace initialized.');
  console.log('Next steps:');
  console.log('1. Edit workspace/site/config/blog.config.yml');
  console.log('2. Add posts under workspace/site/content/posts/');
  console.log('3. Run node build.js');
  console.log('4. Run node serve.js');
  console.log('');
}

main().catch((error) => {
  console.error(`\nInitialization failed: ${error.message}`);
  process.exitCode = 1;
});
