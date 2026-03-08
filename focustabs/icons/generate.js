const puppeteer = require('/Users/ash/Desktop/FocusTabs/video/node_modules/puppeteer');
const path = require('path');

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname);

function buildHTML(size) {
  const borderRadius = Math.round(size * 0.20);
  const svgSize = Math.round(size * 0.60);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    overflow: hidden;
    background: transparent;
  }
  .icon {
    width: ${size}px;
    height: ${size}px;
    border-radius: ${borderRadius}px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
</head>
<body>
<div class="icon">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${svgSize}"
    height="${svgSize}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
</div>
</body>
</html>`;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const size of sizes) {
    const page = await browser.newPage();

    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(buildHTML(size), { waitUntil: 'networkidle0' });

    const outputPath = path.join(outputDir, `icon${size}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: false
    });

    await page.close();
    console.log(`Generated icon${size}.png (${size}x${size})`);
  }

  await browser.close();
  console.log('Done. All icons generated.');
})();
