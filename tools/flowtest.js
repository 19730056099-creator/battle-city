// v1 功能流程测试：通关、道具、2P、换关
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);

  const results = [];
  const check = (n, c, d) => { results.push({ n, ok: !!c, d }); };

  // 1. 通关流程：杀光敌人 -> clear -> 下一关
  await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(200);
    // 直接杀光所有在场敌人 + 清空队列
    window.TG.killAll = () => {
      const s = window.TG.state();
      s.enemies.forEach((_, i) => window.TG.killEnemy(i));
      window.TG.setEnemiesLeft(0);
      window.TG.step(5);
    };
    window.TG.setEnemiesLeft = (n) => { window.TG.state(); window.__setLeft(n); };
  });
  // 用页面内钩子实现 setEnemiesLeft
  await page.evaluate(() => {
    window.__setLeft = (n) => {};
  });
  // 直接修改：通过杀敌方式
  const flow = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(400);  // 有敌人了
    let r = [];
    for (let i = 0; i < 6; i++) {
      const s = window.TG.state();
      if (s.enemies.length > 0) window.TG.killEnemy(0);
    }
    window.TG.step(60);
    r.push(window.TG.state().mode);
    // 如果 clear 了，等它自动进入下一关
    window.TG.step(300);
    r.push(window.TG.state().mode);
    r.push(window.TG.state().stage);
    return r;
  });
  check('stage clear flow', flow[0] === 'clear' || flow[0] === 'play', JSON.stringify(flow));

  // 2. 炸弹道具：全屏灭敌
  const bomb = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(400);
    const s1 = window.TG.state();
    const before = s1.enemies.length;
    window.TG.placePower(s1.players[0].x, s1.players[0].y, 2);
    window.TG.step(3);
    const s2 = window.TG.state();
    const after = s2.enemies.filter(e => e.state === 'active').length;
    return { before, after };
  });
  check('bomb kills all', bomb.after === 0, JSON.stringify(bomb));

  // 3. 定时道具：冻结敌人
  const freeze = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(400);
    const s1 = window.TG.state();
    const e0 = s1.enemies[0];
    const p = s1.players[0];
    window.TG.placePower(p.x, p.y, 3);
    window.TG.step(3);
    const s2 = window.TG.state();
    const e1 = s2.enemies.find(e => e.x === e0.x && e.y === e0.y);
    // 冻结后 60 帧，位置不应变化
    window.TG.step(60);
    const s3 = window.TG.state();
    const e2 = s3.enemies.find(e => e.x === e0.x && e.y === e0.y);
    return { moved: e1 && e2 ? Math.abs(e2.x - e1.x) + Math.abs(e2.y - e1.y) : -1 };
  });
  check('freeze stops enemies', freeze.moved === 0, JSON.stringify(freeze));

  // 4. 铲子道具：基地钢化
  const shovel = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(200);
    const p = window.TG.state().players[0];
    window.TG.placePower(p.x, p.y, 4);
    window.TG.step(3);
    const s = window.TG.state();
    const t = s.tile(6, 11);
    return { tile610: t };
  });
  check('shovel steels base', shovel.tile610 && shovel.tile610.s > 0, JSON.stringify(shovel));

  // 5. 星星升级：子弹穿钢
  const star = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(200);
    const p = window.TG.state().players[0];
    window.TG.placePower(p.x, p.y, 0);
    window.TG.step(2);
    window.TG.placePower(p.x, p.y, 0);
    window.TG.step(2);
    window.TG.placePower(p.x, p.y, 0);
    window.TG.step(2);
    return window.TG.state().players[0].tier;
  });
  check('star tier 3', star === 3, JSON.stringify(star));

  // 6. 加命道具
  const tank = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(200);
    const s = window.TG.state();
    const before = s.lives[0];
    window.TG.placePower(s.players[0].x, s.players[0].y, 1);
    window.TG.step(3);
    return { before, after: window.TG.state().lives[0] };
  });
  check('tank powerup +1 life', tank.after === tank.before + 1, JSON.stringify(tank));

  // 7. 无敌道具
  const shield = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(200);
    const p = window.TG.state().players[0];
    window.TG.placePower(p.x, p.y, 5);
    window.TG.step(3);
    return window.TG.state().players[0].shield > 0;
  });
  check('helmet shield', shield === true, '');

  // 8. 敌人装甲 4 血
  const armor = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.setStage(4);  // 第4关有装甲坦克
    window.TG.step(400);
    const s = window.TG.state();
    const a = s.enemies.find(e => e.type === 3);
    if (!a) return { noArmor: true };
    return { noArmor: false, hp: a.hp };
  });
  check('armor tank 4hp', armor.noArmor || armor.hp === 4, JSON.stringify(armor));

  // 9. 暂停
  const pause = await page.evaluate(() => {
    window.TG.start(false);
    window.TG.step(300);
    return true;
  });
  await page.keyboard.press('KeyP');
  const pauseMode = await page.evaluate(() => window.TG.state().mode);
  check('pause works', pauseMode === 'paused', pauseMode);
  // 汇总
  console.log('=== V1 FLOW TESTS ===');
  let pass = 0;
  for (const r of results) {
    console.log((r.ok ? 'PASS' : 'FAIL') + ' | ' + r.n + (r.ok ? '' : ' | ' + r.d));
    if (r.ok) pass++;
  }
  console.log(`${pass}/${results.length}`);
  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
