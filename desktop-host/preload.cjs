'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coltHost', {
  getStatus: () => ipcRenderer.invoke('host:status'),
  startServer: (opts) => ipcRenderer.invoke('host:start', opts),
  stopServer: () => ipcRenderer.invoke('host:stop'),
  restartServer: (opts) => ipcRenderer.invoke('host:restart', opts),
  createRoom: (opts) => ipcRenderer.invoke('host:createRoom', opts),
  startRoom: (code) => ipcRenderer.invoke('host:startRoom', code),
  pauseRoom: (code, reason) => ipcRenderer.invoke('host:pauseRoom', code, reason),
  resumeRoom: (code) => ipcRenderer.invoke('host:resumeRoom', code),
  closeRoom: (code) => ipcRenderer.invoke('host:closeRoom', code),
  startTunnel: () => ipcRenderer.invoke('host:tunnelStart'),
  stopTunnel: () => ipcRenderer.invoke('host:tunnelStop'),
  refreshTunnelBinary: () => ipcRenderer.invoke('host:tunnelRefresh'),
  backupDatabase: () => ipcRenderer.invoke('host:backup'),
  restoreDatabase: () => ipcRenderer.invoke('host:restore'),
  openPlayerWindow: (opts) => ipcRenderer.invoke('host:openPlayerWindow', opts),
  copyText: (text) => ipcRenderer.invoke('host:copyText', text),
  openExternal: (url) => ipcRenderer.invoke('host:openExternal', url),
  onLog: (cb) => {
    const handler = (_ev, line) => cb(line);
    ipcRenderer.on('host:log', handler);
    return () => ipcRenderer.removeListener('host:log', handler);
  },
  onStatusPush: (cb) => {
    const handler = (_ev, status) => cb(status);
    ipcRenderer.on('host:status-push', handler);
    return () => ipcRenderer.removeListener('host:status-push', handler);
  },
});
