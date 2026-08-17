const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(300);
    // 反复杀玩家直到 game over
    let guard = 0;
    while (guard++ < 25) {
      const s = window.TG.state();
      if (s.mode !== 'play') break;
      const p = s.players[0];
      if (p.alive && p.shield === 0) {
        window.TG.placeBullet(p.x + 4, p.y - 12, 2, false, 0);
        window.TG.step(20);
      } else {
        window.TG.step(120);  // 等重生/等护盾消失
      }
    }
    const s = window.TG.state();
    return {mode: s.mode, lives: s.lives[0], over: s.mode === 'over' || s.mode === 'title'};
  });
  console.log('gameover test:', JSON.stringify(r));
  await browser.close();
})();
