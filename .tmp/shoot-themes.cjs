const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = 'E:/MIJIAOGAME/MijiaoGamePak/MijiaoGameVuePak/HtmlPak/静态博客';
const outDir = path.join(ROOT, '.tmp', 'screenshots');
const themes = ['graphite', 'aurora', 'paper'];

async function setTheme(page, themeId) {
  await page.evaluate((t) => {
    const link = document.getElementById('blog-theme');
    if (link) link.setAttribute('href', `./themes/${t}/theme.css`);
  }, themeId);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  // 桌面：3 主题 × 3 页面 = 9 张
  const desktopTargets = [
    ['index.html', 'home'],
    ['post.html?id=c21a630f', 'post'],
    ['links.html', 'links'],
  ];

  for (const themeId of themes) {
    for (const [url, name] of desktopTargets) {
      await page.goto('http://localhost:8765/' + url, { waitUntil: 'domcontentloaded' });
      await setTheme(page, themeId);
      // 给主题切换留时间
      await page.waitForTimeout(name === 'post' ? 3500 : 1500);
      const out = path.join(outDir, `${themeId}-${name}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log('OK', `${themeId}-${name}.png`);
    }
  }

  // 移动端：3 主题 × 1 首页 = 3 张
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mPage = await mobileCtx.newPage();
  for (const themeId of themes) {
    await mPage.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded' });
    await setTheme(mPage, themeId);
    await mPage.waitForTimeout(1500);
    const out = path.join(outDir, `${themeId}-home-mobile.png`);
    await mPage.screenshot({ path: out, fullPage: true });
    console.log('OK', `${themeId}-home-mobile.png`);
  }

  await browser.close();
})();
