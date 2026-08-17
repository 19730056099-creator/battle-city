// 全面测试：功能 + 渲染像素验证
const { chromium } = require('playwright-core');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(400);

  const px = (x, y) => page.evaluate(([a, b]) => {
    const d = document.getElementById('game').getContext('2d').getImageData(a, b, 1, 1).data;
    return [d[0], d[1], d[2]];
  }, [x, y]);

  const results = [];
  const check = (name, cond, detail) => {
    results.push({ name, ok: !!cond, detail: detail || '' });
  };

  // 1. 标题画面
  const t1 = await px(56 + 2, 80);      // TANK 的 T 首像素（黄色）
  check('title text yellow', t1[0] > 200 && t1[1] > 150 && t1[2] < 150, JSON.stringify(t1));

  // 2. 开始游戏（1P）
  await page.evaluate(() => window.TG.start(false));
  await page.evaluate(() => window.TG.step(150));
  let s = await page.evaluate(() => window.TG.state());
  check('mode play', s.mode === 'play', s.mode);

  // 3. 快进到玩家出生+敌人出现
  await page.evaluate(() => window.TG.step(120));
  s = await page.evaluate(() => window.TG.state());
  check('player alive', s.players[0].alive, JSON.stringify(s.players[0]));
  check('player at spawn (72,200)', s.players[0].x === 72 && s.players[0].y === 200, JSON.stringify([s.players[0].x, s.players[0].y]));

  // 4. 敌人生成
  await page.evaluate(() => window.TG.step(200));
  s = await page.evaluate(() => window.TG.state());
  check('enemies spawned', s.enemies.length > 0 && s.enemiesLeft < 20, JSON.stringify({n: s.enemies.length, left: s.enemiesLeft}));

  // 5. 玩家射击打砖
  await page.evaluate(() => {
    // 走到砖前
    window.TG.key('ArrowUp', true);
  });
  await page.evaluate(() => window.TG.step(60));
  const pos1 = await page.evaluate(() => window.TG.state().players[0]);
  await page.evaluate(() => {
    window.TG.key('ArrowUp', false);
    window.TG.press('Space');
  });
  await page.evaluate(() => window.TG.step(40));
  const t5 = await page.evaluate(() => {
    const s = window.TG.state();
    const px = s.players[0].x, py = s.players[0].y;
    return { bullets: s.bullets.length, tileAbove: s.tile(Math.floor((px + 8) / 16), Math.floor((py - 4) / 16)) };
  });
  check('wall blocks player', pos1.y <= 180, JSON.stringify(pos1));
  check('bullet hit brick', t5.tileAbove && t5.tileAbove.b < 15, JSON.stringify(t5));  // 砖掩码减少=被打掉

  // 6. 玩家像素颜色验证（黄色）
  s = await page.evaluate(() => window.TG.state());
  const c6 = await px(s.players[0].x + 8, s.players[0].y + 8);
  check('player tank yellow', c6[0] > 150 && c6[1] > 100 && c6[2] < 100, JSON.stringify(c6));

  // 7. 老鹰像素（白色/金色，在 (88,176)-(119,207)）
  const c7 = await px(103, 190);
  check('eagle drawn', c7[0] > 150, JSON.stringify(c7));

  // 8. 砖块像素（多点采样）
  let brickOk = false, brickPx = null;
  for (const [sx, sy] of [[50,17],[53,21],[58,17],[51,22],[56,18]]) {
    const c = await px(sx, sy);
    if (c[0] > 150 && c[1] > 80 && c[2] < 80) { brickOk = true; brickPx = c; break; }
  }
  check('brick orange', brickOk, JSON.stringify(brickPx));

  // 9. 钢块像素（(6,3) = 104,56）
  const c9 = await px(104, 56);
  check('steel gray', c9[0] > 100 && Math.abs(c9[0] - c9[1]) < 40, JSON.stringify(c9));

  // 10. HUD 分数显示
  let hudOk = false, hudPx = null;
  for (let i = 0; i < 6; i++) {
    const c = await px(208 + 2 + i, 16 + 1);
    if (c[0] > 100) { hudOk = true; hudPx = c; break; }
  }
  check('HUD score text', hudOk, JSON.stringify(hudPx));

  // 11. 爆炸渲染（杀一个敌人）
  await page.evaluate(() => {
    // 直接把一个敌人弄死
    window.TG.killEnemy = () => {
      const s = window.TG.state();
      if (s.enemies.length > 0) {
        const e = s.enemies[0];
        window.TG.explode(e.x, e.y);
      }
    };
  });
  // 需要 TG 支持 —— 检查 TG 方法存在性
  const hasKill = await page.evaluate(() => typeof window.TG.killEnemy === 'function');
  // 12. 2P 模式
  await page.evaluate(() => { window.TG.start(true); window.TG.step(300); });
  s = await page.evaluate(() => window.TG.state());
  check('2P both alive', s.players[0].alive && s.players[1].alive, JSON.stringify(s.players.map(p => p.alive)));

  // 13. 道具测试：直接放置道具并收集
  const pow = await page.evaluate(() => {
    const s = window.TG.state();
    const p0 = s.players[0];
    window.TG.placePower(p0.x, p0.y, 0);  // 星星
    window.TG.step(2);
    const s2 = window.TG.state();
    return { tier: s2.players[0].tier, power: s2.power };
  });
  check('powerup star collected', pow.tier === 1 && pow.power === null, JSON.stringify(pow));

  // 14. 截图
  await page.screenshot({ path: '../shots/test_2p.png' });

  // 汇总
  console.log('=== TEST RESULTS ===');
  let pass = 0;
  for (const r of results) {
    console.log((r.ok ? 'PASS' : 'FAIL') + ' | ' + r.name + (r.ok ? '' : ' | ' + r.detail));
    if (r.ok) pass++;
  }
  console.log(`\n${pass}/${results.length} passed`);
  console.log('JS ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
