import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream';
import { createGzip } from 'node:zlib';
import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, HostMode, ServerToClientEvents } from '@colt/shared';
import { config, SERVER_VERSION } from './config.js';
import { createLogger, getRecentLogs, onLog } from './logger.js';
export { onLog };
import { Database, type BackupSnapshot } from './persistence/Database.js';
import { RoomManager, type ActiveRoom } from './rooms/RoomManager.js';
import { createRoomAutomation } from './rooms/BotController.js';
import { attachSocketHandlers, type RoomBroadcaster } from './multiplayer/socketServer.js';
import { buildInviteUrl, getLanAddresses, type LanInterfaceInfo } from './host/network.js';
import { CloudflareTunnelManager, type TunnelStatus } from './host/tunnel.js';

const log = createLogger('http');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.hdr': 'application/octet-stream',
};

const COMPRESSIBLE_EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.gltf', '.glb', '.wasm']);
const STATIC_ASSET_EXT = new Set([
  '.js', '.mjs', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico',
  '.ogg', '.mp3', '.m4a', '.aac', '.wav', '.glb', '.gltf', '.ktx2', '.wasm', '.woff2', '.hdr',
]);

export interface HostRoomSummary {
  code: string;
  name: string;
  phase: string;
  round: number;
  hostMode: HostMode;
  hasPassword: boolean;
  paused: boolean;
  pauseReason: string | null;
  players: Array<{
    id: string;
    name: string;
    character: string | null;
    ready: boolean;
    connected: boolean;
  }>;
  spectators: Array<{
    id: string;
    name: string;
    connected: boolean;
    isModerator?: boolean;
  }>;
  inviteUrls: string[];
}

export interface HostStatusSnapshot {
  running: boolean;
  port: number;
  host: string;
  version: string;
  uptimeSec: number;
  dbPath: string;
  completedGames: number;
  lanAddresses: LanInterfaceInfo[];
  tunnel: TunnelStatus;
  rooms: HostRoomSummary[];
  logs: string[];
}

export interface RunningServer {
  port: number;
  host: string;
  dbPath: string;
  db: Database;
  rooms: RoomManager;
  broadcaster: RoomBroadcaster;
  tunnel: CloudflareTunnelManager;
  getHostStatus: () => HostStatusSnapshot;
  createHostRoom: (opts: { roomName?: string; hostMode: HostMode; playerName?: string; password?: string }) => HostRoomSummary & { sessionToken?: string };
  startHostRoom: (code: string) => void;
  pauseHostRoom: (code: string, reason?: string) => void;
  resumeHostRoom: (code: string) => void;
  closeHostRoom: (code: string) => void;
  exportBackup: () => BackupSnapshot;
  importBackup: (snap: BackupSnapshot) => number;
  close: () => Promise<void>;
}

export interface ServerOptions {
  port?: number;
  host?: string;
  dbPath?: string;
  clientDist?: string;
  extraBinaryDirs?: string[];
}

export async function startServer(opts: ServerOptions = {}): Promise<RunningServer> {
  const port = opts.port ?? config.port;
  const host = opts.host ?? config.host;
  const dbPath = opts.dbPath ?? config.dbPath;
  const clientDist = opts.clientDist ?? config.clientDist;

  const db = new Database(dbPath);
  const rooms = new RoomManager(db);
  const tunnel = new CloudflareTunnelManager(opts.extraBinaryDirs ?? []);

  let broadcaster!: RoomBroadcaster;
  let boundPort = port;
  const automation = createRoomAutomation(rooms, () => broadcaster, config.roomIdleMinutes * 60_000);

  const summarizeRoom = (room: ActiveRoom): HostRoomSummary => {
    const st = room.engine.state;
    const players =
      st.phase === 'lobby'
        ? st.lobby.map((l) => ({
            id: l.id,
            name: l.name,
            character: l.character,
            ready: l.ready,
            connected: l.connected,
          }))
        : st.players.map((p) => ({
            id: p.id,
            name: p.name,
            character: p.character,
            ready: true,
            connected: p.connected,
          }));
    const baseUrls = [
      `http://127.0.0.1:${boundPort}`,
      ...getLanAddresses().map((n) => `http://${n.address}:${boundPort}`),
    ];
    const tUrl = tunnel.getStatus().publicUrl;
    if (tUrl) baseUrls.push(tUrl);

    return {
      code: room.info.code,
      name: room.info.name,
      phase: st.phase,
      round: st.roundIndex + 1,
      hostMode: room.info.hostMode,
      hasPassword: room.info.hasPassword,
      paused: room.info.paused,
      pauseReason: room.info.pauseReason,
      players,
      spectators: room.info.spectators.map((s) => ({
        id: s.id,
        name: s.name,
        connected: s.connected,
        isModerator: s.isModerator,
      })),
      inviteUrls: baseUrls.map((u) => buildInviteUrl(u, room.info.code)),
    };
  };

  const getHostStatus = (): HostStatusSnapshot => ({
    running: true,
    port: boundPort,
    host,
    version: SERVER_VERSION,
    uptimeSec: Math.round(process.uptime()),
    dbPath,
    completedGames: db.countResults(),
    lanAddresses: getLanAddresses(),
    tunnel: tunnel.getStatus(),
    rooms: rooms.listRooms().map(summarizeRoom),
    logs: getRecentLogs(),
  });

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/api/health') {
      const body = JSON.stringify({
        ok: true,
        version: SERVER_VERSION,
        rooms: rooms.listRoomCount(),
        completedGames: db.countResults(),
        uptimeSec: Math.round(process.uptime()),
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(body);
      return;
    }

    // Serve static client build when available (production / desktop host mode).
    if (existsSync(clientDist)) {
      const distRoot = resolve(clientDist);
      let decodedPath = url.pathname === '/' ? '/index.html' : url.pathname;
      try {
        decodedPath = decodeURIComponent(decodedPath);
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Bad request');
        return;
      }
      const rel = decodedPath.replace(/^\/+/, '');
      let filePath = resolve(distRoot, rel);
      const insideRoot = filePath === distRoot || filePath.startsWith(distRoot + sep);
      if (!insideRoot) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      let exists = existsSync(filePath) && statSync(filePath).isFile();
      if (!exists) {
        if (STATIC_ASSET_EXT.has(extname(filePath).toLowerCase())) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Asset not found');
          return;
        }
        filePath = join(distRoot, 'index.html');
        exists = existsSync(filePath) && statSync(filePath).isFile();
      }

      if (exists) {
        const st = statSync(filePath);
        const ext = extname(filePath).toLowerCase();
        const mime = MIME[ext] ?? 'application/octet-stream';
        const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
        const isHtml = ext === '.html';
        const isHashed = rel.startsWith('assets/');
        const cacheControl = isHtml
          ? 'no-cache'
          : isHashed
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600';

        if (!req.headers.range && req.headers['if-none-match'] === etag) {
          res.writeHead(304, { ETag: etag, 'Cache-Control': cacheControl });
          res.end();
          return;
        }

        const rangeHdr = req.headers.range;
        if (rangeHdr && typeof rangeHdr === 'string' && rangeHdr.startsWith('bytes=')) {
          const [startStr, endStr] = rangeHdr.slice(6).split('-');
          const start = startStr ? Math.max(0, Number.parseInt(startStr, 10)) : 0;
          const end = endStr ? Math.min(st.size - 1, Number.parseInt(endStr, 10)) : st.size - 1;
          if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= st.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
            res.end();
            return;
          }
          res.writeHead(206, {
            'Content-Type': mime,
            'Content-Range': `bytes ${start}-${end}/${st.size}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes',
            ETag: etag,
            'Cache-Control': cacheControl,
          });
          pipeline(createReadStream(filePath, { start, end }), res, () => {});
          return;
        }

        const acceptGzip = /\bgzip\b/i.test(String(req.headers['accept-encoding'] ?? ''));
        if (acceptGzip && COMPRESSIBLE_EXT.has(ext) && st.size > 1024) {
          res.writeHead(200, {
            'Content-Type': mime,
            'Content-Encoding': 'gzip',
            'Accept-Ranges': 'bytes',
            ETag: etag,
            'Cache-Control': cacheControl,
            Vary: 'Accept-Encoding',
          });
          pipeline(createReadStream(filePath), createGzip(), res, () => {});
          return;
        }

        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': String(st.size),
          'Accept-Ranges': 'bytes',
          ETag: etag,
          'Cache-Control': cacheControl,
        });
        pipeline(createReadStream(filePath), res, () => {});
        return;
      }
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Colt Express Authoritative Server v${SERVER_VERSION}`);
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: config.corsOrigin },
    pingInterval: 10_000,
    pingTimeout: 15_000,
    connectTimeout: 10_000,
  });
  broadcaster = attachSocketHandlers(io, rooms, (room) => automation.schedule(room));

  await new Promise<void>((resolvePromise, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => resolvePromise());
  });

  const addr = httpServer.address();
  boundPort = typeof addr === 'object' && addr ? addr.port : port;
  log.info(`Colt Express server listening on http://${host}:${boundPort}`);

  return {
    port: boundPort,
    host,
    dbPath,
    db,
    rooms,
    broadcaster,
    tunnel,
    getHostStatus,
    createHostRoom: ({ roomName, hostMode, playerName, password }) => {
      const { room, session } = rooms.createRoom({
        playerName: playerName || 'Server Host',
        roomName,
        hostMode,
        password,
        fromDashboard: hostMode === 'dedicated',
      });
      broadcaster.broadcastRoom(room);
      return {
        ...summarizeRoom(room),
        sessionToken: hostMode === 'player' ? session.token : undefined,
      };
    },
    startHostRoom: (code) => {
      const room = rooms.getRoom(code);
      if (!room.hostControlId) throw new Error('Room has no host control id');
      rooms.startMatch(code, room.hostControlId);
      broadcaster.broadcastRoom(room);
    },
    pauseHostRoom: (code, reason) => {
      const room = rooms.getRoom(code);
      if (!room.hostControlId) throw new Error('Room has no host control id');
      rooms.pauseMatch(code, room.hostControlId, reason);
      broadcaster.broadcastRoom(room);
    },
    resumeHostRoom: (code) => {
      const room = rooms.getRoom(code);
      if (!room.hostControlId) throw new Error('Room has no host control id');
      rooms.resumeMatch(code, room.hostControlId);
      broadcaster.broadcastRoom(room);
    },
    closeHostRoom: (code) => {
      const room = rooms.getRoom(code);
      if (!room.hostControlId) throw new Error('Room has no host control id');
      rooms.closeRoom(code, room.hostControlId);
      broadcaster.broadcastClosed(code, 'Room closed by Windows Host');
    },
    exportBackup: () => db.exportBackup(),
    importBackup: (snap) => {
      const n = db.importBackup(snap);
      rooms.reloadFromDatabase();
      for (const r of rooms.listRooms()) broadcaster.broadcastRoom(r);
      return n;
    },
    close: () =>
      new Promise<void>((resolveClose) => {
        automation.stop();
        tunnel.stop();
        io.disconnectSockets(true);
        io.close(() => {
          if (httpServer.listening) {
            httpServer.close(() => {
              db.close();
              resolveClose();
            });
            httpServer.closeAllConnections?.();
          } else {
            db.close();
            resolveClose();
          }
        });
        httpServer.closeAllConnections?.();
      }),
  };
}

// Entrypoint when executed directly (`npm run dev -w @colt/server` or `node release/server/server.mjs`).
const entryArg = process.argv[1]?.replace(/\\/g, '/') ?? '';
const isMain = entryArg.endsWith('/server/src/index.ts') || entryArg.endsWith('/release/server/server.mjs');
if (isMain) {
  startServer().catch((err) => {
    log.error('Fatal startup error', err);
    process.exit(1);
  });
}
