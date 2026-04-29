const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, 'examples', 'starter-modern', 'site');
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
  for (let i = 1; i <= 3; i += 1) {
    const answer = await ask(prompt, `Overwrite workspace data? (${i}/3) [y/N]: `);
    if (answer !== 'y' && answer !== 'yes') return false;
  }
  return true;
}

async function main() {
  console.log('');
  console.log('Static blog workspace initializer');
  console.log('');
  console.log(`Source : ${path.relative(ROOT, SOURCE_DIR)}`);
  console.log(`Target : ${path.relative(ROOT, TARGET_DIR)}`);
  console.log('');

  if (!exists(SOURCE_DIR)) {
    throw new Error(`Starter site not found: ${SOURCE_DIR}`);
  }

  const prompt = createPrompt();
  const start = await ask(prompt, 'Initialize workspace/site from the modern starter? [Y/n]: ');
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
  copyRecursive(SOURCE_DIR, TARGET_DIR);

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
