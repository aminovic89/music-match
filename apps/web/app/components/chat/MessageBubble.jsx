import Icon from '../Icon';
import { Spinner, focusRing } from '../Button';
import { statusText } from './chatFormat';

// Briques du fil de discussion (présentation pure). Miroir de
// apps/mobile/src/components/chat/MessageBubble.jsx.
//
// Contrastes (WCAG AA, texte normal ≥ 4.5:1) :
// - ma bulle : blanc sur accent #7c3aed → 5.7:1 (aplat, pas le dégradé :
//   un fil entier en dégradé fatigue et l'extrémité fuchsia est plus juste) ;
// - sa bulle : fg #f5f6fa sur surface-2 #151a2b → 15.9:1 ;
// - infos sous la bulle : muted #a3aac0 sur background → 8.3:1.

// Rappel du caractère éphémère : fin bandeau épinglé sous l'en-tête (le
// fil s'ouvre en bas, un rappel placé en tête de fil ne serait jamais vu).
// Ton neutre, une seule ligne, pas de compte à rebours anxiogène.
export function EphemeralNotice({ ttlHours = 24, className = '' }) {
  return (
    <p
      className={`flex items-start justify-center gap-1.5 border-b border-line bg-background/80 px-4 py-1.5 text-center text-xs leading-relaxed text-muted ${className}`}
    >
      <Icon name="hourglass" className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
      <span>Les messages s&apos;effacent {ttlHours} h après leur envoi.</span>
    </p>
  );
}

export function DaySeparator({ label }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="text-xs font-medium text-muted">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </li>
  );
}

// Indicateur de saisie : points animés (coupés si prefers-reduced-motion)
// + texte visible, pour ne pas dépendre de l'animation. Masqué aux
// lecteurs d'écran : l'annonce passe par la région live de ConversationView.
export function TypingIndicator({ name }) {
  return (
    <div aria-hidden="true" className="mt-3 flex items-center gap-2">
      <span className="inline-flex h-9 items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface-2 px-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-muted motion-safe:animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </span>
      <span className="text-xs text-muted">{name} écrit…</span>
    </div>
  );
}

/**
 * Bulle de message.
 * @param {Object} props
 * @param {Object} props.row  Ligne produite par buildThread (chatFormat.js).
 * @param {string} props.peerName
 * @param {(tempId: string) => void} [props.onRetry]  Bouton "Réessayer" des messages `status: 'failed'`.
 */
export default function MessageBubble({ row, peerName, onRetry }) {
  const { message, mine, first, time, status, receipt, expiry, showMeta } = row;
  const failed = status === 'failed';
  const state = statusText(row);

  // Coins : arrondis partout, sauf côté auteur où ils se resserrent (le
  // coin du bas fait office de "queue", celui du haut colle au groupe).
  const corners = mine
    ? `rounded-l-2xl rounded-br-md ${first ? 'rounded-tr-2xl' : 'rounded-tr-md'}`
    : `rounded-r-2xl rounded-bl-md ${first ? 'rounded-tl-2xl' : 'rounded-tl-md'}`;

  const tone = mine
    ? `bg-accent text-white ${failed ? 'border-danger' : expiry.soon ? 'border-white/60' : 'border-transparent'}`
    : `bg-surface-2 text-fg ${expiry.soon ? 'border-line-strong' : 'border-line'}`;

  return (
    <li className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${first ? 'mt-3' : 'mt-1'}`}>
      <div
        className={`max-w-[82%] border px-3.5 py-2 text-base leading-relaxed sm:max-w-[70%] ${corners} ${tone} ${
          // Dernière heure avant effacement : contour en pointillés (indice
          // de forme, le texte garde tout son contraste).
          expiry.soon ? 'border-dashed' : ''
        }`}
      >
        <span className="sr-only">{`${mine ? 'Toi' : peerName}, ${time} : `}</span>
        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
      </div>

      {showMeta && (
        <p className={`mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-xs text-muted ${mine ? 'justify-end' : ''}`}>
          <span aria-hidden="true" className="tabular-nums">
            {time}
          </span>
          {state && (
            <span className={`inline-flex items-center gap-1 ${failed ? 'font-medium text-danger' : ''}`}>
              <span aria-hidden="true">·</span>
              {status === 'sending' && <Spinner className="size-3" />}
              {failed && <Icon name="alert" className="size-3.5" />}
              {receipt === 'read' && <Icon name="checkDouble" className="size-3.5 text-accent-text" />}
              {receipt === 'sent' && status === 'sent' && <Icon name="check" className="size-3.5" />}
              {state}
            </span>
          )}
          {expiry.label && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden="true">·</span>
              <Icon name="hourglass" className="size-3" />
              {expiry.label}
            </span>
          )}
        </p>
      )}

      {failed && onRetry && (
        <button
          type="button"
          onClick={() => onRetry(message.tempId || message.id)}
          className={`mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-line ${focusRing}`}
        >
          <Icon name="refresh" className="size-4" />
          Réessayer
          <span className="sr-only"> l&apos;envoi</span>
        </button>
      )}
    </li>
  );
}
