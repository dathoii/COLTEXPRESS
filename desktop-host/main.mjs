/**
 * Desktop Host (Electron) entrypoint.
 * Spawns/starts the authoritative server in-process and opens the browser window.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DESKTOP_CLIENT_DIST = resolve(here, '../release/client');

export async function launchDesktopHost() {
  const { startServer } = await import('../release/server/server.mjs');
  const srv = await startServer({ port: 3001, host: '127.0.0.1', clientDist: DESKTOP_CLIENT_DIST });
  return srv;
}
