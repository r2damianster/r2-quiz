const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const pageErrors = [];
  const networkErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (request) => {
    networkErrors.push(request.url() + ' :: ' + request.failure()?.message);
  });

  await page.goto('https://r2-quiz.vercel.app/host.html', { waitUntil: 'load', timeout: 15000 });
  await page.locator('#btnCrearSala').click();
  await page.waitForTimeout(2500);

  const setupState = (await page.locator('#setupEstado').count())
    ? (await page.locator('#setupEstado').textContent()).trim()
    : '';

  const visiblePanel = await page.locator('section.panel').evaluateAll((els) => {
    const visible = els.find(el => !el.classList.contains('hidden'));
    return visible ? visible.id : 'none';
  });

  const codigoSalaVisible = await page.locator('#codigoSala').innerHTML();
  const codigoTexto = await page.locator('#codigoSala').textContent();

  console.log(JSON.stringify({
    setupState,
    visiblePanel,
    codigoSalaVisible,
    codigoTexto,
    pageErrors,
    networkErrors
  }));

  await browser.close();
})();
