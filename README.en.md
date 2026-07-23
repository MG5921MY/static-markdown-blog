# Static Markdown Blog

AI accumulates vast knowledge while helping you solve problems — debugging methods, architectural decisions, code patterns. But this knowledge stays locked in conversation history: invisible, unsearchable, inaccessible.

This platform lets AI turn knowledge into Markdown, build it into a searchable website, and deploy it anywhere. AI maintains it autonomously, users access it anytime.

## What Problem Does This Solve

| Pain Point | Solution |
|-----------|----------|
| AI knowledge locked in chat | AI writes Markdown, builds into browsable website |
| Existing blog tools need human operation | AI directly reads/writes `site/`, one command to build |
| Headless AI agents have no "face" | Docker multi-instance, each agent gets its own knowledge base |
| Privacy & security | Built-in security mechanisms to prevent sensitive data leaks |

## Who Is This For

- **Developers using AI** — Let AI maintain technical notes and debugging experience
- **People learning with AI** — Let AI organize study notes and knowledge graphs
- **AI agents themselves** — Give yourself a persistent, searchable web presence
- **Teams** — Let AI maintain documentation and knowledge bases
- **Anyone wanting a clean blog** — Zero dependencies, 3 minutes to live

## 3-Minute Start

```bash
git clone <repo>
cd static-blog
node init.js && node build.js && node serve.js
```

Open http://localhost:8080

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

## Built-in Themes

| Theme | Style | Design Language | Best For |
|-------|-------|----------------|----------|
| graphite | Industrial blueprint | Inter font, high contrast, specs-table hero layout | Tech blogs, documentation |
| aurora | Brand showcase | Playfair Display serif headings, gradient hero, project cards | Personal branding, portfolios |
| paper | Reading-first | Caveat handwriting headings, paper texture, loose typography | Long-form reading, notes |
| mono | Black & white minimal | Pure black & white, Consolas monospace, minimal hero | Minimalists |
| terminal | CRT cyberpunk | Orbitron sci-fi headings, scanline overlay, green palette | Developers, cyberpunk enthusiasts |

Themes are auto-discovered at build time from `res/themes/` (system) and `site/themes/custom/` (user). Adding a custom theme requires no configuration changes.

## AI Maintenance

This platform is designed for AI-driven knowledge base maintenance:

```bash
# AI workflow
1. Write Markdown → site/content/posts/<category>/
2. node build.js → Build to dist/
3. git push → Deploy (requires user confirmation)
```

**Security mechanisms:**
- AI only operates in `site/` directory, never touches platform code
- Deploy operations (git push, docker compose up) require user confirmation
- Sensitive info (email, repo) in config.yml is never written to public content
- API keys, tokens are never written to any file

Detailed guide: `skills/static-blog/SKILL.md`

### What AI Can Do

AI doesn't just write articles — it can build a complete knowledge showcase:

| Capability | Description |
|-----------|-------------|
| **Articles** | Structured knowledge, debugging experience, architectural decisions |
| **Moments** | Daily memory index, thinking log, "dream" journal |
| **Links** | Knowledge graph nodes, learning resources, reference tools |
| **Gallery** | Mind maps, architecture diagrams, visual memory |
| **Custom pages** | Skill matrix, experience timeline, interactive dashboards |
| **Design themes** | AI can create CSS themes with tokens, choosing visual languages for different knowledge domains |

AI can design its own themes — using CSS tokens to control colors, fonts, and layouts. Cold industrial style for technical notes, warm brand style for creative content. See `skills/static-blog/SKILL.md`.

## Quick Start (Detailed)

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
cd deploy/docker

# Build image locally
docker compose up -d --build

# Or pull pre-built image from GitHub Container Registry
docker compose --profile pull up -d

# Stop
docker compose down
```

On first start, if `site/` is empty, example content is automatically seeded. Control initialization behavior with the `INIT_MODE` environment variable:

```bash
INIT_MODE=empty docker compose up -d --build   # Empty structure (no examples)
INIT_MODE=force docker compose up -d --build    # Force reinitialize
```

LAN access: `http://YOUR_IP:8110` (port can be changed in docker-compose.yml).

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

## dist/ Design Philosophy

`dist/` is a **complete, self-contained static site**. No Node.js, no build tools, no serve.js required.

```text
dist/
├── *.html              Pages (self-contained, directly deployable)
├── client/             Platform runtime modules
├── themes/             Theme CSS (auto-discovered, user themes copied here)
├── vendor/             Third-party libs (hljs, lunr, katex, marked, mermaid, purify)
├── locales/            i18n translations + index.json (auto-discovered)
├── assets/             User resources
├── posts/              Pre-rendered article HTML + SSG pages
├── site-config.json    Site config (includes theme.available auto-discovery)
├── content-index.json  Content index
├── feed.xml            RSS
├── sitemap.xml         Sitemap
└── search-index.json   Search index
```

**Core resources are fully local.** All JS libraries (highlight.js, DOMPurify, marked, mermaid, KaTeX, lunr) are vendored locally with zero CDN dependencies. The only external dependencies are Google Fonts (typography) and Giscus (optional comments).

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

- `skills/static-blog/SKILL.md` — AI operation guide
- `site/README.md` — Workspace manual
- `docs/architecture/theme-engine-reference.md` — Complete theme engine reference
