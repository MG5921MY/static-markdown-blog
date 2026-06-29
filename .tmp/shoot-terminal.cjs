const { chromium } = require('playwright');
const path = require('path');

const ROOT = 'E:/MIJIAOGAME/MijiaoGamePak/MijiaoGameVuePak/HtmlPak/静态博客';
const outDir = path.join(ROOT, '.tmp', 'screenshots');

(async () => {
  const browser = await chromium.launch();

  // 桌面 1440
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const targets = [
    ['index.html', 'terminal-home.png', 2000],
    ['post.html?id=c21a630f', 'terminal-post.png', 4500],
    ['moments.html', 'terminal-moments.png', 2000],
    ['links.html', 'terminal-links.png', 2000],
    ['gallery.html', 'terminal-gallery.png', 2000],
    ['disclaimer.html', 'terminal-disclaimer.png', 1500],
  ];

  for (const [url, file, wait] of targets) {
    await page.goto('http://localhost:8765/' + url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log('OK', file);
  }

  // 移动端 390
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mPage = await mCtx.newPage();
  for (const [url, file, wait] of [
    ['index.html', 'terminal-home-mobile.png', 2000],
    ['post.html?id=c21a630f', 'terminal-post-mobile.png', 4500],
  ]) {
    await mPage.goto('http://localhost:8765/' + url, { waitUntil: 'domcontentloaded' });
    await mPage.waitForTimeout(wait);
    await mPage.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log('OK', file);
  }

  await browser.close();
})();
