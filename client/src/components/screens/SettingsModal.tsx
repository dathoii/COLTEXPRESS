import type { Lang, UI_STRINGS } from '../../i18n.js';
import './CreateScreen.css';

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  lang: Lang;
  serverUrl: string;
  animationsEnabled: boolean;
  graphicsQuality: 'high' | 'low';
  cameraEffects: boolean;
  soundEnabled: boolean;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  volume: number;
  onChangeLang: (v: Lang) => void;
  onChangeServerUrl: (v: string) => void;
  onChangeAnimationsEnabled: (v: boolean) => void;
  onChangeGraphicsQuality: (v: 'high' | 'low') => void;
  onChangeCameraEffects: (v: boolean) => void;
  onChangeSoundEnabled: (v: boolean) => void;
  onChangeBgmEnabled: (v: boolean) => void;
  onChangeSfxEnabled: (v: boolean) => void;
  onChangeVolume: (v: number) => void;
  onSave: () => void;
  onResetServer: () => void;
}

/** Screen: System, Audio, Language & 3D Graphics Settings. */
export function SettingsModal({
  t,
  lang,
  serverUrl,
  animationsEnabled,
  graphicsQuality,
  cameraEffects,
  soundEnabled,
  bgmEnabled,
  sfxEnabled,
  volume,
  onChangeLang,
  onChangeServerUrl,
  onChangeAnimationsEnabled,
  onChangeGraphicsQuality,
  onChangeCameraEffects,
  onChangeSoundEnabled,
  onChangeBgmEnabled,
  onChangeSfxEnabled,
  onChangeVolume,
  onSave,
  onResetServer,
}: Props) {
  return (
    <section className="screen-create" data-testid="settings-screen">
      <div className="create-saloon-bg" aria-hidden="true" />
      <div className="create-saloon-vignette" aria-hidden="true" />

      <div className="create-dialog-frame">
        <div className="create-top-crest" aria-hidden="true">
          <span className="create-crest-wing left" />
          <span className="create-crest-medal">★</span>
          <span className="create-crest-wing right" />
        </div>
        <span className="create-corner c-tl" aria-hidden="true" />
        <span className="create-corner c-tr" aria-hidden="true" />
        <span className="create-corner c-bl" aria-hidden="true" />
        <span className="create-corner c-br" aria-hidden="true" />

        <h1 className="create-title">{t.settingsTitle}</h1>

        <div className="screen-dialog-subgrid">
          <div className="create-form-grid">
            <label className="create-field">
              <span className="create-label">{t.languageLabel}:</span>
              <div className="create-input-shell">
                <span className="create-rivet left" aria-hidden="true" />
                <select value={lang} onChange={(e) => onChangeLang(e.target.value as Lang)}>
                  <option value="vi">Tiếng Việt (VI)</option>
                  <option value="en">English (EN)</option>
                </select>
                <span className="create-rivet right" aria-hidden="true" />
              </div>
            </label>

            <label className="create-field">
              <span className="create-label">{t.graphicsQualityLabel}:</span>
              <div className="create-input-shell">
                <span className="create-rivet left" aria-hidden="true" />
                <select
                  value={graphicsQuality}
                  onChange={(e) => onChangeGraphicsQuality(e.target.value as 'high' | 'low')}
                  data-testid="graphics-quality-select"
                >
                  <option value="high">{t.graphicsHigh}</option>
                  <option value="low">{t.graphicsLow}</option>
                </select>
                <span className="create-rivet right" aria-hidden="true" />
              </div>
            </label>

            <label className="create-field create-field-span">
              <span className="create-label">{t.serverUrlLabel}:</span>
              <div className="create-input-shell">
                <span className="create-rivet left" aria-hidden="true" />
                <input
                  value={serverUrl}
                  onChange={(e) => onChangeServerUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                />
                <span className="create-rivet right" aria-hidden="true" />
              </div>
            </label>
          </div>

          <div className="screen-dialog-checks">
            <label>
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => onChangeAnimationsEnabled(e.target.checked)}
              />{' '}
              {t.enableAnimations}
            </label>
            <label>
              <input
                type="checkbox"
                checked={cameraEffects}
                onChange={(e) => onChangeCameraEffects(e.target.checked)}
              />{' '}
              {t.cameraEffectsLabel}
            </label>
            <label>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => onChangeSoundEnabled(e.target.checked)}
              />{' '}
              {soundEnabled ? t.soundOn : t.soundMuted}
            </label>
            <label>
              <input
                type="checkbox"
                checked={bgmEnabled}
                disabled={!soundEnabled}
                onChange={(e) => onChangeBgmEnabled(e.target.checked)}
              />{' '}
              {t.bgmLabel}
            </label>
            <label>
              <input
                type="checkbox"
                checked={sfxEnabled}
                disabled={!soundEnabled}
                onChange={(e) => onChangeSfxEnabled(e.target.checked)}
              />{' '}
              {t.sfxLabel}
            </label>
            <label className="volume-slider-label">
              {t.volumeLabel}: <strong>{Math.round(volume * 100)}%</strong>{' '}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                disabled={!soundEnabled}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="create-actions-row">
            <button type="button" className="create-btn-launch" onClick={onSave}>
              {t.saveSettings}
            </button>
            <button type="button" className="create-btn-back" onClick={onResetServer}>
              {t.resetLocalServer}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
