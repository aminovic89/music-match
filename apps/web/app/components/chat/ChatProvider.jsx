'use client';

import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { API, ApiError, apiGet, getToken } from './chatApi';
import { threadsReducer } from './chatState';

// Contexte de chat de l'espace connecté ((app)/layout.jsx).
//
// Le socket vit ICI, dans le layout de l'espace connecté, et non dans la
// page /messages : la pastille de non-lus de la barre d'onglets doit réagir
// à un `new_message` où que l'on soit, et la connexion survit à la
// navigation entre onglets. Comme l'API n'émet `new_message` / `typing`
// qu'aux sockets ayant fait `join_conversation`, on rejoint TOUTES les
// conversations de la liste (et celles qui apparaissent ensuite).
//
// Voir useChat.js pour les hooks consommateurs.

export const ChatContext = createContext(null);

const ACK_TIMEOUT_MS = 10_000;
// Filet de sécurité si `stop_typing` n'arrive jamais. useTypingSignal n'émet
// `typing` qu'une fois par rafale : on reste généreux pour ne pas masquer une
// longue saisie.
const TYPING_SAFETY_MS = 15_000;
const POLL_MS = 60_000;
const RETRY_MS = 5_000;

const newTempId = () =>
  `tmp-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;

const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

export function ChatProvider({ children }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [listState, setListState] = useState({ loading: true, error: null });
  const [connection, setConnection] = useState('connecting');
  const [synced, setSynced] = useState(false);
  const [threads, dispatch] = useReducer(threadsReducer, {});
  const [typingUsers, setTypingUsers] = useState({});
  const [openId, setOpenId] = useState(null);

  const socketRef = useRef(null);
  const joinedRef = useRef(new Set());
  const inflightRef = useRef(new Map()); // tempId -> jeton de tentative
  const typingTimers = useRef(new Map());
  const listSeq = useRef(0);
  // Dernières valeurs, lues par les gestionnaires du socket (qui ne sont
  // enregistrés qu'une fois par socket).
  const latest = useRef({});
  useEffect(() => {
    latest.current = { me, openId, conversations, threads };
  });

  const handleError = useCallback(
    (err) => {
      if (err instanceof ApiError && err.status === 401) router.replace('/login');
    },
    [router]
  );

  const refreshConversations = useCallback(async () => {
    if (!getToken()) return;
    const seq = ++listSeq.current;
    try {
      const data = await apiGet('/api/chat/conversations');
      if (seq !== listSeq.current) return;
      const open = latest.current.openId;
      const clear = open && isVisible();
      setConversations(
        clear ? data.conversations.map((c) => (c.id === open ? { ...c, unread_count: 0 } : c)) : data.conversations
      );
      setListState({ loading: false, error: null });
    } catch (err) {
      handleError(err);
      if (seq === listSeq.current) setListState({ loading: false, error: err.message });
    }
  }, [handleError]);

  // GET .../messages : l'API marque aussi les messages de l'autre comme lus.
  const loadMessages = useCallback(
    async (id, { silent = false } = {}) => {
      if (!silent) dispatch({ type: 'load_start', id });
      try {
        const data = await apiGet(`/api/chat/conversations/${encodeURIComponent(id)}/messages`);
        dispatch({ type: 'load_ok', id, messages: data.messages });
        if (isVisible()) {
          setConversations((prev) =>
            prev.some((c) => c.id === id && c.unread_count > 0)
              ? prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
              : prev
          );
        }
      } catch (err) {
        handleError(err);
        const known = latest.current.threads[id]?.loaded;
        if (!silent || !known) dispatch({ type: 'load_err', id, error: err.message });
      }
    },
    [handleError]
  );

  const joinAll = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return Promise.resolve();
    const pending = latest.current.conversations
      .map((c) => c.id)
      .filter((id) => !joinedRef.current.has(id))
      .map(
        (id) =>
          new Promise((resolve) => {
            joinedRef.current.add(id);
            socket.timeout(ACK_TIMEOUT_MS).emit('join_conversation', id, (err, res) => {
              if (err || !res?.ok) joinedRef.current.delete(id);
              resolve();
            });
          })
      );
    return Promise.all(pending);
  }, []);

  const clearTyping = useCallback((userId) => {
    clearTimeout(typingTimers.current.get(userId));
    typingTimers.current.delete(userId);
    setTypingUsers((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  // --- Données initiales : utilisateur courant + conversations -------------
  useEffect(() => {
    if (!getToken()) {
      // Les pages redirigent elles-mêmes vers /login.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setListState({ loading: false, error: null });
      return;
    }
    let cancelled = false;
    apiGet('/api/users/me')
      .then((data) => {
        if (!cancelled) setMe(data.user);
      })
      .catch(handleError);
    refreshConversations();
    return () => {
      cancelled = true;
    };
  }, [handleError, refreshConversations]);

  // --- Cycle de vie du socket ----------------------------------------------
  useEffect(() => {
    if (!getToken()) return;
    // `auth` en fonction : le jeton est relu à chaque (re)connexion.
    const socket = io(API, { auth: (cb) => cb({ token: getToken() }) });
    socketRef.current = socket;
    const timers = typingTimers.current;
    const inflight = inflightRef.current;
    let authRetry = null;

    const resync = async () => {
      await joinAll();
      if (socketRef.current !== socket || !socket.connected) return;
      // Comble les trous : messages reçus pendant la coupure (et accusés
      // perdus). Le fil ouvert + ceux qui ont des envois en attente.
      const { openId: open, threads: all } = latest.current;
      const ids = new Set(open ? [open] : []);
      for (const [id, t] of Object.entries(all)) {
        if (t.messages.some((m) => !m.id)) ids.add(id);
      }
      await Promise.all([...ids].map((id) => loadMessages(id, { silent: true })));
      if (socketRef.current === socket && socket.connected) setSynced(true);
    };

    socket.on('connect', () => {
      setConnection('connected');
      joinedRef.current = new Set();
      refreshConversations();
      resync();
    });

    socket.on('disconnect', (reason) => {
      setConnection(reason === 'io server disconnect' ? 'disconnected' : 'connecting');
      setSynced(false);
      joinedRef.current = new Set();
      // Les accusés en cours ne seront jamais honorés : on invalide les
      // tentatives ; les messages restent 'sending' et repartent à la
      // reconnexion (voir l'effet de purge de la file).
      inflightRef.current.clear();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      setTypingUsers({});
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('connect_error', (err) => {
      setConnection('disconnected');
      // Un rejet par le middleware serveur (socket.active === false) n'est
      // pas retenté par socket.io : on réessaie nous-mêmes. Pour un jeton
      // refusé, on vérifie d'abord la session en REST (401 -> /login).
      if (!socket.active) {
        if (/token|authentification/i.test(err.message)) refreshConversations();
        clearTimeout(authRetry);
        authRetry = setTimeout(() => socket.connect(), RETRY_MS);
      }
    });

    socket.io.on('reconnect_attempt', () => setConnection('connecting'));

    socket.on('new_message', (message) => {
      const L = latest.current;
      const id = message.conversation_id;
      const mine = message.sender_id === L.me?.id;
      const viewing = id === L.openId && isVisible();
      dispatch({ type: 'incoming', id, message, currentUserId: L.me?.id });
      if (!mine) {
        const conv = L.conversations.find((c) => c.id === id);
        if (conv) clearTyping(conv.user.id);
        // Lecture : l'API ne marque lu qu'au GET des messages.
        if (viewing) loadMessages(id, { silent: true });
      }
      if (!L.conversations.some((c) => c.id === id)) {
        refreshConversations(); // nouvelle conversation inconnue
        return;
      }
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === id);
        if (index < 0) return prev;
        const c = prev[index];
        const updated = {
          ...c,
          last_message: { content: message.content, sent_at: message.sent_at },
          unread_count: !mine && !viewing ? c.unread_count + 1 : c.unread_count,
        };
        return [updated, ...prev.slice(0, index), ...prev.slice(index + 1)];
      });
    });

    socket.on('typing', ({ userId }) => {
      setTypingUsers((prev) => (prev[userId] ? prev : { ...prev, [userId]: true }));
      clearTimeout(timers.get(userId));
      timers.set(userId, setTimeout(() => clearTyping(userId), TYPING_SAFETY_MS));
    });
    socket.on('stop_typing', ({ userId }) => clearTyping(userId));

    return () => {
      clearTimeout(authRetry);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      inflight.clear();
      joinedRef.current = new Set();
      socket.removeAllListeners();
      socket.io.off('reconnect_attempt');
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [joinAll, loadMessages, refreshConversations, clearTyping]);

  // Rejoint les conversations qui apparaissent après la connexion.
  useEffect(() => {
    if (connection === 'connected') joinAll();
  }, [conversations, connection, joinAll]);

  // --- Ouverture d'une conversation ----------------------------------------
  // Appelée par useOpenConversation (null = plus de conversation ouverte).
  const openConversation = useCallback(
    (id) => {
      setOpenId(id);
      if (!id) return;
      loadMessages(id);
      // Lu à l'ouverture : on n'attend pas le prochain fetch de la liste.
      setConversations((prev) =>
        prev.some((c) => c.id === id && c.unread_count > 0)
          ? prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
          : prev
      );
    },
    [loadMessages]
  );

  // --- File d'envoi --------------------------------------------------------
  // Tout message 'sending' non encore en vol est émis dès que le socket est
  // connecté ET resynchronisé (rejoint + refetch : un message dont l'accusé
  // s'est perdu est alors rapproché de la version serveur, pas renvoyé).
  useEffect(() => {
    const socket = socketRef.current;
    if (connection !== 'connected' || !synced || !socket?.connected) return;
    for (const [id, thread] of Object.entries(threads)) {
      for (const m of thread.messages) {
        if (m.status !== 'sending' || m.id || inflightRef.current.has(m.tempId)) continue;
        const token = {};
        inflightRef.current.set(m.tempId, token);
        dispatch({ type: 'mark_emitted', id, tempId: m.tempId });
        socket.timeout(ACK_TIMEOUT_MS).emit('send_message', { conversationId: id, content: m.content }, (err, res) => {
          if (inflightRef.current.get(m.tempId) !== token) return; // tentative invalidée
          inflightRef.current.delete(m.tempId);
          if (err) {
            dispatch({ type: 'fail', id, tempId: m.tempId, maybeSent: true, error: 'Le serveur met trop de temps à répondre.' });
          } else if (!res?.ok) {
            dispatch({ type: 'fail', id, tempId: m.tempId, maybeSent: false, error: res?.error || 'Message non envoyé.' });
          } else {
            dispatch({ type: 'ack_ok', id, tempId: m.tempId, message: res.message });
            // Garantit que la liste reflète le dernier message (le
            // broadcast peut manquer si la room n'est pas rejointe).
            setConversations((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, last_message: { content: res.message.content, sent_at: res.message.sent_at } } : c
              )
            );
          }
        });
      }
    }
  }, [threads, connection, synced]);

  // --- Rafraîchissements : retour au premier plan, réseau, sondage lent -----
  useEffect(() => {
    if (!getToken()) return;
    const refreshAll = () => {
      if (!isVisible()) return;
      const open = latest.current.openId;
      if (open) loadMessages(open, { silent: true });
      refreshConversations();
      const socket = socketRef.current;
      if (socket && !socket.connected && navigator.onLine) socket.connect();
    };
    const onOffline = () => setConnection('disconnected');
    const onOnline = () => {
      const socket = socketRef.current;
      if (socket && !socket.connected) {
        setConnection('connecting');
        socket.connect();
      }
    };
    document.addEventListener('visibilitychange', refreshAll);
    window.addEventListener('focus', refreshAll);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    // Filet pour les nouvelles conversations (match tout juste créé) que
    // le socket ne peut pas annoncer avant d'avoir rejoint leur room.
    const poll = setInterval(() => {
      if (isVisible()) refreshConversations();
    }, POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', refreshAll);
      window.removeEventListener('focus', refreshAll);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      clearInterval(poll);
    };
  }, [loadMessages, refreshConversations]);

  // --- Actions -------------------------------------------------------------
  const sendMessage = useCallback((conversationId, content) => {
    const message = {
      tempId: newTempId(),
      sender_id: latest.current.me?.id,
      content,
      sent_at: new Date().toISOString(),
      status: 'sending',
    };
    dispatch({ type: 'add', id: conversationId, message });
  }, []);

  const retryMessage = useCallback((conversationId, tempId) => {
    dispatch({ type: 'retry', id: conversationId, tempId });
  }, []);

  const emitTyping = useCallback((conversationId, active) => {
    const socket = socketRef.current;
    if (socket?.connected) socket.emit(active ? 'typing' : 'stop_typing', conversationId);
  }, []);

  const unreadCount = useMemo(() => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0), [conversations]);

  const value = useMemo(
    () => ({
      me,
      conversations,
      listState,
      connection,
      threads,
      typingUsers,
      unreadCount,
      openConversation,
      refreshConversations,
      loadMessages,
      sendMessage,
      retryMessage,
      emitTyping,
    }),
    [
      me,
      conversations,
      listState,
      connection,
      threads,
      typingUsers,
      unreadCount,
      openConversation,
      refreshConversations,
      loadMessages,
      sendMessage,
      retryMessage,
      emitTyping,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
