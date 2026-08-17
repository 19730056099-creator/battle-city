const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);
  // 进入施工模式
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(300);
  let s = await page.evaluate(() => window.TG.state());
  console.log('construct mode:', s.mode);
  // 放几块砖（按住 150ms 确保捕捉）
  const hold = async (key) => { await page.keyboard.down(key); await page.waitForTimeout(150); await page.keyboard.up(key); await page.waitForTimeout(50); };
  await hold('Space');
  await hold('ArrowRight');
  await hold('Space');
  await hold('ArrowDown');
  await hold('Space');
  // 换钢块
  await hold('KeyE');
  await hold('Space');
  await page.screenshot({ path: '../shots/construct.png' });
  // 开始游戏
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  s = await page.evaluate(() => window.TG.state());
  const tiles = await page.evaluate(() => {
    const g = window.TG.state();
    const found = [];
    for (let ty = 0; ty < 13; ty++) for (let tx = 0; tx < 13; tx++) {
      const t = g.tile(tx, ty);
      if (t.t !== 0 || t.b !== 0 || t.s !== 0) found.push({tx, ty, t});
    }
    return found;
  });
  console.log('after start:', JSON.stringify({mode: s.mode, tiles}));
  await browser.close();
})();
