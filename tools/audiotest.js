const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);
  // 触发音频（无头环境无音频设备，检查是否报错）
  const r = await page.evaluate(() => {
    try {
      window.TG.audio();
      window.TG.sfxTest();
      window.TG.start(false);
      window.TG.step(500);
      return 'ok';
    } catch (e) {
      return 'ERR: ' + e.message;
    }
  });
  console.log('audio result:', r);
  console.log('page errors:', errs.length ? errs : 'none');
  await browser.close();
})();
