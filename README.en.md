# Static Markdown Blog

A zero-dependency, token-driven theme, sub-path deployable static blog platform.

## Why This Exists

This project aims to provide a **zero-dependency, beautiful themes, works out of the box** static blog platform.

Design principles:
- **Zero dependencies** — No npm runtime dependencies (vendored libs only)
- **Beautiful themes** — 5 original themes, 45+ CSS tokens, 3-state dark mode
- **Works out of the box** — Self-contained build output, deployable anywhere

## Live Demo

https://mg5921my.github.io/static-markdown-blog/

The **Skills**, **Portfolio**, and **Toolbox** pages in the navigation bar demonstrate custom page capabilities:
- **Skills** — Custom HTML page with JS execution (counter animation)
- **Portfolio** — Custom HTML page with data embedding (projects.yml) + JS (3D tilt cards)
- **Toolbox** — Standalone mode (hides platform nav/footer, iframe sandbox isolation)

## Features

| Category | Capabilities |
|----------|-------------|
| **Build** | Markdown → HTML at build time, RSS, Sitemap, search index (CJK tokenization), SSG, incremental build, draft system |
| **Themes** | 5 built-in themes, 45+ CSS tokens, layout tokens, 3-state dark mode, Google Fonts, theme.js, template overrides, auto-discovery |
| **Content** | Blog posts, custom pages (HTML/CSS/JS standalone/embedded), moments, links, gallery, math (KaTeX), diagrams (Mermaid) |
| **Code** | Syntax highlighting (highlight.js), line numbers, copy button |
| **Dev** | Zero dependencies, hot-reload (SSE), CLI (i18n), incremental build, 221 automated tests |
| **Deploy** | GitHub Pages, Docker, any static hosting, sub-path auto-detection |
| **Extend** | Plugin architecture, custom themes, custom pages (standalone/embedded), comments (Giscus), language switching (auto-discovery) |

## Quick Start

### Source Build

```bash
git clone <repo>
cd static-blog
node init.js          # Initialize site/ workspace
node build.js         # Build to dist/
node serve.js         # Preview at http://localhost:8080
```

### Docker

```bash
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

### npm (in development)

```bash
npm install -g static-markdown-blog
mkdir my-blog && cd my-blog
blog init
blog build
blog serve
```

### Any Static Host

The `dist/` directory is the complete output. Deploy directly to Vercel / Netlify / Cloudflare Pages / GitHub Pages / Nginx.

## dist/ Design Philosophy

`dist/` is a **complete, self-contained static site**. No Node.js, no build tools, no serve.js required.

```text
dist/
├── *.html              Pages (self-contained, directly deployable)
├── client/             Platform runtime modules
├── themes/             Theme CSS (auto-discovered, user themes copied here)
├── vendor/             Third-party libs (lunr, katex, marked)
├── locales/            i18n translations + index.json (auto-discovered)
├── assets/             User resources
├── posts/              Pre-rendered article HTML + SSG pages
├── site-config.json    Site config (includes theme.available auto-discovery)
├── content-index.json  Content index
├── feed.xml            RSS
├── sitemap.xml         Sitemap
└── search-index.json   Search index
```

**Core resources are fully local.** CDN is only used for optional enhancements (syntax highlighting, XSS filtering), all non-blocking with graceful degradation.

## CLI

```bash
blog init                  # Initialize workspace
blog build                 # Build
blog build --incremental   # Incremental build
blog serve [port]          # Dev server
blog serve --no-live       # Disable hot-reload
blog --help                # Help (auto-detects language)
blog --help --lang en      # English help
blog --version             # Version
```

## Directory Structure

```text
src/                    Platform code (users don't touch)
  kernel/               Build engine (config, content, markdown, output, paths)
  plugins/              Build-time plugins (static-copy, rss, sitemap, search-index, ssg)
  client/               Runtime modules (core, nav, render, ui, i18n, blog)
  pages/                Page templates + page logic

site/                   User workspace (the only directory users touch)
  config.yml            Site configuration
  content/              Content (posts/, pages/, data/)
  assets/               Asset files
  themes/custom/        Custom themes

res/                    Platform resources (copied to dist/ at build time)
  themes/               5 built-in themes (auto-discovered)
  locales/              Chinese + English (auto-discovered)
  vendor/               Third-party libraries

deploy/                 Deployment config
  docker/               Dockerfile + compose

bin/                    CLI + init scripts
build.js                Build entry
serve.js                Dev server (hot-reload)
test.js                 Automated tests
```

## Built-in Themes

| Theme | Style | Design Reference |
|-------|-------|-----------------|
| graphite | Industrial blueprint | Linear + Vercel |
| aurora | Brand showcase | Stripe |
| paper | Reading-first | Notion + Claude |
| mono | Black & white minimal | Vercel |
| terminal | CRT cyberpunk | DiskScope |

Themes are auto-discovered at build time from `res/themes/` (system) and `site/themes/custom/` (user). Adding a custom theme requires no configuration changes.

## Build Options

```bash
node build.js                    # Full build
node build.js --incremental      # Incremental (skip unchanged files)
node build.js --include-drafts   # Include drafts
```

## Tests

```bash
node test.js                     # Run 221 automated tests
```

## Documentation

- `docs/architecture/theme-engine-reference.md` — Complete theme engine reference
