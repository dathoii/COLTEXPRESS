import type { HostMode } from '@colt/shared';
import type { Lang, UI_STRINGS } from '../../i18n.js';
import './CreateScreen.css';

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  playerName: string;
  roomName: string;
  hostMode: HostMode;
  roomPassword: string;
  turnTimeoutSec: number;
  connected: boolean;
  busy: boolean;
  onChangePlayerName: (v: string) => void;
  onChangeRoomName: (v: string) => void;
  onChangeHostMode: (v: HostMode) => void;
  onChangeRoomPassword: (v: string) => void;
  onChangeTurnTimeoutSec: (v: number) => void;
  onLaunch: () => void;
  onBack: () => void;
}

/** Screen 3 (Tạo Phòng Riêng Tư): Ornate riveted saloon leather dialog with Turn Timer setup. */
export function CreateScreen({
  t,
  playerName,
  roomName,
  hostMode,
  roomPassword,
  turnTimeoutSec,
  connected,
  busy,
  onChangePlayerName,
  onChangeRoomName,
  onChangeHostMode,
  onChangeRoomPassword,
  onChangeTurnTimeoutSec,
  onLaunch,
  onBack,
}: Props) {
  return (
    <section className="screen-create" data-testid="create-screen">
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

        <h1 className="create-title">{t.createTitle}</h1>

        <div className="create-form-grid">
          <label className="create-field">
            <span className="create-label">{t.yourName}:</span>
            <div className="create-input-shell">
              <span className="create-rivet left" aria-hidden="true" />
              <input value={playerName} onChange={(e) => onChangePlayerName(e.target.value)} maxLength={24} />
              <span className="create-rivet right" aria-hidden="true" />
            </div>
          </label>

          <label className="create-field">
            <span className="create-label">{t.trainName}:</span>
            <div className="create-input-shell">
              <span className="create-rivet left" aria-hidden="true" />
              <input value={roomName} onChange={(e) => onChangeRoomName(e.target.value)} maxLength={40} />
              <span className="create-rivet right" aria-hidden="true" />
            </div>
          </label>

          <label className="create-field">
            <span className="create-label">{t.hostMode}:</span>
            <div className="create-input-shell">
              <span className="create-rivet left" aria-hidden="true" />
              <select value={hostMode} onChange={(e) => onChangeHostMode(e.target.value as HostMode)}>
                <option value="player">{t.hostModePlayer}</option>
                <option value="dedicated">{t.hostModeDedicated}</option>
              </select>
              <span className="create-rivet right" aria-hidden="true" />
            </div>
          </label>

          <label className="create-field">
            <span className="create-label">{t.optionalPassword}:</span>
            <div className="create-input-shell">
              <span className="create-rivet left" aria-hidden="true" />
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => onChangeRoomPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                maxLength={32}
              />
              <span className="create-rivet right" aria-hidden="true" />
            </div>
          </label>

          <label className="create-field create-field-span">
            <span className="create-label">{t.turnTimerLabel}:</span>
            <div className="create-input-shell">
              <span className="create-rivet left" aria-hidden="true" />
              <select
                value={turnTimeoutSec}
                onChange={(e) => onChangeTurnTimeoutSec(Number(e.target.value))}
                data-testid="create-turn-timer-select"
              >
                <option value={0}>{t.turnTimerNone}</option>
                <option value={20}>20 {t.turnTimerSecLabel}</option>
                <option value={30}>30 {t.turnTimerSecLabel}</option>
                <option value={45}>45 {t.turnTimerSecLabel}</option>
                <option value={60}>60 {t.turnTimerSecLabel}</option>
              </select>
              <span className="create-rivet right" aria-hidden="true" />
            </div>
          </label>
        </div>

        <div className="create-actions-row">
          <button
            type="button"
            className="create-btn-launch"
            onClick={onLaunch}
            disabled={!connected || busy}
          >
            <span>{t.launchRoom}</span>
            <svg viewBox="0 0 28 20" width="24" height="17" aria-hidden="true">
              <path
                d="M2,16 L26,16 M4,14 L4,9 L11,9 L11,5 L14,5 L14,9 L21,9 L24,14 Z M17,5 L20,2 M7,17 A2,2 0 1 0 11,17 M17,17 A2,2 0 1 0 21,17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button type="button" className="create-btn-back" onClick={onBack}>
            {t.back}
          </button>
        </div>
      </div>
    </section>
  );
}
