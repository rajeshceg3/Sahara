import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [,, root, outdir, mode] = process.argv;
fs.mkdirSync(outdir, { recursive: true });
const port = '4199';
const server = spawn('python3', ['-m', 'http.server', port, '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const url = `http://127.0.0.1:${port}`;
for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  if (mode === 'chapters') {
    await page.goto(url);
    await page.locator('#status').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Pause ambient motion', exact: true }).click();
    for (let ch = 0; ch < 4; ch++) {
      await page.locator(`nav [data-chapter="${ch}"]`).click();
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${outdir}/ch${ch}.png` });
      await page.locator('#encounter').click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${outdir}/ch${ch}-encounter.png` });
      await page.locator('#encounter').click();
      await page.waitForTimeout(300);
    }
  } else {
    // frame mode: close-up per animal via ?frame=kind
    for (const kind of ['camel', 'fennec', 'sandfish', 'dove']) {
      await page.goto(`${url}/?frame=${kind}&clean=1`);
      await page.locator('#status').waitFor({ state: 'detached' });
      const shots = kind === 'camel' ? 5 : 2;
      for (let k = 1; k <= shots; k++) {
        await page.waitForTimeout(k === 1 ? 2200 : (kind === 'camel' ? 5500 : 1600));
        await page.screenshot({ path: `${outdir}/frame-${kind}${k === 1 ? '' : '-' + k}.png` });
      }
    }
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
console.log('captured to', outdir);
