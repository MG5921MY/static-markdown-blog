/**
 * 备份脚本 - 支持多种命名方案
 * 
 * 使用方法：
 *   node backup.js              # 默认使用 V1, V2, V3... 递增版本号
 *   node backup.js --mode=ts    # 使用时间戳 (1735600000000)
 *   node backup.js --mode=date  # 使用日期格式 (2025-01-01-120000)
 *   node backup.js --mode=iso   # 使用 ISO 格式 (2025-01-01T12-00-00)
 *   node backup.js --name=xxx   # 自定义名称
 *   node backup.js --help       # 显示帮助
 */

const fs = require('fs');
const path = require('path');

const OLD_DIR = './old';

// 需要备份的文件列表
const BACKUP_FILES = [
  'index.html',
  'about.html',
  'disclaimer.html',
  '404.html',
  'post.html',
  'page.html',
  'blog.js',
  'build.js',
  'backup.js'
];

// 需要备份的目录列表
const BACKUP_DIRS = [
  'posts',
  'pages',
  'conf',
  'usr',
  'assets'
];

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = { mode: 'version', name: null };
  
  for (const arg of process.argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
    if (arg.startsWith('--mode=')) {
      args.mode = arg.slice(7);
    }
    if (arg.startsWith('--name=')) {
      args.name = arg.slice(7);
    }
  }
  
  return args;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📦 备份脚本 - 使用说明

用法: node backup.js [选项]

选项:
  --mode=<模式>    设置备份目录命名模式
  --name=<名称>    自定义备份目录名称
  --help, -h       显示此帮助信息

命名模式:
  version  (默认) 递增版本号: V1, V2, V3...
  ts       时间戳: 1735600000000
  date     日期时间: 2025-01-01-120000
  iso      ISO格式: 2025-01-01T12-00-00
  compact  紧凑格式: 20250101120000

示例:
  node backup.js                    # V1, V2, V3...
  node backup.js --mode=date        # 2025-01-01-120000
  node backup.js --mode=ts          # 1735600000000
  node backup.js --name=release-1.0 # release-1.0
`);
}

/**
 * 获取下一个版本号
 */
function getNextVersion() {
  if (!fs.existsSync(OLD_DIR)) return 1;

  const dirs = fs.readdirSync(OLD_DIR)
    .filter(name => /^V\d+$/.test(name))
    .map(name => parseInt(name.slice(1), 10))
    .sort((a, b) => b - a);

  return dirs.length > 0 ? dirs[0] + 1 : 1;
}

/**
 * 格式化日期
 */
function formatDate(date, format) {
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  
  const y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const H = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  
  switch (format) {
    case 'ts':
      return String(date.getTime());
    case 'date':
      return `${y}-${M}-${d}-${H}${m}${s}`;
    case 'iso':
      return `${y}-${M}-${d}T${H}-${m}-${s}`;
    case 'compact':
      return `${y}${M}${d}${H}${m}${s}`;
    default:
      return `${y}-${M}-${d}-${H}${m}${s}`;
  }
}

/**
 * 生成备份目录名称
 */
function generateBackupName(args) {
  // 自定义名称优先
  if (args.name) {
    // 安全检查：只允许字母、数字、下划线、连字符、点
    if (!/^[\w\-\.]+$/.test(args.name)) {
      console.error('❌ 无效的名称，只允许字母、数字、下划线、连字符、点');
      process.exit(1);
    }
    return args.name;
  }
  
  const now = new Date();
  
  switch (args.mode) {
    case 'version':
      return `V${getNextVersion()}`;
    case 'ts':
    case 'date':
    case 'iso':
    case 'compact':
      return formatDate(now, args.mode);
    default:
      console.warn(`⚠️ 未知模式 "${args.mode}"，使用默认版本号模式`);
      return `V${getNextVersion()}`;
  }
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  return true;
}

/**
 * 递归复制目录
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

/**
 * 主函数
 */
function backup() {
  const args = parseArgs();
  const backupName = generateBackupName(args);
  const backupDir = path.join(OLD_DIR, backupName);

  // 检查是否已存在
  if (fs.existsSync(backupDir)) {
    console.error(`❌ 备份目录已存在: ${backupDir}`);
    process.exit(1);
  }

  console.log(`📦 创建备份: ${backupDir}\n`);

  fs.mkdirSync(backupDir, { recursive: true });

  let fileCount = 0;
  let dirCount = 0;

  // 备份文件
  for (const file of BACKUP_FILES) {
    if (copyFile(file, path.join(backupDir, file))) {
      console.log(`   ✅ ${file}`);
      fileCount++;
    }
  }

  // 备份目录
  for (const dir of BACKUP_DIRS) {
    if (copyDir(dir, path.join(backupDir, dir))) {
      console.log(`   ✅ ${dir}/`);
      dirCount++;
    }
  }

  console.log(`\n✨ 备份完成！`);
  console.log(`   📄 文件: ${fileCount} 个`);
  console.log(`   📁 目录: ${dirCount} 个`);
  console.log(`   📍 位置: ${backupDir}`);
}

backup();
