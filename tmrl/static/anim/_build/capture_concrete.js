/* headless capture: render every frame_concrete.html frame at WxH -> ../frames_concrete/ */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'file://' + path.join(__dirname, '..', 'frame_concrete.html');
const OUT = path.join(__dirname, '..', 'frames_concrete');

(async () => {
  const W = parseInt(process.argv[2] || '1920', 10);
  const H = parseInt(process.argv[3] || '1080', 10);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  await page.goto(`${URL}?frame=0`, { waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 10000 });
  const total = await page.evaluate(() => window.__total);
  console.log(`capturing ${total} frames @ ${W}x${H}`);

  for (let i = 0; i < total; i++) {
    await page.evaluate((n) => window.__renderFrame(n), i);
    await new Promise(r => setTimeout(r, 8));
    await page.screenshot({ path: path.join(OUT, String(i).padStart(4, '0') + '.png') });
    if (i % 30 === 0 || i === total - 1) console.log(`  ${i + 1}/${total}`);
  }
  await browser.close();
  console.log('frames ->', OUT);
})();
