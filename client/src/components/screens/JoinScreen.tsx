import type { Lang, UI_STRINGS } from '../../i18n.js';
import './CreateScreen.css';

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  playerName: string;
  joinCode: string;
  joinPassword: string;
  joinAsSpectator: boolean;
  connected: boolean;
  busy: boolean;
  onChangePlayerName: (v: string) => void;
  onChangeJoinCode: (v: string) => void;
  onChangeJoinPassword: (v: string) => void;
  onChangeJoinAsSpectator: (v: boolean) => void;
  onJoin: () => void;
  onBack: () => void;
}

/** Screen: Tham gia bằng mã mời (Invite Code Join). */
export function JoinScreen({
  t,
  playerName,
  joinCode,
  joinPassword,
  joinAsSpectator,
  connected,
  busy,
  onChangePlayerName,
  onChangeJoinCode,
  onChangeJoinPassword,
  onChangeJoinAsSpectator,
  onJoin,
  onBack,
}: Props) {
  return (
    <section className="screen-create" data-testid="join-screen">
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

        <h1 className="create-title">{t.joinTitle}</h1>

        <div className="screen-dialog-subgrid">
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
              <span className="create-label">{t.roomCode}:</span>
              <div className="create-input-shell">
                <span className="create-rivet left" aria-hidden="true" />
                <input
                  value={joinCode}
                  onChange={(e) => onChangeJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCDE"
                  maxLength={8}
                />
                <span className="create-rivet right" aria-hidden="true" />
              </div>
            </label>

            <label className="create-field">
              <span className="create-label">{t.optionalPassword}:</span>
              <div className="create-input-shell">
                <span className="create-rivet left" aria-hidden="true" />
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => onChangeJoinPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  maxLength={32}
                />
                <span className="create-rivet right" aria-hidden="true" />
              </div>
            </label>

            <div className="create-field" style={{ justifyContent: 'flex-end' }}>
              <div className="screen-dialog-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={joinAsSpectator}
                    onChange={(e) => onChangeJoinAsSpectator(e.target.checked)}
                  />{' '}
                  {t.joinAsSpectator}
                </label>
              </div>
            </div>
          </div>

          <div className="create-actions-row">
            <button
              type="button"
              className="create-btn-launch"
              onClick={onJoin}
              disabled={!connected || !joinCode.trim() || busy}
            >
              {t.joinRoomBtn}
            </button>
            <button type="button" className="create-btn-back" onClick={onBack}>
              {t.back}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
