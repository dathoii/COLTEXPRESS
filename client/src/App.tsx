import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  ActionType,
  BotDifficulty,
  CharacterId,
  ClientToServerEvents,
  GameView,
  HostMode,
  LootType,
  ParticipantRole,
  ResolutionChoice,
  Result,
  RoomInfo,
  ServerToClientEvents,
  SessionInfo,
} from '@colt/shared';
import { MarshalBadge } from './components/art/LootToken.js';
import { MenuScreen } from './components/screens/MenuScreen.js';
import { CreateScreen } from './components/screens/CreateScreen.js';
import { JoinScreen } from './components/screens/JoinScreen.js';
import { LobbyScreen } from './components/screens/LobbyScreen.js';
import { SettingsModal } from './components/screens/SettingsModal.js';
import { GameArenaScreen } from './components/screens/GameArenaScreen.js';
import { soundManager, type SfxKey } from './audio/soundManager.js';
import { useGameAnimations } from './hooks/useGameAnimations.js';
import { UI_STRINGS, type Lang } from './i18n.js';

export type ScreenId = 'menu' | 'create' | 'join' | 'lobby' | 'game' | 'settings';

const STORAGE_TOKEN = 'colt.session.token';
const STORAGE_SERVER = 'colt.server.url';
const STORAGE_NAME = 'colt.player.name';
const STORAGE_ANIM = 'colt.ui.animations';
const STORAGE_GRAPHICS = 'colt.ui.graphics';
const STORAGE_CAM_FX = 'colt.ui.cameraFx';
const STORAGE_LANG = 'colt.ui.lang';
const STORAGE_SOUND = 'colt.ui.sound';
const STORAGE_BGM = 'colt.ui.bgm';
const STORAGE_SFX = 'colt.ui.sfx';
const STORAGE_VOL = 'colt.ui.volume.v2';

interface RevealCue {
  seq: number;
  playerId: string;
  action: ActionType;
}

function loadInitialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_LANG);
  return saved === 'en' ? 'en' : 'vi';
}

function initialInviteFromUrl(): { code: string; spectator: boolean } {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  if (hash.startsWith('#token=')) {
    const token = decodeURIComponent(hash.slice('#token='.length));
    if (token) localStorage.setItem(STORAGE_TOKEN, token);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return {
    code: (params.get('room') ?? '').trim().toUpperCase(),
    spectator: params.get('spectator') === '1',
  };
}

export function App() {
  const invite = useMemo(() => initialInviteFromUrl(), []);
  const [lang, setLang] = useState<Lang>(() => loadInitialLang());
  const t = UI_STRINGS[lang];
  const [serverUrl, setServerUrl] = useState<string>(() => localStorage.getItem(STORAGE_SERVER) ?? '');
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(
    () => localStorage.getItem(STORAGE_ANIM) !== 'false',
  );
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'low'>(
    () => (localStorage.getItem(STORAGE_GRAPHICS) === 'low' ? 'low' : 'high'),
  );
  const [cameraEffects, setCameraEffects] = useState<boolean>(
    () => localStorage.getItem(STORAGE_CAM_FX) !== 'false',
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    () => localStorage.getItem(STORAGE_SOUND) !== 'false',
  );
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(
    () => localStorage.getItem(STORAGE_BGM) !== 'false',
  );
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(
    () => localStorage.getItem(STORAGE_SFX) !== 'false',
  );
  const [volume, setVolume] = useState<number>(() => {
    const rawStr = localStorage.getItem(STORAGE_VOL);
    if (rawStr === null || rawStr === '') return 1;
    const raw = Number(rawStr);
    return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : 1;
  });
  const [isDealing, setIsDealing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem(STORAGE_NAME) ?? 'Outlaw');
  const [roomName, setRoomName] = useState<string>('Union Pacific 1899');
  const [hostMode, setHostMode] = useState<HostMode>('player');
  const [roomPassword, setRoomPassword] = useState<string>('');
  const [turnTimeoutSec, setTurnTimeoutSec] = useState<number>(0);
  const [joinCode, setJoinCode] = useState<string>(invite.code);
  const [joinPassword, setJoinPassword] = useState<string>('');
  const [joinAsSpectator, setJoinAsSpectator] = useState<boolean>(invite.spectator);
  const [screen, setScreen] = useState<ScreenId>(() => (invite.code ? 'join' : 'menu'));
  const [connected, setConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [role, setRole] = useState<ParticipantRole>('player');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [faceDownToggle, setFaceDownToggle] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [revealQueue, setRevealQueue] = useState<RevealCue[]>([]);
  const [selectedPunchTargetId, setSelectedPunchTargetId] = useState<string | null>(null);
  const [selectedPunchLoot, setSelectedPunchLoot] = useState<LootType | null | 'unset'>('unset');

  const appShellRef = useRef<HTMLDivElement | null>(null);
  const wasNativeFsRef = useRef<boolean>(false);
  const lastLogSeqRef = useRef<number>(-1);
  const syncedRoomRef = useRef<string | null>(null);
  const dealKeyRef = useRef<string>('');
  const prevTurnAlertRef = useRef<string>('');
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const reqSeqRef = useRef<number>(1);
  const anim = useGameAnimations(game, animationsEnabled);
  const isCinematicPlaying = Boolean(anim.activeClip);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_LANG, lang);
  }, [lang]);

  useEffect(() => {
    soundManager.applySettings({ soundEnabled, bgmEnabled, sfxEnabled, volume });
    localStorage.setItem(STORAGE_SOUND, String(soundEnabled));
    localStorage.setItem(STORAGE_BGM, String(bgmEnabled));
    localStorage.setItem(STORAGE_SFX, String(sfxEnabled));
    localStorage.setItem(STORAGE_VOL, String(volume));
  }, [soundEnabled, bgmEnabled, sfxEnabled, volume]);

  useEffect(() => {
    if (screen === 'game' && game) {
      soundManager.setBgm(game.phase === 'gameEnd' ? null : 'western');
    } else {
      soundManager.setBgm('saloon');
    }
  }, [screen, game?.phase]);

  // Automatic non-interactive shuffle & deal effect at start of game and start of every new round
  const activeRoomCode = room?.code ?? '';
  const roundPlanningKey =
    screen === 'game' && activeRoomCode && game && game.phase === 'planning'
      ? `${activeRoomCode}:${game.roundIndex}`
      : '';
  const isFreshPlanningStart = Boolean(game && game.phase === 'planning' && game.actionStack.length === 0);

  useEffect(() => {
    if (!roundPlanningKey) {
      if (!activeRoomCode) dealKeyRef.current = '';
      setIsDealing(false);
      return;
    }
    if (isCinematicPlaying || !isFreshPlanningStart) return;
    if (dealKeyRef.current === roundPlanningKey) return;
    dealKeyRef.current = roundPlanningKey;

    soundManager.playSfx('shuffle');
    const dealSoundTimers = [260, 520, 780].map((ms) =>
      window.setTimeout(() => soundManager.playSfx('deal', 0.8), ms),
    );
    if (animationsEnabled) {
      setIsDealing(true);
    }
    return () => {
      dealSoundTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [roundPlanningKey, isFreshPlanningStart, animationsEnabled, activeRoomCode, isCinematicPlaying]);

  // Independent timer guarantees dealing overlay always clears cleanly after 1550ms
  useEffect(() => {
    if (!isDealing) return;
    const endTimer = window.setTimeout(() => setIsDealing(false), 1550);
    return () => window.clearTimeout(endTimer);
  }, [isDealing]);

  // Reset Ghost's Step-0 face-down toggle across step / turn / round transitions
  const turnStepKey = game
    ? `${game.roundIndex}:${game.planning?.turnIndex ?? -1}:${game.planning?.stepsTaken ?? -1}:${game.planning?.orderIndex ?? -1}`
    : '';
  useEffect(() => {
    setFaceDownToggle(false);
  }, [turnStepKey]);

  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      if (active) {
        wasNativeFsRef.current = true;
        setIsFullscreen(true);
      } else if (wasNativeFsRef.current) {
        wasNativeFsRef.current = false;
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  // Enqueue unseen execution.noEffect spotlights & non-duplicated Wild West SFX for new game log events
  useEffect(() => {
    if (!game || !room) {
      syncedRoomRef.current = null;
      lastLogSeqRef.current = -1;
      setRevealQueue([]);
      return;
    }
    const maxSeq = game.log.reduce((m, e) => (e.seq > m ? e.seq : m), -1);
    if (syncedRoomRef.current !== room.code || maxSeq < lastLogSeqRef.current) {
      syncedRoomRef.current = room.code;
      lastLogSeqRef.current = maxSeq;
      setRevealQueue([]);
      return;
    }
    const unseen = game.log.filter((ev) => ev.seq > lastLogSeqRef.current);
    const cues: RevealCue[] = [];
    const sfxQueue: SfxKey[] = [];
    for (const ev of unseen) {
      switch (ev.type) {
        case 'planning.cardPlayed':
          sfxQueue.push('playCard');
          break;
        case 'planning.cardsDrawn':
          sfxQueue.push('deal');
          break;
        case 'execution.cardRevealed':
          sfxQueue.push('cardFlip');
          break;
        case 'execution.noEffect': {
          sfxQueue.push('emptyClick');
          const d = ev.data as { playerId?: string; action?: ActionType } | undefined;
          if (d?.playerId && d?.action) {
            cues.push({ seq: ev.seq, playerId: d.playerId, action: d.action });
          }
          break;
        }
        case 'action.moved':
          if (!animationsEnabled) sfxQueue.push('move');
          break;
        case 'action.changedFloor':
          if (!animationsEnabled) sfxQueue.push('climb');
          break;
        case 'action.robbed':
          if (!animationsEnabled) {
            const lt = (ev.data as { lootType?: string } | undefined)?.lootType;
            sfxQueue.push(lt === 'strongbox' ? 'robSack' : 'robCoin');
          }
          break;
        case 'action.shot':
          if (!animationsEnabled) sfxQueue.push('shoot');
          break;
        case 'action.punched':
          if (!animationsEnabled) sfxQueue.push('punch');
          break;
        case 'action.marshalMoved':
        case 'marshal.hit':
          if (!animationsEnabled) sfxQueue.push('marshal');
          break;
        case 'game.ended':
          sfxQueue.push('victory');
          break;
      }
    }
    if (cues.length > 0) {
      setRevealQueue((prev) => [...prev, ...cues]);
    }
    const uniqueSfx = Array.from(new Set(sfxQueue)).slice(0, 3);
    uniqueSfx.forEach((key, idx) => {
      if (idx === 0) soundManager.playSfx(key);
      else window.setTimeout(() => soundManager.playSfx(key), idx * 140);
    });
    if (maxSeq > lastLogSeqRef.current) {
      lastLogSeqRef.current = maxSeq;
    }
  }, [game, room, animationsEnabled]);

  useEffect(() => {
    if (revealQueue.length === 0) return;
    const timer = window.setTimeout(() => {
      setRevealQueue((prev) => prev.slice(1));
    }, 1850);
    return () => window.clearTimeout(timer);
  }, [revealQueue]);

  // Reset multi-step punch selection whenever pending decision changes
  const pendingKey = game?.execution?.pending
    ? `${game.version}:${game.execution.index}:${game.execution.pending.playerId}`
    : '';
  useEffect(() => {
    setSelectedPunchTargetId(null);
    setSelectedPunchLoot('unset');
  }, [pendingKey]);

  async function toggleFullscreen(): Promise<void> {
    soundManager.playSfx('uiClick');
    const orientationApi = window.screen.orientation as
      | (ScreenOrientation & { lock?: (mode: string) => Promise<void>; unlock?: () => void })
      | undefined;

    if (isFullscreen) {
      setIsFullscreen(false);
      try {
        orientationApi?.unlock?.();
      } catch {
        // ignore
      }
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch {
          // ignore
        }
      }
      return;
    }

    setIsFullscreen(true);
    const targetEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    try {
      if (typeof targetEl.requestFullscreen === 'function') {
        await targetEl.requestFullscreen();
      } else if (typeof targetEl.webkitRequestFullscreen === 'function') {
        await targetEl.webkitRequestFullscreen();
      }
    } catch {
      // Responsive CSS .is-fullscreen fills the viewport directly
    }

    const isMobile =
      window.innerWidth <= 900 ||
      Boolean(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    if (isMobile) {
      try {
        await orientationApi?.lock?.('landscape');
      } catch {
        // iOS Safari / browsers without orientation.lock fall back cleanly to responsive layout
      }
    }
  }

  function toggleLang(): void {
    soundManager.playSfx('uiClick');
    setLang((prev) => (prev === 'vi' ? 'en' : 'vi'));
  }

  useEffect(() => {
    const sock: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 8000,
    });
    socketRef.current = sock;

    sock.on('connect', () => {
      setConnected(true);
      const t0 = performance.now();
      sock.emit('system:ping', (res) => {
        if (res.ok) setLatencyMs(Math.round(performance.now() - t0));
      });
      const savedToken = localStorage.getItem(STORAGE_TOKEN);
      if (savedToken) {
        sock.emit('session:resume', { token: savedToken }, (res) => {
          if (res.ok) {
            setRole(res.data.role);
          } else {
            localStorage.removeItem(STORAGE_TOKEN);
          }
        });
      }
    });

    sock.on('disconnect', () => setConnected(false));

    sock.on('room:state', (payload) => {
      setRoom(payload.room);
      setGame(payload.game);
      setRole(payload.role);
      if (payload.game.phase === 'lobby') setScreen('lobby');
      else setScreen('game');
    });

    sock.on('room:closed', (payload) => {
      localStorage.removeItem(STORAGE_TOKEN);
      setRoom(null);
      setGame(null);
      setScreen('menu');
      setNotice(`${UI_STRINGS[loadInitialLang()].roomClosedNotice} (${payload.roomCode}): ${payload.reason}`);
    });

    sock.on('system:error', (e) => {
      soundManager.playSfx('error', 0.7);
      setError(`${e.code}: ${e.message}`);
    });

    return () => {
      sock.disconnect();
    };
  }, [serverUrl]);

  function nextRequestId(): string {
    return `r_${Date.now()}_${reqSeqRef.current++}`;
  }

  function handleResult<T>(res: Result<T>, onOk?: (data: T) => void): void {
    setBusy(false);
    if (!res.ok) {
      soundManager.playSfx('error', 0.7);
      setError(`${res.error.code}: ${res.error.message}`);
      return;
    }
    setError(null);
    onOk?.(res.data);
  }

  function emitWithTimeout<T>(fn: (ack: (r: Result<T>) => void) => void, onOk?: (data: T) => void): void {
    const sock = socketRef.current;
    const currentT = UI_STRINGS[lang];
    if (!sock || !connected) {
      setError(`DISCONNECTED: ${currentT.disconnected}`);
      return;
    }
    setBusy(true);
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      setBusy(false);
      setError(`NETWORK_TIMEOUT: ${currentT.timeoutNotice}`);
    }, 8000);

    fn((res) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      handleResult(res, onOk);
    });
  }

  function saveSession(s: SessionInfo): void {
    localStorage.setItem(STORAGE_TOKEN, s.token);
    localStorage.setItem(STORAGE_NAME, playerName);
    setRole(s.role);
  }

  function doCreateRoom(): void {
    emitWithTimeout<SessionInfo>(
      (ack) =>
        socketRef.current?.emit(
          'room:create',
          {
            playerName,
            roomName,
            hostMode,
            password: roomPassword || undefined,
            turnTimeoutSec,
          },
          ack,
        ),
      (s) => {
        saveSession(s);
        setScreen('lobby');
      },
    );
  }

  function doJoinRoom(): void {
    emitWithTimeout<SessionInfo>(
      (ack) =>
        socketRef.current?.emit(
          'room:join',
          { roomCode: joinCode, playerName, password: joinPassword || undefined, asSpectator: joinAsSpectator },
          ack,
        ),
      (s) => {
        saveSession(s);
        setScreen('lobby');
      },
    );
  }

  function doLeaveRoom(): void {
    emitWithTimeout(
      (ack) => socketRef.current?.emit('room:leave', ack),
      () => {
        localStorage.removeItem(STORAGE_TOKEN);
        setRoom(null);
        setGame(null);
        setScreen('menu');
      },
    );
  }

  async function copyInviteLink(code: string): Promise<void> {
    const url = `${window.location.origin}/?room=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`${t.copyNoticePrefix}${url}`);
    } catch {
      setNotice(`${t.copyNoticePrefix}${url}`);
    }
  }

  function submitResolution(choice: ResolutionChoice): void {
    if (!game) return;
    emitWithTimeout((ack) =>
      socketRef.current?.emit(
        'game:resolve',
        { choice, requestId: nextRequestId(), expectedVersion: game.version },
        ack,
      ),
    );
  }

  function handleSelectPunchTarget(targetId: string): void {
    const pending = game?.execution?.pending;
    setSelectedPunchTargetId(targetId);
    if (!pending) {
      setSelectedPunchLoot('unset');
      return;
    }
    const targetOpts = pending.options.filter(
      (o): o is Extract<ResolutionChoice, { type: 'punch' }> =>
        o.type === 'punch' && o.targetId === targetId,
    );
    const loots = Array.from(new Set(targetOpts.map((o) => o.lootType)));
    setSelectedPunchLoot(loots.length === 1 ? loots[0]! : 'unset');
  }

  const viewerId = game?.viewerId ?? null;
  const isSpectator = role !== 'player';
  const isHost =
    role === 'host-moderator' ||
    (viewerId !== null && viewerId === game?.hostId);

  const activeId =
    game?.phase === 'planning' && game.planning
      ? game.planning.order[game.planning.orderIndex] ?? null
      : game?.phase === 'execution' && game.execution?.pending
        ? game.execution.pending.playerId
        : null;

  const turnPromptKey =
    screen === 'game' && room && game && !room.paused && activeId === viewerId
      ? game.phase === 'planning' && game.planning
        ? `${room.code}:P:${game.roundIndex}:${game.planning.turnIndex}:${game.planning.orderIndex}`
        : game.phase === 'execution' && game.execution?.pending
          ? `${room.code}:E:${game.roundIndex}:${game.execution.index}`
          : ''
      : '';

  useEffect(() => {
    if (!turnPromptKey) {
      prevTurnAlertRef.current = '';
      return;
    }
    if (prevTurnAlertRef.current === turnPromptKey) return;
    prevTurnAlertRef.current = turnPromptKey;
    soundManager.playSfx('turnBell', 0.65);
  }, [turnPromptKey]);

  return (
    <div
      ref={appShellRef}
      className={`app-shell ${isFullscreen ? 'is-fullscreen' : ''} ${screen === 'game' ? 'is-in-game' : ''}`}
    >
      <header className="topbar">
        <div className="brand">
          <MarshalBadge size={24} />
          <span>{t.brand}</span>
        </div>
        <div className="row topbar-controls">
          <span
            className={`badge topbar-status-badge ${connected ? 'ok' : 'err'}`}
            title={connected ? `${t.connected}${latencyMs !== null ? ` (${latencyMs}ms)` : ''}` : t.disconnected}
          >
            {screen === 'game'
              ? connected
                ? `${latencyMs ?? 0}ms`
                : '!'
              : connected
                ? `${t.connected}${latencyMs !== null ? ` (${latencyMs}ms)` : ''}`
                : t.disconnected}
          </span>
          {room && (
            <>
              <span className="badge topbar-room-badge" title={`${t.roomLabel}: ${room.code}`}>
                {screen === 'game' ? room.code : `${t.roomLabel}: ${room.code}`}
              </span>
              <span className="badge topbar-mode-badge">
                {room.hostMode === 'dedicated' ? t.dedicatedHost : t.hostPlayer}
              </span>
              {isSpectator && (
                <span className="badge warn">{role === 'host-moderator' ? t.hostModerator : t.spectatorBadge}</span>
              )}
            </>
          )}
          <button
            type="button"
            className="secondary lang-btn"
            data-testid="lang-toggle-btn"
            title={lang === 'vi' ? 'VI | EN' : 'EN | VI'}
            onClick={toggleLang}
          >
            {screen === 'game' ? (lang === 'vi' ? 'VI|EN' : 'EN|VI') : lang === 'vi' ? '🇻🇳 VI | EN' : '🇺🇸 EN | VI'}
          </button>
          <button
            type="button"
            className={`secondary audio-btn ${soundEnabled ? '' : 'is-muted'}`}
            data-testid="audio-toggle-btn"
            title={soundEnabled ? t.soundOn : t.soundMuted}
            aria-label={soundEnabled ? t.soundOn : t.soundMuted}
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) soundManager.playSfx('uiClick');
            }}
          >
            {screen === 'game'
              ? soundEnabled
                ? '🔊'
                : '🔇'
              : soundEnabled
                ? `🔊 ${t.soundOn}`
                : `🔇 ${t.soundMuted}`}
          </button>
          <button
            type="button"
            className="secondary fs-btn"
            data-testid="fullscreen-toggle-btn"
            title={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            aria-label={isFullscreen ? t.fullscreenExit : t.fullscreenEnter}
            onClick={() => void toggleFullscreen()}
          >
            {screen === 'game' ? '⛶' : isFullscreen ? `⛶ ${t.fullscreenExit}` : `⛶ ${t.fullscreenEnter}`}
          </button>
          <button
            type="button"
            className="secondary"
            title={t.home}
            aria-label={t.home}
            onClick={() => {
              soundManager.playSfx('uiClick');
              setScreen(room ? (game?.phase === 'lobby' ? 'lobby' : 'game') : 'menu');
            }}
          >
            {screen === 'game' ? '🏠' : t.home}
          </button>
          <button
            type="button"
            className="secondary"
            title={t.settings}
            aria-label={t.settings}
            onClick={() => {
              soundManager.playSfx('uiClick');
              setScreen('settings');
            }}
          >
            {screen === 'game' ? '⚙' : t.settings}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button className="secondary" onClick={() => setError(null)}>
            {t.dismiss}
          </button>
        </div>
      )}

      {notice && (
        <div className="pause-banner">
          <span>{notice}</span>
          <button className="secondary" onClick={() => setNotice(null)}>
            {t.ok}
          </button>
        </div>
      )}

      {screen === 'menu' && (
        <MenuScreen
          t={t}
          playerName={playerName}
          onChangePlayerName={setPlayerName}
          onCreateRoom={() => setScreen('create')}
          onJoinByCode={() => setScreen('join')}
          onSettings={() => setScreen('settings')}
        />
      )}

      {screen === 'create' && (
        <CreateScreen
          t={t}
          playerName={playerName}
          roomName={roomName}
          hostMode={hostMode}
          roomPassword={roomPassword}
          turnTimeoutSec={turnTimeoutSec}
          connected={connected}
          busy={busy}
          onChangePlayerName={setPlayerName}
          onChangeRoomName={setRoomName}
          onChangeHostMode={setHostMode}
          onChangeRoomPassword={setRoomPassword}
          onChangeTurnTimeoutSec={setTurnTimeoutSec}
          onLaunch={doCreateRoom}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'join' && (
        <JoinScreen
          t={t}
          playerName={playerName}
          joinCode={joinCode}
          joinPassword={joinPassword}
          joinAsSpectator={joinAsSpectator}
          connected={connected}
          busy={busy}
          onChangePlayerName={setPlayerName}
          onChangeJoinCode={setJoinCode}
          onChangeJoinPassword={setJoinPassword}
          onChangeJoinAsSpectator={setJoinAsSpectator}
          onJoin={doJoinRoom}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'settings' && (
        <SettingsModal
          t={t}
          lang={lang}
          serverUrl={serverUrl}
          animationsEnabled={animationsEnabled}
          graphicsQuality={graphicsQuality}
          cameraEffects={cameraEffects}
          soundEnabled={soundEnabled}
          bgmEnabled={bgmEnabled}
          sfxEnabled={sfxEnabled}
          volume={volume}
          onChangeLang={(next) => {
            soundManager.playSfx('uiClick');
            setLang(next);
          }}
          onChangeServerUrl={setServerUrl}
          onChangeAnimationsEnabled={setAnimationsEnabled}
          onChangeGraphicsQuality={setGraphicsQuality}
          onChangeCameraEffects={setCameraEffects}
          onChangeSoundEnabled={setSoundEnabled}
          onChangeBgmEnabled={setBgmEnabled}
          onChangeSfxEnabled={setSfxEnabled}
          onChangeVolume={setVolume}
          onSave={() => {
            soundManager.playSfx('uiClick');
            localStorage.setItem(STORAGE_SERVER, serverUrl.trim());
            localStorage.setItem(STORAGE_ANIM, String(animationsEnabled));
            localStorage.setItem(STORAGE_GRAPHICS, graphicsQuality);
            localStorage.setItem(STORAGE_CAM_FX, String(cameraEffects));
            setScreen(room ? (game?.phase === 'lobby' ? 'lobby' : 'game') : 'menu');
          }}
          onResetServer={() => {
            setServerUrl('');
            localStorage.removeItem(STORAGE_SERVER);
          }}
        />
      )}

      {screen === 'lobby' && game && room && (
        <LobbyScreen
          t={t}
          lang={lang}
          game={game}
          room={room}
          viewerId={viewerId}
          role={role}
          isHost={isHost}
          isSpectator={isSpectator}
          busy={busy}
          onCopyInvite={() => void copyInviteLink(room.code)}
          onCloseRoom={() => emitWithTimeout((ack) => socketRef.current?.emit('room:close', ack))}
          onLeaveRoom={doLeaveRoom}
          onSwitchRole={(asSpectator) =>
            emitWithTimeout((ack) => socketRef.current?.emit('lobby:switchRole', { asSpectator }, ack))
          }
          onToggleReady={(ready) =>
            emitWithTimeout(
              (ack) => socketRef.current?.emit('lobby:ready', { ready, requestId: nextRequestId() }, ack),
              () => soundManager.playSfx('uiReady'),
            )
          }
          onStartGame={() => emitWithTimeout((ack) => socketRef.current?.emit('game:start', ack))}
          onSelectCharacter={(character: CharacterId | null) =>
            emitWithTimeout((ack) =>
              socketRef.current?.emit('lobby:selectCharacter', { character, requestId: nextRequestId() }, ack),
            )
          }
          onAddBot={(difficulty: BotDifficulty) => {
            soundManager.playSfx('uiClick');
            emitWithTimeout((ack) =>
              socketRef.current?.emit('lobby:addBot', { difficulty, requestId: nextRequestId() }, ack),
            );
          }}
          onRemoveBot={(playerId: string) => {
            soundManager.playSfx('uiClick');
            emitWithTimeout((ack) =>
              socketRef.current?.emit('lobby:removeBot', { playerId, requestId: nextRequestId() }, ack),
            );
          }}
          onUpdateTurnTimeout={(nextSec: number) =>
            emitWithTimeout((ack) =>
              socketRef.current?.emit(
                'room:updateConfig',
                { turnTimeoutSec: nextSec, requestId: nextRequestId() },
                ack,
              ),
            )
          }
        />
      )}

      {screen === 'game' && game && room && (
        <GameArenaScreen
          t={t}
          lang={lang}
          room={room}
          game={game}
          viewerId={viewerId}
          isHost={isHost}
          isSpectator={isSpectator}
          busy={busy}
          animationsEnabled={animationsEnabled}
          graphicsQuality={graphicsQuality}
          cameraEffects={cameraEffects}
          isDealing={isDealing}
          anim={anim}
          revealCue={revealQueue[0] ?? null}
          faceDownToggle={faceDownToggle}
          selectedPunchTargetId={selectedPunchTargetId}
          selectedPunchLoot={selectedPunchLoot}
          onChangeFaceDownToggle={setFaceDownToggle}
          onSelectPunchTarget={handleSelectPunchTarget}
          onSelectPunchLoot={setSelectedPunchLoot}
          onResetPunchSelection={() => {
            setSelectedPunchTargetId(null);
            setSelectedPunchLoot('unset');
          }}
          onDismissRevealCue={() => setRevealQueue((prev) => prev.slice(1))}
          onCopyInvite={() => void copyInviteLink(room.code)}
          onPause={(reason) => emitWithTimeout((ack) => socketRef.current?.emit('room:pause', { reason }, ack))}
          onResume={() => emitWithTimeout((ack) => socketRef.current?.emit('room:resume', ack))}
          onCloseRoom={() => emitWithTimeout((ack) => socketRef.current?.emit('room:close', ack))}
          onLeaveRoom={doLeaveRoom}
          onDrawCards={() =>
            emitWithTimeout((ack) =>
              socketRef.current?.emit(
                'game:draw',
                { requestId: nextRequestId(), expectedVersion: game.version },
                ack,
              ),
            )
          }
          onPlayCard={(cardId) =>
            emitWithTimeout((ack) =>
              socketRef.current?.emit(
                'game:playCard',
                {
                  cardId,
                  faceDown: faceDownToggle,
                  requestId: nextRequestId(),
                  expectedVersion: game.version,
                },
                ack,
              ),
            )
          }
          onSubmitResolution={submitResolution}
          onRematch={() => emitWithTimeout((ack) => socketRef.current?.emit('game:rematch', ack))}
        />
      )}
    </div>
  );
}
