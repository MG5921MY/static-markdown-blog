const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const LEGACY_CANDIDATES = [
  path.join(ROOT, 'legacy', 'site'),
  ROOT
];
const WORKSPACE_SITE_DIR = path.join(ROOT, 'workspace', 'site');
const OUTPUT_DIR = path.join(ROOT, 'output');
const REPORT_PATH = path.join(OUTPUT_DIR, 'legacy-migration-report.json');

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value, 'utf8');
}

function copyRecursive(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return;
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

function parseYaml(content) {
  const root = {};
  const lines = content.replace(/\r/g, '').split('\n');
  const stack = [{ indent: -1, value: root }];

  function parseScalar(raw) {
    if (raw === undefined || raw === null) return '';
    let value = String(raw).trim();
    const commentIndex = value.indexOf(' #');
    if (commentIndex > 0) value = value.slice(0, commentIndex).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (/^-?\d+$/.test(value)) return Number(value);
    if (/^-?\d+\.\d+$/.test(value)) return Number(value);
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',').map((item) => parseScalar(item));
    }
    return value;
  }

  function nextUsefulLine(index) {
    for (let i = index + 1; i < lines.length; i += 1) {
      const text = lines[i].trim();
      if (!text || text.startsWith('#')) continue;
      return { index: i, text, indent: lines[i].search(/\S/) };
    }
    return null;
  }

  function readBlockScalar(startIndex, parentIndent) {
    const chunks = [];
    let lastIndex = startIndex;

    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const rawLine = lines[i];
      const trimmedLine = rawLine.trim();
      const lineIndent = rawLine.search(/\S/);

      if (!trimmedLine) {
        if (chunks.length > 0) chunks.push('');
        lastIndex = i;
        continue;
      }

      if (trimmedLine.startsWith('#') && lineIndent > parentIndent) {
        lastIndex = i;
        continue;
      }

      if (lineIndent <= parentIndent) break;

      const sliceIndex = Math.min(rawLine.length, parentIndent + 2);
      chunks.push(rawLine.slice(sliceIndex));
      lastIndex = i;
    }

    return {
      value: chunks.join('\n').replace(/\n+$/, ''),
      nextIndex: lastIndex
    };
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = line.search(/\S/);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (trimmed.startsWith('- ')) {
      if (!Array.isArray(parent)) continue;
      const itemText = trimmed.slice(2).trim();
      if (!itemText) {
        const next = nextUsefulLine(i);
        const child = next && next.indent > indent && next.text.startsWith('- ') ? [] : {};
        parent.push(child);
        stack.push({ indent, value: child });
        continue;
      }

      if (itemText.includes(':')) {
        const colonIndex = itemText.indexOf(':');
        const key = itemText.slice(0, colonIndex).trim();
        const rawValue = itemText.slice(colonIndex + 1).trim();
        const item = {};
        if (rawValue) {
          if (rawValue === '|' || rawValue === '|-' || rawValue === '>') {
            const block = readBlockScalar(i, indent);
            item[key] = block.value;
            i = block.nextIndex;
          } else {
            item[key] = parseScalar(rawValue);
          }
        } else {
          const next = nextUsefulLine(i);
          item[key] = next && next.indent > indent && next.text.startsWith('- ') ? [] : {};
          stack.push({ indent, value: item[key] });
        }
        parent.push(item);
        if (!rawValue) continue;
        stack.push({ indent, value: item });
        continue;
      }

      parent.push(parseScalar(itemText));
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex <= 0) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const rawValue = trimmed.slice(colonIndex + 1).trim();

    if (rawValue) {
      if (rawValue === '|' || rawValue === '|-' || rawValue === '>') {
        const block = readBlockScalar(i, indent);
        parent[key] = block.value;
        i = block.nextIndex;
        continue;
      }
      parent[key] = parseScalar(rawValue);
      continue;
    }

    const next = nextUsefulLine(i);
    const child = next && next.indent > indent && next.text.startsWith('- ') ? [] : {};
    parent[key] = child;
    stack.push({ indent, value: child });
  }

  return root;
}

function yamlScalar(value) {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  const text = String(value);
  if (text === '') return '""';
  if (/^[A-Za-z0-9._/@:-]+$/.test(text)) return text;
  return JSON.stringify(text);
}

function stringifyYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const entries = Object.entries(item);
        if (entries.length === 0) return `${pad}- {}`;
        const [firstKey, firstValue] = entries[0];
        const lines = [];
        if (firstValue && typeof firstValue === 'object') {
          lines.push(`${pad}- ${firstKey}:`);
          lines.push(stringifyYaml(firstValue, indent + 4));
        } else {
          lines.push(`${pad}- ${firstKey}: ${yamlScalar(firstValue)}`);
        }
        for (const [key, childValue] of entries.slice(1)) {
          if (childValue && typeof childValue === 'object') {
            lines.push(`${' '.repeat(indent + 2)}${key}:`);
            lines.push(stringifyYaml(childValue, indent + 4));
          } else {
            lines.push(`${' '.repeat(indent + 2)}${key}: ${yamlScalar(childValue)}`);
          }
        }
        return lines.join('\n');
      }
      return `${pad}- ${yamlScalar(item)}`;
    }).join('\n');
  }

  return Object.entries(value).map(([key, childValue]) => {
    if (childValue && typeof childValue === 'object') {
      const nested = stringifyYaml(childValue, indent + 2);
      return nested ? `${pad}${key}:\n${nested}` : `${pad}${key}: {}`;
    }
    return `${pad}${key}: ${yamlScalar(childValue)}`;
  }).join('\n');
}

function mapLegacyTheme(themeId) {
  const map = {
    default: 'graphite',
    'dark-pro': 'graphite',
    vercel: 'mono',
    stripe: 'aurora',
    notion: 'paper',
    medium: 'paper',
    minimal: 'mono',
    github: 'mono',
    retro: 'mono',
    acid: 'graphite',
    glass: 'aurora'
  };
  return map[themeId] || 'graphite';
}

function normalizePathValue(value, mappings) {
  if (!value) return value;
  const normalized = String(value).replace(/\\/g, '/');
  for (const [fromPrefix, toPrefix] of mappings) {
    if (normalized === fromPrefix) return toPrefix;
    if (normalized.startsWith(`${fromPrefix}/`)) {
      return `${toPrefix}/${normalized.slice(fromPrefix.length + 1)}`;
    }
  }
  return normalized;
}

function normalizeNav(nav) {
  if (!Array.isArray(nav)) return [];
  return nav.map((item) => ({ ...item }));
}

function buildModernConfig(legacyConfig) {
  const legacyPages = Array.isArray(legacyConfig.pages) ? legacyConfig.pages : [];
  const legacyCategories = Array.isArray(legacyConfig.categories) ? legacyConfig.categories : [];
  const features = legacyConfig.features || {};

  return {
    site: {
      ...(legacyConfig.site || {})
    },
    deployment: {
      basePath: 'auto'
    },
    theme: {
      active: mapLegacyTheme(legacyConfig.theme?.active || 'default')
    },
    content: {
      categories: legacyCategories.map((category) => ({
        ...category,
        path: normalizePathValue(category.path, [['posts', 'content/posts']])
      })),
      pages: legacyPages.map((page) => ({
        ...page,
        source: normalizePathValue(page.source, [['pages', 'content/pages']])
      })),
      data: {
        moments: normalizePathValue(features.moments?.source || 'conf/moments.yml', [['conf', 'content/data']]),
        links: normalizePathValue(features.links?.source || 'conf/links.yml', [['conf', 'content/data']]),
        gallery: normalizePathValue(features.gallery?.source || 'conf/gallery.yml', [['conf', 'content/data']])
      }
    },
    nav: normalizeNav(legacyConfig.nav),
    features: {
      moments: {
        enabled: features.moments?.enabled !== false,
        source: normalizePathValue(features.moments?.source || 'conf/moments.yml', [['conf', 'content/data']])
      },
      links: {
        enabled: features.links?.enabled !== false,
        source: normalizePathValue(features.links?.source || 'conf/links.yml', [['conf', 'content/data']])
      },
      gallery: {
        enabled: features.gallery?.enabled !== false,
        source: normalizePathValue(features.gallery?.source || 'conf/gallery.yml', [['conf', 'content/data']])
      }
    },
    display: {
      ...(legacyConfig.display || {})
    },
    beian: {
      ...(legacyConfig.beian || {})
    }
  };
}

function detectLegacyRoot() {
  for (const candidate of LEGACY_CANDIDATES) {
    const configPath = path.join(candidate, 'conf', 'config.yml');
    if (fs.existsSync(configPath)) return candidate;
  }
  throw new Error('No legacy site found. Expected legacy/site/conf/config.yml or conf/config.yml');
}

function safeHash(value) {
  return crypto.createHash('md5').update(value).digest('hex').slice(0, 8);
}

function migrateThemes(legacyRoot, report) {
  const legacyThemesDir = path.join(legacyRoot, 'usr', 'themes');
  const targetThemesDir = path.join(WORKSPACE_SITE_DIR, 'themes', 'custom');
  if (!fs.existsSync(legacyThemesDir)) return;

  for (const entry of fs.readdirSync(legacyThemesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sourceDir = path.join(legacyThemesDir, entry.name);
    const targetDir = path.join(targetThemesDir, entry.name);
    ensureDir(targetDir);

    const legacyStyle = path.join(sourceDir, 'style.css');
    const legacyThemeCss = path.join(sourceDir, 'theme.css');
    const themeCssSource = fs.existsSync(legacyThemeCss) ? legacyThemeCss : legacyStyle;
    if (fs.existsSync(themeCssSource)) {
      copyRecursive(themeCssSource, path.join(targetDir, 'theme.css'));
    }

    const themeMetaSource = path.join(sourceDir, 'theme.yml');
    const themeMetaTarget = path.join(targetDir, 'theme.yml');
    if (fs.existsSync(themeMetaSource)) {
      copyRecursive(themeMetaSource, themeMetaTarget);
    } else {
      writeText(themeMetaTarget, `name: ${entry.name}\nid: ${entry.name}\nversion: 1.0.0\ndescription: "Migrated legacy theme ${entry.name}"\n`);
    }

    report.customThemes.push({
      id: entry.name,
      checksum: safeHash(entry.name)
    });
  }
}

function migrate() {
  const legacyRoot = detectLegacyRoot();
  const legacyConfigPath = path.join(legacyRoot, 'conf', 'config.yml');
  const legacyConfig = parseYaml(readText(legacyConfigPath));
  const modernConfig = buildModernConfig(legacyConfig);

  ensureDir(WORKSPACE_SITE_DIR);
  ensureDir(OUTPUT_DIR);

  copyRecursive(path.join(legacyRoot, 'posts'), path.join(WORKSPACE_SITE_DIR, 'content', 'posts'));
  copyRecursive(path.join(legacyRoot, 'pages'), path.join(WORKSPACE_SITE_DIR, 'content', 'pages'));
  copyRecursive(path.join(legacyRoot, 'conf', 'moments.yml'), path.join(WORKSPACE_SITE_DIR, 'content', 'data', 'moments.yml'));
  copyRecursive(path.join(legacyRoot, 'conf', 'links.yml'), path.join(WORKSPACE_SITE_DIR, 'content', 'data', 'links.yml'));
  copyRecursive(path.join(legacyRoot, 'conf', 'gallery.yml'), path.join(WORKSPACE_SITE_DIR, 'content', 'data', 'gallery.yml'));

  const legacyAssetsDir = path.join(legacyRoot, 'assets');
  if (fs.existsSync(legacyAssetsDir)) {
    copyRecursive(legacyAssetsDir, path.join(WORKSPACE_SITE_DIR, 'assets'));
  }

  migrateThemes(legacyRoot, report);

  writeText(
    path.join(WORKSPACE_SITE_DIR, 'config', 'blog.config.yml'),
    `${stringifyYaml(modernConfig)}\n`
  );

  report.legacyRoot = path.relative(ROOT, legacyRoot).replace(/\\/g, '/');
  report.workspaceRoot = path.relative(ROOT, WORKSPACE_SITE_DIR).replace(/\\/g, '/');
  report.generatedAt = new Date().toISOString();
  report.files = {
    config: 'workspace/site/config/blog.config.yml',
    posts: 'workspace/site/content/posts',
    pages: 'workspace/site/content/pages',
    data: 'workspace/site/content/data',
    themes: 'workspace/site/themes/custom'
  };

  writeText(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Legacy migration completed.`);
  console.log(`Source : ${report.legacyRoot}`);
  console.log(`Target : ${report.workspaceRoot}`);
  console.log(`Report : ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);
}

const report = {
  legacyRoot: '',
  workspaceRoot: '',
  generatedAt: '',
  files: {},
  customThemes: []
};

migrate();
