import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  ActionType,
  GameView,
  LootType,
  ResolutionChoice,
  RoomInfo,
} from '@colt/shared';
import { ACTION_COPY, EVENT_COPY_I18N, TURN_COPY_I18N, UI_STRINGS, type Lang } from '../../i18n.js';
import type { GameAnimationState } from '../../hooks/useGameAnimations.js';
import { CharacterSprite, CHARACTER_PALETTES } from '../art/CharacterSprite.js';
import { CharacterPortrait } from '../art/CharacterPortrait.js';
import { EventPlaque } from '../art/EventPlaque.js';
import { BulletToken, LootToken } from '../art/LootToken.js';
import { PlayingCard, RoundCardDisplay } from '../art/PlayingCard.js';
import { TrainScene } from '../art/TrainScene.js';
import { ScoreboardScreen } from './ScoreboardScreen.js';
import './GameArenaScreen.css';

const TrainScene3D = lazy(() => import('../../scene3d/TrainScene3D.js'));

const BULLETS_PER_BANDIT = 6;

interface RevealCue {
  seq: number;
  playerId: string;
  action: ActionType;
}

class StageErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface Props {
  t: (typeof UI_STRINGS)[Lang];
  lang: Lang;
  room: RoomInfo;
  game: GameView;
  viewerId: string | null;
  isHost: boolean;
  isSpectator: boolean;
  busy: boolean;
  animationsEnabled: boolean;
  graphicsQuality: 'high' | 'low';
  cameraEffects: boolean;
  isDealing: boolean;
  anim: GameAnimationState;
  revealCue: RevealCue | null;
  faceDownToggle: boolean;
  selectedPunchTargetId: string | null;
  selectedPunchLoot: LootType | null | 'unset';
  onChangeFaceDownToggle: (v: boolean) => void;
  onSelectPunchTarget: (targetId: string) => void;
  onSelectPunchLoot: (loot: LootType | null) => void;
  onResetPunchSelection: () => void;
  onDismissRevealCue: () => void;
  onCopyInvite: () => void;
  onPause: (reason: string) => void;
  onResume: () => void;
  onCloseRoom: () => void;
  onLeaveRoom: () => void;
  onDrawCards: () => void;
  onPlayCard: (cardId: string) => void;
  onSubmitResolution: (choice: ResolutionChoice) => void;
  onRematch: () => void;
}

export function GameArenaScreen({
  t,
  lang,
  room,
  game,
  viewerId,
  isHost,
  isSpectator,
  busy,
  animationsEnabled,
  graphicsQuality,
  cameraEffects,
  isDealing,
  anim,
  revealCue,
  faceDownToggle,
  selectedPunchTargetId,
  selectedPunchLoot,
  onChangeFaceDownToggle,
  onSelectPunchTarget,
  onSelectPunchLoot,
  onResetPunchSelection,
  onDismissRevealCue,
  onCopyInvite,
  onPause,
  onResume,
  onCloseRoom,
  onLeaveRoom,
  onDrawCards,
  onPlayCard,
  onSubmitResolution,
  onRematch,
}: Props) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [tableModalOpen, setTableModalOpen] = useState<'none' | 'round' | 'menu'>('none');
  const deadlineAt = room.turnDeadlineAt ?? null;

  useEffect(() => {
    if (!deadlineAt || room.paused || game.phase === 'gameEnd') return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [deadlineAt, room.paused, game.phase]);

  const secsLeft = useMemo(() => {
    if (!deadlineAt || room.paused || game.phase === 'gameEnd') return null;
    return Math.max(0, Math.ceil((deadlineAt - nowMs) / 1000));
  }, [deadlineAt, nowMs, room.paused, game.phase]);

  const selfPlayer = useMemo(() => game.players.find((p) => p.id === viewerId) ?? null, [game, viewerId]);
  const disconnectedPlayers = useMemo(() => game.players.filter((p) => !p.connected), [game.players]);

  const activeId =
    game.phase === 'planning' && game.planning
      ? game.planning.order[game.planning.orderIndex] ?? null
      : game.phase === 'execution' && game.execution?.pending
        ? game.execution.pending.playerId
        : null;

  // Latest card rule: during planning (and stack display), NEVER show a full card history list;
  // display ONLY the single most recently played card (face-down card shows ONLY card back).
  const latestPlayed = game.actionStack.length > 0 ? game.actionStack[game.actionStack.length - 1]! : null;
  const latestOwner = latestPlayed ? game.players.find((p) => p.id === latestPlayed.playerId) ?? null : null;

  const isCinematicPlaying = Boolean(anim.activeClip);
  const activePending = !revealCue && game.phase === 'execution' ? (game.execution?.pending ?? null) : null;
  const isMyDecision = Boolean(activePending && activePending.playerId === viewerId && !room.paused);
  const pendingActor = activePending
    ? game.players.find((p) => p.id === activePending.playerId) ?? null
    : revealCue
      ? game.players.find((p) => p.id === revealCue.playerId) ?? null
      : null;

  const punchForTarget =
    activePending?.card.action === 'punch' && selectedPunchTargetId
      ? activePending.options.filter(
          (o): o is Extract<ResolutionChoice, { type: 'punch' }> =>
            o.type === 'punch' && o.targetId === selectedPunchTargetId,
        )
      : [];
  const punchDistinctLoots = Array.from(new Set(punchForTarget.map((o) => o.lootType)));

  const emptyNoticeText = (action: ActionType): string => {
    if (action === 'shoot' || action === 'punch') return t.noTargetMsg;
    if (action === 'rob') return t.nothingToRobMsg;
    return t.noValidMoveMsg;
  };

  const decisionPromptText = (action: ActionType): string => {
    switch (action) {
      case 'move':
        return t.promptMove;
      case 'changeFloor':
        return t.promptChangeFloor;
      case 'marshal':
        return t.promptMarshal;
      case 'shoot':
        return t.promptShoot;
      case 'punch':
        return t.promptPunch;
      case 'rob':
        return t.promptRob;
    }
  };

  const lootLabel = (lt: LootType | null): string => {
    if (lt === 'purse') return t.purse;
    if (lt === 'jewel') return t.jewel;
    if (lt === 'strongbox') return t.strongbox;
    return t.dropNone;
  };

  const canGhostPlayFaceDown = Boolean(
    selfPlayer &&
      selfPlayer.character === 'ghost' &&
      game.phase === 'planning' &&
      game.planning?.turnIndex === 0 &&
      game.currentRound?.turns[0] !== 'tunnel' &&
      !game.actionStack.some((pc) => pc.playerId === selfPlayer.id),
  );

  const stageFallback2d = (
    <TrainScene
      game={game}
      viewerId={viewerId}
      anim={anim}
      animationsEnabled={animationsEnabled}
      lang={lang}
      pendingDecision={activePending}
      isMyDecision={isMyDecision}
      selectedPunchTargetId={selectedPunchTargetId}
      selectedPunchLoot={selectedPunchLoot}
      onSelectChoice={onSubmitResolution}
      onSelectPunchTarget={onSelectPunchTarget}
    />
  );

  const roundBannerTitle =
    lang === 'vi'
      ? `VÒNG ${game.roundIndex + 1} : ${game.phase === 'execution' ? t.phaseStealin : t.phaseSchemin}`
      : `ROUND ${game.roundIndex + 1} : ${game.phase === 'execution' ? t.phaseStealin : t.phaseSchemin}`;

  const currentEvent = game.currentRound ? EVENT_COPY_I18N[lang][game.currentRound.event] : null;
  const turnMap = TURN_COPY_I18N[lang];

  return (
    <div className="game-arena screen-game is-tabletop-hud">
      {/* Fullscreen panoramic 3D/2D train canvas backdrop */}
      <div className="stage-canvas-layer">
        <StageErrorBoundary fallback={stageFallback2d}>
          <Suspense fallback={stageFallback2d}>
            <TrainScene3D
              game={game}
              viewerId={viewerId}
              anim={anim}
              animationsEnabled={animationsEnabled}
              lang={lang}
              graphicsQuality={graphicsQuality}
              cameraEffects={cameraEffects}
              pendingDecision={activePending}
              isMyDecision={isMyDecision}
              selectedPunchTargetId={selectedPunchTargetId}
              selectedPunchLoot={selectedPunchLoot}
              onSelectChoice={onSubmitResolution}
              onSelectPunchTarget={onSelectPunchTarget}
            />
          </Suspense>
        </StageErrorBoundary>
      </div>

      {/* Dealing Cards Overlay */}
      {isDealing && (
        <div className="deal-stage-overlay" data-testid="deal-animation-overlay" aria-live="polite">
          <div className="shuffle-deck-visual" aria-hidden="true">
            <div className="deck-half deck-left" />
            <div className="deck-half deck-right" />
            <div className="flying-deal-card c1" />
            <div className="flying-deal-card c2" />
            <div className="flying-deal-card c3" />
          </div>
          <div className="deal-banner-text">
            <strong>{t.shufflingBanner}</strong>
            <span>{t.shufflingSub}</span>
          </div>
        </div>
      )}

      {/* TOP HUD LAYER: Top-Left Latest Card Pile + Top-Center Floating Player Medallions */}
      <div className="hud-top-overlay">
        {/* Top-Left: ONLY Latest Played Card (strictly face-down back if faceUp is false; NO history list) */}
        <div className="hud-top-left" data-testid="latest-played-pile">
          <div className="latest-pile-wrap">
            {latestPlayed ? (
              <div className="latest-pile-tilt" title={latestPlayed.faceUp ? `${t.latestPlayedLabel}: ${latestOwner?.name ?? ''}` : t.faceDownSecret}>
                {game.actionStack.length > 1 && <span className="latest-pile-underlay u1" aria-hidden="true" />}
                {game.actionStack.length > 2 && <span className="latest-pile-underlay u2" aria-hidden="true" />}
                <PlayingCard
                  card={latestPlayed.faceUp ? latestPlayed.card : null}
                  faceUp={Boolean(latestPlayed.faceUp && latestPlayed.card)}
                  compact
                  lang={lang}
                />
                <span className="latest-pile-count" title={`${t.stackTitle}: ${game.actionStack.length}`}>
                  {game.actionStack.length}
                </span>
                {latestOwner && latestPlayed.faceUp && (
                  <span className="latest-pile-owner">{latestOwner.name}</span>
                )}
              </div>
            ) : (
              <div className="latest-pile-empty" title={t.emptyStackHint}>
                <span>{t.emptyStackHint}</span>
              </div>
            )}

            <button
              type="button"
              className="hud-round-plus-btn"
              title={t.tableInfoTitle}
              aria-label={t.tableInfoTitle}
              onClick={() => setTableModalOpen((prev) => (prev === 'round' ? 'none' : 'round'))}
            >
              +
            </button>
          </div>
        </div>

        {/* Top-Center: Floating Circular Portrait Medallions matching Image 2 + 6/6 Gunslinger Rule */}
        <div className="hud-top-center" data-testid="bullet-tracker-panel">
          <div className="medallion-row">
            {game.players.map((p) => {
              const pal = CHARACTER_PALETTES[p.character];
              const isSelf = p.id === viewerId;
              const isActive = activeId === p.id && !room.paused && game.phase !== 'gameEnd';
              const fired = Math.max(0, BULLETS_PER_BANDIT - p.bulletsLeft);
              const reachedMaxBullets = fired >= BULLETS_PER_BANDIT;
              const knownCash =
                isSelf || game.phase === 'gameEnd'
                  ? p.loot.reduce((sum, item) => sum + (item.value ?? 0), 0)
                  : null;

              return (
                <div
                  key={p.id}
                  className={`bandit-medallion ${isActive ? 'is-active' : ''} ${isSelf ? 'is-self' : ''} ${!p.connected ? 'is-offline' : ''}`}
                  title={`${p.name} (${pal.label}) — ${t.bullets}: ${p.bulletsLeft}/6 (${t.gunslingerRuleNote})`}
                >
                  <div className="medallion-name-row">
                    <span className="medallion-name">
                      {p.isBot && <span className="bot-dot">🤖</span>}
                      {p.name}
                    </span>
                    {isSelf && <span className="medallion-you-tag">{t.youBadge}</span>}
                  </div>

                  <div className="medallion-avatar-stage">
                    {isActive && (
                      <span className="medallion-turn-arrow" aria-label={t.activeTurn}>
                        ➜
                      </span>
                    )}

                    <div
                      className="medallion-ring"
                      style={{
                        borderColor: pal.primary,
                        boxShadow: isActive
                          ? `0 0 0 3px #fff2a6, 0 0 18px ${pal.primary}`
                          : `0 4px 12px rgba(0, 0, 0, 0.55)`,
                      }}
                    >
                      <CharacterPortrait character={p.character} size={76} variant="avatar" />
                      {knownCash !== null && (
                        <span className="medallion-cash-pill">{knownCash}$</span>
                      )}
                    </div>

                    {/* Top-Right Remaining Bullets Badge (x6 -> turns 🎯+$1K at 0 left / 6 fired) */}
                    <span
                      className={`medallion-bullet-badge ${reachedMaxBullets ? 'is-maxed' : ''}`}
                      title={t.gunslingerRuleNote}
                    >
                      <BulletToken isNeutral={false} number={p.bulletsLeft} size={20} />
                      <strong>{reachedMaxBullets ? '6/6 🎯+$1K' : `×${p.bulletsLeft}`}</strong>
                    </span>

                    {/* Bottom Loot Bag Count Badge */}
                    <span className="medallion-loot-badge" title={`${p.loot.length} ${t.lootVal}`}>
                      <LootToken type="purse" size={28} />
                      <strong>{p.loot.length}</strong>
                    </span>

                    {!p.connected && (
                      <span className="medallion-offline-tag" title={t.offline}>
                        ⚠
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="medallion-substrip">
            <span className="gunslinger-pill" title={t.gunslingerRuleNote}>
              🎯 {t.gunslingerRuleNote}
            </span>
            <span className="self-wounds-pill" data-testid="self-wounds-count">
              <BulletToken isNeutral size={16} />
              {selfPlayer && !isSpectator
                ? `${t.woundsShort}: ${selfPlayer.bulletsReceived ?? 0}`
                : t.spectatorBadge}
            </span>
            {secsLeft !== null && (
              <span className={`turn-timer-pill ${secsLeft <= 8 ? 'is-urgent' : ''}`}>
                ⏱ {secsLeft}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Pause & Disconnect Alerts (only visible when needed) */}
      {room.paused && (
        <div className="pause-banner arena-float-banner">
          <span>
            ⏸ {t.pausedBanner}: {room.pauseReason ?? t.pausedFallback}
          </span>
          {isHost && <button onClick={onResume}>{t.resumeMatch}</button>}
        </div>
      )}

      {!room.paused && disconnectedPlayers.length > 0 && game.phase !== 'gameEnd' && (
        <div className="disconnect-banner arena-float-banner">
          <span>
            ⚠ {t.disconnectAlert}: {disconnectedPlayers.map((p) => p.name).join(', ')}. {t.hostDecidesNote}
          </span>
          {isHost && (
            <button onClick={() => onPause('Waiting for disconnected player')}>{t.pauseForReconnect}</button>
          )}
        </div>
      )}

      {/* Borderless Execution Hero Card Spotlight (choice happens directly on glowing train targets) */}
      {(revealCue || game.phase === 'execution') && (
        <div
          className={`center-spotlight is-floating-center ${isCinematicPlaying ? 'is-cinematic-playing' : ''}`}
          data-testid="execution-spotlight"
        >
          {revealCue ? (
            <div key={`cue-${revealCue.seq}`} className="spotlight-inner is-no-effect">
              <div className="spotlight-card-hero is-card-flip-in">
                <span className="spotlight-card-rays" aria-hidden="true" />
                <PlayingCard
                  card={{
                    id: `cue-${revealCue.seq}`,
                    kind: 'action',
                    action: revealCue.action,
                    owner: pendingActor?.character ?? 'django',
                  }}
                  faceUp
                  compact
                  lang={lang}
                />
              </div>
              <div className="spotlight-meta spotlight-caption-stack">
                <div className="spotlight-actor-row">
                  {pendingActor && <CharacterSprite character={pendingActor.character} size={28} />}
                  <strong>{pendingActor?.name ?? '-'}</strong>
                  <span>— {ACTION_COPY[lang][revealCue.action].title}</span>
                </div>
                <div className="spotlight-action-row">
                  <div className="no-effect-alert" role="status" data-testid="no-effect-notice">
                    {emptyNoticeText(revealCue.action)}
                  </div>
                  <button type="button" className="secondary spotlight-skip-btn" onClick={onDismissRevealCue}>
                    {t.skipReveal}
                  </button>
                </div>
              </div>
            </div>
          ) : activePending ? (
            <div
              key={`exec-${game.roundIndex}-${game.execution?.index ?? 0}-${activePending.card.id}`}
              className="spotlight-inner"
            >
              <div className="spotlight-card-hero is-card-flip-in">
                <span className="spotlight-card-rays" aria-hidden="true" />
                <PlayingCard card={activePending.card} faceUp compact lang={lang} />
              </div>
              <div className="spotlight-meta spotlight-caption-stack">
                <div className="spotlight-actor-row">
                  {pendingActor && <CharacterSprite character={pendingActor.character} size={28} />}
                  <strong>{pendingActor?.name ?? '-'}</strong>
                  <span className="badge">
                    {t.cardIndexOf} {game.execution!.index + 1}/{game.actionStack.length}
                  </span>
                  <span>— {ACTION_COPY[lang][activePending.card.action].title}</span>
                </div>
                {isMyDecision ? (
                  <>
                    <div className="spotlight-prompt-pill">
                      <span className="spotlight-your-turn">{t.yourCardNow}</span>
                      <span className="spotlight-instruction">
                        {selectedPunchTargetId && punchDistinctLoots.length > 1
                          ? t.promptPunchDetail
                          : decisionPromptText(activePending.card.action)}
                      </span>
                    </div>
                    {activePending.card.action === 'punch' && selectedPunchTargetId && (
                      <div className="row spotlight-punch-controls">
                        {punchDistinctLoots.length > 1 &&
                          punchDistinctLoots.map((lt) => (
                            <button
                              key={String(lt)}
                              type="button"
                              className={selectedPunchLoot === lt ? '' : 'secondary'}
                              onClick={() => onSelectPunchLoot(lt)}
                            >
                              {lootLabel(lt)}
                            </button>
                          ))}
                        <button type="button" className="secondary" onClick={onResetPunchSelection}>
                          {t.cancelTarget}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="spotlight-waiting">
                    {t.waitingForActor}: <strong>{pendingActor?.name ?? '-'}</strong>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="spotlight-waiting">{t.resolving}</div>
          )}
        </div>
      )}

      {/* End-of-Game Podium Overlay */}
      {game.phase === 'gameEnd' && game.scores && (
        <ScoreboardScreen
          t={t}
          game={game}
          isHost={isHost}
          busy={busy}
          onRematch={onRematch}
          onLeave={onLeaveRoom}
        />
      )}

      {/* Round / Table Details & Match Menu Popover Modal */}
      {tableModalOpen !== 'none' && (
        <div className="table-modal-backdrop" onClick={() => setTableModalOpen('none')}>
          <div className="card table-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="table-modal-head">
              <h3>{tableModalOpen === 'round' ? t.tableInfoTitle : t.matchMenuTitle}</h3>
              <button type="button" className="secondary" onClick={() => setTableModalOpen('none')}>
                ✕
              </button>
            </div>

            {tableModalOpen === 'round' ? (
              <div className="table-modal-body">
                {game.currentRound && (
                  <div className="modal-round-wrap">
                    <RoundCardDisplay
                      round={game.currentRound}
                      activeTurn={game.phase === 'planning' ? game.planning?.turnIndex ?? null : null}
                      lang={lang}
                    />
                    <EventPlaque
                      eventId={game.currentRound.event}
                      roundName={game.currentRound.name}
                      isStation={game.currentRound.kind === 'station'}
                      lang={lang}
                    />
                  </div>
                )}

                <p className="gunslinger-rule-note">🎯 {t.gunslingerRuleNote}</p>
                <div className="modal-roster-grid">
                  {game.players.map((p) => {
                    const fired = Math.max(0, BULLETS_PER_BANDIT - p.bulletsLeft);
                    return (
                      <div key={p.id} className="modal-roster-row">
                        <CharacterPortrait character={p.character} size={32} variant="avatar" />
                        <div className="modal-roster-meta">
                          <strong>{p.name}</strong> ({CHARACTER_PALETTES[p.character].label})
                          <span>
                            {p.position.car === 0 ? t.locomotive : `${t.car} ${p.position.car}`} (
                            {p.position.floor === 'roof' ? t.floorRoof : t.floorInside}) · {t.bulletsFiredCount}: {fired}/6
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {room.spectators.length > 0 && (
                  <p className="spectators-foot">
                    {t.spectatorsLabel}:{' '}
                    {room.spectators.map((s) => `${s.name}${s.isModerator ? ` [${t.hostBadgeLabel}]` : ''}`).join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="table-modal-body modal-menu-actions">
                <button type="button" onClick={onCopyInvite}>
                  {t.copyInvite}
                </button>
                {isHost && game.phase !== 'gameEnd' && (
                  room.paused ? (
                    <button type="button" onClick={() => { onResume(); setTableModalOpen('none'); }}>
                      {t.resume}
                    </button>
                  ) : (
                    <button type="button" className="secondary" onClick={() => { onPause('Host pause'); setTableModalOpen('none'); }}>
                      {t.pause}
                    </button>
                  )
                )}
                {isHost && (
                  <button type="button" className="danger" onClick={onCloseRoom}>
                    {t.closeRoom}
                  </button>
                )}
                <button type="button" className="secondary" onClick={onLeaveRoom}>
                  {t.leave}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM HUD BAR: Bottom-Left Round Heading + Bottom-Center Fanned Hand + Bottom-Right Draw Deck & Pause Menu */}
      <div className="arena-bottom-dock">
        <div className="hud-bottom-left">
          <div className="round-heading-comic">{roundBannerTitle}</div>
          {game.currentRound && (
            <button
              type="button"
              className="mini-round-pill"
              title={`${currentEvent?.label ?? ''}: ${currentEvent?.desc ?? ''}`}
              onClick={() => setTableModalOpen('round')}
            >
              <span className="mini-turns-strip">
                {game.currentRound.turns.map((turn, idx) => (
                  <span
                    key={idx}
                    className={`mini-turn-dot ${turn} ${
                      game.phase === 'planning' && game.planning?.turnIndex === idx ? 'is-now' : ''
                    }`}
                  >
                    {turnMap[turn].sym}
                  </span>
                ))}
              </span>
              {currentEvent && <span className="mini-event-name">{currentEvent.label}</span>}
            </button>
          )}
        </div>

        <div className="hud-bottom-center">
          {game.phase === 'planning' && game.planning && (
            <>
              <div className="dock-floating-status">
                <span className={`turn-ribbon ${activeId === viewerId && !room.paused ? 'is-mine' : ''}`}>
                  {activeId === viewerId && !room.paused && (
                    <span className="turn-flame" aria-hidden="true">
                      🔥
                    </span>
                  )}
                  <span>
                    {t.activeTurn}: <strong>{game.players.find((p) => p.id === activeId)?.name ?? '-'}</strong>
                    {activeId === viewerId && !room.paused ? ` — ${t.yourTurn}` : ''}
                  </span>
                </span>
                {canGhostPlayFaceDown && (
                  <label className="ghost-toggle">
                    <input
                      type="checkbox"
                      checked={faceDownToggle}
                      onChange={(e) => onChangeFaceDownToggle(e.target.checked)}
                    />{' '}
                    {t.ghostAbilityToggle}
                  </label>
                )}
              </div>

              {selfPlayer && !isSpectator ? (
                <div className={`hand-strip ${isDealing ? 'is-dealing' : ''}`}>
                  {selfPlayer.hand?.map((c) => (
                    <PlayingCard
                      key={c.id}
                      card={c}
                      playable={c.kind === 'action' && activeId === viewerId && !room.paused && !busy}
                      disabled={c.kind !== 'action' || activeId !== viewerId || room.paused || busy}
                      lang={lang}
                      onClick={() => onPlayCard(c.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="spectator-dock-note">{t.spectatorPlanningNote}</p>
              )}
            </>
          )}
        </div>

        <div className="hud-bottom-right arena-header-actions">
          {game.phase === 'planning' && selfPlayer && !isSpectator && (
            <button
              type="button"
              className="dock-draw-pile secondary"
              title={`${t.draw3} (${t.deckLabel}: ${selfPlayer.deckCount})`}
              disabled={activeId !== viewerId || selfPlayer.deckCount === 0 || room.paused || busy}
              onClick={onDrawCards}
            >
              <span className="dock-draw-star" aria-hidden="true">
                ★
              </span>
              <span className="dock-draw-label">{t.draw3}</span>
              <span className="dock-draw-count">{selfPlayer.deckCount}</span>
            </button>
          )}

          <button
            type="button"
            className="brass-circle-btn"
            data-testid="arena-menu-btn"
            title={t.matchMenuTitle}
            aria-label={t.matchMenuTitle}
            onClick={() => setTableModalOpen((prev) => (prev === 'menu' ? 'none' : 'menu'))}
          >
            {room.paused ? '▶' : '⏸'}
          </button>
        </div>
      </div>
    </div>
  );
}
