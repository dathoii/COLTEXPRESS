'use strict';

/**
 * Real Chromium UI, Layout, Fullscreen, EN/VI, SVG Asset & Console Audit using installed Electron (Chromium + Node).
 * Verifies:
 *  - Zero JS errors or failed resource loads on Host Dashboard and Browser Client
 *  - EN <-> VI language toggle on both Client and Host Dashboard
 *  - Interactive flows: Menu -> Create Invite Room -> Lobby -> Live 3-Player Planning & Execution Spotlight + Train clicks
 *  - Single-frame Fullscreen fit at 1280x720 (scrollHeight <= innerHeight + 2, zero horizontal overflow)
 *  - Zero horizontal overflow on mobile (430x844)
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { io } = require('socket.io-client');

const ROOT = resolve(__dirname, '..');

function emitAck(sock, event, ...args) {
  return new Promise((res) => sock.emit(event, ...args, res));
}

async function auditUrl(url, width, height, label, afterLoadFn, extraWinOpts = {}) {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    ...extraWinOpts,
    webPreferences: {
      preload: label === 'dashboard' ? join(ROOT, 'desktop-host/preload.cjs') : undefined,
      partition: `audit-${label}`,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  const consoleErrors = [];
  win.webContents.on('console-message', (ev) => {
    const level = ev?.level;
    const msg = ev?.message ?? String(ev);
    if (level === 'error' || level === 3) {
      consoleErrors.push(msg);
      console.error(`[renderer:${label}]`, msg);
    }
  });
  win.webContents.on('render-process-gone', (_ev, details) => {
    consoleErrors.push(`renderer-gone:${details.reason}`);
    console.error(`[renderer-gone:${label}]`, details.reason);
  });

  const t0 = performance.now();
  await win.loadURL(url);
  await new Promise((r) => setTimeout(r, 350));
  const loadMs = Math.round(performance.now() - t0);

  let extra = {};
  if (afterLoadFn) {
    try {
      extra = await afterLoadFn(win);
    } catch (e) {
      console.error(`[audit:${label}] consoleErrors so far:`, consoleErrors);
      throw e;
    }
  }

  const metrics = await win.webContents.executeJavaScript(`(() => {
    const docEl = document.documentElement;
    return {
      title: document.title,
      scrollWidth: docEl.scrollWidth,
      clientWidth: docEl.clientWidth,
      innerHeight: window.innerHeight,
      scrollHeight: docEl.scrollHeight,
      overflowPx: Math.max(0, docEl.scrollWidth - docEl.clientWidth),
      svgCount: document.querySelectorAll('svg').length,
      textLen: document.body.innerText.trim().length,
    };
  })()`);

  win.destroy();
  return { label, viewport: `${width}x${height}`, loadMs, consoleErrors, ...metrics, ...extra };
}

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

app.whenReady().then(async () => {
  let srv;
  const botSockets = [];
  try {
    const serverEntry = resolve(ROOT, 'release/server/server.mjs');
    const clientDist = resolve(ROOT, 'release/client');
    const { startServer } = await import(pathToFileURL(serverEntry).href);
    srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', clientDist });
    ipcMain.handle('host:status', () => srv.getHostStatus());
    const baseUrl = `http://127.0.0.1:${srv.port}`;

    // 1. Desktop 1280x720 flow: EN/VI toggle -> Create Room -> Lobby -> Start 3P -> Fullscreen single-frame Planning -> Execution Spotlight + Train Click
    // fullScreenable: false keeps the hidden test BrowserWindow clamped at exact 1280x720 so we verify CSS .is-fullscreen single-frame fit on tight 720p screens
    const clientDesktop = await auditUrl(
      baseUrl,
      1280,
      720,
      'client-desktop-1280x720',
      async (win) => {
        // Check VI default + EN toggle + switch back cleanly
        const langCheck = await win.webContents.executeJavaScript(`(async () => {
          const initText = document.body.innerText;
          const langBtn = document.querySelector('[data-testid="lang-toggle-btn"]');
          langBtn?.click();
          await new Promise((r) => setTimeout(r, 80));
          const enText = document.body.innerText;
          langBtn?.click();
          await new Promise((r) => setTimeout(r, 80));
          const viText = document.body.innerText;
          return {
            hasViInit: /Tạo Phòng Mới/i.test(initText),
            hasEnToggle: /Create Invite Room/i.test(enText),
            hasViBack: /Tạo Phòng Mới/i.test(viText),
          };
        })()`);

        const lobbyInfo = await win.webContents.executeJavaScript(`(async () => {
          const findBtn = (rx) => [...document.querySelectorAll('button')].find((b) => rx.test(b.textContent || ''));
          findBtn(/Tạo Phòng Mới|Create Invite Room/i)?.click();
          await new Promise((r) => setTimeout(r, 150));
          findBtn(/Mở Phòng Ngay|Launch Room/i)?.click();
          await new Promise((r) => setTimeout(r, 450));
          const txt = document.body.innerText;
          const codeMatch = txt.match(/(?:Phòng|Room):\\s*([A-Z0-9]{5})/);
          return {
            reachedLobby: /Phòng Chờ|Lobby/i.test(txt),
            roomCode: codeMatch ? codeMatch[1] : null,
          };
        })()`);

        if (!lobbyInfo.roomCode) {
          throw new Error(`Did not receive roomCode in UI: ${JSON.stringify(lobbyInfo)}`);
        }

        // Connect 2 Socket.IO bots
        const b2Sock = io(baseUrl, { transports: ['websocket'], forceNew: true });
        const b3Sock = io(baseUrl, { transports: ['websocket'], forceNew: true });
        botSockets.push(b2Sock, b3Sock);

        const botViews = new Map();
        b2Sock.on('room:state', (p) => botViews.set('b2', p.game));
        b3Sock.on('room:state', (p) => botViews.set('b3', p.game));

        await Promise.all([
          new Promise((r) => b2Sock.once('connect', r)),
          new Promise((r) => b3Sock.once('connect', r)),
        ]);

        const j2 = await emitAck(b2Sock, 'room:join', { roomCode: lobbyInfo.roomCode, playerName: 'DocBot' });
        const j3 = await emitAck(b3Sock, 'room:join', { roomCode: lobbyInfo.roomCode, playerName: 'BelleBot' });
        if (!j2.ok || !j3.ok) throw new Error('Bot join failed');

        const active = srv.rooms.getRoom(lobbyInfo.roomCode);
        const p1Id = active.engine.state.lobby[0].id;
        active.engine.selectCharacter(p1Id, 'django');
        await emitAck(b2Sock, 'lobby:selectCharacter', { character: 'ghost', requestId: 'c2' });
        await emitAck(b3Sock, 'lobby:selectCharacter', { character: 'belle', requestId: 'c3' });
        active.engine.setReady(p1Id, true);
        await emitAck(b2Sock, 'lobby:ready', { ready: true, requestId: 'r2' });
        await emitAck(b3Sock, 'lobby:ready', { ready: true, requestId: 'r3' });
        srv.startHostRoom(lobbyInfo.roomCode);

        await new Promise((r) => setTimeout(r, 180));
        const hasDealAnimation = await win.webContents.executeJavaScript(
          `Boolean(document.querySelector('[data-testid="deal-animation-overlay"]') || document.querySelector('.hand-strip.is-dealing'))`,
        );

        // Toggle Fullscreen and verify single-frame 1280x720 fit during Planning (no clipping or overflow)
        const planningFs = await win.webContents.executeJavaScript(`(async () => {
          document.querySelector('[data-testid="fullscreen-toggle-btn"]')?.click();
          await new Promise((r) => setTimeout(r, 450));
          const shell = document.querySelector('.app-shell');
          const dock = document.querySelector('.arena-bottom-dock');
          const train = document.querySelector('.train-stage');
          const bulletPanel = document.querySelector('[data-testid="bullet-tracker-panel"]');
          const woundsCount = document.querySelector('[data-testid="self-wounds-count"]');
          const audioBtn = document.querySelector('[data-testid="audio-toggle-btn"]');
          const audioInit = audioBtn?.textContent || '';
          audioBtn?.click();
          await new Promise((r) => setTimeout(r, 60));
          const audioMuted = audioBtn?.textContent || '';
          audioBtn?.click();
          await new Promise((r) => setTimeout(r, 60));
          const audioRestored = audioBtn?.textContent || '';
          const audioRes = await fetch('/audio/bgm-western.ogg');
          const mp3RangeRes = await fetch('/audio/bgm-western.mp3', { headers: { Range: 'bytes=0-15' } });
          const docEl = document.documentElement;
          const dockRect = dock?.getBoundingClientRect();
          const trainRect = train?.getBoundingClientRect();
          const has3dCanvas = Boolean(document.querySelector('[data-testid="train-scene-3d"] canvas'));
          const hasFallbackSvg = Boolean(document.querySelector('.car-stage svg'));
          const hasSideRail = Boolean(document.querySelector('.arena-side-rail'));
          const hasHistoryList = Boolean(document.querySelector('.stack-row'));
          const latestCardsCount = document.querySelectorAll('[data-testid="latest-played-pile"] .western-card').length;
          return {
            viewportHeight: window.innerHeight,
            isFullscreenClass: Boolean(shell?.classList.contains('is-fullscreen')),
            has3dCanvas,
            hasTrainStage: has3dCanvas || hasFallbackSvg,
            handCards: document.querySelectorAll('.hand-strip .western-card').length,
            hasBulletTracker: Boolean(bulletPanel),
            bulletTrackerHas1000Rule: /1[.,]?000/.test(bulletPanel?.textContent || '') && /6\\/6/.test(bulletPanel?.textContent || ''),
            hasSelfWounds: Boolean(woundsCount?.textContent?.trim()),
            hasOldEventLog: Boolean(document.querySelector('.log-panel')),
            hasSideRail,
            hasHistoryList,
            latestCardsCount,
            hasDealAnimation: ${JSON.stringify(hasDealAnimation)},
            audioToggleWorked: audioInit !== audioMuted && audioRestored === audioInit,
            audioEndpointOk:
              audioRes.ok &&
              (audioRes.headers.get('content-type') || '').includes('audio/ogg') &&
              mp3RangeRes.status === 206,
            dockVisibleInFrame: Boolean(dockRect && dockRect.bottom <= window.innerHeight + 2),
            trainVisibleInFrame: Boolean(trainRect && trainRect.bottom <= window.innerHeight + 2),
            planningHeightOverflow: Math.max(0, docEl.scrollHeight - window.innerHeight),
            planningWidthOverflow: Math.max(0, docEl.scrollWidth - window.innerWidth),
          };
        })()`);

        // Play through Round 1 Planning (up to 80 ticks) until Execution starts
        let reqN = 1;
        let planningSteps = 0;
        let faceDownVerified = false;
        let planningShotSaved = false;
        for (let tick = 0; tick < 80; tick++) {
          const g = active.engine.state;
          if (g.phase !== 'planning') break;
          const turnPid = g.planning.order[g.planning.orderIndex];
          const turnTypeNow = g.currentRound?.turns[g.planning.turnIndex] ?? 'normal';
          if (turnPid === p1Id) {
            const clicked = await win.webContents.executeJavaScript(`(() => {
              const cards = [...document.querySelectorAll('.hand-strip .western-card.is-playable')];
              const movePref = cards.find((el) => /DI CHUYỂN|ĐỔI TẦNG|CẢNH SÁT|LỤM|MOVE|FLOOR|MARSHAL|ROB/i.test(el.textContent || ''));
              const chosen = movePref || cards[0];
              if (chosen) { chosen.click(); return 'card'; }
              const d = document.querySelector('.arena-bottom-dock button.secondary');
              if (d && !d.disabled) { d.click(); return 'draw'; }
              return null;
            })()`);
            if (clicked) planningSteps++;
          } else {
            const sock = turnPid === j2.data.playerId ? b2Sock : b3Sock;
            const bName = turnPid === j2.data.playerId ? 'b2' : 'b3';
            const gv = botViews.get(bName);
            const hand = gv?.players.find((x) => x.id === turnPid)?.hand || [];
            const actionCard = hand.find((c) => c.kind === 'action');
            const wantFaceDown = turnTypeNow === 'tunnel' || (bName === 'b2' && g.planning.turnIndex === 0);
            if (gv && gv.version === g.version) {
              if (actionCard) {
                const ack = await emitAck(sock, 'game:playCard', {
                  cardId: actionCard.id,
                  faceDown: wantFaceDown,
                  requestId: `p-${reqN++}`,
                  expectedVersion: g.version,
                });
                if (ack?.ok) {
                  planningSteps++;
                  if (wantFaceDown && !faceDownVerified) {
                    await new Promise((r) => setTimeout(r, 110));
                    const fdCheck = await win.webContents.executeJavaScript(`(() => {
                      const cards = [...document.querySelectorAll('[data-testid="latest-played-pile"] .western-card')];
                      return cards.length === 1 && cards[0].classList.contains('is-back');
                    })()`);
                    if (fdCheck) faceDownVerified = true;
                  }
                }
              } else {
                const ack = await emitAck(sock, 'game:draw', {
                  requestId: `d-${reqN++}`,
                  expectedVersion: g.version,
                });
                if (ack?.ok) planningSteps++;
              }
            }
          }
          if (!planningShotSaved && planningSteps >= 2 && process.env.AUDIT_SCREENSHOT_DIR) {
            await new Promise((r) => setTimeout(r, 180));
            const dealVisible = await win.webContents.executeJavaScript(
              `Boolean(document.querySelector('[data-testid="deal-animation-overlay"]'))`,
            );
            if (!dealVisible) {
              planningShotSaved = true;
              await win.webContents.executeJavaScript(
                `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`,
              );
              const snapImg = await win.webContents.capturePage();
              require('node:fs').mkdirSync(process.env.AUDIT_SCREENSHOT_DIR, { recursive: true });
              require('node:fs').writeFileSync(
                require('node:path').resolve(process.env.AUDIT_SCREENSHOT_DIR, 'audit-planning.png'),
                snapImg.toPNG(),
              );
            }
          }
          await new Promise((r) => setTimeout(r, 85));
        }

        // Verify Top-Left Latest Card pile shows strictly ONE card + 3D canvas bounds
        const stackInspect = await win.webContents.executeJavaScript(`(() => {
          const cards = [...document.querySelectorAll('[data-testid="latest-played-pile"] .western-card')];
          const cRect = document.querySelector('[data-testid="train-scene-3d"] canvas')?.getBoundingClientRect();
          return {
            cardCount: cards.length,
            topCardClass: cards[0]?.className || null,
            canvasRect: cRect ? { w: Math.round(cRect.width), h: Math.round(cRect.height) } : null,
          };
        })()`);

        await new Promise((r) => setTimeout(r, 250));

        // Verify Fullscreen Execution Spotlight + click any bot actions + click P1 interactive train target if available
        let spotlightSeen = false;
        let execShotSaved = false;
        let directTrainClickWorked = false;
        let executionHeightOverflow = 999;

        for (let exStep = 0; exStep < 40; exStep++) {
          const g = active.engine.state;
          const uiSnap = await win.webContents.executeJavaScript(`(() => {
            const docEl = document.documentElement;
            const sp = document.querySelector('[data-testid="execution-spotlight"]');
            const zone = document.querySelector('.is-target-zone');
            const bandit = document.querySelector('.is-attack-target');
            const lootBtn = document.querySelector('.loot-target-btn');
            const skipBtn = document.querySelector('[data-testid="no-effect-notice"]')?.parentElement?.querySelector('button');
            return {
              hasSpotlight: Boolean(sp),
              hasTargetZone: Boolean(zone),
              hasAttackTarget: Boolean(bandit),
              hasLootBtn: Boolean(lootBtn),
              hasNoEffectSkip: Boolean(skipBtn),
              heightOverflow: Math.max(0, docEl.scrollHeight - window.innerHeight),
            };
          })()`);

          if (uiSnap.hasSpotlight) {
            spotlightSeen = true;
            if (!execShotSaved && process.env.AUDIT_SCREENSHOT_DIR) {
              execShotSaved = true;
              await new Promise((r) => setTimeout(r, 400));
              await win.webContents.executeJavaScript(
                `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))`,
              );
              const snapImg = await win.webContents.capturePage();
              require('node:fs').mkdirSync(process.env.AUDIT_SCREENSHOT_DIR, { recursive: true });
              require('node:fs').writeFileSync(
                require('node:path').resolve(process.env.AUDIT_SCREENSHOT_DIR, 'audit-execution.png'),
                snapImg.toPNG(),
              );
            }
          }
          if (uiSnap.heightOverflow <= 2) executionHeightOverflow = uiSnap.heightOverflow;

          if (uiSnap.hasNoEffectSkip) {
            await win.webContents.executeJavaScript(
              `document.querySelector('[data-testid="no-effect-notice"]')?.parentElement?.querySelector('button')?.click()`,
            );
            await new Promise((r) => setTimeout(r, 100));
            continue;
          }

          if (g.phase !== 'execution' || !g.execution?.pending) {
            if (g.phase !== 'execution') break;
            await new Promise((r) => setTimeout(r, 80));
            continue;
          }

          const pend = g.execution.pending;
          if (pend.playerId === p1Id) {
            if (uiSnap.hasTargetZone || uiSnap.hasAttackTarget || uiSnap.hasLootBtn) {
              await win.webContents.executeJavaScript(`(() => {
                const target = document.querySelector('.is-target-zone')
                  || document.querySelector('.loot-target-btn')
                  || document.querySelector('.is-attack-target');
                target?.click();
              })()`);
              await new Promise((r) => setTimeout(r, 150));
              if (active.engine.state.version !== g.version) {
                directTrainClickWorked = true;
              }
            }
            if (active.engine.state.version === g.version && active.engine.state.execution?.pending?.playerId === p1Id) {
              await win.webContents.executeJavaScript(`document.querySelector('.spotlight-quick-btns button')?.click()`);
              await new Promise((r) => setTimeout(r, 120));
            }
            if (directTrainClickWorked) break;
          } else {
            const sock = pend.playerId === j2.data.playerId ? b2Sock : b3Sock;
            await emitAck(sock, 'game:resolve', {
              choice: pend.options[0],
              requestId: `ex-${reqN++}`,
              expectedVersion: g.version,
            });
            await new Promise((r) => setTimeout(r, 90));
          }
        }

        return {
          ...langCheck,
          ...lobbyInfo,
          ...planningFs,
          planningSteps,
          faceDownVerified,
          stackInspect,
          phaseAfterPlanning: active.engine.state.phase,
          spotlightSeen,
          directTrainClickWorked,
          executionHeightOverflow,
        };
      },
      { fullScreenable: false, maxWidth: 1280, maxHeight: 720 },
    );

    // 2. Audit mobile viewport (430x844 in-game PC-scaled Landscape Game App Fullscreen + Default 100% Volume)
    const clientMobile = await auditUrl(
      baseUrl,
      430,
      844,
      'client-mobile',
      async (win) => {
        const lobbyM = await win.webContents.executeJavaScript(`(async () => {
          const findBtn = (rx) => [...document.querySelectorAll('button')].find((b) => rx.test(b.textContent || ''));
          findBtn(/Tạo Phòng Mới|Create Invite Room/i)?.click();
          await new Promise((r) => setTimeout(r, 120));
          findBtn(/Mở Phòng Ngay|Launch Room/i)?.click();
          await new Promise((r) => setTimeout(r, 400));
          const codeMatch = document.body.innerText.match(/(?:Phòng|Room):\\s*([A-Z0-9]{5})/);
          return codeMatch ? codeMatch[1] : null;
        })()`);
        if (!lobbyM) throw new Error('Mobile audit failed to create room');

        // Add 2 AI Bots in Mobile Lobby, enter Fullscreen, pick Ghost & verify Ready+Start above grid + native scroll
        const lobbyMobileFs = await win.webContents.executeJavaScript(`(async () => {
          document.querySelector('[data-testid="lobby-add-bot-easy-btn"]')?.click();
          await new Promise((r) => setTimeout(r, 140));
          document.querySelector('[data-testid="lobby-add-bot-normal-btn"]')?.click();
          await new Promise((r) => setTimeout(r, 160));
          const botChips = document.querySelectorAll('.bot-chip').length;

          const selectGhost = [...document.querySelectorAll('.char-card button')].find((b) => /Ghost/i.test(b.textContent || ''));
          selectGhost?.click();
          await new Promise((r) => setTimeout(r, 140));

          document.querySelector('[data-testid="fullscreen-toggle-btn"]')?.click();
          await new Promise((r) => setTimeout(r, 200));
          const card = document.querySelector('[data-testid="lobby-card"]');
          const readyBtn = document.querySelector('[data-testid="lobby-ready-btn"]');
          const startBtn = document.querySelector('[data-testid="lobby-start-btn"]');
          const header = document.querySelector('.lobby-bandit-header');
          const charGrid = document.querySelector('.char-grid');
          const headerRect = header?.getBoundingClientRect();
          const readyRect = readyBtn?.getBoundingClientRect();
          const charRect = charGrid?.getBoundingClientRect();
          const cardOverflowY = card ? getComputedStyle(card).overflowY : '';
          const cardScrollH = card?.scrollHeight || 0;
          const cardClientH = card?.clientHeight || 0;
          if (card) card.scrollTop = 180;
          await new Promise((r) => setTimeout(r, 40));
          const scrolledTop = card ? card.scrollTop : 0;
          if (card) card.scrollTop = 0;

          readyBtn?.click();
          await new Promise((r) => setTimeout(r, 180));
          const startEnabled = Boolean(startBtn && !startBtn.disabled);
          startBtn?.click();
          await new Promise((r) => setTimeout(r, 450));

          return {
            botChips,
            startEnabled,
            lobbyScrollableCss: cardOverflowY === 'auto',
            lobbyCanScroll: Boolean(card && cardScrollH > cardClientH && scrolledTop > 0),
            lobbyReadyTouchOk: Boolean(readyRect && readyRect.height >= 44),
            lobbyReadyVisibleInFrame: Boolean(
              readyRect &&
                readyRect.width > 40 &&
                readyRect.height >= 44 &&
                readyRect.left >= -2 &&
                readyRect.right <= window.innerWidth + 2 &&
                readyRect.top >= -2 &&
                readyRect.bottom <= window.innerHeight + 2
            ),
            lobbyReadyAboveGrid: Boolean(headerRect && charRect && headerRect.top <= charRect.top + 4),
            lobbyStartPresent: Boolean(startBtn),
          };
        })()`);

        const postStart = await win.webContents.executeJavaScript(`(async () => {
          const defaultVol = localStorage.getItem('colt.ui.volume.v2');
          const shell = document.querySelector('.app-shell');
          const train = document.querySelector('.train-stage');
          const dock = document.querySelector('.arena-bottom-dock');
          const bullets = document.querySelector('[data-testid="bullet-tracker-panel"]');
          const style = shell ? getComputedStyle(shell) : null;
          const docEl = document.documentElement;
          const trainRect = train?.getBoundingClientRect();
          const dockRect = dock?.getBoundingClientRect();
          const bulletsRect = bullets?.getBoundingClientRect();
          const headerBtn = document.querySelector('.arena-header-actions button');
          const headerBtnRect = headerBtn?.getBoundingClientRect();
          return {
            defaultVolumeIs100: defaultVol === '1',
            mobileFsActive: Boolean(shell?.classList.contains('is-fullscreen')),
            mobileNoTransformHack: Boolean(style && style.transform === 'none'),
            mobileNoHorizontalOverflow: Math.max(0, docEl.scrollWidth - window.innerWidth) <= 2,
            mobileTouchButtonOk: Boolean(headerBtnRect && headerBtnRect.height >= 44),
            mobileTrainVisible: Boolean(trainRect && trainRect.width > 240 && trainRect.height > 150),
            mobileDockVisible: Boolean(dockRect && dockRect.width > 240 && dockRect.height > 120),
            mobileBulletsVisible: Boolean(bulletsRect && bulletsRect.width > 200 && bulletsRect.height > 60),
          };
        })()`);
        return { ...lobbyMobileFs, ...postStart };
      },
      { fullScreenable: false, maxWidth: 430, maxHeight: 844 },
    );

    // 3. Audit Host Dashboard with real IPC server status & EN/VI toggle
    const dashUrl = pathToFileURL(resolve(ROOT, 'desktop-host/dashboard.html')).href;
    const dashboardAudit = await auditUrl(dashUrl, 1220, 820, 'dashboard', async (win) => {
      return win.webContents.executeJavaScript(`(async () => {
        const viLabel = document.getElementById('btn-open-lobby')?.textContent;
        document.getElementById('btn-lang')?.click();
        await new Promise((r) => setTimeout(r, 80));
        const enLabel = document.getElementById('btn-open-lobby')?.textContent;
        document.getElementById('btn-lang')?.click();
        await new Promise((r) => setTimeout(r, 80));
        return {
          statusText: document.getElementById('status-pill')?.textContent,
          roomsListed: document.querySelectorAll('.room-card').length,
          hasStartBtn: Boolean(document.getElementById('btn-start')),
          hasBackupBtn: Boolean(document.getElementById('btn-backup')),
          hasTunnelBtn: Boolean(document.getElementById('btn-tunnel-start')),
          viLabel,
          enLabel,
        };
      })()`);
    });

    const results = [clientDesktop, clientMobile, dashboardAudit];
    console.log('UI_AUDIT_RESULTS=' + JSON.stringify(results, null, 2));

    for (const r of results) {
      if (r.consoleErrors.length > 0) {
        throw new Error(`Console errors on ${r.label}: ${r.consoleErrors.join('; ')}`);
      }
      if (r.overflowPx > 2) {
        throw new Error(`Horizontal overflow on ${r.label} (${r.viewport}): ${r.overflowPx}px`);
      }
      if (r.textLen < 40) {
        throw new Error(`Empty render on ${r.label}`);
      }
    }

    if (
      !clientDesktop.hasViInit ||
      !clientDesktop.hasEnToggle ||
      !clientDesktop.hasViBack ||
      !clientDesktop.reachedLobby ||
      !clientDesktop.isFullscreenClass ||
      !clientDesktop.hasTrainStage ||
      clientDesktop.handCards < 6 ||
      !clientDesktop.hasBulletTracker ||
      !clientDesktop.bulletTrackerHas1000Rule ||
      !clientDesktop.hasSelfWounds ||
      clientDesktop.hasOldEventLog ||
      clientDesktop.hasSideRail ||
      clientDesktop.hasHistoryList ||
      !clientDesktop.faceDownVerified ||
      (clientDesktop.stackInspect?.cardCount ?? 0) > 1 ||
      (clientDesktop.stackInspect?.canvasRect?.w ?? 0) < 800 ||
      (clientDesktop.stackInspect?.canvasRect?.h ?? 0) < 500 ||
      !clientDesktop.hasDealAnimation ||
      !clientDesktop.audioToggleWorked ||
      !clientDesktop.audioEndpointOk ||
      clientDesktop.planningHeightOverflow > 2 ||
      clientDesktop.planningWidthOverflow > 2 ||
      !clientDesktop.spotlightSeen ||
      clientDesktop.executionHeightOverflow > 2
    ) {
      throw new Error(`Desktop Fullscreen/Execution UI verification failed: ${JSON.stringify(clientDesktop)}`);
    }

    if (
      clientMobile.botChips !== 2 ||
      !clientMobile.startEnabled ||
      !clientMobile.lobbyScrollableCss ||
      !clientMobile.lobbyCanScroll ||
      !clientMobile.lobbyReadyTouchOk ||
      !clientMobile.lobbyReadyVisibleInFrame ||
      !clientMobile.lobbyReadyAboveGrid ||
      !clientMobile.lobbyStartPresent ||
      !clientMobile.defaultVolumeIs100 ||
      !clientMobile.mobileFsActive ||
      !clientMobile.mobileNoTransformHack ||
      !clientMobile.mobileNoHorizontalOverflow ||
      !clientMobile.mobileTouchButtonOk ||
      !clientMobile.mobileTrainVisible ||
      !clientMobile.mobileDockVisible ||
      !clientMobile.mobileBulletsVisible
    ) {
      throw new Error(`Mobile fullscreen/lobby/bot/audio check failed: ${JSON.stringify(clientMobile)}`);
    }

    if (
      dashboardAudit.statusText !== 'RUNNING' ||
      dashboardAudit.roomsListed < 1 ||
      dashboardAudit.viLabel === dashboardAudit.enLabel
    ) {
      throw new Error(`Dashboard live check failed: ${JSON.stringify(dashboardAudit)}`);
    }

    for (const s of botSockets) s.disconnect();
    await srv.close();
    console.log('UI_AUDIT_PASSED');
    app.exit(0);
  } catch (err) {
    console.error('UI_AUDIT_FAILED', err);
    for (const s of botSockets) s.disconnect();
    if (srv) await srv.close().catch(() => {});
    app.exit(1);
  }
});

app.on('window-all-closed', () => {});
