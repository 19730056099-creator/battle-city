// 自动化试玩脚本
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(800);

  // 标题画面截图
  await page.screenshot({ path: 'shots/title.png' });
  console.log('errors so far:', errors);

  // 开始游戏
  await page.evaluate(() => { window.TG.start(false); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/stage_intro.png' });
  console.log('stage intro:', await page.evaluate(() => window.TG.state().mode));

  // 进入游戏后截图
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/play_1.png' });
  const st = await page.evaluate(() => window.TG.state());
  console.log('play state:', JSON.stringify(st));

  // 简单操控：向右移动 2 秒
  await page.evaluate(() => window.TG.key('ArrowRight', true));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.TG.key('ArrowRight', false));
  await page.screenshot({ path: 'shots/play_2.png' });
  console.log('after move:', JSON.stringify(await page.evaluate(() => window.TG.state()).then(s => s.players[0])));

  await browser.close();
  console.log('FINAL ERRORS:', errors);
})();
