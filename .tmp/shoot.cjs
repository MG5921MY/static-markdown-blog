const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const ROOT = 'E:/MIJIAOGAME/MijiaoGamePak/MijiaoGameVuePak/HtmlPak/静态博客';
  const outDir = path.join(ROOT, '.tmp', 'screenshots');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const targets = [
    ['index.html', '01-home-mono.png'],
    ['post.html?id=c21a630f', '02-post-mono.png'],
    ['post.html?id=23e15b2d', '03-post-theme-mono.png'],
    ['moments.html', '04-moments-mono.png'],
    ['links.html', '05-links-mono.png'],
    ['gallery.html', '06-gallery-mono.png'],
    ['disclaimer.html', '07-disclaimer-mono.png'],
  ];
  for (const [path_, file] of targets) {
    await page.goto('http://localhost:8765/' + path_, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(outDir, file), fullPage: true });
    console.log('OK', file);
  }
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mPage = await mobileCtx.newPage();
  await mPage.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
  await mPage.waitForTimeout(2200);
  await mPage.screenshot({ path: path.join(outDir, '08-home-mono-mobile.png'), fullPage: true });
  console.log('OK mobile');
  await browser.close();
})();
