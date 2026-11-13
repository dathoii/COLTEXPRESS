import type { RoundEventId } from '@colt/shared';
import { EVENT_COPY_I18N, type Lang } from '../../i18n.js';
import { BulletToken, LootToken, MarshalBadge } from './LootToken.js';

interface Props {
  eventId: RoundEventId;
  roundName: string;
  isStation?: boolean;
  lang?: Lang;
}

function EventArtGlyph({ eventId }: { eventId: RoundEventId }) {
  switch (eventId) {
    case 'takeItAll':
      return <LootToken type="purse" size={44} title="Take It All!" />;
    case 'angryMarshal':
    case 'marshalsRevenge':
      return <MarshalBadge size={42} />;
    case 'passengersRebellion':
      return <BulletToken isNeutral size={40} />;
    case 'pickpocketing':
      return <LootToken type="jewel" size={42} title="Pickpocketing" />;
    case 'hostageConductor':
      return <LootToken type="strongbox" size={42} title="Hostage Conductor" />;
    case 'swivelArm':
    case 'braking':
      return (
        <svg viewBox="0 0 44 44" width="42" height="42" aria-hidden="true">
          <circle cx="22" cy="22" r="18" fill="rgba(40,22,10,0.65)" stroke="#f0be59" strokeWidth="2" />
          <path
            d={eventId === 'braking' ? 'M32,22 L12,22 M19,15 L12,22 L19,29' : 'M12,22 L32,22 M25,15 L32,22 L25,29'}
            fill="none"
            stroke="#ffcb63"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'none':
    default:
      return (
        <svg viewBox="0 0 44 44" width="42" height="42" aria-hidden="true">
          <circle cx="22" cy="22" r="10" fill="#ffd970" stroke="#9e5a16" strokeWidth="2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="22"
              y1="5"
              x2="22"
              y2="9"
              stroke="#ffd970"
              strokeWidth="2.4"
              strokeLinecap="round"
              transform={`rotate(${deg} 22 22)`}
            />
          ))}
        </svg>
      );
  }
}

/** Western comic-poster event marquee badge placed beside the round ticket in the arena header. */
export function EventPlaque({ eventId, roundName, isStation = false, lang = 'vi' }: Props) {
  const ev = (EVENT_COPY_I18N[lang] ?? EVENT_COPY_I18N.en)[eventId];
  return (
    <div className={`event-plaque ${isStation ? 'is-station' : ''}`} title={`${roundName} — ${ev.label}: ${ev.desc}`}>
      <div className="event-plaque-inner">
        <span className="event-plaque-title">{ev.label}</span>
        <div className="event-plaque-icon">
          <EventArtGlyph eventId={eventId} />
        </div>
      </div>
    </div>
  );
}
