import { config, type LogLevel } from './config.js';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MAX_LOGS = 250;
const recentLogs: string[] = [];
const logListeners = new Set<(line: string) => void>();

/** Small structured logger (one line per entry, ISO timestamp) with ring buffer for Host UI. */
function write(level: LogLevel, scope: string, msg: string, meta?: unknown): void {
  if (ORDER[level] < ORDER[config.logLevel]) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${msg}`;
  const extra = meta === undefined ? '' : ' ' + safeJson(meta);
  const full = line + extra;
  recentLogs.push(full);
  if (recentLogs.length > MAX_LOGS) recentLogs.splice(0, recentLogs.length - MAX_LOGS);
  for (const fn of logListeners) {
    try {
      fn(full);
    } catch {
      // ignore listener error
    }
  }
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(full);
}

export function getRecentLogs(): string[] {
  return [...recentLogs];
}

export function onLog(listener: (line: string) => void): () => void {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

function safeJson(v: unknown): string {
  try {
    if (v instanceof Error) return JSON.stringify({ name: v.name, message: v.message, stack: v.stack });
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (m: string, meta?: unknown) => write('debug', scope, m, meta),
    info: (m: string, meta?: unknown) => write('info', scope, m, meta),
    warn: (m: string, meta?: unknown) => write('warn', scope, m, meta),
    error: (m: string, meta?: unknown) => write('error', scope, m, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
