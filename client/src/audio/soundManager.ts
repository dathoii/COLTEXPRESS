export type BgmTrack = 'saloon' | 'western' | null;

export type SfxKey =
  | 'shuffle'
  | 'deal'
  | 'playCard'
  | 'cardFlip'
  | 'move'
  | 'climb'
  | 'shoot'
  | 'punch'
  | 'robCoin'
  | 'robSack'
  | 'marshal'
  | 'emptyClick'
  | 'turnBell'
  | 'uiClick'
  | 'uiReady'
  | 'error'
  | 'victory';

export interface AudioSettings {
  soundEnabled: boolean;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  volume: number; // 0..1
}

const BGM_STEMS: Record<Exclude<BgmTrack, null>, { base: string; ogg: string; mp3: string }> = {
  saloon: { base: 'bgm-saloon', ogg: '/audio/bgm-saloon.ogg', mp3: '/audio/bgm-saloon.mp3' },
  western: { base: 'bgm-western', ogg: '/audio/bgm-western.ogg', mp3: '/audio/bgm-western.mp3' },
};

const SFX_STEMS: Record<SfxKey, { base: string; fallbackExt: '.ogg' | '.wav' }> = {
  shuffle: { base: 'card-shuffle', fallbackExt: '.ogg' },
  deal: { base: 'card-deal', fallbackExt: '.wav' },
  playCard: { base: 'card-play', fallbackExt: '.wav' },
  cardFlip: { base: 'card-flip', fallbackExt: '.wav' },
  move: { base: 'move-step', fallbackExt: '.ogg' },
  climb: { base: 'climb-ladder', fallbackExt: '.ogg' },
  shoot: { base: 'shoot-revolver', fallbackExt: '.ogg' },
  punch: { base: 'punch-hit', fallbackExt: '.ogg' },
  robCoin: { base: 'rob-coin', fallbackExt: '.ogg' },
  robSack: { base: 'rob-sack', fallbackExt: '.ogg' },
  marshal: { base: 'marshal-whistle', fallbackExt: '.ogg' },
  emptyClick: { base: 'empty-click', fallbackExt: '.ogg' },
  turnBell: { base: 'turn-bell', fallbackExt: '.ogg' },
  uiClick: { base: 'ui-click', fallbackExt: '.wav' },
  uiReady: { base: 'ui-ready', fallbackExt: '.wav' },
  error: { base: 'error-buzz', fallbackExt: '.wav' },
  victory: { base: 'victory', fallbackExt: '.ogg' },
};

function shouldPreferMp3(): boolean {
  if (typeof navigator === 'undefined' || typeof Audio === 'undefined') return true;
  try {
    const testAudio = new Audio();
    const oggSupport = testAudio.canPlayType('audio/ogg; codecs="vorbis"');
    const ua = navigator.userAgent ?? '';
    const isAppleMobileOrSafari =
      /iP(hone|ad|od)/i.test(ua) || (/Safari/i.test(ua) && !/Chrome|CriOS|Firefox|Edg/i.test(ua));
    return isAppleMobileOrSafari || !oggSupport;
  } catch {
    return true;
  }
}

function audioUrlForSfx(key: SfxKey, preferMp3: boolean): string {
  const meta = SFX_STEMS[key];
  return `/audio/${meta.base}${preferMp3 ? '.mp3' : meta.fallbackExt}`;
}

function audioUrlForBgm(track: Exclude<BgmTrack, null>, preferMp3: boolean): string {
  return preferMp3 ? BGM_STEMS[track].mp3 : BGM_STEMS[track].ogg;
}

class SoundController {
  private settings: AudioSettings = {
    soundEnabled: true,
    bgmEnabled: true,
    sfxEnabled: true,
    volume: 1.0,
  };

  private preferMp3 = shouldPreferMp3();
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private bgmBuffers = new Map<Exclude<BgmTrack, null>, AudioBuffer>();
  private bgmBufferInflight = new Map<Exclude<BgmTrack, null>, Promise<AudioBuffer | null>>();
  private bgmSource: AudioBufferSourceNode | null = null;
  private activeBgmSourceTrack: Exclude<BgmTrack, null> | null = null;

  private sfxBuffers = new Map<SfxKey, AudioBuffer>();
  private sfxBufferInflight = new Map<SfxKey, Promise<AudioBuffer | null>>();

  // Lightweight HTMLAudioElement fallback before WebAudio finishes decoding
  private fallbackBgmAudio: HTMLAudioElement | null = null;
  private fallbackSfxCache = new Map<SfxKey, HTMLAudioElement>();

  private currentBgmTrack: BgmTrack = null;
  private unlocked = false;
  private unlockListenerAttached = false;
  private visibilityListenerAttached = false;

  constructor() {
    this.ensureUnlockListener();
    this.ensureVisibilityListener();
  }

  private getOrCreateContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const masterGain = ctx.createGain();
      const bgmGain = ctx.createGain();
      const sfxGain = ctx.createGain();
      bgmGain.connect(masterGain);
      sfxGain.connect(masterGain);
      masterGain.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = masterGain;
      this.bgmGain = bgmGain;
      this.sfxGain = sfxGain;
      this.syncGains();
      return ctx;
    } catch {
      return null;
    }
  }

  private ensureUnlockListener(): void {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const handler = () => {
      this.unlock();
      if (this.unlocked) {
        window.removeEventListener('pointerdown', handler, true);
        window.removeEventListener('touchend', handler, true);
        window.removeEventListener('click', handler, true);
        window.removeEventListener('keydown', handler, true);
      }
    };

    window.addEventListener('pointerdown', handler, { capture: true, passive: true });
    window.addEventListener('touchend', handler, { capture: true, passive: true });
    window.addEventListener('click', handler, { capture: true, passive: true });
    window.addEventListener('keydown', handler, { capture: true, passive: true });
  }

  private ensureVisibilityListener(): void {
    if (this.visibilityListenerAttached || typeof document === 'undefined') return;
    this.visibilityListenerAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.ctx?.suspend().catch(() => {});
        this.fallbackBgmAudio?.pause();
      } else {
        this.ctx?.resume().catch(() => {});
        this.syncBgmPlayback();
      }
    });
  }

  public unlock(): void {
    const ctx = this.getOrCreateContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Wake iOS WebAudio hardware cleanly using a zero-amplitude 1-sample buffer
      try {
        const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = silent;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        // Ignore if context is closing
      }
      this.unlocked = ctx.state === 'running' || this.unlocked;
    } else {
      this.unlocked = true;
    }
    this.syncBgmPlayback();
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public preloadCommon(): void {
    void this.loadSfxBuffer('uiClick');
    void this.loadSfxBuffer('playCard');
    void this.loadSfxBuffer('shoot');
    void this.loadSfxBuffer('punch');
    void this.loadSfxBuffer('move');
  }

  public applySettings(next: AudioSettings): void {
    this.settings = {
      soundEnabled: next.soundEnabled,
      bgmEnabled: next.bgmEnabled,
      sfxEnabled: next.sfxEnabled,
      volume: Math.max(0, Math.min(1, Number.isFinite(next.volume) ? next.volume : 1)),
    };
    this.syncGains();
    this.syncBgmPlayback();
  }

  private syncGains(): void {
    const masterVal = this.settings.soundEnabled ? this.settings.volume : 0;
    const bgmVal = this.settings.bgmEnabled ? 0.38 : 0;
    const sfxVal = this.settings.sfxEnabled ? 0.92 : 0;

    if (this.ctx && this.masterGain && this.bgmGain && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(masterVal, now, 0.02);
      this.bgmGain.gain.setTargetAtTime(bgmVal, now, 0.03);
      this.sfxGain.gain.setTargetAtTime(sfxVal, now, 0.01);
    }
    if (this.fallbackBgmAudio) {
      this.fallbackBgmAudio.volume = Math.max(0, Math.min(1, masterVal * 0.42));
    }
  }

  private async fetchAndDecode(url: string): Promise<AudioBuffer | null> {
    const ctx = this.getOrCreateContext();
    if (!ctx || typeof fetch !== 'function') return null;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return await ctx.decodeAudioData(buf);
    } catch {
      return null;
    }
  }

  private loadBgmBuffer(track: Exclude<BgmTrack, null>): Promise<AudioBuffer | null> {
    const cached = this.bgmBuffers.get(track);
    if (cached) return Promise.resolve(cached);
    const inflight = this.bgmBufferInflight.get(track);
    if (inflight) return inflight;

    const primaryUrl = audioUrlForBgm(track, this.preferMp3);
    const altUrl = audioUrlForBgm(track, !this.preferMp3);
    const req = this.fetchAndDecode(primaryUrl)
      .then((buf) => buf ?? this.fetchAndDecode(altUrl))
      .then((buf) => {
        this.bgmBufferInflight.delete(track);
        if (buf) this.bgmBuffers.set(track, buf);
        return buf;
      });
    this.bgmBufferInflight.set(track, req);
    return req;
  }

  private loadSfxBuffer(key: SfxKey): Promise<AudioBuffer | null> {
    const cached = this.sfxBuffers.get(key);
    if (cached) return Promise.resolve(cached);
    const inflight = this.sfxBufferInflight.get(key);
    if (inflight) return inflight;

    const primaryUrl = audioUrlForSfx(key, this.preferMp3);
    const altUrl = audioUrlForSfx(key, true);
    const req = this.fetchAndDecode(primaryUrl)
      .then((buf) => (buf || primaryUrl === altUrl ? buf : this.fetchAndDecode(altUrl)))
      .then((buf) => {
        this.sfxBufferInflight.delete(key);
        if (buf) this.sfxBuffers.set(key, buf);
        return buf;
      });
    this.sfxBufferInflight.set(key, req);
    return req;
  }

  private stopWebAudioBgm(): void {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
        this.bgmSource.disconnect();
      } catch {
        // Ignore already stopped source
      }
      this.bgmSource = null;
      this.activeBgmSourceTrack = null;
    }
  }

  public setBgm(track: BgmTrack): void {
    if (this.currentBgmTrack === track) {
      this.syncBgmPlayback();
      return;
    }
    this.currentBgmTrack = track;
    this.stopWebAudioBgm();

    if (this.fallbackBgmAudio) {
      this.fallbackBgmAudio.pause();
      this.fallbackBgmAudio.src = '';
      this.fallbackBgmAudio = null;
    }

    if (!track) return;

    const ctx = this.getOrCreateContext();
    if (ctx) {
      void this.loadBgmBuffer(track).then(() => {
        if (this.currentBgmTrack === track) {
          this.syncBgmPlayback();
        }
      });
      return;
    }

    if (typeof Audio === 'undefined') return;
    try {
      const audio = new Audio(audioUrlForBgm(track, this.preferMp3));
      audio.loop = true;
      audio.preload = 'auto';
      this.fallbackBgmAudio = audio;
      this.syncBgmPlayback();
    } catch {
      // Ignore environments without Audio constructor
    }
  }

  private syncBgmPlayback(): void {
    const shouldPlay =
      this.settings.soundEnabled &&
      this.settings.bgmEnabled &&
      this.settings.volume > 0 &&
      this.currentBgmTrack !== null &&
      (typeof document === 'undefined' || !document.hidden);

    this.syncGains();

    if (!shouldPlay || !this.currentBgmTrack) {
      this.stopWebAudioBgm();
      this.fallbackBgmAudio?.pause();
      return;
    }

    const track = this.currentBgmTrack;
    const ctx = this.getOrCreateContext();
    if (ctx && this.bgmGain) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          this.ensureUnlockListener();
        });
      }
      const buffer = this.bgmBuffers.get(track);
      if (buffer) {
        if (this.bgmSource && this.activeBgmSourceTrack === track) {
          return;
        }
        this.stopWebAudioBgm();
        try {
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          src.connect(this.bgmGain);
          src.start(0);
          this.bgmSource = src;
          this.activeBgmSourceTrack = track;
        } catch {
          // Ignore start failures cleanly
        }
      } else {
        void this.loadBgmBuffer(track).then((loaded) => {
          if (loaded && this.currentBgmTrack === track) {
            this.syncBgmPlayback();
          }
        });
      }
      return;
    }

    if (this.fallbackBgmAudio) {
      const p = this.fallbackBgmAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => this.ensureUnlockListener());
      }
    }
  }

  public playSfx(key: SfxKey, gain = 1): void {
    if (
      !this.settings.soundEnabled ||
      !this.settings.sfxEnabled ||
      this.settings.volume <= 0
    ) {
      return;
    }

    const ctx = this.getOrCreateContext();
    if (ctx && this.sfxGain) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const buffer = this.sfxBuffers.get(key);
      if (buffer) {
        try {
          const src = ctx.createBufferSource();
          const clipGain = ctx.createGain();
          clipGain.gain.value = Math.max(0, Math.min(1.5, gain));
          src.buffer = buffer;
          src.connect(clipGain);
          clipGain.connect(this.sfxGain);
          src.start(0);
          return;
        } catch {
          // Fallback below
        }
      } else {
        void this.loadSfxBuffer(key);
      }
    }

    if (typeof Audio === 'undefined') return;
    try {
      let base = this.fallbackSfxCache.get(key);
      if (!base) {
        base = new Audio(audioUrlForSfx(key, this.preferMp3));
        base.preload = 'auto';
        this.fallbackSfxCache.set(key, base);
      }
      const instance = base.cloneNode(true) as HTMLAudioElement;
      instance.volume = Math.max(0, Math.min(1, this.settings.volume * 0.9 * gain));
      const p = instance.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch {
      // Ignore playback errors in restricted environments
    }
  }
}

export const soundManager = new SoundController();
