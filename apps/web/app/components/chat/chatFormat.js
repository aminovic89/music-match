// Aides de présentation du chat (aucun appel réseau). Miroir exact de
// apps/mobile/src/chatFormat.js : toute modification ici doit être
// répercutée côté mobile, et inversement.
//
// Les limites reprennent apps/api/src/services/chat.js : le contenu est
// `trim()` puis refusé s'il est vide ou dépasse 2000 caractères ; chaque
// message expire MESSAGE_TTL_HOURS (24 h par défaut) après son envoi.

export const MAX_MESSAGE_LENGTH = 2000;
export const MESSAGE_TTL_HOURS = 24;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// Deux messages du même auteur à moins de 5 min forment un groupe (un seul
// horodatage, bulles resserrées).
const GROUP_GAP_MS = 5 * MINUTE;
// Le compteur de caractères n'apparaît qu'à l'approche de la limite.
const COUNTER_THRESHOLD = 200;

const toMs = (iso) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};

const pad = (n) => String(n).padStart(2, '0');

const dayStart = (ms) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

// Nombre de jours calendaires entre `ms` et `now` (0 = aujourd'hui).
const daysAgo = (ms, now) => Math.round((dayStart(now) - dayStart(ms)) / (24 * HOUR));

// "14:02" (heure locale).
export function formatTime(iso) {
  const ms = toMs(iso);
  if (ms === null) return '';
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Séparateur de jour dans le fil : "Aujourd'hui", "Hier", sinon la date.
export function formatDayLabel(iso, now) {
  const ms = toMs(iso);
  if (ms === null) return '';
  const days = daysAgo(ms, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return new Date(ms).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Heure relative de la liste des conversations : "À l'instant", "12 min",
// "14:02" (aujourd'hui), "Hier", puis "12 sept.".
export function formatListTime(iso, now) {
  const ms = toMs(iso);
  if (ms === null) return '';
  const diff = now - ms;
  if (diff < MINUTE) return "À l'instant";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min`;
  const days = daysAgo(ms, now);
  if (days <= 0) return formatTime(iso);
  if (days === 1) return 'Hier';
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// "27 ans · Lyon" (chaque partie est optionnelle).
export function peerSubtitle(peer) {
  if (!peer) return '';
  return [peer.age ? `${peer.age} ans` : null, peer.city || null].filter(Boolean).join(' · ');
}

// Clé stable d'un message. Un message optimiste porte `tempId` ; si le
// câblage conserve ce `tempId` sur le message confirmé par le serveur, la
// bulle n'est pas remontée (pas de saut visuel).
export const messageKey = (message) => String(message.tempId || message.id);

export const isMine = (message, currentUserId) => message.sender_id === currentUserId;

// 'sending' | 'failed' | 'sent' (les messages venus de l'API n'ont pas de
// `status` : ils sont envoyés).
export const messageStatus = (message) =>
  message.status === 'sending' || message.status === 'failed' ? message.status : 'sent';

// Temps restant avant effacement, formulé calmement.
export function formatRemaining(ms) {
  if (ms < MINUTE) return "S'efface dans moins d'une minute";
  if (ms < HOUR) return `S'efface dans ${Math.ceil(ms / MINUTE)} min`;
  return `S'efface dans ${Math.max(1, Math.round(ms / HOUR))} h`;
}

// État d'expiration d'un message :
// - expired : à masquer (l'API ne le renverrait plus) ;
// - label : mention "S'efface dans …", seulement dans le dernier quart de
//   vie du message (6 h sur 24) pour ne pas mettre un compte à rebours
//   sous chaque bulle ;
// - soon : dernière heure → bulle en pointillés (indice non coloré).
export function expiryInfo(message, now, ttlHours = MESSAGE_TTL_HOURS) {
  const expiresAt = toMs(message.expires_at);
  if (expiresAt === null) return { expired: false, label: null, soon: false };
  const left = expiresAt - now;
  if (left <= 0) return { expired: true, label: null, soon: false };
  const showLabel = left <= (ttlHours * HOUR) / 4;
  return { expired: false, label: showLabel ? formatRemaining(left) : null, soon: left <= HOUR };
}

// Messages encore visibles (non expirés), dans l'ordre reçu (sent_at
// croissant, comme l'API).
export function visibleMessages(messages, now) {
  return (messages || []).filter((m) => !expiryInfo(m, now).expired);
}

// Transforme les messages en lignes d'affichage : séparateurs de jour +
// bulles groupées par auteur / proximité dans le temps.
// Ligne message : { type, key, message, mine, first, last, time, status,
// receipt, expiry, showMeta }.
// - receipt : 'read' | 'sent' sur MON dernier message envoyé uniquement
//   (accusé de lecture à partir de `is_read`), sinon null.
// - showMeta : la ligne d'infos (heure, statut…) est affichée sous la bulle.
export function buildThread(messages, currentUserId, now, ttlHours = MESSAGE_TTL_HOURS) {
  const visible = visibleMessages(messages, now);

  let lastOwnSentIndex = -1;
  visible.forEach((m, i) => {
    if (isMine(m, currentUserId) && messageStatus(m) === 'sent') lastOwnSentIndex = i;
  });

  const rows = [];
  visible.forEach((message, i) => {
    const prev = visible[i - 1];
    const next = visible[i + 1];
    const sentAt = toMs(message.sent_at) ?? now;
    const newDay = !prev || dayStart(toMs(prev.sent_at) ?? now) !== dayStart(sentAt);
    if (newDay) {
      rows.push({ type: 'day', key: `day-${dayStart(sentAt)}`, label: formatDayLabel(message.sent_at, now) });
    }

    const sameGroup = (a, b) =>
      !!a &&
      !!b &&
      a.sender_id === b.sender_id &&
      Math.abs((toMs(a.sent_at) ?? now) - (toMs(b.sent_at) ?? now)) <= GROUP_GAP_MS &&
      dayStart(toMs(a.sent_at) ?? now) === dayStart(toMs(b.sent_at) ?? now);

    const mine = isMine(message, currentUserId);
    const status = messageStatus(message);
    const first = !sameGroup(prev, message);
    const last = !sameGroup(message, next);
    const receipt = i === lastOwnSentIndex ? (message.is_read ? 'read' : 'sent') : null;
    const expiry = expiryInfo(message, now, ttlHours);

    rows.push({
      type: 'message',
      key: messageKey(message),
      message,
      mine,
      first,
      last,
      time: formatTime(message.sent_at),
      status,
      receipt,
      expiry,
      showMeta: last || status !== 'sent' || receipt !== null,
    });
  });
  return rows;
}

// Texte du statut affiché sous une bulle (hors heure), ou null.
export function statusText(row) {
  if (row.status === 'sending') return 'Envoi…';
  if (row.status === 'failed') return 'Non envoyé';
  if (row.receipt === 'read') return 'Vu';
  if (row.receipt === 'sent') return 'Envoyé';
  return null;
}

// Libellé accessible complet d'une bulle : "Toi, 14:02 : Salut ! (Vu)"
export function messageLabel(row, peerName) {
  const author = row.mine ? 'Toi' : peerName || 'Ton match';
  const extras = [statusText(row), row.showMeta ? row.expiry.label : null].filter(Boolean);
  const base = `${author}, ${row.time} : ${row.message.content}`;
  return extras.length ? `${base} (${extras.join(', ')})` : base;
}

// État du brouillon dans la zone de saisie (mêmes règles que l'API : la
// longueur est mesurée après trim()).
export function draftState(draft, maxLength = MAX_MESSAGE_LENGTH) {
  const trimmed = (draft || '').trim();
  const length = trimmed.length;
  const over = Math.max(0, length - maxLength);
  const remaining = maxLength - length;
  return {
    trimmed,
    length,
    over,
    remaining,
    isEmpty: length === 0,
    isOver: over > 0,
    canSend: length > 0 && over === 0,
    showCounter: remaining <= COUNTER_THRESHOLD,
  };
}

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;

// Texte d'aide sous la zone de saisie (compteur / dépassement), ou null.
export function counterText(state) {
  if (state.isOver) return `Message trop long : ${plural(state.over, 'caractère')} en trop.`;
  if (state.showCounter) return `${plural(state.remaining, 'caractère')} ${state.remaining > 1 ? 'restants' : 'restant'}`;
  return null;
}

// Amorces de conversation à partir des artistes en commun (3 au plus).
export function icebreakers(sharedArtists) {
  return (sharedArtists || [])
    .filter(Boolean)
    .slice(0, 3)
    .map((artist) => ({
      artist,
      text: `Toi aussi tu écoutes ${artist} ? C'est quoi ton titre préféré ?`,
    }));
}

// "3 messages non lus" / "1 message non lu".
export function unreadLabel(count) {
  return count > 1 ? `${count} messages non lus` : '1 message non lu';
}

// Pastille de non-lus : plafonnée à "99+".
export const unreadBadge = (count) => (count > 99 ? '99+' : String(count));

// Nombre de messages reçus après le message de clé `afterKey` (messages
// arrivés pendant que l'utilisateur lisait plus haut dans le fil).
export function countNewSince(messages, afterKey, currentUserId) {
  if (afterKey === null || afterKey === undefined) return 0;
  const index = messages.findIndex((m) => messageKey(m) === afterKey);
  return messages.slice(index + 1).filter((m) => !isMine(m, currentUserId)).length;
}
