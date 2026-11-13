import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { GameState, HostMode, ParticipantRole, ScoreLine, SpectatorInfo } from '@colt/shared';
import { createLogger } from '../logger.js';

const log = createLogger('db');

export interface StoredSession {
  playerId: string;
  role: ParticipantRole;
}

export interface RoomMeta {
  hostMode: HostMode;
  passwordHash: string | null;
  hostControlId: string | null;
  paused: boolean;
  pauseReason: string | null;
  closed: boolean;
  spectators: SpectatorInfo[];
  turnTimeoutSec?: number;
}

export interface StoredRoom {
  code: string;
  name: string;
  createdAt: number;
  state: GameState;
  sessions: Record<string, StoredSession | string>;
  meta?: RoomMeta;
}

export interface BackupSnapshot {
  version: number;
  exportedAt: number;
  rooms: StoredRoom[];
  results: Array<{ roomCode: string; finishedAt: number; winnerIds: string[]; scores: ScoreLine[] }>;
}

/** Persistence layer: SQLite via Node's built-in node:sqlite (no native build step). */
export class Database {
  private db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        phase TEXT NOT NULL,
        state_json TEXT NOT NULL,
        sessions_json TEXT NOT NULL,
        meta_json TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS game_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        finished_at INTEGER NOT NULL,
        winners_json TEXT NOT NULL,
        scores_json TEXT NOT NULL
      );
    `);
    this.migrateColumns();
    log.info(`SQLite ready at ${path}`);
  }

  private migrateColumns(): void {
    const cols = this.db.prepare('PRAGMA table_info(rooms)').all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === 'meta_json')) {
      this.db.exec(`ALTER TABLE rooms ADD COLUMN meta_json TEXT NOT NULL DEFAULT '{}'`);
    }
  }

  saveRoom(r: StoredRoom): void {
    this.db
      .prepare(
        `INSERT INTO rooms (code, name, created_at, updated_at, phase, state_json, sessions_json, meta_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET updated_at = excluded.updated_at, phase = excluded.phase,
           state_json = excluded.state_json, sessions_json = excluded.sessions_json, meta_json = excluded.meta_json`,
      )
      .run(
        r.code,
        r.name,
        r.createdAt,
        Date.now(),
        r.state.phase,
        JSON.stringify(r.state),
        JSON.stringify(r.sessions),
        JSON.stringify(r.meta ?? {}),
      );
  }

  deleteRoom(code: string): void {
    this.db.prepare('DELETE FROM rooms WHERE code = ?').run(code);
  }

  loadRooms(): StoredRoom[] {
    const rows = this.db.prepare('SELECT code, name, created_at, state_json, sessions_json, meta_json FROM rooms').all() as Array<{
      code: string;
      name: string;
      created_at: number;
      state_json: string;
      sessions_json: string;
      meta_json: string;
    }>;
    const out: StoredRoom[] = [];
    for (const row of rows) {
      try {
        const meta = row.meta_json ? (JSON.parse(row.meta_json) as Partial<RoomMeta>) : {};
        out.push({
          code: row.code,
          name: row.name,
          createdAt: row.created_at,
          state: JSON.parse(row.state_json) as GameState,
          sessions: JSON.parse(row.sessions_json) as Record<string, StoredSession | string>,
          meta: meta.hostMode ? (meta as RoomMeta) : undefined,
        });
      } catch (e) {
        log.warn(`Skipping corrupt room ${row.code}`, e);
      }
    }
    return out;
  }

  saveResult(roomCode: string, winnerIds: string[], scores: ScoreLine[]): void {
    this.db
      .prepare('INSERT INTO game_results (room_code, finished_at, winners_json, scores_json) VALUES (?, ?, ?, ?)')
      .run(roomCode, Date.now(), JSON.stringify(winnerIds), JSON.stringify(scores));
  }

  countResults(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM game_results').get() as { n: number }).n;
  }

  exportBackup(): BackupSnapshot {
    const rooms = this.loadRooms();
    const resRows = this.db
      .prepare('SELECT room_code, finished_at, winners_json, scores_json FROM game_results ORDER BY id ASC')
      .all() as Array<{ room_code: string; finished_at: number; winners_json: string; scores_json: string }>;
    const results = resRows.map((r) => ({
      roomCode: r.room_code,
      finishedAt: r.finished_at,
      winnerIds: JSON.parse(r.winners_json) as string[],
      scores: JSON.parse(r.scores_json) as ScoreLine[],
    }));
    return { version: 1, exportedAt: Date.now(), rooms, results };
  }

  importBackup(snap: BackupSnapshot): number {
    if (!snap || !Array.isArray(snap.rooms)) {
      throw new Error('Invalid backup payload');
    }
    this.db.exec('BEGIN');
    try {
      this.db.exec('DELETE FROM rooms');
      for (const r of snap.rooms) {
        this.saveRoom(r);
      }
      if (Array.isArray(snap.results)) {
        this.db.exec('DELETE FROM game_results');
        const stmt = this.db.prepare(
          'INSERT INTO game_results (room_code, finished_at, winners_json, scores_json) VALUES (?, ?, ?, ?)',
        );
        for (const res of snap.results) {
          stmt.run(res.roomCode, res.finishedAt, JSON.stringify(res.winnerIds), JSON.stringify(res.scores));
        }
      }
      this.db.exec('COMMIT');
      log.info(`Restored backup with ${snap.rooms.length} room(s)`);
      return snap.rooms.length;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}
