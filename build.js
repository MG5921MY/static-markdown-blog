/**
 * 博客构建脚本
 * - 支持主题系统
 * - 生成站点配置
 * - 扫描文章索引
 * 
 * 使用方法：node build.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 路径配置
const CONFIG_PATH = './conf/config.yml';
const OUTPUT_DIR = './posts';
const THEMES_DIR = './usr/themes';

/**
 * 生成短 hash ID
 */
function generateId(str) {
  return crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
}

/**
 * 简单 YAML 解析器
 */
function parseYaml(content) {
  const result = {};
  const lines = content.split('\n');
  const stack = [{ obj: result, indent: -1 }];
  let currentArray = null;
  let currentArrayKey = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const indent = line.search(/\S/);
    
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      
      if (value.includes(':')) {
        const obj = {};
        const colonIdx = value.indexOf(':');
        const key = value.slice(0, colonIdx).trim();
        const val = value.slice(colonIdx + 1).trim();
        obj[key] = parseValue(val);
        
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextTrimmed = nextLine.trim();
          const nextIndent = nextLine.search(/\S/);
          
          if (!nextTrimmed || nextTrimmed.startsWith('#')) { j++; continue; }
          if (nextIndent <= indent || nextTrimmed.startsWith('- ')) break;
          
          if (nextTrimmed.includes(':')) {
            const ci = nextTrimmed.indexOf(':');
            const k = nextTrimmed.slice(0, ci).trim();
            const v = nextTrimmed.slice(ci + 1).trim();
            obj[k] = parseValue(v);
          }
          j++;
        }
        i = j - 1;
        
        if (currentArray) currentArray.push(obj);
      } else {
        if (currentArray) currentArray.push(parseValue(value));
      }
      continue;
    }
    
    if (trimmed.includes(':')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      
      const current = stack[stack.length - 1].obj;
      
      if (value === '' || value === '|' || value === '>') {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim().startsWith('-')) {
          current[key] = [];
          currentArray = current[key];
          currentArrayKey = key;
        } else {
          current[key] = {};
          stack.push({ obj: current[key], indent });
          currentArray = null;
        }
      } else {
        current[key] = parseValue(value);
        currentArray = null;
      }
    }
  }
  
  return result;
}

function parseValue(value) {
  if (!value) return '';
  
  const commentIndex = value.indexOf(' #');
  if (commentIndex > 0) value = value.slice(0, commentIndex).trim();
  
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  
  return value;
}

/**
 * 解析 Front Matter
 */
function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (match) {
    try {
      const meta = parseYaml(match[1]);
      const body = content.slice(match[0].length).trim();
      return { meta, body };
    } catch (e) {
      return { meta: {}, body: content };
    }
  }
  return { meta: {}, body: content };
}

/**
 * 安全路径验证
 */
function isPathSafe(filePath, basePath) {
  const resolved = path.resolve(basePath, filePath);
  const resolvedBase = path.resolve(basePath);
  return resolved.startsWith(resolvedBase);
}

/**
 * 检查是否排除
 */
function isExcluded(filePath, excludePatterns) {
  const fileName = path.basename(filePath);
  for (const pattern of excludePatterns) {
    if (pattern.startsWith('_') && fileName.startsWith('_')) return true;
    if (pattern.endsWith('/*')) {
      const dir = pattern.slice(0, -2);
      if (filePath.includes(dir + '/') || filePath.includes(dir + '\\')) return true;
    }
    if (fileName === pattern) return true;
  }
  return false;
}

/**
 * 递归扫描目录
 * @param {boolean} collectGroups - 是否收集分组（tree模式）
 * @param {string} groupPath - 当前分组路径（相对于分类根目录）
 */
function scanDirectory(dirPath, basePath, currentDepth, maxDepth, excludePatterns, categoryId, collectGroups = false, groupPath = '') {
  const results = [];
  const groups = {};
  
  if (maxDepth !== -1 && currentDepth > maxDepth) return { posts: results, groups };
  if (!fs.existsSync(dirPath)) {
    console.warn(`  ⚠️ 目录不存在: ${dirPath}`);
    return { posts: results, groups };
  }
  
  const items = fs.readdirSync(dirPath);
  const currentDirPosts = []; // 当前目录直接包含的文章
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
    
    if (!isPathSafe(fullPath, basePath)) continue;
    if (isExcluded(relativePath, excludePatterns)) continue;
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // 计算子目录的分组路径
      const subGroupPath = groupPath ? `${groupPath}/${item}` : item;
      
      const subResult = scanDirectory(
        fullPath, basePath, currentDepth + 1, maxDepth, 
        excludePatterns, categoryId, collectGroups, subGroupPath
      );
      
      // 收集子目录的文章和分组
      results.push(...subResult.posts);
      Object.assign(groups, subResult.groups);
      
    } else if (stat.isFile() && item.endsWith('.md')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const { meta, body } = parseFrontMatter(content);
        
        const uniqueKey = `${categoryId}:${relativePath}`;
        const id = generateId(uniqueKey);
        
        let summary = meta.summary || '';
        if (!summary && body) {
          const plainText = body
            // 移除标题
            .replace(/^#+\s+.*/gm, '')
            // 移除代码块
            .replace(/```[\s\S]*?```/g, '')
            // 移除行内代码
            .replace(/`[^`]+`/g, '')
            // 移除链接，保留文字
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // 移除图片
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
            // 移除粗体/斜体/删除线
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            .replace(/~~([^~]+)~~/g, '$1')
            // 移除引用标记
            .replace(/^>\s*/gm, '')
            // 移除列表标记
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            // 移除水平线
            .replace(/^[-*_]{3,}$/gm, '')
            // 移除表格分隔符
            .replace(/\|/g, ' ')
            .replace(/^[-:|\s]+$/gm, '')
            // 清理多余空白
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          summary = plainText.slice(0, 150) + (plainText.length > 150 ? '...' : '');
        }
        
        let tags = meta.tags || [];
        if (typeof tags === 'string') {
          const m = tags.match(/\[(.*)\]/);
          tags = m ? m[1].split(',').map(t => t.trim()) : [tags];
        }
        
        const post = {
          id,
          _file: relativePath,
          _groupPath: groupPath || null,  // 所属分组路径（空字符串表示根目录）
          title: meta.title || item.replace('.md', ''),
          date: meta.date ? formatDate(meta.date) : null,
          tags,
          summary,
          _sortDate: meta.date ? new Date(meta.date).getTime() : 0
        };
        
        results.push(post);
        currentDirPosts.push(post);
      } catch (e) {
        console.warn(`  ⚠️ 读取失败: ${fullPath}`, e.message);
      }
    }
  }
  
  // tree 模式：如果当前目录有文章，创建分组
  if (collectGroups && groupPath && currentDirPosts.length > 0) {
    const dirName = path.basename(groupPath);
    groups[groupPath] = {
      name: groupPath,
      displayName: dirName,
      depth: (groupPath.match(/\//g) || []).length,
      posts: currentDirPosts
    };
  }
  
  return { posts: results, groups };
}

function formatDate(date) {
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return String(date);
}

function resolvePath(configPath, basePath) {
  if (path.isAbsolute(configPath)) return configPath;
  return path.join(basePath, configPath);
}

/**
 * 扫描可用主题
 */
function scanThemes() {
  const themes = [];
  
  if (!fs.existsSync(THEMES_DIR)) {
    console.warn(`⚠️ 主题目录不存在: ${THEMES_DIR}`);
    return themes;
  }
  
  const items = fs.readdirSync(THEMES_DIR);
  
  for (const item of items) {
    const themePath = path.join(THEMES_DIR, item);
    const stat = fs.statSync(themePath);
    
    if (stat.isDirectory()) {
      const stylePath = path.join(themePath, 'style.css');
      const infoPath = path.join(themePath, 'theme.yml');
      
      if (fs.existsSync(stylePath)) {
        let info = { name: item, version: '1.0.0', author: 'Unknown', description: '' };
        
        if (fs.existsSync(infoPath)) {
          try {
            const infoContent = fs.readFileSync(infoPath, 'utf8');
            info = { ...info, ...parseYaml(infoContent) };
          } catch (e) {}
        }
        
        themes.push({
          id: item,
          ...info,
          path: `usr/themes/${item}`
        });
      }
    }
  }
  
  return themes;
}

/**
 * 主函数
 */
function build() {
  console.log('🚀 开始构建博客...\n');
  
  // 检查配置文件
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`❌ 配置文件不存在: ${CONFIG_PATH}`);
    process.exit(1);
  }
  
  const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = parseYaml(configContent);
  
  const scanConfig = config.scan || {};
  const maxDepth = scanConfig.maxDepth !== undefined ? scanConfig.maxDepth : 2;
  const excludePatterns = scanConfig.exclude || [];
  
  // 扫描主题
  console.log('🎨 扫描主题...');
  const themes = scanThemes();
  themes.forEach(t => console.log(`   ✅ ${t.name} (${t.id})`));
  
  // 验证当前主题
  const activeTheme = config.theme?.active || 'default';
  const themeExists = themes.some(t => t.id === activeTheme);
  if (!themeExists && themes.length > 0) {
    console.warn(`⚠️ 主题 "${activeTheme}" 不存在，将使用 "${themes[0].id}"`);
  }
  
  console.log(`\n📁 扫描文章 (深度: ${maxDepth === -1 ? '无限' : maxDepth})...`);
  
  const siteRoot = path.dirname(path.resolve(CONFIG_PATH));
  
  // 公开索引
  const publicIndex = {
    generated: new Date().toISOString(),
    categories: {}
  };
  
  // 路径映射
  const pathMap = {};
  
  let totalPosts = 0;
  const categories = config.categories || [];
  
  for (const category of categories) {
    const categoryPath = resolvePath(category.path, path.dirname(siteRoot));
    const displayType = category.type || 'flat';
    
    console.log(`   📂 ${category.name} (${category.path}) [${displayType}]`);
    
    const isTree = displayType === 'tree';
    const { posts, groups } = scanDirectory(categoryPath, categoryPath, 0, maxDepth, excludePatterns, category.id, isTree, '');
    posts.sort((a, b) => (b._sortDate || 0) - (a._sortDate || 0));
    
    // 处理分组内的排序
    if (isTree) {
      for (const groupPath of Object.keys(groups)) {
        groups[groupPath].posts.sort((a, b) => (b._sortDate || 0) - (a._sortDate || 0));
      }
    }
    
    const publicPosts = posts.map(p => {
      pathMap[p.id] = { category: category.id, file: p._file };
      return { id: p.id, title: p.title, date: p.date, tags: p.tags, summary: p.summary, groupPath: p._groupPath };
    });
    
    // 处理分组数据
    const publicGroups = {};
    for (const [groupPath, groupData] of Object.entries(groups)) {
      publicGroups[groupPath] = {
        name: groupData.name,
        displayName: groupData.displayName,
        depth: groupData.depth,
        posts: groupData.posts.map(p => {
          pathMap[p.id] = { category: category.id, file: p._file };
          return { id: p.id, title: p.title, date: p.date, tags: p.tags, summary: p.summary };
        })
      };
    }
    
    publicIndex.categories[category.id] = {
      name: category.name,
      icon: category.icon,
      path: category.id,
      description: category.description,
      type: displayType,
      posts: publicPosts,
      groups: isTree ? publicGroups : undefined
    };
    
    const groupCount = Object.keys(groups).length;
    console.log(`      找到 ${posts.length} 篇文章${groupCount > 0 ? ` (${groupCount} 个分组)` : ''}`);
    totalPosts += posts.length;
  }
  
  // 生成站点配置（供前端使用）
  const siteConfig = {
    site: config.site || {},
    theme: {
      active: themeExists ? activeTheme : (themes[0]?.id || 'default'),
      available: themes,
      config: config.theme?.config || {}
    },
    beian: config.beian || { enabled: false },
    nav: config.nav || [],
    display: config.display || {}
  };
  
  // 处理自定义页面
  console.log('\n📄 处理自定义页面...');
  const pages = config.pages || [];
  const pagesData = {};
  
  for (const page of pages) {
    if (!page.id) continue;
    
    const pageData = {
      id: page.id,
      name: page.name || page.id,
      icon: page.icon || '',
      description: page.description || '',
      type: page.type || 'html'
    };
    
    if (page.type === 'markdown' && page.source) {
      // 读取 md 文件
      const mdPath = page.source;
      if (fs.existsSync(mdPath)) {
        try {
          const content = fs.readFileSync(mdPath, 'utf8');
          const { meta, body } = parseFrontMatter(content);
          pageData.title = meta.title || page.name;
          pageData.content = body;
          pageData.source = mdPath;
          console.log(`   ✅ ${page.name} (markdown: ${mdPath})`);
        } catch (e) {
          console.warn(`   ⚠️ 读取失败: ${mdPath}`);
          pageData.content = '';
        }
      } else {
        console.warn(`   ⚠️ 文件不存在: ${mdPath}`);
        pageData.content = '';
      }
    } else if (page.type === 'category' && page.categoryId) {
      // 绑定分类
      pageData.categoryId = page.categoryId;
      const cat = publicIndex.categories[page.categoryId];
      if (cat) {
        console.log(`   ✅ ${page.name} (category: ${page.categoryId})`);
      } else {
        console.warn(`   ⚠️ 分类不存在: ${page.categoryId}`);
      }
    } else if (page.type === 'html') {
      // 自定义 HTML
      pageData.content = page.content || '';
      console.log(`   ✅ ${page.name} (html)`);
    }
    
    pagesData[page.id] = pageData;
  }
  
  siteConfig.pages = pagesData;
  
  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 写入文件
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(publicIndex, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, '_pathmap.json'), JSON.stringify(pathMap, null, 2), 'utf8');
  fs.writeFileSync('./site-config.json', JSON.stringify(siteConfig, null, 2), 'utf8');
  
  console.log(`\n✨ 构建完成！`);
  console.log(`   📄 文章: ${totalPosts} 篇`);
  console.log(`   📑 页面: ${Object.keys(pagesData).length} 个`);
  console.log(`   🎨 主题: ${themes.length} 个 (当前: ${siteConfig.theme.active})`);
  console.log(`   📁 输出: posts/index.json, site-config.json`);
}

build();
