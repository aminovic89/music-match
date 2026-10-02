import React from 'react';
import { AccessibilityInfo, Text, TextInput, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import MessagesScreen from '../screens/MessagesScreen';
import ConversationScreen from '../screens/ConversationScreen';
import MatchesScreen from '../screens/MatchesScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import TabBar, { TABS } from '../components/TabBar';
import { touch } from '../theme';
import {
  MAX_MESSAGE_LENGTH,
  buildThread,
  counterText,
  draftState,
  formatListTime,
  formatRemaining,
} from '../chatFormat';
import { render, flush, control, byRole, hasText, press, pressableStyle, type, Stateful } from '../testUtils';

jest.mock('@music-match/shared', () => ({
  apiClient: { getDiscover: jest.fn(), likeUser: jest.fn(), getMatches: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// Données fictives au format de l'API (apps/api/src/services/chat.js).
// Dates construites en heure locale : les tests ne dépendent pas du fuseau.
const NOW = new Date(2026, 9, 2, 14, 30).getTime();
const at = (h, m, dayOffset = 0) => new Date(2026, 9, 2 + dayOffset, h, m).toISOString();
const plus24h = (iso) => new Date(new Date(iso).getTime() + 24 * 3600 * 1000).toISOString();
const ME = 'me';
const INES = { id: 'u1', first_name: 'Inès', avatar_url: null, age: 27, city: 'Lyon' };

const CONVERSATIONS = [
  {
    id: 'c1',
    created_at: at(9, 0, -2),
    user: INES,
    last_message: { content: 'Random Access Memories, évidemment.', sent_at: at(14, 28) },
    unread_count: 2,
  },
  {
    id: 'c2',
    created_at: at(18, 40, -1),
    user: { id: 'u2', first_name: 'Karim', avatar_url: null, age: 31, city: null },
    last_message: null,
    unread_count: 0,
  },
];

const msg = (id, sender, content, sent, extra = {}) => ({
  id,
  conversation_id: 'c1',
  sender_id: sender,
  content,
  sent_at: sent,
  expires_at: plus24h(sent),
  is_read: true,
  ...extra,
});

const MESSAGES = [
  msg('m1', 'u1', 'Salut ! On a Daft Punk en commun', at(21, 12, -1)),
  msg('m2', ME, 'Hello Inès !', at(14, 20)),
  msg('m3', ME, 'C’est quoi ton album préféré ?', at(14, 21)),
  msg('m4', 'u1', 'Random Access Memories, évidemment.', at(14, 28), { is_read: false }),
];

const labels = (root, prefix) =>
  byRole(root, 'text')
    .map((n) => n.props.accessibilityLabel)
    .filter((l) => typeof l === 'string' && l.startsWith(prefix));

const conversation = (props = {}) => (
  <ConversationScreen
    peer={INES}
    currentUserId={ME}
    messages={MESSAGES}
    now={NOW}
    onSend={jest.fn()}
    onBack={jest.fn()}
    {...props}
  />
);

const sendButton = (root) => control(root, 'button', /^Envoy|^Envoi/);
const composerInput = (root) => root.findAllByType(TextInput)[0];

beforeEach(() => jest.clearAllMocks());

describe('MessagesScreen (liste des conversations)', () => {
  it('affiche prénom, aperçu, heure relative et non-lus (nombre + libellé)', async () => {
    const onOpenConversation = jest.fn();
    const r = await render(
      <MessagesScreen conversations={CONVERSATIONS} now={NOW} onOpenConversation={onOpenConversation} />
    );
    expect(hasText(r.root, 'Messages')).toBe(true);
    expect(hasText(r.root, 'Inès')).toBe(true);
    expect(hasText(r.root, 'Random Access Memories, évidemment.')).toBe(true);
    expect(hasText(r.root, '2 min')).toBe(true);
    expect(hasText(r.root, 'Hier')).toBe(true);
    expect(hasText(r.root, 'Aucun message récent · dis bonjour')).toBe(true);

    const row = control(r.root, 'button', /^Inès/);
    expect(row.props.accessibilityLabel).toBe(
      'Inès, 2 messages non lus, Dernier message : Random Access Memories, évidemment., 2 min'
    );
    expect(pressableStyle(row).minHeight).toBeGreaterThanOrEqual(touch.min);
    expect(control(r.root, 'button', /^Karim/).props.accessibilityLabel).toBe('Karim, Aucun message récent, Hier');

    // Aperçu tronqué sur une ligne.
    const preview = r.root.findAll(
      (n) => n.type === Text && n.props.children === 'Random Access Memories, évidemment.'
    )[0];
    expect(preview.props.numberOfLines).toBe(1);

    await press(row);
    expect(onOpenConversation).toHaveBeenCalledWith('c1');
    expect(byRole(r.root, 'list')).toHaveLength(1);
    r.unmount();
  });

  it('état vide : explique et renvoie vers la découverte / les matchs', async () => {
    const onNavigateDiscover = jest.fn();
    const onNavigateMatches = jest.fn();
    const r = await render(
      <MessagesScreen conversations={[]} onNavigateDiscover={onNavigateDiscover} onNavigateMatches={onNavigateMatches} />
    );
    expect(hasText(r.root, 'Pas encore de conversation')).toBe(true);
    expect(hasText(r.root, "s'effacent au bout de 24 h")).toBe(true);
    await press(control(r.root, 'button', 'Trouver des matchs'));
    await press(control(r.root, 'button', 'Voir mes matchs'));
    expect(onNavigateDiscover).toHaveBeenCalledTimes(1);
    expect(onNavigateMatches).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it('chargement : état accessible, pas d’état vide', async () => {
    const r = await render(<MessagesScreen conversations={[]} loading />);
    expect(byRole(r.root, 'progressbar')[0].props.accessibilityLabel).toBe('Chargement des conversations…');
    expect(hasText(r.root, 'Pas encore de conversation')).toBe(false);
    r.unmount();
  });

  it('erreur : alerte annoncée + Réessayer, pas d’état vide trompeur', async () => {
    const onRetry = jest.fn();
    const r = await render(<MessagesScreen conversations={[]} error="Serveur indisponible" onRetry={onRetry} />);
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Serveur indisponible');
    expect(hasText(r.root, 'Pas encore de conversation')).toBe(false);
    await press(control(r.root, 'button', 'Réessayer'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    r.unmount();
  });
});

describe('ConversationScreen (fil)', () => {
  it('en-tête : retour, prénom, âge · ville', async () => {
    const onBack = jest.fn();
    const r = await render(conversation({ onBack }));
    expect(byRole(r.root, 'header')[0].props.children).toBe('Inès');
    expect(hasText(r.root, '27 ans · Lyon')).toBe(true);
    const back = control(r.root, 'button', 'Retour aux conversations');
    expect(pressableStyle(back).minHeight).toBeGreaterThanOrEqual(touch.min);
    expect(pressableStyle(back).minWidth).toBeGreaterThanOrEqual(touch.min);
    await press(back);
    expect(onBack).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it('bulles à moi / à l’autre avec libellés accessibles, séparateurs de jour, accusé de lecture', async () => {
    const r = await render(conversation());
    expect(labels(r.root, 'Toi,')).toEqual([
      'Toi, 14:20 : Hello Inès !',
      'Toi, 14:21 : C’est quoi ton album préféré ? (Vu)',
    ]);
    expect(labels(r.root, 'Inès,')).toEqual([
      // Plus de 6 h restantes : pas de compte à rebours sous la bulle.
      'Inès, 21:12 : Salut ! On a Daft Punk en commun',
      'Inès, 14:28 : Random Access Memories, évidemment.',
    ]);
    expect(hasText(r.root, 'Hier')).toBe(true);
    expect(hasText(r.root, "Aujourd'hui")).toBe(true);
    // Groupe : une seule ligne d'infos pour mes deux messages rapprochés.
    expect(hasText(r.root, '14:21 · ✓✓ Vu')).toBe(true);
    expect(hasText(r.root, '14:20')).toBe(false);
    r.unmount();
  });

  it('bandeau éphémère calme, toujours visible', async () => {
    const r = await render(conversation());
    expect(hasText(r.root, "Les messages s'effacent 24 h après leur envoi.")).toBe(true);
    const empty = await render(conversation({ messages: [], ttlHours: 12 }));
    expect(hasText(empty.root, "Les messages s'effacent 12 h après leur envoi.")).toBe(true);
    r.unmount();
    empty.unmount();
  });

  it('masque les messages expirés et signale ceux qui vont s’effacer', async () => {
    const old = msg('m0', 'u1', 'Déjà effacé', at(14, 0, -1));
    const soon = msg('m00', 'u1', 'Bientôt effacé', at(15, 0, -1));
    const r = await render(conversation({ messages: [old, soon, ...MESSAGES] }));
    expect(hasText(r.root, 'Déjà effacé')).toBe(false);
    expect(labels(r.root, 'Inès, 15:00')).toEqual(["Inès, 15:00 : Bientôt effacé (S'efface dans 30 min)"]);
    // Dernière heure : contour en pointillés (indice non coloré).
    const bubble = r.root.findAll(
      (n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.borderStyle === 'dashed'
    );
    expect(bubble.length).toBeGreaterThan(0);
    r.unmount();
  });

  it('indicateur de saisie affiché et annoncé', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const r = await render(conversation({ peerTyping: true }));
    expect(r.root.findAll((n) => n.props.testID === 'typing-indicator' && typeof n.type === 'string')).toHaveLength(1);
    expect(hasText(r.root, 'Inès écrit…')).toBe(true);
    expect(announce).toHaveBeenCalledWith("Inès est en train d'écrire");
    r.unmount();

    const quiet = await render(conversation());
    expect(hasText(quiet.root, 'Inès écrit…')).toBe(false);
    quiet.unmount();
  });

  it('annonce un message reçu après l’ouverture, pas l’historique ni mes envois', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    let update;
    const r = await render(
      <Stateful initial={MESSAGES}>
        {(messages, setMessages) => {
          update = setMessages;
          return conversation({ messages });
        }}
      </Stateful>
    );
    expect(announce).not.toHaveBeenCalled();

    await React.act(async () => update([...MESSAGES, msg('m5', ME, 'Bien vu', at(14, 29))]));
    expect(announce).not.toHaveBeenCalled();

    await React.act(async () =>
      update([...MESSAGES, msg('m5', ME, 'Bien vu', at(14, 29)), msg('m6', 'u1', 'Tu as vu leur live ?', at(14, 30))])
    );
    expect(announce).toHaveBeenCalledWith('Inès : Tu as vu leur live ?');
    r.unmount();
  });

  it('conversation vide : invite + amorces à partir des artistes en commun', async () => {
    const r = await render(conversation({ messages: [], sharedArtists: ['Daft Punk', 'Air'] }));
    expect(hasText(r.root, 'Dis bonjour à Inès')).toBe(true);
    const suggestion = control(r.root, 'button', /Daft Punk/);
    expect(pressableStyle(suggestion).minHeight).toBeGreaterThanOrEqual(touch.min);
    await press(suggestion);
    expect(composerInput(r.root).props.value).toBe("Toi aussi tu écoutes Daft Punk ? C'est quoi ton titre préféré ?");
    expect(sendButton(r.root).props.disabled).toBe(false);
    r.unmount();

    const plain = await render(conversation({ messages: [] }));
    expect(hasText(plain.root, 'Dis bonjour à Inès')).toBe(true);
    expect(control(plain.root, 'button', /Daft Punk/)).toBeUndefined();
    plain.unmount();
  });

  it('chargement et erreur (avec Réessayer)', async () => {
    const loading = await render(conversation({ messages: [], loading: true }));
    expect(byRole(loading.root, 'progressbar')[0].props.accessibilityLabel).toBe('Chargement des messages…');
    expect(hasText(loading.root, 'Dis bonjour à Inès')).toBe(false);
    loading.unmount();

    const onReload = jest.fn();
    const r = await render(conversation({ messages: [], error: 'Conversation introuvable', onReload }));
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Conversation introuvable');
    await press(control(r.root, 'button', 'Réessayer'));
    expect(onReload).toHaveBeenCalledTimes(1);
    r.unmount();
  });
});

describe('ConversationScreen (zone de saisie)', () => {
  it('Envoyer désactivé si vide ou espaces ; envoie le contenu sans espaces autour puis vide le champ', async () => {
    const onSend = jest.fn();
    const r = await render(conversation({ onSend }));
    expect(composerInput(r.root).props.multiline).toBe(true);
    expect(sendButton(r.root).props.disabled).toBe(true);
    expect(sendButton(r.root).props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(pressableStyle(sendButton(r.root)).width).toBeGreaterThanOrEqual(touch.min);
    expect(pressableStyle(sendButton(r.root)).height).toBeGreaterThanOrEqual(touch.min);

    await type(r.root, 'Message à Inès', '   \n ');
    expect(sendButton(r.root).props.disabled).toBe(true);
    await press(sendButton(r.root));
    expect(onSend).not.toHaveBeenCalled();

    await type(r.root, 'Message à Inès', '  Salut Inès !\n ');
    expect(sendButton(r.root).props.disabled).toBe(false);
    await press(sendButton(r.root));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('Salut Inès !');
    expect(composerInput(r.root).props.value).toBe('');
    expect(sendButton(r.root).props.disabled).toBe(true);
    r.unmount();
  });

  it('limite de 2000 caractères : compteur à l’approche, envoi bloqué au-delà', async () => {
    const onSend = jest.fn();
    const r = await render(conversation({ onSend }));
    await type(r.root, 'Message à Inès', 'a'.repeat(1700));
    expect(hasText(r.root, 'restant')).toBe(false);

    await type(r.root, 'Message à Inès', 'a'.repeat(1950));
    expect(hasText(r.root, '50 caractères restants')).toBe(true);
    expect(sendButton(r.root).props.disabled).toBe(false);

    await type(r.root, 'Message à Inès', 'a'.repeat(MAX_MESSAGE_LENGTH + 12));
    expect(hasText(r.root, '! Message trop long : 12 caractères en trop.')).toBe(true);
    expect(sendButton(r.root).props.disabled).toBe(true);
    await press(sendButton(r.root));
    expect(onSend).not.toHaveBeenCalled();

    // La limite s'applique après trim(), comme côté API.
    await type(r.root, 'Message à Inès', `  ${'a'.repeat(MAX_MESSAGE_LENGTH)}  `);
    expect(sendButton(r.root).props.disabled).toBe(false);
    r.unmount();
  });

  it('message échoué : "Non envoyé" + Réessayer(tempId) ; message en cours : "Envoi…"', async () => {
    const onRetry = jest.fn();
    const failed = { tempId: 't1', sender_id: ME, content: 'Raté', sent_at: at(14, 29), status: 'failed' };
    const pending = { tempId: 't2', sender_id: ME, content: 'En route', sent_at: at(14, 30), status: 'sending' };
    const r = await render(conversation({ messages: [...MESSAGES, failed, pending], onRetry }));
    expect(labels(r.root, 'Toi, 14:29')).toEqual(['Toi, 14:29 : Raté (Non envoyé)']);
    expect(labels(r.root, 'Toi, 14:30')).toEqual(['Toi, 14:30 : En route (Envoi…)']);
    expect(hasText(r.root, '14:29 · ! Non envoyé')).toBe(true);

    const retry = control(r.root, 'button', "Réessayer l'envoi");
    expect(pressableStyle(retry).minHeight).toBeGreaterThanOrEqual(touch.min);
    await press(retry);
    expect(onRetry).toHaveBeenCalledWith('t1');
    // L'accusé de lecture reste sur mon dernier message réellement envoyé.
    expect(labels(r.root, 'Toi, 14:21')).toEqual(['Toi, 14:21 : C’est quoi ton album préféré ? (Vu)']);
    r.unmount();
  });

  it('signaux de saisie : onTyping une fois par rafale, onStopTyping à l’envoi et quand le champ est vidé', async () => {
    const onTyping = jest.fn();
    const onStopTyping = jest.fn();
    const r = await render(conversation({ onTyping, onStopTyping }));
    await type(r.root, 'Message à Inès', 'S');
    await type(r.root, 'Message à Inès', 'Sa');
    await type(r.root, 'Message à Inès', 'Sal');
    expect(onTyping).toHaveBeenCalledTimes(1);
    expect(onStopTyping).not.toHaveBeenCalled();

    await type(r.root, 'Message à Inès', '');
    expect(onStopTyping).toHaveBeenCalledTimes(1);

    await type(r.root, 'Message à Inès', 'Salut');
    expect(onTyping).toHaveBeenCalledTimes(2);
    await press(sendButton(r.root));
    expect(onStopTyping).toHaveBeenCalledTimes(2);
    r.unmount();
    expect(onStopTyping).toHaveBeenCalledTimes(2);
  });

  it('état de la connexion : bandeau, et envoi désactivé hors connexion', async () => {
    const offline = await render(conversation({ connection: 'disconnected' }));
    expect(hasText(offline.root, "Hors connexion. Tu pourras écrire dès que la connexion sera revenue.")).toBe(true);
    await type(offline.root, 'Message à Inès', 'Salut');
    expect(sendButton(offline.root).props.disabled).toBe(true);
    expect(hasText(offline.root, 'Envoi indisponible hors connexion.')).toBe(true);
    offline.unmount();

    const reconnecting = await render(conversation({ connection: 'connecting' }));
    expect(hasText(reconnecting.root, 'Reconnexion en cours…')).toBe(true);
    await type(reconnecting.root, 'Message à Inès', 'Salut');
    expect(sendButton(reconnecting.root).props.disabled).toBe(false);
    reconnecting.unmount();

    const busy = await render(conversation({ sending: true }));
    await type(busy.root, 'Message à Inès', 'Salut');
    expect(sendButton(busy.root).props.accessibilityLabel).toBe('Envoi en cours');
    expect(sendButton(busy.root).props.disabled).toBe(true);
    busy.unmount();
  });

  it('zone de saisie au-dessus de la zone sûre (inset bas appliqué clavier fermé)', async () => {
    const r = await render(conversation());
    const bar = r.root.findAll(
      (n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.borderTopWidth === 1
    )[0];
    expect(StyleSheet.flatten(bar.props.style).paddingBottom).toBeGreaterThanOrEqual(34);
    r.unmount();
  });
});

describe('TabBar à 4 onglets', () => {
  it('Accueil / Découvrir / Matchs / Messages : cibles ≥ 44pt, libellés sur une ligne', async () => {
    const onNavigate = jest.fn();
    const r = await render(<TabBar current="messages" onNavigate={onNavigate} />);
    expect(TABS.map((t) => t.label)).toEqual(['Accueil', 'Découvrir', 'Matchs', 'Messages']);
    const tabs = TABS.map((t) => control(r.root, 'tab', t.label));
    expect(tabs.filter(Boolean)).toHaveLength(4);
    for (const tab of tabs) {
      const style = pressableStyle(tab);
      expect(style.minHeight).toBeGreaterThanOrEqual(touch.min);
      expect(style.flex).toBe(1); // 4 × 80pt sur un écran de 320pt
    }
    for (const label of TABS.map((t) => t.label)) {
      const text = r.root.findAll((n) => n.type === Text && n.props.children === label)[0];
      expect(text.props.numberOfLines).toBe(1);
      expect(text.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.3);
      // Un mot, 12pt : tient dans 80pt même agrandi à 130 %.
      expect(label.length).toBeLessThanOrEqual(9);
    }
    expect(control(r.root, 'tab', 'Messages').props.accessibilityState.selected).toBe(true);
    expect(control(r.root, 'tab', 'Matchs').props.accessibilityState.selected).toBe(false);
    await press(control(r.root, 'tab', 'Accueil'));
    expect(onNavigate).toHaveBeenLastCalledWith('home');
    r.unmount();
  });

  it('pastille de non-lus : nombre visible et libellé accessible', async () => {
    const onNavigate = jest.fn();
    const r = await render(<TabBar current="home" onNavigate={onNavigate} badges={{ messages: 3 }} />);
    expect(hasText(r.root, '3')).toBe(true);
    const tab = control(r.root, 'tab', 'Messages, 3 non lus');
    await press(tab);
    expect(onNavigate).toHaveBeenLastCalledWith('messages');
    r.unmount();

    const one = await render(<TabBar current="home" onNavigate={onNavigate} badges={{ messages: 1 }} />);
    expect(control(one.root, 'tab', 'Messages, 1 non lu')).toBeDefined();
    one.unmount();

    const many = await render(<TabBar current="home" onNavigate={onNavigate} badges={{ messages: 250 }} />);
    expect(hasText(many.root, '99+')).toBe(true);
    many.unmount();
  });
});

describe('Entrées vers le chat', () => {
  const httpMatch = {
    id: 'm1', user_id: 'u1', first_name: 'Inès', age: 27, city: 'Lyon', avatar_url: null, score: 0.82,
    matched_at: '2026-09-01T10:00:00Z', expires_at: '2026-09-15T10:00:00Z',
  };

  it('MatchesScreen : "Écrire à …" appelle onWrite(match) ; absent sans onWrite', async () => {
    apiClient.getMatches.mockResolvedValue({ matches: [httpMatch] });
    const onWrite = jest.fn();
    const r = await render(<MatchesScreen onWrite={onWrite} />);
    await flush();
    await press(control(r.root, 'button', 'Écrire à Inès'));
    expect(onWrite).toHaveBeenCalledWith(httpMatch);
    r.unmount();

    const without = await render(<MatchesScreen />);
    await flush();
    expect(control(without.root, 'button', 'Écrire à Inès')).toBeUndefined();
    without.unmount();
  });

  it('célébration d’un match : "Écrire à …" appelle onWrite avec user_id', async () => {
    apiClient.getDiscover.mockResolvedValue({
      candidates: [{ id: 'u1', first_name: 'Inès', avatar_url: null, age: 27, city: 'Lyon', score: 0.82 }],
    });
    apiClient.likeUser.mockResolvedValue({ matched: true });
    const onWrite = jest.fn();
    const r = await render(<DiscoverScreen onWrite={onWrite} />);
    await flush();
    await press(control(r.root, 'button', 'Liker'));
    await flush();
    await press(control(r.root, 'button', 'Écrire à Inès'));
    expect(onWrite).toHaveBeenCalledWith({ user_id: 'u1', first_name: 'Inès' });
    expect(control(r.root, 'button', 'Continuer à découvrir')).toBeDefined();
    r.unmount();
  });
});

describe('chatFormat', () => {
  it('draftState / counterText suivent les règles de l’API (trim, 2000)', () => {
    expect(draftState('   ').canSend).toBe(false);
    expect(draftState(' ok ').trimmed).toBe('ok');
    expect(draftState('a'.repeat(2000)).canSend).toBe(true);
    expect(draftState('a'.repeat(2001)).canSend).toBe(false);
    expect(counterText(draftState('a'.repeat(1999)))).toBe('1 caractère restant');
    expect(counterText(draftState('a'.repeat(2001)))).toBe('Message trop long : 1 caractère en trop.');
    expect(counterText(draftState('court'))).toBeNull();
  });

  it('heures relatives et temps restant', () => {
    expect(formatListTime(new Date(NOW - 20 * 1000).toISOString(), NOW)).toBe("À l'instant");
    expect(formatListTime(at(14, 18), NOW)).toBe('12 min');
    expect(formatListTime(at(9, 5), NOW)).toBe('09:05');
    expect(formatListTime(at(23, 50, -1), NOW)).toBe('Hier');
    expect(formatRemaining(30 * 1000)).toBe("S'efface dans moins d'une minute");
    expect(formatRemaining(2 * 3600 * 1000)).toBe("S'efface dans 2 h");
  });

  it('buildThread regroupe par auteur et par proximité dans le temps', () => {
    const rows = buildThread(MESSAGES, ME, NOW);
    expect(rows.map((row) => row.type)).toEqual(['day', 'message', 'day', 'message', 'message', 'message']);
    const [, , , first, second] = rows;
    expect([first.first, first.last, second.first, second.last]).toEqual([true, false, false, true]);
    expect(second.receipt).toBe('read');
    expect(first.showMeta).toBe(false);
  });
});
