import type { Lang, UI_STRINGS } from '../../i18n.js';
import './MenuScreen.css';

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  playerName: string;
  onChangePlayerName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinByCode: () => void;
  onSettings: () => void;
}

function OrnateFiligreeCrest({ position }: { position: 'top' | 'bottom' }) {
  return (
    <svg
      className={`menu-crest menu-crest-${position}`}
      viewBox="0 0 220 34"
      width="200"
      height="31"
      aria-hidden="true"
    >
      <path
        d="M10,24 Q45,24 68,14 Q86,6 110,6 Q134,6 152,14 Q175,24 210,24"
        fill="none"
        stroke="#c5b49a"
        strokeWidth="2.2"
      />
      <path
        d="M52,22 Q80,14 110,20 Q140,14 168,22"
        fill="none"
        stroke="#8d795c"
        strokeWidth="1.4"
      />
      <circle cx="110" cy="14" r="7" fill="#2c221b" stroke="#d9c39e" strokeWidth="2" />
      <polygon
        points="110,9 111.5,12.5 115,12.5 112.2,14.5 113.2,18 110,16 106.8,18 107.8,14.5 105,12.5 108.5,12.5"
        fill="#f0c462"
      />
    </svg>
  );
}

/** Screen 1 (Trang chủ): Union Pacific 1899 Hero Card with cliffside steam train backdrop & leather satchel input. */
export function MenuScreen({ t, playerName, onChangePlayerName, onCreateRoom, onJoinByCode, onSettings }: Props) {
  return (
    <section className="screen-menu" data-testid="menu-screen">
      <div className="menu-ember-field" aria-hidden="true" />

      <div className="menu-ornate-card card">
        <OrnateFiligreeCrest position="top" />
        <OrnateFiligreeCrest position="bottom" />

        <span className="menu-corner c-tl" aria-hidden="true" />
        <span className="menu-corner c-tr" aria-hidden="true" />
        <span className="menu-corner c-bl" aria-hidden="true" />
        <span className="menu-corner c-br" aria-hidden="true" />

        <div className="menu-hero-bg" aria-hidden="true" />
        <div className="menu-hero-scrim" aria-hidden="true" />

        <div className="menu-hero-content">
          <h1 className="menu-title">{t.menuTitle}</h1>
          <p className="menu-desc">{t.menuDesc}</p>

          <label className="menu-leather-field">
            <span className="menu-leather-flap">
              <span>{t.outlawName}:</span>
              <span className="menu-flap-rivet" aria-hidden="true" />
            </span>
            <input
              className="menu-leather-input"
              value={playerName}
              onChange={(e) => onChangePlayerName(e.target.value)}
              maxLength={24}
            />
          </label>

          <div className="menu-cta-row">
            <button type="button" className="menu-btn menu-btn-primary" onClick={onCreateRoom}>
              <span className="menu-btn-ico" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="17" height="17">
                  <rect x="2" y="4" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M2,8 L18,8 M6,12 L10,12 M13,12 L15,12" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </span>
              <span>{t.createInviteRoom}</span>
            </button>

            <button type="button" className="menu-btn menu-btn-copper" onClick={onJoinByCode}>
              <span>{t.joinByCode}</span>
            </button>

            <button type="button" className="menu-btn menu-btn-iron" onClick={onSettings}>
              <span className="menu-btn-ico" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="16" height="16">
                  <circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M10,2 L10,4.5 M10,15.5 L10,18 M2,10 L4.5,10 M15.5,10 L18,10 M4.3,4.3 L6.1,6.1 M13.9,13.9 L15.7,15.7 M15.7,4.3 L13.9,6.1 M6.1,13.9 L4.3,15.7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>{t.settings}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
