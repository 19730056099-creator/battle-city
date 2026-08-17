// 自动试玩：机器人玩一局坦克大战，收集统计数据
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('file:///home/mengzhouyi/01/battle-city/index.html');
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__dbg = []; });

  // 安装机器人：在页面内运行
  await page.evaluate(() => {
    window.bot = {
      step: 0,
      // 守基地战术：贴着基地两侧防守，优先拦截逼近的敌人
      think() {
        const s = window.TG.state();
        if (s.mode !== 'play') return;
        const p = s.players[0];
        if (!p.alive) return;
        let best = null, bd = 1e9;
        for (const e of s.enemies) {
          if (e.state !== 'active') continue;
          // 威胁度：靠近基地的敌人优先
          const threat = (e.y > 140 ? 0 : 1) + Math.max(0, (e.y - 100)) / 200;
          const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) + threat * 300;
          if (d < bd) { bd = d; best = e; }
        }
        ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].forEach(k => window.TG.key(k, false));
        if (!best) {
          // 无敌人：回防基地上方
          const home = [72, 176];
          const dx = home[0] - p.x, dy = home[1] - p.y;
          if (Math.abs(dx) > 4) window.TG.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', true);
          else if (Math.abs(dy) > 4) window.TG.key(dy > 0 ? 'ArrowDown' : 'ArrowUp', true);
          return;
        }
        const dx = best.x - p.x, dy = best.y - p.y;
        const nearBase = best.y > 130;
        // 对齐射击
        const alignedX = Math.abs(dy) < 14 && Math.abs(dx) > 10;
        const alignedY = Math.abs(dx) < 14 && Math.abs(dy) > 10;
        // 贴身敌人：直接射击
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
          if (Math.abs(dx) > Math.abs(dy)) window.TG.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', true);
          else window.TG.key(dy > 0 ? 'ArrowDown' : 'ArrowUp', true);
          window.TG.press('Space');
          return;
        }
        // 不朝基地射击：仅当子弹轨迹会穿过老鹰区域时
        const bulletCrossesBase = (() => {
          // 估算子弹路径 (p -> best 方向)
          if (Math.abs(dy) < 14) {
            // 水平射击
            const bulletY = p.y + 8;
            if (bulletY > 176 && bulletY < 207) {
              // 子弹会横穿老鹰 x 范围 [88,119]
              const x0 = Math.min(p.x, best.x) + 8, x1 = Math.max(p.x, best.x) + 8;
              if (x0 < 119 && x1 > 88) return true;
            }
          } else if (Math.abs(dx) < 14) {
            // 垂直射击
            const bulletX = p.x + 8;
            if (bulletX > 88 && bulletX < 119) {
              const y0 = Math.min(p.y, best.y) + 8, y1 = Math.max(p.y, best.y) + 8;
              if (y0 < 207 && y1 > 176) return true;
            }
          }
          return false;
        })();
        if (nearBase && !bulletCrossesBase) {
          if (alignedX) { window.TG.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', true); window.TG.press('Space'); }
          else if (alignedY) { window.TG.key(dy > 0 ? 'ArrowDown' : 'ArrowUp', true); window.TG.press('Space'); }
          else if (Math.abs(dx) > Math.abs(dy)) { window.TG.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', true); }
          else { window.TG.key(dy > 0 ? 'ArrowDown' : 'ArrowUp', true); }
        } else if (Math.abs(dy) < 14 && Math.abs(dx) > 10) {
          window.TG.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', true);
          window.TG.press('Space');
        } else if (Math.abs(dx) < 14 && Math.abs(dy) > 10) {
          window.TG.key(dy > 0 ? 'ArrowDown' : 'ArrowUp', true);
          window.TG.press('Space');
        } else if (Math.abs(dx) > Math.abs(dy)) {
          window.TG.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', true);
        } else {
          window.TG.key(dy > 0 ? 'ArrowDown' : 'ArrowUp', true);
        }
      },
      tick() {
        this.step++;
        this.think();
      }
    };
    // 接管主循环：每帧跑一次机器人
    window.botTimer = setInterval(() => window.bot.tick(), 16);
  });

  // 开始游戏
  await page.evaluate(() => window.TG.start(false));
  // 老鹰死亡时打印击杀现场
  setInterval(async () => {
    const r = await page.evaluate(() => window.__dbg);
    if (r && r.length) {
      console.log('EAGLE LOG:', JSON.stringify(r));
      window.__dbg.length = 0;
    }
  }, 1000);

  // 试玩 300 秒
  const T = 420000;
  const samples = [];
  const start = Date.now();
  while (Date.now() - start < T) {
    await page.waitForTimeout(5000);
    const s = await page.evaluate(() => {
      const st = window.TG.state();
      return { t: Math.round((Date.now() - window.__t0) / 1000), mode: st.mode, stage: st.stage,
               score: st.score[0], lives: st.lives[0], enemiesLeft: st.enemiesLeft,
               kills: st.kills, enemies: st.enemies.length, frame: st.frame };
    });
    s.t = Math.round((Date.now() - start) / 1000);
    if (s.t % 30 === 0) await page.screenshot({ path: '../shots/run_' + s.t + 's.png' });
    samples.push(s);
    console.log(JSON.stringify(s));
    if (s.mode === 'over' || s.mode === 'title') break;
  }
  await page.evaluate(() => clearInterval(window.botTimer));
  await page.screenshot({ path: '../shots/autoplay_end.png' });
  await browser.close();
  console.log('=== TEST DONE ===');
})();
