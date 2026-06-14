const { test } = require('playwright/test');
test('footer probe', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('http://127.0.0.1:5510/index.html?skhpsRuntime=local-dev', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  async function metrics(label) {
    return await page.evaluate((label) => {
      const footer = document.querySelector('[data-skhps-footer]');
      const panel = document.querySelector('#skhps-runtime-panel');
      const tail = document.querySelector('#skhps-runtime-tail');
      const fr = footer && footer.getBoundingClientRect();
      const pr = panel && panel.getBoundingClientRect();
      const tr = tail && tail.getBoundingClientRect();
      return { label, scrollY: window.scrollY, innerHeight: window.innerHeight, scrollHeight: document.documentElement.scrollHeight, runtimeState: document.documentElement.getAttribute('data-skhps-runtime-state'), docked: document.documentElement.getAttribute('data-skhps-runtime-docked'), tailSpacer: document.documentElement.getAttribute('data-skhps-runtime-tail-spacer'), footer: fr && { top: fr.top, bottom: fr.bottom, height: fr.height }, panel: pr && { top: pr.top, bottom: pr.bottom, height: pr.height, position: getComputedStyle(panel).position, zIndex: getComputedStyle(panel).zIndex }, tail: tr && { top: tr.top, bottom: tr.bottom, height: tr.height, marginTop: getComputedStyle(tail).marginTop }, footerStyle: footer && { position: getComputedStyle(footer).position, zIndex: getComputedStyle(footer).zIndex } };
    }, label);
  }
  console.log(JSON.stringify(await metrics('before'), null, 2));
  await page.click('.skhps-footer-runtime-toggle');
  await page.waitForTimeout(50);
  console.log(JSON.stringify(await metrics('after50'), null, 2));
  await page.waitForTimeout(300);
  console.log(JSON.stringify(await metrics('after350'), null, 2));
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  console.log(JSON.stringify(await metrics('afterWheel'), null, 2));
});
