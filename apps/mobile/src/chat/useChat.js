import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { apiClient } from '@music-match/shared';
import { confirmMessage, mergeFetched, setStatus } from './messages';

// Délai max d'attente de l'acquittement de `send_message`.
export const ACK_TIMEOUT_MS = 10000;
// Filet de sécurité : `stop_typing` peut ne jamais arriver (réseau coupé chez
// l'autre) ; l'indicateur retombe seul. Le client émetteur n'envoie `typing`
// qu'une fois par rafale, d'où une valeur large.
export const PEER_TYPING_TIMEOUT_MS = 15000;

const AUTH_ERRORS = ['Token invalide ou expiré', 'Authentification requise'];

/**
 * Données et temps réel du chat, liés à la session authentifiée.
 *
 * - `token` : jeton de session (null = déconnecté, socket fermé, état vidé).
 * - `onUnauthorized` : appelé sur 401 (REST) ou rejet d'auth du socket.
 *
 * Une seule connexion socket par session. Le serveur n'émet `new_message` que
 * dans la room `conversation:<id>` : on rejoint donc TOUTES les conversations
 * (pas seulement l'ouverte) pour tenir le badge de non-lus à jour.
 */
export default function useChat(token, { onUnauthorized } = {}) {
  const [currentUserId, setCurrentUserId] = useState(/** @type {string|null} */ (null));
  const [conversations, setConversations] = useState(/** @type {any[]} */ ([]));
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [conversationsError, setConversationsError] = useState(/** @type {string|null} */ (null));
  const [connection, setConnection] = useState(/** @type {'connected'|'connecting'|'disconnected'} */ ('disconnected'));
  const [openId, setOpenId] = useState(/** @type {string|null} */ (null));
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(/** @type {string|null} */ (null));
  const [sendError, setSendError] = useState(/** @type {string|null} */ (null));
  const [peerTyping, setPeerTyping] = useState(false);

  const socketRef = useRef(null);
  const sessionRef = useRef(0);
  const tokenRef = useRef(token);
  const meRef = useRef(null);
  const openIdRef = useRef(null);
  const conversationsRef = useRef([]);
  const messagesRef = useRef([]);
  const joinedRef = useRef(new Set());
  const receivedWhileOpenRef = useRef(false);
  const typingTimerRef = useRef(null);
  const tempCounterRef = useRef(0);
  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    unauthorizedRef.current = onUnauthorized;
  });
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleApiError = useCallback((err) => {
    if (err && err.status === 401) unauthorizedRef.current?.();
  }, []);

  const clearTyping = useCallback(() => {
    clearTimeout(typingTimerRef.current);
    setPeerTyping(false);
  }, []);

  const joinRoom = useCallback((id, onResult) => {
    const socket = socketRef.current;
    if (!socket) return;
    if (!onResult && joinedRef.current.has(id)) return;
    joinedRef.current.add(id);
    socket.emit('join_conversation', id, (res) => {
      if (!res || !res.ok) joinedRef.current.delete(id);
      onResult?.(res);
    });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!tokenRef.current) return [];
    const session = sessionRef.current;
    try {
      const { conversations: list } = await apiClient.getConversations();
      if (session !== sessionRef.current) return [];
      // La conversation ouverte est lue en continu : jamais de non-lu local.
      const adjusted = list.map((c) => (c.id === openIdRef.current ? { ...c, unread_count: 0 } : c));
      conversationsRef.current = adjusted;
      setConversations(adjusted);
      setConversationsError(null);
      if (socketRef.current?.connected) adjusted.forEach((c) => joinRoom(c.id));
      return adjusted;
    } catch (err) {
      if (session !== sessionRef.current) return [];
      handleApiError(err);
      setConversationsError('Impossible de charger tes conversations.');
      return conversationsRef.current;
    } finally {
      if (session === sessionRef.current) setConversationsLoaded(true);
    }
  }, [joinRoom, handleApiError]);

  const loadMessages = useCallback(
    async (id) => {
      const session = sessionRef.current;
      try {
        const { messages: fetched } = await apiClient.getConversationMessages(id);
        if (session !== sessionRef.current || openIdRef.current !== id) return;
        setMessages((prev) => mergeFetched(prev, fetched));
        setMessagesError(null);
      } catch (err) {
        if (session !== sessionRef.current || openIdRef.current !== id) return;
        handleApiError(err);
        setMessagesError(err.message || 'Impossible de charger les messages.');
      } finally {
        if (session === sessionRef.current && openIdRef.current === id) setMessagesLoading(false);
      }
    },
    [handleApiError]
  );

  // Rejoint la room de la conversation ouverte puis recharge son historique
  // (rejoindre d'abord : aucun message perdu entre le fetch et la room).
  const syncOpenConversation = useCallback(
    (id) => {
      joinRoom(id, (res) => {
        if (openIdRef.current !== id) return;
        if (!res || !res.ok) setMessagesError((res && res.error) || 'Impossible de rejoindre la conversation.');
      });
      loadMessages(id);
    },
    [joinRoom, loadMessages]
  );

  // Cycle de vie de la session : connexion après login, fermeture au logout.
  useEffect(() => {
    tokenRef.current = token;
    if (!token) return undefined;
    sessionRef.current += 1;
    const session = sessionRef.current;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initial de la session, avant la première connexion
    setConnection('connecting');

    apiClient
      .getMe()
      .then((res) => {
        if (session !== sessionRef.current) return;
        meRef.current = res.user.id;
        setCurrentUserId(res.user.id);
      })
      .catch(handleApiError);

    const socket = io(apiClient.baseUrl, {
      // Le polling HTTP long est fragile sous React Native : WebSocket direct.
      transports: ['websocket'],
      auth: (cb) => cb({ token: tokenRef.current }),
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnection('connected');
      joinedRef.current = new Set(); // les rooms ne survivent pas à une reconnexion
      loadConversations();
      if (openIdRef.current) syncOpenConversation(openIdRef.current);
    };
    const onDisconnect = (reason) => {
      setConnection('disconnected');
      clearTyping();
      // Coupure décidée par le serveur : pas de reconnexion automatique.
      if (reason === 'io server disconnect') socket.connect();
    };
    const onConnectError = (err) => {
      if (err && AUTH_ERRORS.includes(err.message)) {
        unauthorizedRef.current?.();
        return;
      }
      setConnection('disconnected');
    };
    const onReconnectAttempt = () => setConnection('connecting');

    const onNewMessage = (message) => {
      if (!message) return;
      if (message.conversation_id === openIdRef.current) {
        setMessages((prev) => confirmMessage(prev, message, null, meRef.current));
        if (message.sender_id !== meRef.current) {
          receivedWhileOpenRef.current = true;
          clearTyping();
        }
        const patched = conversationsRef.current.map((c) =>
          c.id === message.conversation_id
            ? { ...c, last_message: { content: message.content, sent_at: message.sent_at } }
            : c
        );
        conversationsRef.current = patched;
        setConversations(patched);
      } else {
        loadConversations();
      }
    };

    const isOpenPeer = (userId) => {
      const open = conversationsRef.current.find((c) => c.id === openIdRef.current);
      // L'événement ne porte pas de conversationId : on filtre sur l'interlocuteur.
      return Boolean(open) && open.user.id === userId;
    };
    const onTyping = ({ userId } = {}) => {
      if (!isOpenPeer(userId)) return;
      setPeerTyping(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setPeerTyping(false), PEER_TYPING_TIMEOUT_MS);
    };
    const onStopTyping = ({ userId } = {}) => {
      if (isOpenPeer(userId)) clearTyping();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);

    // Retour au premier plan : l'OS a pu couper le socket. Reconnexion si
    // besoin (l'événement `connect` recharge tout), sinon simple rafraîchissement.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!socket.connected) {
        setConnection('connecting');
        socket.connect();
        return;
      }
      loadConversations();
      if (openIdRef.current) syncOpenConversation(openIdRef.current);
    });

    return () => {
      appStateSub?.remove();
      socket.off();
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.disconnect();
      socketRef.current = null;
      sessionRef.current += 1; // invalide les réponses en vol
      joinedRef.current = new Set();
      meRef.current = null;
      openIdRef.current = null;
      conversationsRef.current = [];
      clearTimeout(typingTimerRef.current);
      setCurrentUserId(null);
      setConversations([]);
      setConversationsLoaded(false);
      setConversationsError(null);
      setConnection('disconnected');
      setOpenId(null);
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError(null);
      setSendError(null);
      setPeerTyping(false);
    };
  }, [token, loadConversations, syncOpenConversation, clearTyping, handleApiError]);

  const open = useCallback(
    (id) => {
      openIdRef.current = id;
      receivedWhileOpenRef.current = false;
      setOpenId(id);
      setMessages([]);
      messagesRef.current = [];
      setMessagesError(null);
      setSendError(null);
      setMessagesLoading(true);
      clearTyping();
      // Ouvrir = lire : l'API marque lu au chargement de l'historique.
      const updated = conversationsRef.current.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c));
      conversationsRef.current = updated;
      setConversations(updated);
      syncOpenConversation(id);
    },
    [syncOpenConversation, clearTyping]
  );

  const close = useCallback(() => {
    const id = openIdRef.current;
    if (!id) return;
    openIdRef.current = null;
    setOpenId(null);
    setMessages([]);
    setMessagesLoading(false);
    setMessagesError(null);
    setSendError(null);
    clearTyping();
    // Messages reçus pendant l'ouverture : les relire les marque lus côté API
    // (pas d'événement socket dédié), puis on rafraîchit les compteurs.
    const markRead = receivedWhileOpenRef.current
      ? apiClient.getConversationMessages(id).catch(() => {})
      : Promise.resolve();
    receivedWhileOpenRef.current = false;
    markRead.then(() => loadConversations());
  }, [clearTyping, loadConversations]);

  // Conversation avec un utilisateur donné (bouton "Écrire" des matchs).
  // Retourne la conversation ouverte, ou null si elle est introuvable.
  const openWithUser = useCallback(
    async (userId) => {
      let found = conversationsRef.current.find((c) => c.user.id === userId);
      if (!found) {
        const list = await loadConversations();
        found = list.find((c) => c.user.id === userId);
      }
      if (found) open(found.id);
      return found || null;
    },
    [loadConversations, open]
  );

  const emitSend = useCallback((conversationId, tempId, content) => {
    const fail = (reason) => {
      setMessages((prev) => setStatus(prev, tempId, 'failed'));
      setSendError(reason);
    };
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      fail('Hors connexion. Réessaie quand la connexion sera revenue.');
      return;
    }
    // `timeout` retire aussi le paquet du buffer s'il expire : pas de doublon
    // livré tardivement après un "Réessayer".
    socket.timeout(ACK_TIMEOUT_MS).emit('send_message', { conversationId, content }, (err, res) => {
      if (err) return fail('Le serveur ne répond pas. Réessaie.');
      // `res.error` : message de l'API (ex. message vide / trop long, quota).
      if (!res || !res.ok) return fail((res && res.error) || "Le message n'a pas pu être envoyé.");
      setMessages((prev) => confirmMessage(prev, res.message, tempId, meRef.current));
    });
  }, []);

  const send = useCallback(
    (content) => {
      const id = openIdRef.current;
      if (!id) return;
      tempCounterRef.current += 1;
      const tempId = `tmp-${Date.now()}-${tempCounterRef.current}`;
      setSendError(null);
      setMessages((prev) => [
        ...prev,
        { tempId, sender_id: meRef.current, content, sent_at: new Date().toISOString(), status: 'sending' },
      ]);
      emitSend(id, tempId, content);
    },
    [emitSend]
  );

  const retry = useCallback(
    (tempId) => {
      const id = openIdRef.current;
      const failed = messagesRef.current.find((m) => m.tempId === tempId && m.status === 'failed');
      if (!id || !failed) return;
      setSendError(null);
      setMessages((prev) => setStatus(prev, tempId, 'sending'));
      emitSend(id, tempId, failed.content);
    },
    [emitSend]
  );

  const typing = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && openIdRef.current) socket.emit('typing', openIdRef.current);
  }, []);
  const stopTyping = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && openIdRef.current) socket.emit('stop_typing', openIdRef.current);
  }, []);

  const reloadMessages = useCallback(() => {
    if (!openIdRef.current) return;
    setMessagesLoading(true);
    syncOpenConversation(openIdRef.current);
  }, [syncOpenConversation]);

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return {
    currentUserId,
    connection,
    conversations,
    conversationsLoading: Boolean(token) && !conversationsLoaded,
    conversationsError,
    reloadConversations: loadConversations,
    unreadTotal,
    openId,
    open,
    close,
    openWithUser,
    messages,
    messagesLoading,
    messagesError: messagesError || sendError,
    reloadMessages,
    peerTyping,
    send,
    retry,
    typing,
    stopTyping,
  };
}
