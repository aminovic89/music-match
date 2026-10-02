// Transformations pures de la liste de messages d'une conversation.
// Un message optimiste porte un `tempId` (et `status`) ; une fois confirmé
// il garde ce `tempId` pour que la clé React reste stable.

// Confirme un message venu du serveur (ack ou `new_message`).
// - `tempId` connu (ack) : remplace l'optimiste ; si `new_message` est arrivé
//   avant l'ack (le serveur émet dans la room avant d'acquitter), le doublon
//   sans tempId est retiré.
// - sans `tempId` (`new_message`) : ignoré si déjà présent ; sinon, s'il
//   correspond à un de mes envois encore en cours (même contenu), il le
//   remplace en gardant son tempId ; sinon ajouté.
export function confirmMessage(list, message, tempId, currentUserId) {
  if (tempId) {
    const idx = list.findIndex((m) => m.tempId === tempId);
    const confirmed = { ...message, tempId };
    if (idx === -1) {
      return list.some((m) => m.id === message.id) ? list : [...list, confirmed];
    }
    return list
      .map((m, i) => (i === idx ? confirmed : m))
      .filter((m, i) => i === idx || m.id !== message.id);
  }
  if (list.some((m) => m.id === message.id)) return list;
  if (message.sender_id === currentUserId) {
    const idx = list.findIndex(
      (m) => m.status === 'sending' && m.tempId && m.content === message.content
    );
    if (idx !== -1) return list.map((m, i) => (i === idx ? { ...message, tempId: m.tempId } : m));
  }
  return [...list, message];
}

// Fusionne l'historique rechargé (REST) avec l'état local : les messages
// confirmés gardent leur tempId, les envois en cours / échoués sont conservés.
export function mergeFetched(local, fetched) {
  const tempIds = new Map(local.filter((m) => m.id && m.tempId).map((m) => [m.id, m.tempId]));
  const merged = fetched.map((m) => (tempIds.has(m.id) ? { ...m, tempId: tempIds.get(m.id) } : m));
  const pending = local.filter((m) => m.status === 'sending' || m.status === 'failed');
  return [...merged, ...pending];
}

export function setStatus(list, tempId, status) {
  return list.map((m) => (m.tempId === tempId ? { ...m, status } : m));
}
