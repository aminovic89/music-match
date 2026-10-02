'use client';

import BottomNav from '../BottomNav';
import { useUnreadCount } from './useChat';

// BottomNav alimentée par le total des messages non lus du contexte de chat.
export default function ChatBottomNav() {
  return <BottomNav unreadCount={useUnreadCount()} />;
}
