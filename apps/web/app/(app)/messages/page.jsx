'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MessagesLayout from '@/components/chat/MessagesLayout';
import { useChat, useConversationList, useOpenConversation } from '@/components/chat/useChat';
import PageContainer from '@/components/PageContainer';
import { LoadingState } from '@/components/States';

// Route unique /messages, compatible `output: 'export'` : pas de segment
// dynamique [id] (il faudrait connaître tous les ids au build). La
// conversation ouverte est portée par un paramètre de requête :
// - /messages                → liste des conversations
// - /messages?c=<convId>     → conversation ouverte
// - /messages?u=<userId>     → conversation avec ce match (lien "Écrire"
//   de /matches et de la célébration : l'API des matchs renvoie `user_id`
//   mais pas l'id de conversation)
//
// Données et temps réel : voir components/chat/ChatProvider.jsx (monté dans
// (app)/layout.jsx) et useChat.js.

function Messages() {
  const router = useRouter();
  const params = useSearchParams();
  const conversationId = params.get('c');
  const userId = params.get('u');
  const list = useConversationList();
  const { refreshConversations } = useChat();

  useEffect(() => {
    if (!localStorage.getItem('mm_token')) router.replace('/login');
    else refreshConversations();
  }, [router, refreshConversations]);

  const selected =
    list.conversations.find((c) => (conversationId ? c.id === conversationId : userId && c.user.id === userId)) ||
    null;
  const conversation = useOpenConversation(selected);

  return <MessagesLayout list={list} conversation={conversation} />;
}

export default function MessagesPage() {
  return (
    // useSearchParams impose une frontière Suspense pour le prérendu
    // statique : le HTML exporté contient ce repli, remplacé à l'hydratation.
    <Suspense
      fallback={
        <PageContainer width="sm">
          <LoadingState label="Chargement des conversations…" />
        </PageContainer>
      }
    >
      <Messages />
    </Suspense>
  );
}
