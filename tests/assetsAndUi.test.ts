import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io, type Socket } from 'socket.io-client';
import { describe, expect, it } from 'vitest';
import type {
  CharacterId,
  ClientToServerEvents,
  Result,
  RoomStatePayload,
  ServerToClientEvents,
  SessionInfo,
} from '@colt/shared';
import { CHARACTERS, CHARACTER_INFO } from '@colt/game-rules';
import { startServer } from '../server/src/index.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type ClientSock = Socket<ServerToClientEvents, ClientToServerEvents>;

function connect(url: string): Promise<ClientSock> {
  return new Promise((resolvePromise, reject) => {
    const s: ClientSock = io(url, { transports: ['websocket'], forceNew: true });
    s.once('connect', () => resolvePromise(s));
    s.once('connect_error', reject);
  });
}

function call<T>(fn: (cb: (r: Result<T>) => void) => void): Promise<Result<T>> {
  return new Promise((resolvePromise) => fn(resolvePromise));
}

describe('Phase 6 Visual Assets, Rule Fidelity & 6-Player Full Match Benchmarks', () => {
  it('verifies all manifest visual assets exist and have valid SVG/PNG/ICO formats', () => {
    const manifestPath = resolve(ROOT, 'assets/manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      version: number;
      assets: Record<string, string[]>;
    };
    const allFiles = Object.values(manifest.assets).flat();
    expect(allFiles.length).toBeGreaterThanOrEqual(20);

    for (const rel of allFiles) {
      const abs = resolve(ROOT, rel);
      expect(existsSync(abs), `missing asset ${rel}`).toBe(true);
      const buf = readFileSync(abs);
      expect(buf.length, `empty asset ${rel}`).toBeGreaterThan(100);
      if (rel.endsWith('.svg')) {
        const text = buf.toString('utf8');
        expect(text).toContain('<svg');
        expect(text).toContain('</svg>');
      } else if (rel.endsWith('.png')) {
        expect(buf[0]).toBe(0x89);
        expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
      } else if (rel.endsWith('.ico')) {
        expect(buf.readUInt16LE(0)).toBe(0);
        expect(buf.readUInt16LE(2)).toBe(1);
        expect(buf.readUInt16LE(4)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('verifies client UI card & character art components cover all verified rules and characters', () => {
    const cardSrc = readFileSync(resolve(ROOT, 'client/src/components/art/PlayingCard.tsx'), 'utf8');
    const i18nSrc = readFileSync(resolve(ROOT, 'client/src/i18n.ts'), 'utf8');
    const combinedSrc = `${cardSrc}\n${i18nSrc}`;
    const spriteSrc = readFileSync(resolve(ROOT, 'client/src/components/art/CharacterSprite.tsx'), 'utf8');

    for (const a of ['move:', 'changeFloor:', 'shoot:', 'punch:', 'rob:', 'marshal:']) {
      expect(combinedSrc).toContain(a);
    }
    for (const ev of [
      'angryMarshal:',
      'swivelArm:',
      'braking:',
      'takeItAll:',
      'passengersRebellion:',
      'pickpocketing:',
      'marshalsRevenge:',
      'hostageConductor:',
    ]) {
      expect(combinedSrc).toContain(ev);
    }
    expect(CHARACTERS).toHaveLength(6);
    for (const cid of CHARACTERS) {
      expect(CHARACTER_INFO[cid].ability.length).toBeGreaterThan(10);
      expect(combinedSrc).toContain(`${cid}:`);
      expect(spriteSrc).toContain(`${cid}:`);
    }
  });

  it('verifies production client build size and HTTP static serving optimization', async () => {
    const clientDir = resolve(ROOT, 'release/client');
    expect(existsSync(resolve(clientDir, 'index.html'))).toBe(true);
    const assetsDir = resolve(clientDir, 'assets');
    const files = readdirSync(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    const cssFiles = files.filter((f) => f.endsWith('.css'));
    expect(jsFiles.length).toBeGreaterThanOrEqual(1);
    expect(cssFiles.length).toBeGreaterThanOrEqual(1);

    const entryJs = jsFiles.find((f) => f.startsWith('index-'));
    const threeVendorJs = jsFiles.find((f) => f.startsWith('three-vendor-'));
    const scene3dJs = jsFiles.find((f) => f.includes('TrainScene3D'));
    expect(entryJs, 'missing entry index-*.js').toBeTruthy();
    expect(threeVendorJs, 'missing lazy three-vendor chunk').toBeTruthy();
    expect(scene3dJs, 'missing lazy TrainScene3D chunk').toBeTruthy();

    const entryJsBytes = statSync(resolve(assetsDir, entryJs!)).size;
    const totalCssBytes = cssFiles.reduce((acc, f) => acc + statSync(resolve(assetsDir, f)).size, 0);
    expect(entryJsBytes).toBeLessThan(650 * 1024);
    expect(totalCssBytes).toBeLessThan(82 * 1024);

    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:', clientDist: clientDir });
    try {
      const htmlRes = await fetch(`http://127.0.0.1:${srv.port}/`);
      expect(htmlRes.status).toBe(200);
      expect(htmlRes.headers.get('content-type')).toContain('text/html');
      const html = await htmlRes.text();
      expect(html).toContain('Colt Express');

      const mp3RangeRes = await fetch(`http://127.0.0.1:${srv.port}/audio/bgm-western.mp3`, {
        headers: { Range: 'bytes=0-15' },
      });
      expect(mp3RangeRes.status).toBe(206);
      expect(mp3RangeRes.headers.get('content-type')).toContain('audio/mpeg');
      expect((await mp3RangeRes.arrayBuffer()).byteLength).toBe(16);

      const oggRes = await fetch(`http://127.0.0.1:${srv.port}/audio/bgm-western.ogg`);
      expect(oggRes.status).toBe(200);
      expect(oggRes.headers.get('content-type')).toContain('audio/ogg');

      const wavRes = await fetch(`http://127.0.0.1:${srv.port}/audio/card-play.wav`);
      expect(wavRes.status).toBe(200);
      expect(wavRes.headers.get('content-type')).toContain('audio/wav');
      await wavRes.arrayBuffer();

      const rangeRes = await fetch(`http://127.0.0.1:${srv.port}/audio/bgm-western.ogg`, {
        headers: { Range: 'bytes=0-15' },
      });
      expect(rangeRes.status).toBe(206);
      expect(rangeRes.headers.get('accept-ranges')).toBe('bytes');
      expect(rangeRes.headers.get('content-range')).toMatch(/^bytes 0-15\/\d+$/);
      const rangeBuf = await rangeRes.arrayBuffer();
      expect(rangeBuf.byteLength).toBe(16);
      expect(Buffer.from(rangeBuf.slice(0, 4)).toString('ascii')).toBe('OggS');

      const missingRes = await fetch(`http://127.0.0.1:${srv.port}/art/nonexistent-asset.png`);
      expect(missingRes.status).toBe(404);
      await missingRes.text();
    } finally {
      await srv.close();
    }
  });

  it('runs a full 6-player match + spectator role switching end-to-end over Socket.IO within memory/time budget', async () => {
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    const url = `http://127.0.0.1:${srv.port}`;
    const sockets: ClientSock[] = [];
    const latestState = new Map<string, RoomStatePayload>();
    const waiters = new Set<() => void>();
    const notifyUpdate = () => {
      for (const w of waiters) w();
      waiters.clear();
    };
    const waitUpdate = (ms = 100) =>
      new Promise<void>((resolveWait) => {
        const timer = setTimeout(() => {
          waiters.delete(done);
          resolveWait();
        }, ms);
        const done = () => {
          clearTimeout(timer);
          resolveWait();
        };
        waiters.add(done);
      });

    try {
      const host = await connect(url);
      sockets.push(host);
      const created = await call<SessionInfo>((cb) =>
        host.emit('room:create', { playerName: 'Bandit1', roomName: 'SixMax' }, cb),
      );
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const code = created.data.roomCode;
      const hostPid = created.data.playerId;

      const playerIds: string[] = [hostPid];
      host.on('room:state', (p) => {
        latestState.set(hostPid, p);
        notifyUpdate();
      });

      for (let i = 2; i <= 6; i++) {
        const s = await connect(url);
        sockets.push(s);
        const joined = await call<SessionInfo>((cb) =>
          s.emit('room:join', { roomCode: code, playerName: `Bandit${i}` }, cb),
        );
        expect(joined.ok).toBe(true);
        if (!joined.ok) return;
        const pid = joined.data.playerId;
        playerIds.push(pid);
        s.on('room:state', (p) => {
          latestState.set(pid, p);
          notifyUpdate();
        });
      }

      const sixthSock = sockets[5]!;
      const swSpec = await call<{ role: string }>((cb) =>
        sixthSock.emit('lobby:switchRole', { asSpectator: true }, cb),
      );
      expect(swSpec.ok).toBe(true);
      const swBack = await call<{ role: string }>((cb) =>
        sixthSock.emit('lobby:switchRole', { asSpectator: false }, cb),
      );
      expect(swBack.ok).toBe(true);

      const chars: CharacterId[] = ['django', 'tuco', 'doc', 'cheyenne', 'ghost', 'belle'];
      for (let i = 0; i < 6; i++) {
        const sock = sockets[i]!;
        const char = chars[i]!;
        await call((cb) => sock.emit('lobby:selectCharacter', { character: char }, cb));
        await call((cb) => sock.emit('lobby:ready', { ready: true }, cb));
      }

      const tStart = performance.now();
      const started = await call((cb) => host.emit('game:start', cb));
      expect(started.ok).toBe(true);

      await new Promise((r) => setTimeout(r, 40));

      const midView = latestState.get(hostPid)?.game;
      expect(midView).toBeTruthy();
      expect(midView?.players.find((p) => p.id === hostPid)?.bulletsReceived).toBe(0);
      expect(
        midView?.players.filter((p) => p.id !== hostPid).every((p) => p.bulletsReceived === undefined),
      ).toBe(true);

      let steps = 0;
      let loopTicks = 0;
      let finished = false;
      let lastActedVersion = -1;
      let lastReason = 'init';
      while (steps < 1200 && loopTicks < 1000) {
        loopTicks++;
        const view = latestState.get(hostPid)?.game;
        if (!view || view.version === lastActedVersion) {
          lastReason = !view ? 'no-host-view' : `same-ver:${view.version}`;
          await waitUpdate(20);
          continue;
        }
        if (view.phase === 'gameEnd') {
          finished = true;
          break;
        }
        if (view.phase === 'planning' && view.planning) {
          const activePid = view.planning.order[view.planning.orderIndex];
          if (!activePid) {
            lastReason = `no-activePid:${view.planning.orderIndex}`;
            await waitUpdate(20);
            continue;
          }
          const myView = latestState.get(activePid)?.game;
          if (!myView || myView.version !== view.version) {
            lastReason = `ver-mismatch:${activePid}:my=${myView?.version}:host=${view.version}`;
            await waitUpdate(20);
            continue;
          }
          steps++;
          lastActedVersion = view.version;
          lastReason = `played:${steps}:${activePid}`;
          const idx = playerIds.indexOf(activePid);
          const activeSock = sockets[idx]!;
          const me = myView.players.find((p) => p.id === activePid);
          const playable = me?.hand?.find((c) => c.kind === 'action');
          const res = playable
            ? await call((cb) =>
                activeSock.emit(
                  'game:playCard',
                  { cardId: playable.id, requestId: `play-${steps}`, expectedVersion: myView.version },
                  cb,
                ),
              )
            : await call((cb) =>
                activeSock.emit('game:draw', { requestId: `draw-${steps}`, expectedVersion: myView.version }, cb),
              );
          expect(res, `planning step ${steps}: ${JSON.stringify(res)}`).toMatchObject({ ok: true });
        } else if (view.phase === 'execution' && view.execution?.pending) {
          const pend = view.execution.pending;
          const deciderView = latestState.get(pend.playerId)?.game;
          if (!deciderView || deciderView.version !== view.version) {
            lastReason = `decider-sync:${pend.playerId}`;
            await waitUpdate(20);
            continue;
          }
          const choice = deciderView.execution?.pending?.options[0];
          const idx = playerIds.indexOf(pend.playerId);
          const activeSock = sockets[idx]!;
          if (!choice) {
            lastReason = `no-choice:${pend.card.action}`;
            await waitUpdate(20);
            continue;
          }
          steps++;
          lastActedVersion = view.version;
          lastReason = `resolved:${steps}:${pend.playerId}`;
          const res = await call((cb) =>
            activeSock.emit(
              'game:resolve',
              { choice, requestId: `res-${steps}`, expectedVersion: view.version },
              cb,
            ),
          );
          expect(res, `execution step ${steps}: ${JSON.stringify(res)}`).toMatchObject({ ok: true });
        } else {
          lastReason = `other-phase:${view.phase}:pend=${Boolean(view.execution?.pending)}`;
          await waitUpdate(20);
        }
      }

      const elapsedMs = performance.now() - tStart;
      const curView = latestState.get(hostPid)?.game;
      expect(
        finished,
        `stuck reason=${lastReason} phase=${curView?.phase} round=${curView?.roundIndex} v=${curView?.version} steps=${steps} ticks=${loopTicks}`,
      ).toBe(true);
      expect(elapsedMs).toBeLessThan(15_000);
      const finalGame = latestState.get(hostPid)!.game;
      expect(finalGame.scores).toHaveLength(6);
      expect(finalGame.winnerIds.length).toBeGreaterThanOrEqual(1);

      const rssMb = process.memoryUsage().rss / (1024 * 1024);
      expect(rssMb).toBeLessThan(512);
    } finally {
      for (const s of sockets) s.disconnect();
      await srv.close();
    }
  }, 20_000);

  it('verifies client EN/VI localization, fullscreen single-frame UI, and empty-target notices', () => {
    const i18nSrc = readFileSync(resolve(ROOT, 'client/src/i18n.ts'), 'utf8');
    const uiSrc = [
      'client/src/App.tsx',
      'client/src/components/screens/GameArenaScreen.tsx',
      'client/src/components/screens/LobbyScreen.tsx',
      'client/src/components/screens/CreateScreen.tsx',
      'client/src/components/screens/ScoreboardScreen.tsx',
    ]
      .map((rel) => readFileSync(resolve(ROOT, rel), 'utf8'))
      .join('\n');
    const trainSrc = readFileSync(resolve(ROOT, 'client/src/components/art/TrainScene.tsx'), 'utf8');
    const train3dSrc = readFileSync(resolve(ROOT, 'client/src/scene3d/TrainScene3D.tsx'), 'utf8');

    expect(i18nSrc).toContain("noTargetMsg: 'Không có đối tượng'");
    expect(i18nSrc).toContain("nothingToRobMsg: 'Không có gì để lụm'");
    expect(i18nSrc).toContain("noTargetMsg: 'No valid target'");
    expect(i18nSrc).toContain("nothingToRobMsg: 'Nothing to rob'");
    expect(i18nSrc).toContain('vi:');
    expect(i18nSrc).toContain('en:');
    expect(uiSrc).toContain('fullscreen-toggle-btn');
    expect(uiSrc).toContain('lang-toggle-btn');
    expect(uiSrc).toContain('audio-toggle-btn');
    expect(uiSrc).toContain('execution-spotlight');
    expect(uiSrc).toContain('bullet-tracker-panel');
    expect(uiSrc).toContain('latest-played-pile');
    expect(uiSrc).toContain('deal-animation-overlay');
    expect(uiSrc).not.toContain('log-panel');
    expect(uiSrc).not.toContain('arena-side-rail');
    expect(uiSrc).not.toContain('stack-row');
    expect(uiSrc).toContain('latestPlayed.faceUp');
    expect(uiSrc).toContain('is-fullscreen');
    expect(i18nSrc).toContain('6/6');
    expect(trainSrc).toContain('is-target-zone');
    expect(trainSrc).toContain('is-attack-target');
    expect(trainSrc).toContain('loot-target-btn');
    expect(train3dSrc).toContain('train-scene-3d');
    expect(train3dSrc).toContain('is-target-zone');
    expect(train3dSrc).toContain('is-attack-target');
    expect(train3dSrc).toContain('loot-target-btn');
  });

  it('verifies all 19 CC0 audio files (OGG/WAV + iOS MP3) and compressed WebP art exist', () => {
    const audioFiles = [
      'bgm-saloon.ogg',
      'bgm-western.ogg',
      'victory.ogg',
      'card-shuffle.ogg',
      'card-deal.wav',
      'card-play.wav',
      'card-flip.wav',
      'move-step.ogg',
      'climb-ladder.ogg',
      'shoot-revolver.ogg',
      'punch-hit.ogg',
      'rob-coin.ogg',
      'rob-sack.ogg',
      'marshal-whistle.ogg',
      'empty-click.ogg',
      'turn-bell.ogg',
      'ui-click.wav',
      'ui-ready.wav',
      'error-buzz.wav',
    ];
    for (const file of audioFiles) {
      const abs = resolve(ROOT, 'client/public/audio', file);
      expect(existsSync(abs), `missing audio ${file}`).toBe(true);
      const buf = readFileSync(abs);
      expect(buf.length, `empty audio ${file}`).toBeGreaterThan(1000);
      if (file.endsWith('.ogg')) {
        expect(buf.subarray(0, 4).toString('ascii'), `invalid OGG header: ${file}`).toBe('OggS');
      } else if (file.endsWith('.wav')) {
        expect(buf.subarray(0, 4).toString('ascii'), `invalid WAV header: ${file}`).toBe('RIFF');
      }
      const mp3Abs = abs.replace(/\.(ogg|wav)$/, '.mp3');
      expect(existsSync(mp3Abs), `missing MP3 sibling for ${file}`).toBe(true);
      expect(readFileSync(mp3Abs).length, `empty MP3 sibling for ${file}`).toBeGreaterThan(800);
    }

    const webpArt = [
      'art/bg-canyon-sunset.webp',
      'art/bg-saloon.webp',
      'art/hero-train-menu.webp',
      'art/thumbs/portrait-django.webp',
      'art/thumbs/portrait-tuco.webp',
      'art/thumbs/portrait-doc.webp',
      'art/thumbs/portrait-cheyenne.webp',
      'art/thumbs/portrait-ghost.webp',
      'art/thumbs/portrait-belle.webp',
      'art/thumbs/portrait-marshal.webp',
      'favicon.png',
    ];
    for (const rel of webpArt) {
      const abs = resolve(ROOT, 'client/public', rel);
      expect(existsSync(abs), `missing optimized asset: ${rel}`).toBe(true);
      expect(statSync(abs).size).toBeGreaterThan(500);
    }
  });
});
