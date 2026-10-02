import React from 'react';
import { act } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import { apiClient } from '@music-match/shared';
import App from '../../App';
import { render, flush, control, hasText, press, type } from '../testUtils';

// Aucun vrai socket : faux client socket.io pilotable depuis les tests.
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    const handlers = {};
    const managerHandlers = {};
    const socket = {
      connected: false,
      emitted: [],
      sendHandler: null,
      handlers,
      on: jest.fn((ev, fn) => {
        (handlers[ev] = handlers[ev] || []).push(fn);
        return socket;
      }),
      off: jest.fn(() => {
        Object.keys(handlers).forEach((k) => delete handlers[k]);
      }),
      io: {
        on: jest.fn((ev, fn) => {
          (managerHandlers[ev] = managerHandlers[ev] || []).push(fn);
        }),
        off: jest.fn(),
      },
      connect: jest.fn(() => {
        socket.connected = true;
        socket.trigger('connect');
      }),
      disconnect: jest.fn(() => {
        socket.connected = false;
      }),
      emit: jest.fn((ev, ...args) => {
        socket.emitted.push([ev, ...args]);
        const cb = args[args.length - 1];
        if (ev === 'join_conversation' && typeof cb === 'function') cb({ ok: true });
      }),
      timeout: jest.fn(() => ({
        emit: (ev, payload, cb) => {
          socket.emitted.push([ev, payload]);
          if (socket.sendHandler) socket.sendHandler(payload, cb);
        },
      })),
      trigger(ev, ...args) {
        require('react').act(() => {
          (handlers[ev] || []).forEach((fn) => fn(...args));
        });
      },
    };
    return socket;
  }),
}));

jest.mock('expo-image-picker', () => ({}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@music-match/shared', () => ({
  apiClient: {
    baseUrl: 'http://api.test',
    setToken: jest.fn(),
    getMe: jest.fn(),
    getConversations: jest.fn(),
    getConversationMessages: jest.fn(),
    getMatches: jest.fn(),
    getDiscover: jest.fn(),
    likeUser: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const ME = 'me';
const at = (offsetMin) => new Date(Date.now() - offsetMin * 60000).toISOString();
const inFuture = () => new Date(Date.now() + 20 * 3600 * 1000).toISOString();
const INES = { id: 'u1', first_name: 'Inès', avatar_url: null, age: 27, city: 'Lyon' };
const KARIM = { id: 'u2', first_name: 'Karim', avatar_url: null, age: 31, city: null };

const conversations = () => [
  { id: 'c1', created_at: at(500), user: INES, last_message: { content: 'Salut toi', sent_at: at(5) }, unread_count: 2 },
  { id: 'c2', created_at: at(300), user: KARIM, last_message: null, unread_count: 1 },
];
const msg = (id, sender, content, minutes = 5) => ({
  id,
  conversation_id: 'c1',
  sender_id: sender,
  content,
  sent_at: at(minutes),
  expires_at: inFuture(),
  is_read: false,
});

const socket = () => io.mock.results[io.mock.results.length - 1].value;
const emitted = (ev) => socket().emitted.filter((e) => e[0] === ev);
const connect = () => socket().connect();
const sendButton = (root) => control(root, 'button', 'Envoyer');

let mounted = null;

async function boot() {
  const r = await render(<App />);
  mounted = r;
  await flush();
  connect();
  await flush();
  return r;
}

afterEach(async () => {
  if (mounted) await mounted.unmount();
  mounted = null;
});

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.getItemAsync.mockResolvedValue('tok');
  apiClient.getMe.mockResolvedValue({ user: { id: ME } });
  apiClient.getConversations.mockResolvedValue({ conversations: conversations() });
  apiClient.getConversationMessages.mockResolvedValue({ messages: [msg('m1', 'u1', 'Salut toi')] });
  apiClient.getMatches.mockResolvedValue({
    matches: [{ id: 'x', user_id: 'u2', first_name: 'Karim', score: 0.5, matched_at: at(100), expires_at: inFuture(), age: 31, city: null, avatar_url: null }],
  });
});

const goMessages = async (r) => {
  await press(control(r.root, 'tab', /Messages/));
  await flush();
};

describe('chat câblé (App)', () => {
  it("ouvre le socket avec le token en WebSocket, charge les conversations et affiche le badge", async () => {
    const r = await boot();
    expect(io).toHaveBeenCalledTimes(1);
    expect(io.mock.calls[0][0]).toBe('http://api.test');
    expect(io.mock.calls[0][1].transports).toEqual(['websocket']);
    let auth;
    io.mock.calls[0][1].auth((a) => { auth = a; });
    expect(auth).toEqual({ token: 'tok' });

    // Rooms rejointes pour toutes les conversations (badge en temps réel).
    expect(emitted('join_conversation').map((e) => e[1])).toEqual(['c1', 'c2']);
    // Badge = 2 + 1.
    expect(hasText(r.root, '3')).toBe(true);

    await goMessages(r);
    expect(hasText(r.root, 'Inès')).toBe(true);
    expect(hasText(r.root, 'Karim')).toBe(true);
    expect(hasText(r.root, 'Salut toi')).toBe(true);
  });

  it("ouvrir une conversation rejoint la room, charge les messages et remet son non-lu à zéro", async () => {
    const r = await boot();
    await goMessages(r);
    await press(control(r.root, 'button', /^Inès/));
    await flush();
    expect(apiClient.getConversationMessages).toHaveBeenCalledWith('c1');
    expect(emitted('join_conversation').filter((e) => e[1] === 'c1').length).toBeGreaterThanOrEqual(2);
    expect(hasText(r.root, 'Salut toi')).toBe(true);
    // Écran poussé : plus de barre d'onglets, et le badge ne compte plus c1 (reste 1).
    expect(control(r.root, 'tab', /Messages/)).toBeUndefined();

    // Retour : Messages, compteurs rechargés.
    apiClient.getConversations.mockResolvedValue({
      conversations: conversations().map((c) => (c.id === 'c1' ? { ...c, unread_count: 0 } : c)),
    });
    await press(control(r.root, 'button', 'Retour aux conversations'));
    await flush();
    expect(control(r.root, 'tab', /Messages/)).toBeDefined();
    expect(apiClient.getConversations).toHaveBeenCalled();
  });

  async function openInes(r) {
    await goMessages(r);
    await press(control(r.root, 'button', /^Inès/));
    await flush();
  }

  it("envoi : émet send_message, bulle optimiste puis confirmation à l'ack (sans doublon avec new_message)", async () => {
    let ackCb;
    const r = await boot();
    socket().sendHandler = (payload, cb) => { ackCb = cb; };
    await openInes(r);
    await type(r.root, 'Message à Inès', '  Coucou  ');
    await press(sendButton(r.root));

    expect(emitted('send_message')[0][1]).toEqual({ conversationId: 'c1', content: 'Coucou' });
    expect(hasText(r.root, 'Coucou')).toBe(true);
    expect(hasText(r.root, 'Envoi…')).toBe(true);

    const confirmed = msg('m2', ME, 'Coucou', 0);
    // Le serveur émet new_message dans la room AVANT l'ack.
    socket().trigger('new_message', confirmed);
    await act(async () => { ackCb(null, { ok: true, message: confirmed }); });
    await flush();

    const occurrences = r.root.findAll((n) => n.type === require('react-native').Text && n.props.children === 'Coucou');
    expect(occurrences.length).toBe(1);
    expect(hasText(r.root, 'Envoi…')).toBe(false);
  });

  it("échec d'envoi : état failed avec le message de l'API, puis Réessayer renvoie", async () => {
    const r = await boot();
    socket().sendHandler = (payload, cb) => cb(null, { ok: false, error: 'Limite quotidienne atteinte' });
    await openInes(r);
    await type(r.root, 'Message à Inès', 'Hello');
    await press(sendButton(r.root));
    await flush();
    expect(hasText(r.root, 'Non envoyé')).toBe(true);
    expect(hasText(r.root, 'Limite quotidienne atteinte')).toBe(true);

    const saved = msg('m3', ME, 'Hello', 0);
    socket().sendHandler = (payload, cb) => cb(null, { ok: true, message: saved });
    await press(control(r.root, 'button', "Réessayer l'envoi"));
    await flush();
    expect(emitted('send_message')).toHaveLength(2);
    expect(emitted('send_message')[1][1]).toEqual({ conversationId: 'c1', content: 'Hello' });
    expect(hasText(r.root, 'Non envoyé')).toBe(false);
    expect(hasText(r.root, 'Limite quotidienne atteinte')).toBe(false);
  });

  it("timeout d'ack : le message passe en échec", async () => {
    const r = await boot();
    socket().sendHandler = (payload, cb) => cb(new Error('operation has timed out'));
    await openInes(r);
    await type(r.root, 'Message à Inès', 'Hello');
    await press(sendButton(r.root));
    await flush();
    expect(hasText(r.root, 'Non envoyé')).toBe(true);
  });

  it('new_message entrant : ajouté une seule fois même reçu deux fois', async () => {
    const r = await boot();
    await openInes(r);
    const incoming = msg('m9', 'u1', 'Message tout neuf', 0);
    socket().trigger('new_message', incoming);
    socket().trigger('new_message', incoming);
    await flush();
    const n = r.root.findAll((nd) => nd.type === require('react-native').Text && nd.props.children === 'Message tout neuf');
    expect(n.length).toBe(1);
  });

  it("new_message dans une conversation non ouverte : recharge les conversations (badge)", async () => {
    const r = await boot();
    apiClient.getConversations.mockClear();
    apiClient.getConversations.mockResolvedValue({
      conversations: conversations().map((c) => (c.id === 'c2' ? { ...c, unread_count: 4 } : c)),
    });
    socket().trigger('new_message', { ...msg('m10', 'u2', 'Yo', 0), conversation_id: 'c2' });
    await flush();
    expect(apiClient.getConversations).toHaveBeenCalledTimes(1);
    expect(hasText(r.root, '6')).toBe(true);
  });

  it('typing / stop_typing basculent l’indicateur, et il retombe seul après le délai de sécurité', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    try {
      const r = await boot();
      await openInes(r);
      expect(hasText(r.root, 'Inès écrit…')).toBe(false);
      socket().trigger('typing', { userId: 'u1' });
      expect(hasText(r.root, 'Inès écrit…')).toBe(true);
      socket().trigger('stop_typing', { userId: 'u1' });
      expect(hasText(r.root, 'Inès écrit…')).toBe(false);

      socket().trigger('typing', { userId: 'u2' }); // autre utilisateur : ignoré
      expect(hasText(r.root, 'Inès écrit…')).toBe(false);

      socket().trigger('typing', { userId: 'u1' });
      expect(hasText(r.root, 'Inès écrit…')).toBe(true);
      await act(async () => { jest.advanceTimersByTime(16000); });
      expect(hasText(r.root, 'Inès écrit…')).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('typing émis vers le serveur avec la conversation ouverte', async () => {
    const r = await boot();
    await openInes(r);
    await type(r.root, 'Message à Inès', 'a');
    expect(emitted('typing')[0][1]).toBe('c1');
  });

  it("reconnexion : rejoint la room et recharge l'historique ; retour au premier plan reconnecte", async () => {
    const r = await boot();
    await openInes(r);
    apiClient.getConversationMessages.mockClear();
    socket().connected = false;
    socket().trigger('disconnect', 'transport close');
    await flush();
    expect(hasText(r.root, 'Hors connexion')).toBe(true);

    socket().connected = true;
    socket().trigger('connect');
    await flush();
    expect(apiClient.getConversationMessages).toHaveBeenCalledWith('c1');
    expect(hasText(r.root, 'Hors connexion')).toBe(false);
  });

  it('retour au premier plan : reconnecte le socket coupé, sinon rafraîchit', async () => {
    let onChange;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((ev, fn) => {
      if (ev === 'change') onChange = fn;
      return { remove };
    });
    try {
      const r = await boot();
      socket().connected = false;
      socket().connect.mockClear();
      await act(async () => { onChange('active'); });
      expect(socket().connect).toHaveBeenCalledTimes(1);

      apiClient.getConversations.mockClear();
      socket().connected = true;
      await act(async () => { onChange('active'); });
      expect(apiClient.getConversations).toHaveBeenCalledTimes(1);
      await r.unmount();
      expect(remove).toHaveBeenCalled();
    } finally {
      AppState.addEventListener.mockRestore();
    }
  });

  it("onWrite depuis les matchs : ouvre la conversation de l'utilisateur", async () => {
    const r = await boot();
    await press(control(r.root, 'tab', /Matchs/));
    await flush();
    await press(control(r.root, 'button', /Écrire/));
    await flush();
    expect(apiClient.getConversationMessages).toHaveBeenCalledWith('c2');
    expect(hasText(r.root, 'Karim')).toBe(true);
    expect(control(r.root, 'button', 'Retour aux conversations')).toBeDefined();
  });

  it('déconnexion : le socket est fermé', async () => {
    apiClient.getConversations.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    mounted = await render(<App />);
    await flush();
    connect();
    await flush();
    expect(apiClient.setToken).toHaveBeenLastCalledWith(null);
    expect(socket().disconnect).toHaveBeenCalled();
  });
});
