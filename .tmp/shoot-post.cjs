const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const ROOT = 'E:/MIJIAOGAME/MijiaoGamePak/MijiaoGameVuePak/HtmlPak/静态博客';
  const outDir = path.join(ROOT, '.tmp', 'screenshots');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [url, file] of [
    ['post.html?id=c21a630f', '02-post-mono.png'],
    ['post.html?id=23e15b2d', '03-post-theme-mono.png'],
  ]) {
    await page.goto('http://localhost:8765/' + url, { waitUntil: 'domcontentloaded' });
    try { await page.waitForSelector('.post-body .markdown-body, .markdown-body h1, .post-body p, .post-article h1', { timeout: 25000 }); console.log('found post body'); } catch (e) { console.log('not found', e.message); }
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log('OK', file);
  }
  await browser.close();
})();
