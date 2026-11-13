import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Environment configuration. Reads .env (if present) then process.env. */
const here = dirname(fileURLToPath(import.meta.url));

function findRoot(): string {
  // Works both from server/src (dev) and release/server (bundled).
  for (const c of [resolve(here, '..', '..'), resolve(here, '..'), process.cwd()]) {
    if (existsSync(resolve(c, 'package.json')) && existsSync(resolve(c, 'documentation'))) return c;
  }
  return process.cwd();
}

export const ROOT_DIR = process.env.COLT_ROOT ?? findRoot();

const envFile = resolve(ROOT_DIR, '.env');
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // ignore malformed .env; defaults below apply
  }
}

function int(name: string, def: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : def;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const config = {
  port: int('PORT', 3001),
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: (process.env.LOG_LEVEL as LogLevel) ?? 'info',
  dbPath: resolve(ROOT_DIR, process.env.DB_PATH ?? 'data/colt-express.db'),
  clientDist: resolve(ROOT_DIR, process.env.CLIENT_DIST ?? 'release/client'),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  roomIdleMinutes: int('ROOM_IDLE_MINUTES', 240),
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;

export const SERVER_VERSION = '0.1.0';
