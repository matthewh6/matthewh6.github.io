/* visual check: screenshot sigma_bar_cream.html at given frame indices (file://, frames inlined) */
const puppeteer = require('puppeteer-core');
const path = require('path');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'file://' + path.join(__dirname, '..', 'sigma_bar_cream.html');
const OUT = path.join(__dirname, '..', 'out');
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const W = parseInt(process.argv[2] || '1920', 10);
  const H = parseInt(process.argv[3] || '1080', 10);
  const idxs = (process.argv[4] || '75,158,202,395').split(',').map(s => parseInt(s, 10));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  for (const i of idxs) {
    await page.goto(`${URL}?frame=${i}`, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 10000 });
    const f = path.join(OUT, `dial_${W}x${H}_f${i}.png`);
    await page.screenshot({ path: f });
    console.log('wrote', f);
  }
  await browser.close();
})();
