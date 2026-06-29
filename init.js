const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const PKG_ROOT = __dirname;
const SITE_DIR = path.join(ROOT, 'site');

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
  const answer = await ask(prompt, 'Overwrite site data? [y/N]: ');
  return answer === 'y' || answer === 'yes';
}

async function main() {
  console.log('');
  console.log('Static blog workspace initializer');
  console.log('');
  console.log(`Target  : ${path.relative(ROOT, SITE_DIR)}`);
  console.log('');

  const prompt = createPrompt();
  const start = await ask(prompt, 'Initialize site/? [Y/n]: ');
  if (start === 'n' || start === 'no') {
    prompt.close();
    console.log('\nInitialization cancelled.');
    return;
  }

  if (isMeaningfulDirectory(SITE_DIR)) {
    const confirmed = await confirmOverwrite(prompt, SITE_DIR);
    if (!confirmed) {
      prompt.close();
      console.log('\nInitialization cancelled.');
      return;
    }
    removeRecursive(SITE_DIR);
  }

  ensureDir(SITE_DIR);
  ensureDir(path.join(SITE_DIR, 'content', 'posts'));
  ensureDir(path.join(SITE_DIR, 'content', 'pages'));
  ensureDir(path.join(SITE_DIR, 'content', 'data'));
  ensureDir(path.join(SITE_DIR, 'assets'));
  ensureDir(path.join(SITE_DIR, 'themes', 'custom'));

  // Copy default config from package if available
  const defaultConfig = path.join(PKG_ROOT, 'site', 'config.yml');
  if (exists(defaultConfig)) {
    fs.copyFileSync(defaultConfig, path.join(SITE_DIR, 'config.yml'));
  }

  prompt.close();

  console.log('\nWorkspace initialized.');
  console.log('Next steps:');
  console.log('1. Edit site/config.yml');
  console.log('2. Add posts under site/content/posts/');
  console.log('3. Run node build.js');
  console.log('4. Run node serve.js');
  console.log('');
}

main().catch((error) => {
  console.error(`\nInitialization failed: ${error.message}`);
  process.exitCode = 1;
});
