const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(400);
  // 像素采样函数
  await page.evaluate(() => {
    window.sample = (x, y) => {
      const d = document.getElementById('game').getContext('2d').getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
  });
  // 标题画面采样：TANK 文字应为黄色 (248,216,120)
  const t1 = await page.evaluate(() => window.sample(56+8, 80+4));
  console.log('title text px (expect yellow-ish):', t1);
  // 开始游戏并快进
  await page.evaluate(() => { window.TG.start(false); window.TG.step(220); });
  // 玩家已出生 (80,200)，坦克中心 (88,208) 应为黄色系
  const t2 = await page.evaluate(() => {
    const s = window.TG.state();
    return { state: s.players[0], px: window.sample(s.players[0].x + 8, s.players[0].y + 8) };
  });
  console.log('player pos+color:', JSON.stringify(t2));
  // 砖块颜色采样：(1,1) 是砖列 -> (16+8, 16+8)
  const t3 = await page.evaluate(() => window.sample(24, 24));
  console.log('brick tile px (expect orange 212,136,32):', t3);
  // 水/树/钢检查: stage1 (6,3)=钢 -> (104, 56)
  const t4 = await page.evaluate(() => window.sample(104, 56));
  console.log('steel tile px (expect gray):', t4);
  // HUD: 1UP 文字
  const t5 = await page.evaluate(() => window.sample(208+8, 4+4));
  console.log('HUD 1UP px (expect yellow):', t5);
  await browser.close();
})();
