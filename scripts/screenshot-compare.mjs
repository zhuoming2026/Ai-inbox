import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function takeScreenshot() {
  const serverUrl = 'http://localhost:5173';

  console.log('Launching browser...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1780 }
  });
  const page = await context.newPage();

  console.log('Navigating to app...');
  await page.goto(serverUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000); // Wait for fonts and dynamic content

  const screenshotDir = join(projectRoot, '.screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = join(screenshotDir, 'current.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  console.log(`Screenshot saved: ${screenshotPath}`);

  await browser.close();
  return screenshotPath;
}

takeScreenshot().catch(console.error);
