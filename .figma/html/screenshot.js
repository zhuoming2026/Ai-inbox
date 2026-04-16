const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1780 }
  });

  const page = await context.newPage();

  // Take screenshot of main page
  await page.goto('http://localhost:8888/main-page.html');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: '/Users/zhuoming/lzm/CodeZone/ai-inbox-app/.figma/html/screenshot-main-page.png',
    fullPage: true
  });
  console.log('Main page screenshot saved');

  // Take screenshot of content page
  await page.goto('http://localhost:8888/content-page.html');
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: '/Users/zhuoming/lzm/CodeZone/ai-inbox-app/.figma/html/screenshot-content-page.png',
    fullPage: true
  });
  console.log('Content page screenshot saved');

  await browser.close();
  console.log('Done!');
})();
