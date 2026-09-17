# Third-Party Notices

This project uses the following third-party libraries and resources. Each is used in compliance with its respective license.

如有遗漏，请联系补充，我们将严格遵守各开源协议要求。

---

## Vendor Libraries (Bundled)

All runtime libraries are bundled locally under `res/vendor/` — the site has **zero CDN dependencies** at runtime.

### marked

- **Version**: 12.0.2
- **License**: MIT
- **Copyright**: Copyright (c) 2011-2024, Christopher Jeffrey
- **Source**: https://github.com/markedjs/marked
- **Usage**: Markdown to HTML rendering (build-time and client-side)

### lunr.js

- **Version**: 2.3.9
- **License**: MIT
- **Copyright**: Copyright (C) 2020 Oliver Nightingale
- **Source**: https://github.com/olivernn/lunr.js
- **Usage**: Full-text search index

### KaTeX

- **Version**: Latest
- **License**: MIT
- **Copyright**: Copyright (c) 2013-2020 Khan Academy
- **Source**: https://github.com/KaTeX/KaTeX
- **Usage**: Mathematical formula rendering

### DOMPurify

- **Version**: 3.1.6
- **License**: Apache-2.0
- **Copyright**: Copyright 2015 Mario Heiderich
- **Source**: https://github.com/cure53/DOMPurify
- **Usage**: XSS sanitization for user content

### highlight.js

- **Version**: 11.10.0
- **License**: BSD-3-Clause
- **Copyright**: Copyright (c) 2006, Ivan Sagalaev
- **Source**: https://github.com/highlightjs/highlight.js
- **Usage**: Code syntax highlighting

### Mermaid

- **Version**: 10.x
- **License**: MIT
- **Copyright**: Copyright (c) 2014-2023 Knut Sveidqvist
- **Source**: https://github.com/mermaid-js/mermaid
- **Usage**: Diagram rendering (flowcharts, sequence diagrams, etc.)

---

## External Services (Optional, Not Bundled)

### Giscus

- **Version**: Latest
- **License**: MIT
- **Copyright**: Copyright (c) 2021 giscus
- **Source**: https://github.com/giscus/giscus
- **Usage**: Comments system (optional; loaded from `giscus.app` when enabled — an external service that cannot be bundled because it requires backend storage)

---

## Fonts

### Web Fonts (Bundled, SIL Open Font License 1.1)

All web fonts are downloaded from Google Fonts (latin subset) and **bundled locally** under `res/vendor/fonts/` (see `scripts/localize-fonts.js` for the reproducible download script). Licensed under the [SIL Open Font License 1.1](https://scripts.sil.org/OFL) — embedding and redistribution permitted.

| Font | Usage |
|------|-------|
| Inter | Primary sans-serif (graphite, terminal, aurora themes) |
| JetBrains Mono | Monospace (graphite, terminal, paper, aurora themes) |
| Orbitron | Display (terminal theme) |
| Caveat | Handwriting (paper theme) |
| Playfair Display | Serif display (aurora theme) |

### KaTeX Math Fonts

- **License**: MIT (same as KaTeX)
- **Usage**: Mathematical formula rendering
- **Fonts**: KaTeX_AMS, KaTeX_Caligraphic, KaTeX_Fraktur, KaTeX_Main, KaTeX_Math, KaTeX_SansSerif, KaTeX_Script, KaTeX_Size1-4, KaTeX_Typewriter

---

## Theme Designs

All themes (graphite, terminal, paper, aurora, mono, glass, sakura) and base.css are original designs created for this project. No existing theme packages were referenced or copied.

---

## License Compliance

- **MIT**: Free to use, modify, and distribute. Attribution preserved above.
- **Apache-2.0**: Free to use, modify, and distribute. NOTICE file maintained.
- **BSD-3-Clause**: Free to use, modify, and distribute. Attribution preserved above.
- **OFL-1.1**: Free to use, modify, and distribute. No restrictions on embedding.

---

*Last updated: 2026-09-17*
