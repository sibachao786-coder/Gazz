#!/usr/bin/env node
/**
 * Shooting War — Auto Hack (Node.js CLI)
 * Created by @XuanCuong2006
 * Single-file version — no run.bat needed
 */

const { chromium } = require('playwright');
const readline = require('readline');

// ============================================================
// READLINE SETUP
// ============================================================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  console.log('\n==========================================');
  console.log('   SHOOTING WAR - AOV');
  console.log('   Created by @XuanCuong2006');
  console.log('==========================================\n');

  // Lấy SSO KEY từ args hoặc prompt
  let ssoKey = process.argv[2];
  if (!ssoKey) {
    ssoKey = await askQuestion('SSO KEY: ');
    if (!ssoKey.trim()) {
      console.error('❌ SSO KEY không được để trống!');
      rl.close();
      process.exit(1);
    }
  }

  rl.close();

  console.log('\n⏳ Xử lý...\n');

  // Game hack script (embedded)
  const hackScript = `
(function() {
  'use strict';
  if (window.__XuanCuong2006__) return;
  window.__XuanCuong2006__ = true;
  console.log('Telegram: @XuanCuong2006');

  const SPEED = 50;
  const TIMES = [0, 23, 32, 37, 42, 46, 51, 56];
  const TOTAL = 316;
  const KILLS = { 7: [51, 56] };
  let game = null, loop = null;
  let lvlStart = 0, curLvl = 0;
  let realStart = 0;

  function deepSearch(obj, d) {
    if (d > 6 || !obj || typeof obj !== 'object') return null;
    try {
      if (obj.monsters instanceof Array && obj.bullets instanceof Array &&
          obj.levels instanceof Array && 'playElapsed' in obj && 'isPlaying' in obj) {
        return obj;
      }
      for (const k of Object.keys(obj)) {
        if (k === 'parent' || k === 'renderer' || k === 'stage') continue;
        try { const r = deepSearch(obj[k], d + 1); if (r) return r; } catch (e) {}
      }
    } catch (e) {}
    return null;
  }

  // Hook PixiJS
  const origInit = globalThis.__PIXI_APP_INIT__;
  globalThis.__PIXI_APP_INIT__ = function(app, v) {
    if (origInit) origInit.call(globalThis, app, v);
    setTimeout(tryFind, 500);
    setTimeout(tryFind, 1500);
    setTimeout(tryFind, 3000);
  };

  function startHacks() {
    if (!game || game._hx) return;
    game._hx = true;
    console.log('[HACK] Game found!');
    if (game._tick) {
      const o = game._tick;
      game._tick = function(t) { return o.call(this, Math.min(t * SPEED, 3000)); };
      console.log('[HACK] Speed: ' + SPEED + 'x');
    }
    if (game._onGameStart) {
      const _ogs = game._onGameStart;
      game._onGameStart = function() {
        if (!this.levels || !this.levels.length) return;
        return _ogs.call(this);
      };
    }
    // Auto-start game
    let startAttempts = 0;
    function tryAutoStart() {
      startAttempts++;
      if (!game || game.isPlaying || game.isGameOver) {
        if (game && game.isPlaying) console.log('[HACK] Game is playing — auto-start done');
        return;
      }
      console.log('[HACK] Auto-start #' + startAttempts);
      if (game._onStartBtnPress) {
        try { game._onStartBtnPress(); } catch (e) { console.log('[HACK] Start error: ' + e.message); }
      }
      if (startAttempts < 15) setTimeout(tryAutoStart, 3000);
    }
    setTimeout(tryAutoStart, 3000);
    loop = setInterval(tick, 30);
  }

  function tick() {
    if (!game || game.isGameOver) return;
    if (game.inLevelTitle && game.levelTitleTimer < 900) game.levelTitleTimer = 999;
    if (!game.isPlaying) return;

    const mons = game.monsters;
    if (!mons) return;
    const lv = (game.currentLevelIndex || 0) + 1;
    const el = game.playElapsed || 0;

    if (lv !== curLvl) { 
      curLvl = lv; 
      game._kp = 0; 
      game._pl = false; 
      console.log('[HACK] Màn ' + lv + ' | Game:' + Math.round(el) + 's | Real:' + (realStart ? ((Date.now()-realStart)/1000).toFixed(1) : '?') + 's'); 
    }
    if (game.isPlaying && !game._pl) { 
      game._pl = true; 
      lvlStart = el; 
      if (!realStart) realStart = Date.now(); 
    }
    if (!game.isPlaying) { game._pl = false; }

    const phases = KILLS[lv] || [TIMES[lv]];
    const pi = game._kp || 0;
    const next = phases[pi];
    if (next === undefined || el - lvlStart < next) {
      for (let i = 0; i < mons.length; i++) {
        const m = mons[i];
        if (!m || m.dying || m.hp <= 0) continue;
        try { m.t = 0.5; m.lane = 'center'; } catch (e) {}
      }
      if (game.levelLaneSpeed !== undefined) game.levelLaneSpeed = 0;
      return;
    }

    game._kp = pi + 1;
    const last = pi >= phases.length - 1;
    const idx = lv - 1;

    if (lv === 7 && pi === 0) {
      for (let i = mons.length - 1; i >= 0; i--) {
        const m = mons[i];
        if (!m || m.isBoss) continue;
        try { m.sprite?.destroy(); m.hpBar?.destroy(); m.shadow?.destroy(); } catch (e) {}
        if (game.minionKilled !== undefined) game.minionKilled++;
        mons.splice(i, 1);
      }
      if (game.levels && game.levels[idx]) {
        for (const min of game.levels[idx].minions || []) {
          game.minionSpawnedCount.set(min.type, min.qty);
        }
      }
      game.bossSpawned = false;
      try { game._spawnBoss(); } catch (e) {}
    } else if (last && lv >= 7) {
      for (let i = mons.length - 1; i >= 0; i--) {
        const m = mons[i]; if (!m) continue;
        try { m.sprite?.destroy(); m.hpBar?.destroy(); m.shadow?.destroy(); } catch (e) {}
        mons.splice(i, 1);
      }
      game.playElapsed = TOTAL;
      game.clearedLevelNum = 7;
      game.clearedLevelSecond = TOTAL;
      const realSec = realStart ? ((Date.now() - realStart) / 1000).toFixed(1) : '?';
      console.log('[DONE] Game cleared! Time: ' + TOTAL + 's | Real: ' + realSec + 's | Level: 7');
      try { game._gameCleared(); } catch (e) {}

      setTimeout(async () => {
        try {
          const r = await fetch('/api/app/game/get_top', { credentials: 'include' });
          const d = await r.json();
          if (d.topInfos) {
            for (const p of d.topInfos) {
              if (p.myRank) {
                console.log('[BXH] Phase ' + p.phaseId + ' — Rank: #' + p.myRank + ' | Time: ' + (p.myResult?.second || '?') + 's | Màn: ' + (p.myResult?.levelNum || '?'));
                if (p.top) {
                  console.log('[BXH] === TOP 5 ===');
                  p.top.slice(0, 5).forEach(e => console.log('  #' + e.rank + ' ' + e.name + ' — Màn ' + (e.result?.levelNum||'?') + ' | ' + (e.result?.second||'?') + 's'));
                }
                break;
              }
            }
          }
        } catch(e) { console.log('[BXH] Error: ' + e.message); }
        window.__eni_done = { time: TOTAL, level: 7, real: realSec, at: Date.now() };
      }, 5000);

      setTimeout(async () => {
        try {
          const r = await fetch('/api/app/game/get_top', { credentials: 'include' });
          const d = await r.json();
          if (d.topInfos) {
            for (const p of d.topInfos) {
              if (p.myRank) {
                console.log('[BXH] Phase ' + p.phaseId + ' — Rank: #' + p.myRank);
                if (p.myResult) console.log('[BXH] Result: Màn ' + (p.myResult.levelNum || '?') + ' | ' + (p.myResult.second || '?') + 's');
                return;
              }
            }
            for (const p of d.topInfos) {
              if (p.top) {
                for (const e of p.top) {
                  if (e.name === game._playerName || e.userId === game._userId) {
                    console.log('[BXH] Phase ' + p.phaseId + ' — Rank: #' + e.rank + ' / ' + p.top.length);
                    return;
                  }
                }
              }
            }
            console.log('[BXH] Not in leaderboard yet');
          }
        } catch (e) { console.log('[BXH] Error: ' + e.message); }
      }, 4000);
    } else {
      try { game._startLevel(lv); } catch (e) {}
    }
  }

  const _o = XMLHttpRequest.prototype.open;
  const _s = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(m, u, ...a) { this._u = u; this._m = m; return _o.call(this, m, u, ...a); };
  XMLHttpRequest.prototype.send = function(body) {
    if (this._u && this._u.includes('/game/update_status') && this._m === 'POST') {
      try { let d = JSON.parse(body); (d.data || d).level = 7; (d.data || d).sec = TOTAL; (d.data || d).completed = true; body = JSON.stringify(d); } catch (e) {}
    }
    return _s.call(this, body);
  };

  function tryFind() {
    if (game) return true;
    game = deepSearch(window, 0);
    if (!game) {
      const c = document.querySelector('canvas');
      if (c) {
        let el = c.parentElement;
        for (let i = 0; i < 20 && el; i++) {
          const fk = Object.keys(el).find(k => k.startsWith('__reactFiber'));
          if (fk) {
            let fiber = el[fk];
            for (let j = 0; j < 80 && fiber; j++) {
              let ms = fiber.memoizedState;
              while (ms) {
                const v = ms.memoizedState;
                if (v && typeof v === 'object') {
                  if (v.current && v.current.monsters instanceof Array && 'playElapsed' in v.current) { game = v.current; break; }
                  if (v.monsters instanceof Array && 'playElapsed' in v) { game = v; break; }
                }
                ms = ms.next;
              }
              if (game) break;
              if (fiber.stateNode && typeof fiber.stateNode === 'object') {
                for (const k of Object.keys(fiber.stateNode)) {
                  try { const v = fiber.stateNode[k]; if (v && v.monsters instanceof Array && 'playElapsed' in v) { game = v; break; } } catch (e) {}
                }
              }
              if (game) break;
              fiber = fiber.return || fiber.child;
            }
          }
          if (game) break;
          el = el.parentElement;
        }
      }
    }
    if (game) {
      console.log('[HACK] Game found!');
      startHacks();
      return true;
    }
    return false;
  }

  setInterval(tryFind, 300);
})();
`;

  try {
    // Launch browser
    console.log('🚀 Khởi động trình duyệt...\n');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    // Log console
    page.on('console', msg => {
      const t = msg.text();
      if (t.includes('[HACK]') || t.includes('[DONE]') || t.includes('[BXH]') || t.includes('[SSO]')) {
        console.log('  ' + t);
      }
    });

    // ============================================================
    // STEP 1: Convert SSO KEY to Event Link
    // ============================================================
    console.log('📝 Chuyển đổi SSO KEY...\n');
    await page.goto('https://lqchecker.pro/shooting/', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });

    const converted = await page.evaluate(async (key) => {
      // Find input
      const inputs = document.querySelectorAll('textarea, input[type="text"], input:not([type])');
      let inputEl = null;
      for (const el of inputs) {
        if (el.offsetParent !== null && !el.disabled) { 
          inputEl = el; 
          break; 
        }
      }
      if (!inputEl) return { error: 'No input found' };

      // Fill SSO key
      inputEl.value = key;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));

      // Find convert button
      const btns = document.querySelectorAll('button, a, input[type="submit"], div[class*="btn"], div[class*="button"]');
      let btn = null;
      for (const b of btns) {
        if (b.textContent?.includes('Chuyển') || b.textContent?.includes('Convert') ||
            b.className?.includes('convert') || b.className?.includes('submit')) {
          if (b.offsetParent !== null) { 
            btn = b; 
            break; 
          }
        }
      }
      if (!btn) {
        for (const b of document.querySelectorAll('*')) {
          if (b.textContent?.trim() === 'Chuyển đổi' && b.offsetParent !== null) { 
            btn = b; 
            break; 
          }
        }
      }
      if (!btn) return { error: 'No convert button found' };

      btn.click();
      await new Promise(r => setTimeout(r, 3000));

      const bodyText = document.body.innerText;
      const urlMatch = bodyText.match(/https?:\/\/shootingwar\.lienquan\.garena\.vn\/connect\/garena\/callback\?access_token=[a-f0-9]+/i);
      if (urlMatch) return { url: urlMatch[0] };

      return { error: 'No event link found in result' };
    }, ssoKey);

    if (converted.error) {
      console.error('❌ Chuyển đổi SSO thất bại: ' + converted.error);
      await browser.close();
      process.exit(1);
    }

    const eventLink = converted.url;
    console.log('✅ Event Link: ' + eventLink.substring(0, 80) + '...\n');

    // ============================================================
    // STEP 2: Play game with hack
    // ============================================================
    console.log('🎮 Vào game và chạy hack...\n');
    await page.addInitScript(hackScript);
    await page.goto(eventLink, { waitUntil: 'networkidle', timeout: 60000 });
    console.log('📄 Title: ' + await page.title() + '\n');
    await page.waitForTimeout(5000);

    // ============================================================
    // STEP 3: Wait for result
    // ============================================================
    console.log('⏳ Đợi kết quả...\n');
    let done = false;
    for (let i = 0; i < 300 && !done; i++) {
      await page.waitForTimeout(1000);
      const r = await page.evaluate(() => {
        if (window.__eni_done) {
          return { 
            over: true, 
            time: window.__eni_done.time, 
            lv: window.__eni_done.level,
            real: window.__eni_done.real
          };
        }
        return null;
      });
      if (r && r.over) {
        done = true;
        console.log('\n✅ HOÀN THÀNH!');
        console.log('   ⏱️  Game Time: ' + r.time + 's');
        console.log('   🎯 Level: ' + r.lv);
        console.log('   ⚡ Real Time: ' + r.real + 's\n');
      } else if (i % 10 === 0 && i > 0) {
        console.log('[ENI] Still waiting... (' + i + 's)');
      }
    }

    if (!done) {
      console.log('⚠️  Hết thời gian chờ\n');
    }

    await browser.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Lỗi: ' + error.message);
    process.exit(1);
  }
})();
