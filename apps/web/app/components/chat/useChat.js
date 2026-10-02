'use client';

import { useContext, useEffect, useMemo } from 'react';
import { ChatContext } from './ChatProvider';

// Hooks de lecture du contexte de chat (voir ChatProvider.jsx pour
// l'architecture : socket unique dans le layout de l'espace connecté).

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat doit être utilisé sous <ChatProvider>.');
  return ctx;
}

// Total des non-lus, pour la pastille de BottomNav.
export function useUnreadCount() {
  return useContext(ChatContext)?.unreadCount ?? 0;
}

// Props de ConversationList.
export function useConversationList() {
  const { conversations, listState, refreshConversations } = useChat();
  return useMemo(
    () => ({
      conversations,
      loading: listState.loading && conversations.length === 0,
      error: listState.error,
      onRetry: refreshConversations,
    }),
    [conversations, listState, refreshConversations]
  );
}

// Props de ConversationView pour la conversation `conversation` (objet de la
// liste) ; null si aucune n'est ouverte. Marque la conversation comme ouverte
// (chargement des messages + lecture) tant que le composant est monté.
export function useOpenConversation(conversation) {
  const chat = useChat();
  const { me, threads, typingUsers, connection, openConversation, loadMessages, sendMessage, retryMessage, emitTyping } = chat;
  const id = conversation?.id ?? null;
  const peerId = conversation?.user.id;

  useEffect(() => {
    openConversation(id);
    return () => openConversation(null);
  }, [id, openConversation]);

  return useMemo(() => {
    if (!conversation) return null;
    const thread = threads[id];
    return {
      id,
      peer: conversation.user,
      currentUserId: me?.id,
      messages: thread?.messages ?? [],
      loading: !me || !thread || thread.loading,
      error: thread?.error || thread?.sendError || null,
      onReload: () => loadMessages(id),
      peerTyping: !!typingUsers[peerId],
      connection,
      onSend: (content) => sendMessage(id, content),
      onRetry: (tempId) => retryMessage(id, tempId),
      onTyping: () => emitTyping(id, true),
      onStopTyping: () => emitTyping(id, false),
    };
    // `conversation` : seule son identité (id/pair) compte pour ces props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, conversation?.user, threads, typingUsers, connection, me]);
}
