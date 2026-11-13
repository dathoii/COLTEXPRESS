import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../logger.js';

const log = createLogger('tunnel');

export type TunnelState = 'unavailable' | 'stopped' | 'starting' | 'running' | 'error';

export interface TunnelStatus {
  state: TunnelState;
  binaryPath: string | null;
  publicUrl: string | null;
  lastError: string | null;
  provider: 'cloudflare-quick-tunnel';
}

const URL_REGEX = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

export function detectCloudflaredBinary(extraDirs: string[] = []): string | null {
  const exeName = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  for (const dir of extraDirs) {
    const candidate = join(dir, exeName);
    if (existsSync(candidate)) return candidate;
  }
  const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
  try {
    const res = spawnSync(cmd, [exeName], { encoding: 'utf8', timeout: 3000, windowsHide: true });
    if (res.status === 0 && res.stdout) {
      const first = res.stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      if (first) return first.trim();
    }
  } catch {
    // binary not present
  }
  return null;
}

/**
 * Manages an optional free Cloudflare Quick Tunnel (`cloudflared tunnel --url ...`).
 * Requires no Cloudflare account or VPS, never uses stored credentials, and never
 * fakes a live public URL when `cloudflared` is not installed or fails to connect.
 */
export class CloudflareTunnelManager {
  private proc: ChildProcess | null = null;
  private state: TunnelState;
  private binaryPath: string | null;
  private publicUrl: string | null = null;
  private lastError: string | null = null;
  private listeners = new Set<(status: TunnelStatus) => void>();

  constructor(private readonly extraDirs: string[] = []) {
    this.binaryPath = detectCloudflaredBinary(extraDirs);
    this.state = this.binaryPath ? 'stopped' : 'unavailable';
  }

  refreshBinary(): TunnelStatus {
    if (!this.proc) {
      this.binaryPath = detectCloudflaredBinary(this.extraDirs);
      this.state = this.binaryPath ? 'stopped' : 'unavailable';
    }
    return this.getStatus();
  }

  getStatus(): TunnelStatus {
    return {
      state: this.state,
      binaryPath: this.binaryPath,
      publicUrl: this.publicUrl,
      lastError: this.lastError,
      provider: 'cloudflare-quick-tunnel',
    };
  }

  onChange(fn: (s: TunnelStatus) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.getStatus();
    for (const fn of this.listeners) {
      try {
        fn(snap);
      } catch {
        // ignore listener errors
      }
    }
  }

  start(localPort: number): TunnelStatus {
    if (this.proc) return this.getStatus();
    this.binaryPath = detectCloudflaredBinary(this.extraDirs);
    if (!this.binaryPath) {
      this.state = 'unavailable';
      this.lastError =
        'cloudflared binary not found in PATH. Install Cloudflare Tunnel (winget install Cloudflare.cloudflared) to enable free Quick Tunnel.';
      this.emit();
      return this.getStatus();
    }

    this.state = 'starting';
    this.publicUrl = null;
    this.lastError = null;
    this.emit();

    const target = `http://127.0.0.1:${localPort}`;
    log.info(`Starting Cloudflare Quick Tunnel -> ${target}`);
    const proc = spawn(this.binaryPath, ['tunnel', '--url', target, '--no-autoupdate'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.proc = proc;

    const handleOutput = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      const match = text.match(URL_REGEX);
      if (match && this.publicUrl !== match[0]) {
        this.publicUrl = match[0];
        this.state = 'running';
        this.lastError = null;
        log.info(`Cloudflare Tunnel active: ${this.publicUrl}`);
        this.emit();
      }
    };

    proc.stdout?.on('data', handleOutput);
    proc.stderr?.on('data', handleOutput);

    proc.once('error', (err) => {
      this.proc = null;
      this.state = 'error';
      this.publicUrl = null;
      this.lastError = err.message;
      log.error('Cloudflare Tunnel error', err);
      this.emit();
    });

    proc.once('exit', (code) => {
      this.proc = null;
      if (this.state !== 'stopped') {
        this.state = code === 0 ? 'stopped' : 'error';
        if (code !== 0 && !this.lastError) {
          this.lastError = `cloudflared exited with code ${code}`;
        }
        this.publicUrl = null;
        this.emit();
      }
    });

    return this.getStatus();
  }

  stop(): TunnelStatus {
    const proc = this.proc;
    this.state = 'stopped';
    this.publicUrl = null;
    this.proc = null;
    if (proc) {
      proc.kill();
      log.info('Cloudflare Tunnel stopped');
    }
    this.emit();
    return this.getStatus();
  }
}
