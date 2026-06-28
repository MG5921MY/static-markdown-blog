---
title: Theme Engine Architecture
date: 2026-06-28
tags: [theme, architecture, css, design]
summary: How the token-driven theme system works, including layout control, dark mode, and custom theme creation.
---

# Theme Engine Architecture

This platform uses a **token-driven theme engine** that separates visual design from page structure.

## How It Works

All themes share the same HTML structure. Visual differences are achieved entirely through CSS custom properties (tokens).

```
themes/base.css          ← Structure + 45+ token definitions
themes/graphite/theme.css ← Overrides tokens for graphite look
themes/aurora/theme.css   ← Overrides tokens for aurora look
```

## Token Categories

### Color Tokens

```css
:root {
  --bg-primary: #0b0d12;
  --bg-secondary: #11141b;
  --text-primary: #f5f7fb;
  --accent: #6f7cff;
  --border: rgba(255, 255, 255, 0.08);
}
```

### Layout Tokens

```css
:root {
  --layout-width: 1120px;
  --layout-prose: 760px;
  --card-columns: auto;
  --card-direction: column;
  --hero-align: center;
  --post-article-width: 880px;
}
```

### Typography Tokens

```css
:root {
  --font-display: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

## Creating a Custom Theme

### 1. Create the Directory

```
workspace/site/themes/custom/my-theme/
  theme.yml
  theme.css
```

### 2. Define theme.yml

```yaml
name: My Theme
version: 1.0.0
author: Your Name
description: A custom theme for my blog.
```

### 3. Write theme.css

```css
@import "../base.css";

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #212529;
  --accent: #0d6efd;
  --font-display: "Georgia", serif;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #e0e0e0;
    --accent: #6ea8fe;
  }
}

:root[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #e0e0e0;
  --accent: #6ea8fe;
}
```

## Layout Control

Themes can control page layout through tokens:

```css
/* Add a sidebar */
:root {
  --layout-sidebar-width: 280px;
  --layout-sidebar-position: right;
}

/* Change card grid to 3 columns */
.posts-grid {
  grid-template-columns: repeat(3, 1fr);
}

/* Make cards horizontal (list view) */
:root {
  --card-direction: row;
}
```

## Theme JavaScript

Themes can include a `theme.js` file for custom interactions:

```javascript
// themes/my-theme/theme.js
Blog.onInit = function() {
  console.log('Theme initialized!');
};

Blog.onPageLoad = function() {
  // Add custom animations
  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.02)';
    });
  });
};
```

## Template Partials

Themes can override specific sections by providing HTML templates:

```
themes/my-theme/templates/
  hero.html      ← Custom hero section
  footer.html    ← Custom footer
  post-card.html ← Custom post card
```

The platform loads these templates and replaces the default sections automatically.

## Design Principles

1. **Tokens over selectors** - Use CSS variables, not class-based styling
2. **Structure stays constant** - Themes only change visual appearance
3. **Dark mode built-in** - Every theme should support light and dark
4. **Progressive enhancement** - Works without JavaScript

For the complete token reference, see the Theme Engine Reference documentation.
