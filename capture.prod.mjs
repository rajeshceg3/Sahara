import { chromium } from 'playwright';
import fs from 'node:fs';
const [,, outdir] = process.argv;
const base = process.env.PROD;
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  for (const kind of ['camel', 'fennec', 'sandfish', 'dove', 'viper', 'sandgrouse', 'scarab', 'agama']) {
    await page.goto(`${base}/?frame=${kind}&clean=1`);
    await page.locator('#status').waitFor({ state: 'detached' });
    const shots = kind === 'camel' ? 5 : 2;
    for (let k = 1; k <= shots; k++) {
      await page.waitForTimeout(k === 1 ? 2200 : (kind === 'camel' ? 5500 : 1600));
      await page.screenshot({ path: `${outdir}/frame-${kind}${k === 1 ? '' : '-' + k}.png` });
    }
  }
} finally {
  await browser.close();
}
console.log('captured to', outdir);
