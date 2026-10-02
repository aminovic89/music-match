// État des fils de discussion (réducteur pur). Un fil = les messages d'une
// conversation, y compris les messages optimistes (`tempId`, `status`).
//
// Les messages optimistes portent un champ local que l'UI ignore :
// - `maybeSent` : l'émission a eu lieu au moins une fois (le serveur a pu
//   l'enregistrer sans que l'accusé nous parvienne) -> à la resynchronisation
//   on tente de le rapprocher d'un message serveur au lieu de le renvoyer.

export const initialThread = { messages: [], loading: false, loaded: false, error: null, sendError: null };

// Tolérance sur l'écart d'horloge client/serveur pour rapprocher un message
// optimiste d'un message serveur.
const ADOPT_TOLERANCE_MS = 30_000;
// Un message confirmé localement mais absent d'un fetch lancé juste avant
// reste affiché (le fetch peut précéder l'insertion).
const RECENT_MS = 10_000;

export function mergeServerMessages(local, server, now = Date.now()) {
  const tempById = new Map(local.filter((m) => m.id && m.tempId).map((m) => [m.id, m.tempId]));
  const result = server.map((m) => (tempById.has(m.id) ? { ...m, tempId: tempById.get(m.id) } : m));
  const serverIds = new Set(server.map((m) => m.id));
  const remaining = [];
  for (const m of local) {
    if (m.id) {
      if (!serverIds.has(m.id) && m.tempId && now - Date.parse(m.sent_at) < RECENT_MS) remaining.push(m);
      continue;
    }
    if (m.maybeSent) {
      const since = Date.parse(m.sent_at) - ADOPT_TOLERANCE_MS;
      const index = result.findIndex(
        (s) => !s.tempId && s.sender_id === m.sender_id && s.content === m.content && Date.parse(s.sent_at) >= since
      );
      if (index >= 0) {
        result[index] = { ...result[index], tempId: m.tempId };
        continue;
      }
    }
    remaining.push(m);
  }
  return [...result, ...remaining];
}

const patch = (state, id, fn) => ({ ...state, [id]: fn(state[id] || initialThread) });
const patchMessage = (thread, tempId, fn) => ({
  ...thread,
  messages: thread.messages.map((m) => (m.tempId === tempId ? fn(m) : m)),
});

export function threadsReducer(state, action) {
  const { id } = action;
  switch (action.type) {
    case 'load_start':
      return patch(state, id, (t) => ({ ...t, loading: !t.loaded }));
    case 'load_ok':
      return patch(state, id, (t) => ({
        ...t,
        messages: mergeServerMessages(t.messages, action.messages),
        loaded: true,
        loading: false,
        error: null,
      }));
    case 'load_err':
      return patch(state, id, (t) => ({ ...t, loading: false, error: action.error }));
    case 'add':
      return patch(state, id, (t) => ({ ...t, messages: [...t.messages, action.message], sendError: null }));
    case 'incoming': {
      const { message, currentUserId } = action;
      return patch(state, id, (t) => {
        if (t.messages.some((m) => m.id === message.id)) return t;
        if (message.sender_id === currentUserId) {
          // La diffusion arrive AVANT l'accusé (même socket) : on adopte le
          // message optimiste en attente de même contenu, avec son tempId.
          const index = t.messages.findIndex((m) => !m.id && m.status === 'sending' && m.content === message.content);
          if (index >= 0) {
            const messages = t.messages.slice();
            messages[index] = { ...message, tempId: messages[index].tempId };
            return { ...t, messages };
          }
        }
        return { ...t, messages: [...t.messages, message] };
      });
    }
    case 'ack_ok':
      return patch(state, id, (t) => {
        const { tempId, message } = action;
        if (t.messages.some((m) => m.tempId === tempId && m.id === message.id)) return { ...t, sendError: null };
        if (t.messages.some((m) => m.tempId === tempId)) {
          return { ...patchMessage(t, tempId, () => ({ ...message, tempId })), sendError: null };
        }
        // Déjà présent sans tempId (fetch concurrent) ou jamais ajouté.
        if (t.messages.some((m) => m.id === message.id)) {
          return {
            ...t,
            messages: t.messages.map((m) => (m.id === message.id ? { ...m, tempId } : m)),
            sendError: null,
          };
        }
        return { ...t, messages: [...t.messages, { ...message, tempId }], sendError: null };
      });
    case 'mark_emitted':
      return patch(state, id, (t) => patchMessage(t, action.tempId, (m) => ({ ...m, maybeSent: true })));
    case 'fail':
      return patch(state, id, (t) => ({
        ...patchMessage(t, action.tempId, (m) => ({ ...m, status: 'failed', maybeSent: action.maybeSent })),
        sendError: action.error,
      }));
    case 'retry':
      return patch(state, id, (t) => ({
        ...patchMessage(t, action.tempId, (m) => ({ ...m, status: 'sending' })),
        sendError: null,
      }));
    default:
      return state;
  }
}
