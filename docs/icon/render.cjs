// 案 2-B のアイコンを各サイズの PNG に書き出す
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const sizes = [['std', 512, 'icon-512.png'], ['std', 192, 'icon-192.png'], ['std', 180, 'apple-touch-icon.png'], ['std', 48, 'favicon-48.png'], ['std', 32, 'favicon-32.png'], ['mask', 512, 'icon-maskable-512.png']];
  for (const [id, size, name] of sizes) {
    const p = await b.newPage({ viewport: { width: 512, height: 1100 }, deviceScaleFactor: size / 512 });
    await p.goto('file://' + __dirname + '/final.html');
    await p.waitForTimeout(1000);
    await p.locator('#' + id).screenshot({ path: `${out}/${name}`, omitBackground: false });
    await p.close();
  }
  await b.close();
})();
