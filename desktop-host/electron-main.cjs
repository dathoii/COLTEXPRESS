'use strict';

const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require('electron');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');

const isSmoke = process.argv.includes('--smoke');

if (!isSmoke) {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  }
}

let dashboardWindow = null;
const playerWindows = new Set();
let serverModule = null;
let runningServer = null;
let unsubLog = null;
let unsubTunnel = null;
let configuredPort = Number(process.env.PORT ?? 3001);
let lastError = null;
const offlineLogs = [];

function addOfflineLog(line) {
  offlineLogs.push(`${new Date().toISOString()} INFO  [desktop] ${line}`);
  if (offlineLogs.length > 250) offlineLogs.shift();
  pushLogToWindow(offlineLogs[offlineLogs.length - 1]);
}

function getPaths() {
  const userData = app.getPath('userData');
  if (app.isPackaged) {
    return {
      serverEntry: join(process.resourcesPath, 'server', 'server.mjs'),
      clientDist: join(process.resourcesPath, 'client'),
      iconPath: join(process.resourcesPath, 'assets', 'icons', 'colt-express.png'),
      dbPath: isSmoke ? ':memory:' : join(userData, 'colt-express.db'),
      extraBinaryDirs: [join(process.resourcesPath, 'bin'), join(userData, 'bin')],
    };
  }
  const root = resolve(__dirname, '..');
  return {
    serverEntry: resolve(root, 'release', 'server', 'server.mjs'),
    clientDist: resolve(root, 'release', 'client'),
    iconPath: resolve(root, 'assets', 'icons', 'colt-express.png'),
    dbPath: isSmoke ? ':memory:' : resolve(root, 'data', 'colt-express.db'),
    extraBinaryDirs: [resolve(root, 'bin'), join(userData, 'bin')],
  };
}

async function loadServerModule() {
  if (serverModule) return serverModule;
  const { serverEntry } = getPaths();
  if (!existsSync(serverEntry)) {
    throw new Error(`Server bundle not found at ${serverEntry}. Run npm run build first.`);
  }
  serverModule = await import(pathToFileURL(serverEntry).href);
  return serverModule;
}

function pushLogToWindow(line) {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('host:log', line);
  }
}

function buildStatusSnapshot() {
  const paths = getPaths();
  if (!runningServer) {
    return {
      running: false,
      port: configuredPort,
      host: '0.0.0.0',
      version: app.getVersion(),
      uptimeSec: 0,
      dbPath: paths.dbPath,
      completedGames: 0,
      lanAddresses: [],
      tunnel: {
        state: 'unavailable',
        binaryPath: null,
        publicUrl: null,
        lastError: null,
        provider: 'cloudflare-quick-tunnel',
      },
      rooms: [],
      logs: [...offlineLogs],
      lastError,
      userDataBinDir: join(app.getPath('userData'), 'bin'),
    };
  }
  return {
    ...runningServer.getHostStatus(),
    lastError,
    userDataBinDir: join(app.getPath('userData'), 'bin'),
  };
}

function pushStatusToWindow() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send('host:status-push', buildStatusSnapshot());
  }
}

async function startHostServer(portOverride) {
  if (runningServer) return buildStatusSnapshot();
  lastError = null;
  if (typeof portOverride === 'number' && Number.isFinite(portOverride) && portOverride >= 0 && portOverride <= 65535) {
    configuredPort = Math.floor(portOverride);
  }
  const paths = getPaths();
  if (paths.dbPath !== ':memory:') {
    mkdirSync(dirname(paths.dbPath), { recursive: true });
  }
  const mod = await loadServerModule();
  if (typeof mod.onLog === 'function') {
    unsubLog = mod.onLog((line) => pushLogToWindow(line));
  }
  runningServer = await mod.startServer({
    port: configuredPort,
    host: '0.0.0.0',
    dbPath: paths.dbPath,
    clientDist: paths.clientDist,
    extraBinaryDirs: paths.extraBinaryDirs,
  });
  configuredPort = runningServer.port;
  unsubTunnel = runningServer.tunnel.onChange(() => pushStatusToWindow());
  addOfflineLog(`Server started on port ${runningServer.port} (0.0.0.0)`);
  pushStatusToWindow();
  return buildStatusSnapshot();
}

async function stopHostServer() {
  if (!runningServer) return buildStatusSnapshot();
  const srv = runningServer;
  runningServer = null;
  if (unsubTunnel) {
    unsubTunnel();
    unsubTunnel = null;
  }
  if (unsubLog) {
    unsubLog();
    unsubLog = null;
  }
  await srv.close();
  addOfflineLog('Server stopped cleanly');
  pushStatusToWindow();
  return buildStatusSnapshot();
}

async function restartHostServer(portOverride) {
  await stopHostServer();
  return startHostServer(portOverride);
}

function openPlayerWindow(opts = {}) {
  if (!runningServer) throw new Error('Server must be running first');
  const { iconPath } = getPaths();
  const baseUrl = `http://127.0.0.1:${runningServer.port}/`;
  const qs = new URLSearchParams();
  if (opts.roomCode) qs.set('room', opts.roomCode);
  if (opts.spectator) qs.set('spectator', '1');
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const hash = opts.sessionToken ? `#token=${encodeURIComponent(opts.sessionToken)}` : '';
  const targetUrl = `${baseUrl}${query}${hash}`;

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    fullScreenable: true,
    title: opts.spectator
      ? `Colt Express — Khán Giả (${opts.roomCode || 'Lobby'})`
      : `Colt Express Online (${opts.roomCode || 'Lobby'})`,
    icon: existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  playerWindows.add(win);
  win.on('closed', () => playerWindows.delete(win));
  win.loadURL(targetUrl);
  return { opened: true, url: `${baseUrl}${query}` };
}

function createDashboardWindow() {
  const { iconPath } = getPaths();
  dashboardWindow = new BrowserWindow({
    width: 1220,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    show: !isSmoke,
    title: 'Colt Express Online — Windows Host Server',
    icon: existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  dashboardWindow.loadFile(join(__dirname, 'dashboard.html'));
  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('host:status', () => buildStatusSnapshot());

  ipcMain.handle('host:start', async (_ev, opts = {}) => {
    try {
      const port = opts.port !== undefined ? Number(opts.port) : undefined;
      return { ok: true, data: await startHostServer(port) };
    } catch (err) {
      lastError = err.message || String(err);
      pushStatusToWindow();
      return { ok: false, error: lastError };
    }
  });

  ipcMain.handle('host:stop', async () => {
    try {
      return { ok: true, data: await stopHostServer() };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:restart', async (_ev, opts = {}) => {
    try {
      const port = opts.port !== undefined ? Number(opts.port) : undefined;
      return { ok: true, data: await restartHostServer(port) };
    } catch (err) {
      lastError = err.message || String(err);
      pushStatusToWindow();
      return { ok: false, error: lastError };
    }
  });

  ipcMain.handle('host:createRoom', (_ev, opts = {}) => {
    try {
      if (!runningServer) throw new Error('Hãy bấm Start Server trước.');
      const created = runningServer.createHostRoom({
        roomName: opts.roomName,
        hostMode: opts.hostMode === 'dedicated' ? 'dedicated' : 'player',
        playerName: opts.playerName,
        password: opts.password,
      });
      if (opts.hostMode === 'player' && opts.openWindow !== false && created.sessionToken) {
        openPlayerWindow({ roomCode: created.code, sessionToken: created.sessionToken });
      }
      pushStatusToWindow();
      return { ok: true, data: created };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:startRoom', (_ev, code) => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      runningServer.startHostRoom(code);
      pushStatusToWindow();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:pauseRoom', (_ev, code, reason) => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      runningServer.pauseHostRoom(code, reason);
      pushStatusToWindow();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:resumeRoom', (_ev, code) => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      runningServer.resumeHostRoom(code);
      pushStatusToWindow();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:closeRoom', (_ev, code) => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      runningServer.closeHostRoom(code);
      pushStatusToWindow();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:tunnelStart', async () => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      const status = await runningServer.tunnel.start(runningServer.port);
      pushStatusToWindow();
      return { ok: true, data: status };
    } catch (err) {
      pushStatusToWindow();
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:tunnelStop', () => {
    if (runningServer) runningServer.tunnel.stop();
    pushStatusToWindow();
    return { ok: true };
  });

  ipcMain.handle('host:tunnelRefresh', () => {
    if (!runningServer) return { ok: false, error: 'Server chưa chạy' };
    const status = runningServer.tunnel.refreshBinary();
    pushStatusToWindow();
    return { ok: true, data: status };
  });

  ipcMain.handle('host:backup', async () => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      const snap = runningServer.exportBackup();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const { canceled, filePath } = await dialog.showSaveDialog(dashboardWindow, {
        title: 'Lưu bản sao lưu Colt Express Online',
        defaultPath: join(app.getPath('documents'), `colt-express-backup-${stamp}.json`),
        filters: [{ name: 'Colt Express Backup (JSON)', extensions: ['json'] }],
      });
      if (canceled || !filePath) return { ok: false, error: 'Đã hủy sao lưu' };
      writeFileSync(filePath, JSON.stringify(snap, null, 2), 'utf8');
      addOfflineLog(`Backup saved to ${filePath} (${snap.rooms.length} room(s))`);
      return { ok: true, data: { filePath, rooms: snap.rooms.length } };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:restore', async () => {
    try {
      if (!runningServer) throw new Error('Server chưa chạy');
      const { canceled, filePaths } = await dialog.showOpenDialog(dashboardWindow, {
        title: 'Khôi phục bản sao lưu Colt Express Online',
        properties: ['openFile'],
        filters: [{ name: 'Colt Express Backup (JSON)', extensions: ['json'] }],
      });
      if (canceled || !filePaths.length) return { ok: false, error: 'Đã hủy khôi phục' };
      const raw = readFileSync(filePaths[0], 'utf8');
      const parsed = JSON.parse(raw);
      const count = runningServer.importBackup(parsed);
      pushStatusToWindow();
      return { ok: true, data: { filePath: filePaths[0], rooms: count } };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:openPlayerWindow', (_ev, opts = {}) => {
    try {
      return { ok: true, data: openPlayerWindow(opts) };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('host:copyText', (_ev, text) => {
    clipboard.writeText(String(text ?? ''));
    return { ok: true };
  });

  ipcMain.handle('host:openExternal', async (_ev, url) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
      return { ok: true };
    }
    return { ok: false, error: 'URL không hợp lệ' };
  });
}

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-webgl');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

app.on('child-process-gone', (_ev, details) => {
  if (details && details.type === 'GPU') {
    addOfflineLog(`GPU process exited (${details.reason || 'unknown'}); renderer falls back safely.`);
  }
});

app.on('second-instance', () => {
  if (dashboardWindow) {
    if (dashboardWindow.isMinimized()) dashboardWindow.restore();
    dashboardWindow.focus();
  }
});

app.whenReady().then(async () => {
  registerIpc();
  createDashboardWindow();

  try {
    await startHostServer(isSmoke ? 0 : configuredPort);
    if (isSmoke) {
      const snap = buildStatusSnapshot();
      const res = await fetch(`http://127.0.0.1:${snap.port}/api/health`);
      const health = await res.json();
      if (!snap.running || !health.ok) {
        throw new Error('Smoke check health validation failed');
      }
      console.log(`ELECTRON_HOST_SMOKE_OK port=${snap.port} node=${process.versions.node}`);
      await stopHostServer();
      app.exit(0);
    }
  } catch (err) {
    lastError = err.message || String(err);
    addOfflineLog(`Startup warning: ${lastError}`);
    pushStatusToWindow();
    if (isSmoke) {
      console.error('ELECTRON_HOST_SMOKE_FAIL', err);
      app.exit(1);
    }
  }
});

let shuttingDown = false;
app.on('before-quit', (ev) => {
  if (!runningServer || shuttingDown) return;
  ev.preventDefault();
  shuttingDown = true;
  stopHostServer()
    .catch(() => {})
    .finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
