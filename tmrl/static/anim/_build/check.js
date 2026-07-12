// Quick single-frame visual check of frame.html
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:8765/static/anim/frame.html';

(async () => {
  const t = process.argv[2] || '3';
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto(`${BASE}?t=${t}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 });
  await page.screenshot({ path: `../out/check_t${t}.png` });
  await browser.close();
  console.log(`wrote out/check_t${t}.png`);
})();
