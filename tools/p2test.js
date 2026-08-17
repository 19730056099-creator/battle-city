const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);
  // 直接 2P 开始（TG.start(true)）
  const r = await page.evaluate(() => {
    window.TG.start(true);
    window.TG.step(300);
    const s = window.TG.state();
    const p0 = s.players[0], p1 = s.players[1];
    // P1 向右，P2 向左
    window.TG.key('ArrowLeft', true);   // P1 左移（出生点右侧 1px 就是砖桩，原版不能右移）
    window.TG.key('KeyL', true);        // P2 右移
    window.TG.step(30);
    const s2 = window.TG.state();
    const moved = [s2.players[0].x < p0.x, s2.players[1].x > p1.x];
    // 双方射击
    window.TG.key('ArrowLeft', false);
    window.TG.key('KeyL', false);
    window.TG.press('Space');
    window.TG.press('KeyN');
    window.TG.step(20);
    const s3 = window.TG.state();
    return {
      alive: [s.players[0].alive, s.players[1].alive],
      spawns: [[p0.x, p0.y], [p1.x, p1.y]],
      moved,
      p1Bullets: s3.bullets.filter(b => b.isPlayer).length,
      scores: s3.score
    };
  });
  console.log('2P test:', JSON.stringify(r));
  await browser.close();
})();
