#!/usr/bin/env node
/**
 * 零依赖代码检查（语法 + 引用完整性 + 调试残留）
 *
 * 设计原则：
 * - 不引入任何 npm 依赖（项目零依赖约束）
 * - 三层检查：语法（node --check）/ 相对引用存在性 / debugger 残留
 * - 任一失败以非零退出码结束，可接入 CI 与本地 `npm run check`
 *
 * 用法：node scripts/check.js  （或 npm run check）
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/** 检查范围：根目录入口脚本 + src/ 全部模块 + scripts/ 自身 */
const ROOT_SCRIPTS = ['build.js', 'serve.js', 'init.js', 'test.js'];
const SCAN_DIRS = ['src', 'scripts'];

/** 收集全部待检查的 .js 文件（绝对路径） */
function collectJsFiles() {
  const files = [];
  for (const name of ROOT_SCRIPTS) {
    const filePath = path.join(ROOT, name);
    if (fs.existsSync(filePath)) files.push(filePath);
  }
  for (const dir of SCAN_DIRS) {
    const base = path.join(ROOT, dir);
    if (!fs.existsSync(base)) continue;
    walk(base, files);
  }
  return files;
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
}

/** 层 1：语法检查（node --check，子进程隔离，不影响本进程） */
function checkSyntax(files) {
  const problems = [];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      const message = (result.stderr || '').split('\n').slice(0, 3).join('\n').trim();
      problems.push({ file, message });
    }
  }
  return problems;
}

/**
 * 层 2：相对引用存在性（require 的 ./ 路径必须可解析）。
 * 仅检查静态字符串字面量；动态路径（模板字符串/变量）自动跳过；
 * 纯注释行（// 与块注释 * 开头）不参与扫描，避免示例文本误报。
 */
const RELATIVE_REQUIRE_RE = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function checkRelativeRequires(files) {
  const problems = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const code = source
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*');
      })
      .join('\n');
    RELATIVE_REQUIRE_RE.lastIndex = 0;
    let match;
    while ((match = RELATIVE_REQUIRE_RE.exec(code)) !== null) {
      const target = path.resolve(path.dirname(file), match[1]);
      if (!isResolvable(target)) {
        problems.push({
          file,
          message: `相对引用无法解析: ${match[1]}`,
        });
      }
    }
  }
  return problems;
}

/** 尝试补全 .js / .json / index.js 后缀判断目标是否存在 */
function isResolvable(target) {
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return true;
  for (const suffix of ['.js', '.json', '/index.js', '/index.json']) {
    if (fs.existsSync(target + suffix)) return true;
  }
  return false;
}

/** 层 3：debugger 残留（明确的调试断点，必须清除） */
function checkDebuggerStatements(files) {
  const problems = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (/^\s*debugger\s*;?\s*$/.test(line)) {
        problems.push({ file, message: `第 ${index + 1} 行存在 debugger 语句` });
      }
    });
  }
  return problems;
}

function main() {
  const t0 = Date.now();
  const files = collectJsFiles();
  console.log(`check: 扫描 ${files.length} 个 JS 文件\n`);

  const syntaxProblems = checkSyntax(files);
  const requireProblems = checkRelativeRequires(files);
  const debuggerProblems = checkDebuggerStatements(files);
  const problems = [...syntaxProblems, ...requireProblems, ...debuggerProblems];

  if (problems.length === 0) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`✅ 全部通过（语法 / 相对引用 / debugger 残留）— ${elapsed}s`);
    return;
  }

  console.error(`❌ 发现 ${problems.length} 个问题：\n`);
  for (const problem of problems) {
    const rel = path.relative(ROOT, problem.file);
    console.error(`  ${rel}: ${problem.message}`);
  }
  process.exitCode = 1;
}

main();
