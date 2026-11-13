import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { startServer } from '../server/src/index.js';
import { buildInviteUrl, getLanAddresses, isPortReachable } from '../server/src/host/network.js';
import { CloudflareTunnelManager, detectCloudflaredBinary } from '../server/src/host/tunnel.js';

describe('Windows Host Network, Tunnel & Control APIs', () => {
  it('discovers non-internal LAN IPv4 addresses and builds invite URLs cleanly', async () => {
    const addrs = getLanAddresses();
    expect(Array.isArray(addrs)).toBe(true);
    for (const iface of addrs) {
      expect(iface.address).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      expect(iface.address.startsWith('127.')).toBe(false);
      expect(iface.address.startsWith('169.254.')).toBe(false);
      expect(iface.name.length).toBeGreaterThan(0);
    }

    expect(buildInviteUrl('http://192.168.1.50:3001/', 'ab3k9')).toBe('http://192.168.1.50:3001/?room=AB3K9');
    expect(buildInviteUrl('https://demo.trycloudflare.com', 'Z9Q12')).toBe(
      'https://demo.trycloudflare.com/?room=Z9Q12',
    );
    expect(await isPortReachable('127.0.0.1', 0)).toBe(true);
  });

  it('honestly reports Cloudflare Quick Tunnel status without faking public URLs', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'colt-tunnel-test-'));
    try {
      const mgr = new CloudflareTunnelManager([tmp]);
      const init = mgr.getStatus();
      expect(init.publicUrl).toBeNull();
      expect(init.provider).toBe('cloudflare-quick-tunnel');
      if (!init.binaryPath) {
        const afterStart = mgr.start(3001);
        expect(afterStart.state).toBe('unavailable');
        expect(afterStart.publicUrl).toBeNull();
        expect(afterStart.lastError).toMatch(/cloudflared/i);
      }

      const binName = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
      writeFileSync(join(tmp, binName), 'stub');
      const found = detectCloudflaredBinary([tmp]);
      expect(found).toBe(join(tmp, binName));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('supports Windows Host lifecycle: health, host-player/dedicated room controls, backup & restore', async () => {
    const srv = await startServer({ port: 0, host: '127.0.0.1', dbPath: ':memory:' });
    try {
      const healthRes = await fetch(`http://127.0.0.1:${srv.port}/api/health`);
      expect(healthRes.status).toBe(200);
      const health = (await healthRes.json()) as { ok: boolean; rooms: number };
      expect(health.ok).toBe(true);
      expect(health.rooms).toBe(0);

      // Host Player room yields sessionToken for Desktop Host Player window
      const hpRoom = srv.createHostRoom({
        roomName: 'Saloon',
        hostMode: 'player',
        playerName: 'Sheriff',
        password: 'gold',
      });
      expect(hpRoom.sessionToken).toBeTruthy();
      expect(hpRoom.hasPassword).toBe(true);
      expect(hpRoom.players).toHaveLength(1);
      const hostPlayer = hpRoom.players[0]!;
      expect(hpRoom.inviteUrls[0]).toContain(`?room=${hpRoom.code}`);

      // Add 2 more players via RoomManager and drive host controls
      const j2 = srv.rooms.joinRoom({ roomCode: hpRoom.code, playerName: 'Belle', password: 'gold' });
      const j3 = srv.rooms.joinRoom({ roomCode: hpRoom.code, playerName: 'Doc', password: 'gold' });
      const active = srv.rooms.getRoom(hpRoom.code);
      active.engine.selectCharacter(hostPlayer.id, 'django');
      active.engine.selectCharacter(j2.session.playerId, 'belle');
      active.engine.selectCharacter(j3.session.playerId, 'doc');
      active.engine.setReady(hostPlayer.id, true);
      active.engine.setReady(j2.session.playerId, true);
      active.engine.setReady(j3.session.playerId, true);

      srv.startHostRoom(hpRoom.code);
      srv.pauseHostRoom(hpRoom.code, 'Break time');
      let snap = srv.getHostStatus();
      expect(snap.rooms).toHaveLength(1);
      expect(snap.rooms[0]!.paused).toBe(true);
      expect(snap.rooms[0]!.pauseReason).toBe('Break time');

      const backup = srv.exportBackup();
      expect(backup.rooms).toHaveLength(1);

      srv.resumeHostRoom(hpRoom.code);
      snap = srv.getHostStatus();
      expect(snap.rooms[0]!.paused).toBe(false);

      srv.closeHostRoom(hpRoom.code);
      expect(srv.getHostStatus().rooms).toHaveLength(0);

      // Restore from backup brings paused room back
      const restoredCount = srv.importBackup(backup);
      expect(restoredCount).toBe(1);
      snap = srv.getHostStatus();
      expect(snap.rooms[0]!.code).toBe(hpRoom.code);
      expect(snap.rooms[0]!.paused).toBe(true);

      // Dedicated room takes 0 player seats
      const dedRoom = srv.createHostRoom({
        roomName: 'Dedicated Express',
        hostMode: 'dedicated',
      });
      expect(dedRoom.sessionToken).toBeUndefined();
      expect(dedRoom.hostMode).toBe('dedicated');
      expect(dedRoom.players).toHaveLength(0);
    } finally {
      await srv.close();
    }
  });

  it('bundles cloudflared.exe in installer config and supports EN/VI Host Dashboard switching', () => {
    const bundledBin = resolve(ROOT, 'bin/cloudflared.exe');
    expect(existsSync(bundledBin)).toBe(true);
    expect(statSync(bundledBin).size).toBeGreaterThan(1_000_000);

    const builderYml = readFileSync(resolve(ROOT, 'electron-builder.yml'), 'utf8');
    expect(builderYml).toContain('from: bin');
    expect(builderYml).toContain('to: bin');

    const dashHtml = readFileSync(resolve(ROOT, 'desktop-host/dashboard.html'), 'utf8');
    const dashJs = readFileSync(resolve(ROOT, 'desktop-host/dashboard.js'), 'utf8');
    expect(dashHtml).toContain('id="btn-lang"');
    expect(dashJs).toContain('I18N');
    expect(dashJs).toContain("vi:");
    expect(dashJs).toContain("en:");
  });
});
