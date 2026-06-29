const fs = require('fs');
const path = require('path');

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

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: content.trim() };
  return {
    meta: parseYaml(match[1]),
    body: content.slice(match[0].length).trim()
  };
}

function normalizePageRecords(pageRecords) {
  if (Array.isArray(pageRecords)) return pageRecords;
  if (pageRecords && typeof pageRecords === 'object') return Object.values(pageRecords);
  return [];
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function loadConfig(cwd, pkgRoot) {
  const sitePath = path.join(cwd, 'site', 'config.yml');
  const pkgSitePath = path.join(pkgRoot, 'site', 'config.yml');
  const legacyPath = path.join(pkgRoot, 'config', 'blog.config.yml');

  let filePath, siteRoot, mode;

  if (fs.existsSync(sitePath)) {
    filePath = sitePath;
    siteRoot = path.join(cwd, 'site');
    mode = 'site';
  } else if (fs.existsSync(pkgSitePath)) {
    filePath = pkgSitePath;
    siteRoot = path.join(pkgRoot, 'site');
    mode = 'package-site';
  } else if (fs.existsSync(legacyPath)) {
    filePath = legacyPath;
    siteRoot = pkgRoot;
    mode = 'legacy';
  } else {
    throw new Error('No config found. Expected site/config.yml or config/blog.config.yml');
  }

  const raw = parseYaml(readText(filePath));

  return {
    site: raw.site || {},
    deployment: raw.deployment || { basePath: 'auto' },
    theme: raw.theme || {},
    categories: raw.content?.categories || [],
    pages: normalizePageRecords(raw.content?.pages || []),
    nav: raw.nav || [],
    navActions: raw.navActions || [],
    features: raw.features || {},
    display: raw.display || {},
    beian: raw.beian || { enabled: false },
    comments: raw.comments || { enabled: false },
    _raw: raw,
    _siteRoot: siteRoot,
    _configPath: filePath,
    _mode: mode
  };
}

module.exports = { parseYaml, parseFrontMatter, loadConfig };
