const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const results = [];
    for (let st = 1; st <= 35; st++) {
      window.TG.start(false);
      window.TG.setStage(st);
      window.TG.step(300);
      const s = window.TG.state();
      results.push({stage: st, mode: s.mode, enemies: s.enemies.length, tile1: s.tile(1,1) && s.tile(1,1).t});
    }
    return results;
  });
  let bad = 0;
  for (const x of r) {
    if (x.mode !== 'play' || x.enemies < 0) { console.log('BAD:', JSON.stringify(x)); bad++; }
  }
  // 检查第 24 关的 fallback
  await page.evaluate(() => { window.TG.setStage(24); window.TG.step(100); });
  const s24 = await page.evaluate(() => ({mode: window.TG.state().mode, t: window.TG.state().tile(1,1)}));
  console.log('stage24 mode:', s24.mode, 'tile(1,1):', JSON.stringify(s24.t));
  console.log('stages tested:', r.length, 'bad:', bad, 'errors:', errs.length ? errs : 'none');
  await browser.close();
})();
