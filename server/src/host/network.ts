import { createServer as createNetServer } from 'node:net';
import { networkInterfaces } from 'node:os';

export interface LanInterfaceInfo {
  name: string;
  address: string;
  netmask: string;
}

/** Returns non-internal IPv4 addresses suitable for LAN multiplayer on Windows/macOS/Linux. */
export function getLanAddresses(): LanInterfaceInfo[] {
  const nets = networkInterfaces();
  const list: LanInterfaceInfo[] = [];
  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    for (const info of addrs) {
      if (info.family !== 'IPv4' || info.internal) continue;
      if (info.address.startsWith('169.254.')) continue; // link-local APIPA
      list.push({ name, address: info.address, netmask: info.netmask });
    }
  }
  return list;
}

export function buildInviteUrl(baseUrl: string, roomCode: string): string {
  const clean = baseUrl.replace(/\/+$/, '');
  return `${clean}/?room=${encodeURIComponent(roomCode.toUpperCase())}`;
}

export async function isPortReachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createNetServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });
}
