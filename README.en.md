# Static Markdown Blog

A zero-dependency, token-driven theme, sub-path deployable static blog platform.

## Why This Exists

Most Markdown static blog solutions suffer from three problems: **ugly** (outdated default themes), **abandoned** (niche SSGs with no maintenance), and **outdated** (no modern CSS, no containerization, no sub-path deployment).

This project aims to be: **zero-dependency, beautiful themes, works out of the box**.

## Features

| Category | Capabilities |
|----------|-------------|
| **Build** | Markdown → HTML at build time, RSS, Sitemap, search index, SSG, incremental build, draft system |
| **Themes** | 5 built-in themes, 45+ CSS tokens, layout tokens, 3-state dark mode, Google Fonts, theme.js, template overrides |
| **Content** | Blog posts, custom pages (HTML/CSS/JS), moments, links, gallery, math (KaTeX), diagrams (Mermaid) |
| **Dev** | Zero dependencies, hot-reload (SSE), CLI (i18n), automated tests (221) |
| **Deploy** | GitHub Pages, Docker, any static hosting, sub-path auto-detection |
| **Extend** | Plugin architecture, custom themes, custom pages (standalone/embedded), comments (Giscus) |

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
  kernel/               Build engine
  plugins/              Build-time plugins
  client/               Runtime modules
  pages/                Page templates + page logic

site/                   User workspace (the only directory users touch)
  config.yml            Site configuration
  content/              Content (posts/, pages/, data/)
  assets/               Asset files
  themes/custom/        Custom themes

res/                    Platform resources (copied to dist/ at build time)
  themes/               5 built-in themes
  locales/              Chinese + English
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
