---
title: Markdown Features Showcase
date: 2026-06-28
tags: [markdown, demo, guide]
summary: A comprehensive demonstration of supported Markdown features including code blocks, tables, lists, and more.
---

# Markdown Features Showcase

This article demonstrates all supported Markdown features in this blog platform.

## Text Formatting

**Bold text**, *italic text*, ~~strikethrough~~, and `inline code`.

You can also combine **bold *and italic*** together.

## Links and Images

[Link to GitHub](https://github.com)

Images work the same way: `![alt text](url)`

## Lists

### Unordered List

- First item
- Second item
  - Nested item A
  - Nested item B
- Third item

### Ordered List

1. Step one
2. Step two
3. Step three

### Task List

- [x] Build the platform
- [x] Add theme engine
- [ ] Write documentation

## Blockquotes

> This is a blockquote. It can contain multiple paragraphs and other formatting.
>
> Like this second paragraph.

## Code Blocks

JavaScript with syntax highlighting:

```javascript
const Blog = {
  config: null,
  
  async init() {
    this.config = await this.loadJson('./site-config.json');
    await this.loadTheme();
    return true;
  },
  
  resolveBasePath() {
    const meta = document.querySelector('meta[name="blog-base"]');
    return meta?.content || '/';
  }
};
```

Python example:

```python
def fibonacci(n):
    """Generate Fibonacci sequence up to n."""
    a, b = 0, 1
    while a < n:
        yield a
        a, b = b, a + b

for num in fibonacci(100):
    print(num)
```

CSS with custom properties:

```css
:root {
  --bg-primary: #0b0d12;
  --accent: #6f7cff;
  --font-display: "Inter", sans-serif;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
}
```

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown rendering | Done | Build-time and client-side |
| Theme system | Done | Token-driven, 5 themes |
| Dark mode | Done | Auto + manual toggle |
| i18n | Done | Chinese + English |
| RSS feed | Done | Auto-generated |

## Horizontal Rule

---

## Mathematical Expressions

Inline math: E = mc²

## Nested Blockquotes

> Level 1
> > Level 2
> > > Level 3

## Long Code Block

```bash
#!/bin/bash
# Initialize the blog workspace
echo "Initializing blog..."
node init.js

# Build the static site
echo "Building..."
node build.js

# Start the dev server
echo "Starting server..."
node serve.js 8080
```

This demonstrates the platform's ability to handle complex Markdown content with proper styling and syntax highlighting.
