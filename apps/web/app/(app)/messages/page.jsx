'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MessagesLayout from '@/components/chat/MessagesLayout';
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
// TODO(web-frontend) — câblage, ce fichier ne contient que la présentation :
// - `conversations` : GET /api/chat/conversations (+ loading / error / onRetry) ;
// - conversation ouverte : GET /api/chat/conversations/:id/messages, socket
//   join_conversation / send_message / new_message / typing / stop_typing ;
// - passer à MessagesLayout `conversation={{ id, peer, currentUserId,
//   messages, loading, error, peerTyping, connection, onSend, onRetry,
//   onTyping, onStopTyping, ... }}` (contrat : ConversationView.jsx) ;
// - total des non-lus → `unreadCount` de BottomNav (app/(app)/layout.jsx).
const conversations = [];

function Messages() {
  const params = useSearchParams();
  const conversationId = params.get('c');
  const userId = params.get('u');
  const selected =
    conversations.find((c) => (conversationId ? c.id === conversationId : userId && c.user.id === userId)) || null;

  return (
    <MessagesLayout
      list={{ conversations }}
      conversation={selected ? { id: selected.id, peer: selected.user, messages: [] } : null}
    />
  );
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
