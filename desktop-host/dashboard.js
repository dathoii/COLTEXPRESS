'use strict';

const api = window.coltHost;

const $ = (id) => document.getElementById(id);

const STORAGE_HOST_LANG = 'colt.host.lang';

const I18N = {
  vi: {
    headerTitle: 'Colt Express Online — Windows Host',
    headerSubtitle: 'Authoritative Server • LAN & Internet Tunnel • Invite-Only (3–6 Người)',
    portLabel: 'Port',
    btnStart: 'Start Server',
    btnRestart: 'Restart Server',
    btnStop: 'Stop Server',
    btnOpenLobby: 'Mở Cửa Sổ Game',
    panelStatus: 'Server Status & Dữ Liệu',
    kvStateLabel: 'Trạng thái',
    kvListenLabel: 'Địa chỉ lắng nghe',
    kvUptimeLabel: 'Thời gian chạy',
    kvGamesLabel: 'Ván đã hoàn tất',
    btnBackup: 'Backup Dữ Liệu',
    btnRestore: 'Restore Bản Lưu',
    panelNetwork: 'Network Status (LAN & Internet)',
    lanHeading: 'Mạng LAN (Cùng Wi-Fi / Router)',
    waitingServer: 'Đang chờ server khởi động...',
    tunnelHeading: 'Internet Miễn Phí (Cloudflare Quick Tunnel)',
    tunnelIdleDefault: 'Chưa bật Tunnel. Không cần VPS, domain hay thẻ tín dụng.',
    btnTunnelStart: 'Bật Quick Tunnel',
    btnTunnelStop: 'Tắt Tunnel',
    btnTunnelCopy: 'Copy Link Internet',
    btnTunnelRefresh: 'Kiểm tra lại',
    tunnelHintLead: 'Lưu ý CGNAT & Firewall: Quick Tunnel không cần mở port router nhưng yêu cầu có tệp',
    tunnelHintMid: 'trong PATH hoặc thư mục',
    tunnelHintEnd: 'Link Quick Tunnel là tạm thời cho mỗi phiên.',
    panelCreateRoom: 'Tạo Phòng Chơi Mới (Invite-Only • 3–6 Người)',
    hostModeLabel: 'Chế độ Host',
    optHostPlayer: 'Host Player (Host vừa chạy server vừa chơi)',
    optDedicated: 'Dedicated Server (Host chỉ điều hành, không chiếm chỗ)',
    playerNameLabel: 'Tên Người Chơi (Host)',
    roomNameLabel: 'Tên Phòng',
    roomPwdLabel: 'Mật khẩu (tùy chọn)',
    roomPwdPlaceholder: 'Để trống nếu dùng mã mời',
    btnCreateRoom: 'Tạo Phòng',
    panelRooms: 'Danh Sách Phòng, Người Chơi & Khán Giả',
    emptyRoomsDefault: 'Chưa có phòng nào. Tạo phòng mới ở trên hoặc mở cửa sổ game để tạo.',
    panelLogs: 'Server Logs (Thời gian thực)',
    btnClearLogs: 'Xóa hiển thị',
    stateRunning: (v) => `Đang hoạt động (v${v})`,
    stateError: (e) => `Dừng — Lỗi: ${e}`,
    stateStopped: 'Đã dừng',
    serverOff: 'Server đang tắt.',
    cloudflaredReady: 'cloudflared: Sẵn sàng',
    cloudflaredMissing: 'cloudflared: Chưa cài',
    tunnelErr: (e) => `Lỗi Tunnel: ${e}`,
    tunnelNoBin: 'Không tìm thấy cloudflared.exe trên máy. Mạng LAN vẫn hoạt động bình thường; để chơi qua Internet, đặt cloudflared.exe vào thư mục bin.',
    tunnelOff: 'Tunnel đang tắt. Nhấn "Bật Quick Tunnel" để lấy link Internet công khai.',
    roomsUnit: (n) => `${n} phòng`,
    emptyRoomsLong: 'Chưa có phòng nào. Dùng biểu mẫu ở trên để tạo phòng Host Player hoặc Dedicated Server.',
    noNewLogs: '(Chưa có log mới)',
    clearedLogs: '(Đã xóa màn hình log)',
    roundTag: 'Vòng',
    noPlayersYet: 'Chưa có người chơi (tối thiểu 3 để bắt đầu)',
    readyLabel: 'Sẵn sàng',
    waitLabel: 'Chờ',
    noSpecs: 'Không có khán giả',
    specOnline: 'Đang xem',
    specOffline: 'Mất kết nối',
    hasPwd: '🔒 Có mật khẩu',
    startMatch: 'Bắt Đầu Trận',
    resume: 'Tiếp Tục',
    pause: 'Tạm Dừng',
    openSpec: 'Xem Khán Giả',
    closeRoom: 'Đóng Phòng',
    playersHead: (n) => `Người chơi (${n}/6)`,
    specsHead: (n) => `Khán giả (${n})`,
    inviteHead: 'Link Mời (Invite-Only)',
    specPrefix: 'Khán giả',
    pauseByHost: 'Tạm dừng bởi Windows Host',
    toastTunnelStarting: 'Đang khởi tạo Cloudflare Quick Tunnel...',
    toastTunnelReady: (u) => `Quick Tunnel sẵn sàng: ${u}`,
    toastTunnelStopped: 'Đã tắt Quick Tunnel.',
    toastCopyInternet: 'Đã copy link Internet!',
    toastCopied: (v) => `Đã copy: ${v}`,
    toastRoomCreated: (c, m) => `Đã tạo phòng ${c} (${m})`,
    toastServerStarted: (p) => `Server đã chạy tại cổng ${p}`,
    toastServerStopped: 'Đã dừng server.',
    toastServerRestarted: (p) => `Đã khởi động lại tại cổng ${p}`,
    toastBackupOk: (n, f) => `Đã lưu backup (${n} phòng): ${f}`,
    toastRestoreOk: (n) => `Đã khôi phục ${n} phòng từ bản lưu.`,
    errPrefix: 'Lỗi',
  },
  en: {
    headerTitle: 'Colt Express Online — Windows Host',
    headerSubtitle: 'Authoritative Server • LAN & Internet Tunnel • Invite-Only (3–6 Players)',
    portLabel: 'Port',
    btnStart: 'Start Server',
    btnRestart: 'Restart Server',
    btnStop: 'Stop Server',
    btnOpenLobby: 'Open Game Window',
    panelStatus: 'Server Status & Data',
    kvStateLabel: 'Status',
    kvListenLabel: 'Listening At',
    kvUptimeLabel: 'Uptime',
    kvGamesLabel: 'Completed Matches',
    btnBackup: 'Backup Data',
    btnRestore: 'Restore Backup',
    panelNetwork: 'Network Status (LAN & Internet)',
    lanHeading: 'LAN Network (Same Wi-Fi / Router)',
    waitingServer: 'Waiting for server to start...',
    tunnelHeading: 'Free Internet (Cloudflare Quick Tunnel)',
    tunnelIdleDefault: 'Tunnel idle. No VPS, domain, or credit card needed.',
    btnTunnelStart: 'Start Quick Tunnel',
    btnTunnelStop: 'Stop Tunnel',
    btnTunnelCopy: 'Copy Internet URL',
    btnTunnelRefresh: 'Re-check Binary',
    tunnelHintLead: 'CGNAT & Firewall note: Quick Tunnel requires zero router port-forwarding and looks for',
    tunnelHintMid: 'in PATH or folder',
    tunnelHintEnd: 'The generated link is temporary per session.',
    panelCreateRoom: 'Create New Room (Invite-Only • 3–6 Players)',
    hostModeLabel: 'Host Mode',
    optHostPlayer: 'Host Player (Run server & play in match)',
    optDedicated: 'Dedicated Server (Moderator only, does not take seat)',
    playerNameLabel: 'Host Player Name',
    roomNameLabel: 'Room Name',
    roomPwdLabel: 'Password (optional)',
    roomPwdPlaceholder: 'Leave blank for invite code only',
    btnCreateRoom: 'Create Room',
    panelRooms: 'Rooms, Players & Spectators',
    emptyRoomsDefault: 'No active rooms yet. Create one above or open the game window.',
    panelLogs: 'Server Logs (Live)',
    btnClearLogs: 'Clear Display',
    stateRunning: (v) => `Running (v${v})`,
    stateError: (e) => `Stopped — Error: ${e}`,
    stateStopped: 'Stopped',
    serverOff: 'Server is stopped.',
    cloudflaredReady: 'cloudflared: Ready',
    cloudflaredMissing: 'cloudflared: Missing',
    tunnelErr: (e) => `Tunnel Error: ${e}`,
    tunnelNoBin: 'cloudflared.exe not found. LAN still works normally; place cloudflared.exe in the bin folder for Internet play.',
    tunnelOff: 'Tunnel is off. Click "Start Quick Tunnel" to create a public Internet URL.',
    roomsUnit: (n) => `${n} room${n === 1 ? '' : 's'}`,
    emptyRoomsLong: 'No rooms yet. Use the form above to create a Host Player or Dedicated Server room.',
    noNewLogs: '(No new logs)',
    clearedLogs: '(Display cleared)',
    roundTag: 'Round',
    noPlayersYet: 'No players yet (minimum 3 to start)',
    readyLabel: 'Ready',
    waitLabel: 'Waiting',
    noSpecs: 'No spectators',
    specOnline: 'Watching',
    specOffline: 'Disconnected',
    hasPwd: '🔒 Password',
    startMatch: 'Start Match',
    resume: 'Resume',
    pause: 'Pause',
    openSpec: 'Open Spectator',
    closeRoom: 'Close Room',
    playersHead: (n) => `Players (${n}/6)`,
    specsHead: (n) => `Spectators (${n})`,
    inviteHead: 'Invite Links (Invite-Only)',
    specPrefix: 'Spectator',
    pauseByHost: 'Paused by Windows Host',
    toastTunnelStarting: 'Starting Cloudflare Quick Tunnel...',
    toastTunnelReady: (u) => `Quick Tunnel ready: ${u}`,
    toastTunnelStopped: 'Quick Tunnel stopped.',
    toastCopyInternet: 'Internet URL copied!',
    toastCopied: (v) => `Copied: ${v}`,
    toastRoomCreated: (c, m) => `Created room ${c} (${m})`,
    toastServerStarted: (p) => `Server listening on port ${p}`,
    toastServerStopped: 'Server stopped.',
    toastServerRestarted: (p) => `Server restarted on port ${p}`,
    toastBackupOk: (n, f) => `Saved backup (${n} rooms): ${f}`,
    toastRestoreOk: (n) => `Restored ${n} rooms from backup.`,
    errPrefix: 'Error',
  },
};

let currentLang = localStorage.getItem(STORAGE_HOST_LANG) === 'en' ? 'en' : 'vi';

const els = {
  btnLang: $('btn-lang'),
  portInput: $('port-input'),
  btnStart: $('btn-start'),
  btnRestart: $('btn-restart'),
  btnStop: $('btn-stop'),
  btnOpenLobby: $('btn-open-lobby'),
  statusPill: $('status-pill'),
  kvState: $('kv-state'),
  kvListen: $('kv-listen'),
  kvUptime: $('kv-uptime'),
  kvGames: $('kv-games'),
  kvDb: $('kv-db'),
  btnBackup: $('btn-backup'),
  btnRestore: $('btn-restore'),
  tunnelPill: $('tunnel-pill'),
  lanList: $('lan-list'),
  cloudflaredBadge: $('cloudflared-badge'),
  tunnelUrlBox: $('tunnel-url-box'),
  btnTunnelStart: $('btn-tunnel-start'),
  btnTunnelStop: $('btn-tunnel-stop'),
  btnTunnelCopy: $('btn-tunnel-copy'),
  btnTunnelRefresh: $('btn-tunnel-refresh'),
  binDir: $('bin-dir'),
  createForm: $('create-room-form'),
  hostMode: $('host-mode'),
  playerNameWrap: $('player-name-wrap'),
  hostPlayerName: $('host-player-name'),
  roomName: $('room-name'),
  roomPassword: $('room-password'),
  roomCountBadge: $('room-count-badge'),
  roomsContainer: $('rooms-container'),
  logsBox: $('logs-box'),
  btnClearLogs: $('btn-clear-logs'),
  toast: $('toast'),
};

let currentStatus = null;
let clearedAtCount = 0;

function dict() {
  return I18N[currentLang];
}

function applyLanguage() {
  const L = dict();
  document.documentElement.lang = currentLang;
  if (els.btnLang) {
    els.btnLang.textContent = currentLang === 'vi' ? '🇻🇳 VI | EN' : '🇺🇸 EN | VI';
  }
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && typeof L[key] === 'string') {
      el.textContent = L[key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key && typeof L[key] === 'string') {
      el.setAttribute('placeholder', L[key]);
    }
  });
  if (currentStatus) {
    renderStatus(currentStatus);
  }
}

els.btnLang?.addEventListener('click', () => {
  currentLang = currentLang === 'vi' ? 'en' : 'vi';
  localStorage.setItem(STORAGE_HOST_LANG, currentLang);
  applyLanguage();
});

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.add('hidden'), 3200);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUptime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function renderStatus(snap) {
  const L = dict();
  currentStatus = snap;

  // Header & status card
  els.statusPill.textContent = snap.running ? 'RUNNING' : 'STOPPED';
  els.statusPill.className = `pill ${snap.running ? 'running' : 'stopped'}`;
  els.btnStart.disabled = snap.running;
  els.btnStop.disabled = !snap.running;
  els.btnRestart.disabled = !snap.running;
  els.btnOpenLobby.disabled = !snap.running;
  els.btnBackup.disabled = !snap.running;
  els.btnRestore.disabled = !snap.running;

  els.kvState.textContent = snap.running
    ? L.stateRunning(snap.version)
    : snap.lastError
      ? L.stateError(snap.lastError)
      : L.stateStopped;
  els.kvListen.textContent = snap.running ? `http://${snap.host}:${snap.port}` : '—';
  els.kvUptime.textContent = snap.running ? formatUptime(snap.uptimeSec) : '0m 0s';
  els.kvGames.textContent = String(snap.completedGames ?? 0);
  els.kvDb.textContent = snap.dbPath || '—';
  if (snap.userDataBinDir) {
    els.binDir.textContent = snap.userDataBinDir;
  }

  // LAN list
  if (!snap.running) {
    els.lanList.innerHTML = `<li class="muted">${escapeHtml(L.serverOff)}</li>`;
  } else if (!snap.lanAddresses || snap.lanAddresses.length === 0) {
    els.lanList.innerHTML = `<li><span class="mono">http://127.0.0.1:${snap.port}</span><button class="btn ghost small-btn" data-copy="http://127.0.0.1:${snap.port}">Copy</button></li>`;
  } else {
    const items = snap.lanAddresses.map((n) => {
      const url = `http://${n.address}:${snap.port}`;
      return `<li><span><strong>${escapeHtml(n.name)}</strong>: <span class="mono">${escapeHtml(url)}</span></span><button class="btn ghost small-btn" data-copy="${escapeHtml(url)}">Copy LAN</button></li>`;
    });
    items.push(
      `<li><span><strong>Localhost</strong>: <span class="mono">http://127.0.0.1:${snap.port}</span></span><button class="btn ghost small-btn" data-copy="http://127.0.0.1:${snap.port}">Copy</button></li>`,
    );
    els.lanList.innerHTML = items.join('');
  }

  // Tunnel
  const t = snap.tunnel || { state: 'unavailable', binaryPath: null, publicUrl: null, lastError: null };
  const hasBinary = Boolean(t.binaryPath) && t.state !== 'unavailable';
  els.tunnelPill.textContent = `TUNNEL ${String(t.state).toUpperCase()}`;
  els.tunnelPill.className = `pill ${t.state === 'running' ? 'ready' : t.state === 'error' || t.state === 'unavailable' ? 'error' : t.state === 'starting' ? 'starting' : 'idle'}`;
  els.cloudflaredBadge.textContent = hasBinary ? L.cloudflaredReady : L.cloudflaredMissing;
  els.btnTunnelStart.disabled = !snap.running || !hasBinary || t.state === 'starting' || t.state === 'running';
  els.btnTunnelStop.disabled = !snap.running || (t.state !== 'running' && t.state !== 'starting');
  els.btnTunnelCopy.disabled = !t.publicUrl;

  if (t.publicUrl) {
    els.tunnelUrlBox.className = 'tunnel-box mono';
    els.tunnelUrlBox.textContent = t.publicUrl;
  } else if (t.lastError) {
    els.tunnelUrlBox.className = 'tunnel-box';
    els.tunnelUrlBox.textContent = L.tunnelErr(t.lastError);
  } else if (!hasBinary) {
    els.tunnelUrlBox.className = 'tunnel-box muted';
    els.tunnelUrlBox.textContent = L.tunnelNoBin;
  } else {
    els.tunnelUrlBox.className = 'tunnel-box muted';
    els.tunnelUrlBox.textContent = L.tunnelOff;
  }

  // Rooms
  const rooms = snap.rooms || [];
  els.roomCountBadge.textContent = L.roomsUnit(rooms.length);
  if (rooms.length === 0) {
    els.roomsContainer.innerHTML = `<div class="empty-box">${escapeHtml(L.emptyRoomsLong)}</div>`;
  } else {
    els.roomsContainer.innerHTML = rooms.map(renderRoomCard).join('');
  }

  // Logs
  const allLogs = snap.logs || [];
  const visible = allLogs.slice(clearedAtCount);
  els.logsBox.textContent = visible.length ? visible.join('\n') : L.noNewLogs;
  els.logsBox.scrollTop = els.logsBox.scrollHeight;
}

function renderRoomCard(r) {
  const L = dict();
  const modeLabel = r.hostMode === 'dedicated' ? 'Dedicated Server' : 'Host Player';
  const pauseBadge = r.paused
    ? `<span class="pill paused">PAUSED${r.pauseReason ? `: ${escapeHtml(r.pauseReason)}` : ''}</span>`
    : `<span class="pill running">${escapeHtml(r.phase.toUpperCase())} • ${escapeHtml(L.roundTag)} ${r.round}</span>`;

  const playersHtml =
    r.players.length === 0
      ? `<li class="muted">${escapeHtml(L.noPlayersYet)}</li>`
      : r.players
          .map(
            (p) =>
              `<li><span>${escapeHtml(p.name)} ${p.character ? `(${escapeHtml(p.character)})` : ''}</span><span>${p.connected ? '🟢' : '🔴'} ${escapeHtml(p.ready ? L.readyLabel : L.waitLabel)}</span></li>`,
          )
          .join('');

  const specsHtml =
    r.spectators.length === 0
      ? `<li class="muted">${escapeHtml(L.noSpecs)}</li>`
      : r.spectators
          .map((s) => `<li><span>${escapeHtml(s.name)}</span><span>${s.connected ? `🟢 ${escapeHtml(L.specOnline)}` : `🔴 ${escapeHtml(L.specOffline)}`}</span></li>`)
          .join('');

  const primaryInvite = r.inviteUrls[1] || r.inviteUrls[0] || '';
  const specInvite = primaryInvite ? `${primaryInvite}&spectator=1` : '';
  const invitesHtml = r.inviteUrls
    .map(
      (u) =>
        `<div class="invite-row"><span class="mono">${escapeHtml(u)}</span><button class="btn ghost small-btn" data-copy="${escapeHtml(u)}">Copy Invite</button></div>`,
    )
    .join('');

  const canStart = r.phase === 'lobby' && r.players.length >= 3 && r.players.length <= 6;

  return `
    <div class="room-card">
      <div class="room-top">
        <div>
          <span class="room-code">${escapeHtml(r.code)}</span>
          <strong class="room-name">${escapeHtml(r.name)}</strong>
          <span class="badge room-badge">${modeLabel}</span>
          ${r.hasPassword ? `<span class="badge room-badge">${escapeHtml(L.hasPwd)}</span>` : ''}
        </div>
        <div class="action-row">
          ${pauseBadge}
          ${canStart ? `<button class="btn primary small-btn" data-room-act="start" data-code="${escapeHtml(r.code)}">${escapeHtml(L.startMatch)}</button>` : ''}
          ${
            r.phase !== 'lobby' && r.phase !== 'gameEnd'
              ? r.paused
                ? `<button class="btn primary small-btn" data-room-act="resume" data-code="${escapeHtml(r.code)}">${escapeHtml(L.resume)}</button>`
                : `<button class="btn secondary small-btn" data-room-act="pause" data-code="${escapeHtml(r.code)}">${escapeHtml(L.pause)}</button>`
              : ''
          }
          <button class="btn ghost small-btn" data-open-spec="${escapeHtml(r.code)}">${escapeHtml(L.openSpec)}</button>
          <button class="btn danger small-btn" data-room-act="close" data-code="${escapeHtml(r.code)}">${escapeHtml(L.closeRoom)}</button>
        </div>
      </div>

      <div class="room-columns">
        <div>
          <strong>${escapeHtml(L.playersHead(r.players.length))}</strong>
          <ul class="mini-list">${playersHtml}</ul>
        </div>
        <div>
          <strong>${escapeHtml(L.specsHead(r.spectators.length))}</strong>
          <ul class="mini-list">${specsHtml}</ul>
        </div>
        <div>
          <strong>${escapeHtml(L.inviteHead)}</strong>
          <div class="invite-box">
            ${invitesHtml}
            ${
              specInvite
                ? `<div class="invite-row"><span class="mono">${escapeHtml(L.specPrefix)}: ${escapeHtml(specInvite)}</span><button class="btn ghost small-btn" data-copy="${escapeHtml(specInvite)}">Copy Spec</button></div>`
                : ''
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

// Form toggle
els.hostMode.addEventListener('change', () => {
  els.playerNameWrap.classList.toggle('hidden', els.hostMode.value === 'dedicated');
});

els.createForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const L = dict();
  const mode = els.hostMode.value;
  const res = await api.createRoom({
    hostMode: mode,
    playerName: els.hostPlayerName.value.trim() || 'Host Sheriff',
    roomName: els.roomName.value.trim() || 'Union Pacific Express',
    password: els.roomPassword.value,
    openWindow: mode === 'player',
  });
  if (!res.ok) {
    showToast(`${L.errPrefix}: ${res.error}`);
    return;
  }
  showToast(L.toastRoomCreated(res.data.code, mode === 'dedicated' ? 'Dedicated' : 'Host Player'));
  await refresh();
});

// Header buttons
els.btnStart.addEventListener('click', async () => {
  const L = dict();
  const port = Number(els.portInput.value || 3001);
  const res = await api.startServer({ port });
  if (!res.ok) showToast(`${L.errPrefix}: ${res.error}`);
  else {
    showToast(L.toastServerStarted(res.data.port));
    renderStatus(res.data);
  }
});

els.btnStop.addEventListener('click', async () => {
  const L = dict();
  const res = await api.stopServer();
  if (!res.ok) showToast(`${L.errPrefix}: ${res.error}`);
  else {
    showToast(L.toastServerStopped);
    renderStatus(res.data);
  }
});

els.btnRestart.addEventListener('click', async () => {
  const L = dict();
  const port = Number(els.portInput.value || 3001);
  const res = await api.restartServer({ port });
  if (!res.ok) showToast(`${L.errPrefix}: ${res.error}`);
  else {
    showToast(L.toastServerRestarted(res.data.port));
    renderStatus(res.data);
  }
});

els.btnOpenLobby.addEventListener('click', async () => {
  const res = await api.openPlayerWindow({});
  if (!res.ok) showToast(res.error);
});

els.btnBackup.addEventListener('click', async () => {
  const res = await api.backupDatabase();
  if (res.ok) showToast(dict().toastBackupOk(res.data.rooms, res.data.filePath));
  else showToast(res.error);
});

els.btnRestore.addEventListener('click', async () => {
  const res = await api.restoreDatabase();
  if (res.ok) {
    showToast(dict().toastRestoreOk(res.data.rooms));
    await refresh();
  } else {
    showToast(res.error);
  }
});

els.btnTunnelStart.addEventListener('click', async () => {
  const L = dict();
  showToast(L.toastTunnelStarting);
  const res = await api.startTunnel();
  if (!res.ok) showToast(`${L.errPrefix}: ${res.error}`);
  else if (res.data?.publicUrl) showToast(L.toastTunnelReady(res.data.publicUrl));
  await refresh();
});

els.btnTunnelStop.addEventListener('click', async () => {
  await api.stopTunnel();
  showToast(dict().toastTunnelStopped);
  await refresh();
});

els.btnTunnelCopy.addEventListener('click', async () => {
  const url = currentStatus?.tunnel?.publicUrl;
  if (!url) return;
  await api.copyText(url);
  showToast(dict().toastCopyInternet);
});

els.btnTunnelRefresh.addEventListener('click', async () => {
  await api.refreshTunnelBinary();
  await refresh();
});

els.btnClearLogs.addEventListener('click', () => {
  clearedAtCount = currentStatus?.logs?.length ?? 0;
  els.logsBox.textContent = dict().clearedLogs;
});

// Delegated copy / room actions
document.body.addEventListener('click', async (ev) => {
  const target = ev.target.closest('button');
  if (!target) return;

  const copyVal = target.getAttribute('data-copy');
  if (copyVal) {
    await api.copyText(copyVal);
    showToast(dict().toastCopied(copyVal));
    return;
  }

  const openSpec = target.getAttribute('data-open-spec');
  if (openSpec) {
    const res = await api.openPlayerWindow({ roomCode: openSpec, spectator: true });
    if (!res.ok) showToast(res.error);
    return;
  }

  const act = target.getAttribute('data-room-act');
  const code = target.getAttribute('data-code');
  if (act && code) {
    let res;
    if (act === 'start') res = await api.startRoom(code);
    else if (act === 'pause') res = await api.pauseRoom(code, dict().pauseByHost);
    else if (act === 'resume') res = await api.resumeRoom(code);
    else if (act === 'close') res = await api.closeRoom(code);
    if (res && !res.ok) showToast(res.error);
    else await refresh();
  }
});

async function refresh() {
  const snap = await api.getStatus();
  renderStatus(snap);
}

api.onLog((line) => {
  const L = dict();
  if (currentStatus) {
    currentStatus.logs.push(line);
    if (currentStatus.logs.length > 250) currentStatus.logs.shift();
  }
  const existing = els.logsBox.textContent === L.noNewLogs || els.logsBox.textContent === L.clearedLogs
    ? ''
    : els.logsBox.textContent + '\n';
  els.logsBox.textContent = existing + line;
  els.logsBox.scrollTop = els.logsBox.scrollHeight;
});

api.onStatusPush((snap) => renderStatus(snap));

applyLanguage();
refresh();
setInterval(refresh, 1500);
