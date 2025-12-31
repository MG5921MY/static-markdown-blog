/**
 * 项目初始化脚本
 * 将 xxx-example 目录/文件复制到 xxx
 * 
 * 使用方法：node init.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 需要处理的映射关系
const MAPPINGS = [
  // 配置文件（从 conf-example 复制到 conf）
  { from: 'conf-example/config.yml.example', to: 'conf/config.yml', type: 'file' },
  { from: 'conf-example/moments.yml.example', to: 'conf/moments.yml', type: 'file' },
  { from: 'conf-example/links.yml.example', to: 'conf/links.yml', type: 'file' },
  { from: 'conf-example/gallery.yml.example', to: 'conf/gallery.yml', type: 'file' },
  // 内容目录
  { from: 'posts-example', to: 'posts', type: 'dir' },
  { from: 'pages-example', to: 'pages', type: 'dir' },
  { from: 'assets-example', to: 'assets', type: 'dir' },
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// 创建 readline 接口
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// 询问用户
function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

// 三次确认覆盖
async function confirmOverwrite(rl, targetPath) {
  log(`\n⚠️  目标已存在: ${targetPath}`, 'yellow');
  
  for (let i = 1; i <= 3; i++) {
    const answer = await ask(rl, `   确认覆盖？(${i}/3) [y/N]: `);
    if (answer !== 'y' && answer !== 'yes') {
      log(`   ❌ 取消覆盖`, 'red');
      return false;
    }
    if (i < 3) {
      log(`   ⚠️  再次确认...`, 'yellow');
    }
  }
  
  log(`   ✅ 确认覆盖`, 'green');
  return true;
}

// 递归复制目录
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  
  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制文件
function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(src, dest);
  return true;
}

// 检查目标是否存在
function targetExists(target, type) {
  if (!fs.existsSync(target)) return false;
  
  if (type === 'dir') {
    // 目录存在且非空
    return fs.readdirSync(target).length > 0;
  }
  return true;
}

// 删除目录
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 主函数
async function main() {
  console.log('');
  log('╔════════════════════════════════════════╗', 'cyan');
  log('║       静态博客 - 项目初始化脚本        ║', 'cyan');
  log('╚════════════════════════════════════════╝', 'cyan');
  console.log('');
  log('此脚本将复制示例文件到工作目录：', 'cyan');
  console.log('');
  
  for (const m of MAPPINGS) {
    console.log(`   ${m.from} → ${m.to}`);
  }
  console.log('');
  
  const rl = createRL();
  
  // 首次确认
  const startAnswer = await ask(rl, '是否开始初始化？[Y/n]: ');
  if (startAnswer === 'n' || startAnswer === 'no') {
    log('\n已取消初始化', 'yellow');
    rl.close();
    return;
  }
  
  console.log('');
  let successCount = 0;
  let skipCount = 0;
  
  for (const mapping of MAPPINGS) {
    const { from, to, type } = mapping;
    
    log(`📦 处理: ${from} → ${to}`, 'cyan');
    
    // 检查源是否存在
    if (!fs.existsSync(from)) {
      log(`   ⚠️  源不存在，跳过`, 'yellow');
      skipCount++;
      continue;
    }
    
    // 检查目标是否存在
    if (targetExists(to, type)) {
      const confirmed = await confirmOverwrite(rl, to);
      if (!confirmed) {
        skipCount++;
        continue;
      }
      
      // 删除旧目标
      if (type === 'dir') {
        removeDir(to);
      }
    }
    
    // 执行复制
    try {
      if (type === 'dir') {
        copyDir(from, to);
      } else {
        copyFile(from, to);
      }
      log(`   ✅ 完成`, 'green');
      successCount++;
    } catch (e) {
      log(`   ❌ 失败: ${e.message}`, 'red');
    }
  }
  
  rl.close();
  
  console.log('');
  log('════════════════════════════════════════', 'cyan');
  log(`初始化完成！成功: ${successCount}, 跳过: ${skipCount}`, 'green');
  console.log('');
  log('下一步：', 'cyan');
  console.log('   1. 编辑 conf/config.yml 配置站点信息');
  console.log('   2. 在 posts/ 目录添加文章');
  console.log('   3. 运行 node build.js 构建索引');
  console.log('   4. 运行 node serve.js 启动本地预览');
  console.log('');
}

main().catch(console.error);
