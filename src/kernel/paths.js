/**
 * Unified path resolution for all 3 distribution modes:
 *   1. Source build  (cwd = project root, pkgRoot = project root)
 *   2. Docker        (cwd = /app, pkgRoot = /app)
 *   3. npm global    (cwd = user dir, pkgRoot = node_modules/pkg)
 *
 * All path resolution goes through this module to ensure consistency.
 */

const path = require('path');
const fs = require('fs');

function createPaths(cwd, pkgRoot) {
  // pkgRoot: where the platform code lives (build.js, src/, res/themes/, res/locales/, res/vendor/)
  // cwd: where the user runs the command (their project directory)
  const resolvedPkg = pkgRoot || cwd;
  const resolvedCwd = cwd;

  return {
    // ── Platform paths (where the platform code lives) ──
    pkgRoot: resolvedPkg,
    srcDir: path.join(resolvedPkg, 'src'),
    kernelDir: path.join(resolvedPkg, 'src', 'kernel'),
    pluginsDir: path.join(resolvedPkg, 'src', 'plugins'),
    clientDir: path.join(resolvedPkg, 'src', 'client'),
    pagesDir: path.join(resolvedPkg, 'src', 'pages'),
    themesDir: path.join(resolvedPkg, 'res', 'themes'),
    localesDir: path.join(resolvedPkg, 'res', 'locales'),
    vendorDir: path.join(resolvedPkg, 'res', 'vendor'),
    binDir: path.join(resolvedPkg, 'bin'),
    defaultSiteDir: path.join(resolvedPkg, 'site'),

    // ── User paths (where the user's content lives) ──
    cwd: resolvedCwd,
    siteDir: path.join(resolvedCwd, 'site'),
    distDir: path.join(resolvedCwd, 'dist'),

    // ── Config resolution cascade ──
    resolveConfig() {
      const candidates = [
        { path: path.join(resolvedCwd, 'site', 'config.yml'), mode: 'site', siteRoot: path.join(resolvedCwd, 'site') },
        { path: path.join(resolvedPkg, 'site', 'config.yml'), mode: 'package', siteRoot: path.join(resolvedPkg, 'site') },
        { path: path.join(resolvedPkg, 'config', 'blog.config.yml'), mode: 'legacy', siteRoot: resolvedPkg },
      ];
      for (const c of candidates) {
        if (fs.existsSync(c.path)) return c;
      }
      return null;
    },

    // ── Content path resolution ──
    resolveContent(relativePath, siteRoot) {
      return path.join(siteRoot || path.join(resolvedCwd, 'site'), relativePath);
    },

    // ── Asset path resolution ──
    resolveAsset(relativePath, siteRoot) {
      // Try site assets first, then platform assets
      const siteAsset = path.join(siteRoot || path.join(resolvedCwd, 'site'), 'assets', relativePath);
      if (fs.existsSync(siteAsset)) return siteAsset;
      return path.join(resolvedPkg, 'assets', relativePath);
    },

    // ── Static file sources (for build output) ──
    getStaticFileSources() {
      return {
        // HTML templates
        templates: path.join(resolvedPkg, 'src', 'pages'),
        // Client JS
        client: path.join(resolvedPkg, 'src', 'client'),
        // Built-in themes
        themes: path.join(resolvedPkg, 'res', 'themes'),
        // Locales
        locales: path.join(resolvedPkg, 'res', 'locales'),
        // Vendor libs
        vendor: path.join(resolvedPkg, 'res', 'vendor'),
        // User assets (overlay)
        userAssets: path.join(resolvedCwd, 'site', 'assets'),
        // User custom themes (overlay)
        userThemes: path.join(resolvedCwd, 'site', 'themes', 'custom'),
      };
    },

    // ── Watch paths (for serve.js) ──
    getWatchPaths() {
      return {
        dirs: [
          path.join(resolvedCwd, 'site'),        // User workspace
          path.join(resolvedPkg, 'res', 'themes'),       // Built-in themes
          path.join(resolvedPkg, 'res', 'locales'),      // Locales
        ],
        files: [
          // Platform templates
          ...fs.readdirSync(path.join(resolvedPkg, 'src', 'pages'), { withFileTypes: true })
            .filter(e => e.isFile() && (e.name.endsWith('.html') || e.name.endsWith('.page.js')))
            .map(e => path.join(resolvedPkg, 'src', 'pages', e.name)),
          // Client JS
          ...fs.readdirSync(path.join(resolvedPkg, 'src', 'client'), { withFileTypes: true })
            .filter(e => e.isFile() && e.name.endsWith('.js'))
            .map(e => path.join(resolvedPkg, 'src', 'client', e.name)),
        ].filter(p => fs.existsSync(p)),
      };
    },
  };
}

module.exports = { createPaths };
