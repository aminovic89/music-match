import React from 'react';
import { apiClient } from '@music-match/shared';
import DiscoverScreen from '../screens/DiscoverScreen';
import MatchesScreen from '../screens/MatchesScreen';
import TabBar from '../components/TabBar';
import { touch } from '../theme';
import { render, flush, control, byRole, hasText, press, pressableStyle } from '../testUtils';

jest.mock('@music-match/shared', () => ({
  apiClient: { getDiscover: jest.fn(), likeUser: jest.fn(), getMatches: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const CANDIDATES = [
  {
    id: 'u1', first_name: 'Inès', avatar_url: null, age: 27, city: 'Lyon', score: 0.82,
    shared_artists: ['Daft Punk', 'Air'], shared_moods: ['chill'], top_artists: [], top_moods: [],
  },
  {
    id: 'u2', first_name: 'Karim', avatar_url: null, age: 31, city: null, score: 0.4,
    top_artists: ['Nas'], top_moods: ['intense'],
  },
];

const httpError = (status, message) => Object.assign(new Error(message), { status });

beforeEach(() => jest.resetAllMocks());

describe('DiscoverScreen', () => {
  it('charge les candidats : nom, âge, score, chips en commun, compteur', async () => {
    apiClient.getDiscover.mockResolvedValue({ candidates: CANDIDATES });
    const r = await render(<DiscoverScreen />);
    await flush();
    expect(hasText(r.root, 'Inès, 27')).toBe(true);
    expect(hasText(r.root, 'Lyon')).toBe(true);
    expect(hasText(r.root, '82 %')).toBe(true);
    expect(hasText(r.root, 'Profil 1 sur 2')).toBe(true);
    expect(hasText(r.root, 'Vous aimez tous les deux')).toBe(true);
    expect(hasText(r.root, 'Daft Punk')).toBe(true);
    expect(hasText(r.root, '😌 Chill')).toBe(true);
    r.unmount();
  });

  it('Passer avance sans appel API ; les goûts du profil suivant sont neutres', async () => {
    apiClient.getDiscover.mockResolvedValue({ candidates: CANDIDATES });
    const r = await render(<DiscoverScreen />);
    await flush();
    const pass = control(r.root, 'button', 'Passer');
    expect(pressableStyle(pass).minHeight).toBeGreaterThanOrEqual(touch.min);
    await press(pass);
    expect(apiClient.likeUser).not.toHaveBeenCalled();
    expect(hasText(r.root, 'Karim, 31')).toBe(true);
    expect(hasText(r.root, 'Profil 2 sur 2')).toBe(true);
    expect(hasText(r.root, 'Ses artistes et ses moods')).toBe(true);
    expect(hasText(r.root, '🔥 Intense')).toBe(true);
    r.unmount();
  });

  it("Liker appelle likeUser avec l'id puis avance ; fin de liste = état vide + rafraîchir", async () => {
    apiClient.getDiscover.mockResolvedValue({ candidates: CANDIDATES });
    apiClient.likeUser.mockResolvedValue({ matched: false });
    const r = await render(<DiscoverScreen />);
    await flush();
    await press(control(r.root, 'button', 'Liker'));
    await flush();
    expect(apiClient.likeUser).toHaveBeenCalledWith('u1');
    expect(hasText(r.root, 'Karim, 31')).toBe(true);

    await press(control(r.root, 'button', 'Liker'));
    await flush();
    expect(apiClient.likeUser).toHaveBeenLastCalledWith('u2');
    expect(hasText(r.root, "Plus de profils pour l'instant")).toBe(true);

    apiClient.getDiscover.mockResolvedValue({ candidates: [CANDIDATES[0]] });
    await press(control(r.root, 'button', 'Rafraîchir'));
    await flush();
    expect(apiClient.getDiscover).toHaveBeenCalledTimes(2);
    expect(hasText(r.root, 'Inès, 27')).toBe(true);
    r.unmount();
  });

  it('célèbre un match, puis continue ou ouvre les matchs', async () => {
    apiClient.getDiscover.mockResolvedValue({ candidates: CANDIDATES });
    apiClient.likeUser.mockResolvedValue({ matched: true });
    const onNavigateMatches = jest.fn();
    const r = await render(<DiscoverScreen onNavigateMatches={onNavigateMatches} />);
    await flush();
    await press(control(r.root, 'button', 'Liker'));
    await flush();
    expect(hasText(r.root, "C'est un match avec Inès !")).toBe(true);
    expect(hasText(r.root, 'Inès, 27')).toBe(false);

    await press(control(r.root, 'button', 'Voir mes matchs'));
    expect(onNavigateMatches).toHaveBeenCalledTimes(1);

    await press(control(r.root, 'button', 'Continuer à découvrir'));
    expect(hasText(r.root, 'Karim, 31')).toBe(true);
    r.unmount();
  });

  it('erreur de like : alerte, on reste sur le profil', async () => {
    apiClient.getDiscover.mockResolvedValue({ candidates: CANDIDATES });
    apiClient.likeUser.mockRejectedValue(httpError(500, 'Boom'));
    const r = await render(<DiscoverScreen />);
    await flush();
    await press(control(r.root, 'button', 'Liker'));
    await flush();
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Boom');
    expect(hasText(r.root, 'Inès, 27')).toBe(true);
    r.unmount();
  });

  it('404 : invite à importer sa musique', async () => {
    apiClient.getDiscover.mockRejectedValue(httpError(404, 'Profil musical non créé'));
    const onNavigateMusic = jest.fn();
    const r = await render(<DiscoverScreen onNavigateMusic={onNavigateMusic} />);
    await flush();
    expect(hasText(r.root, 'Complète ton profil musical')).toBe(true);
    await press(control(r.root, 'button', 'Importer ma musique'));
    expect(onNavigateMusic).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it('erreur de chargement : alerte + Réessayer ; 401 déclenche onUnauthorized', async () => {
    apiClient.getDiscover.mockRejectedValueOnce(httpError(500, 'Serveur indisponible'));
    const r = await render(<DiscoverScreen />);
    await flush();
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Serveur indisponible');
    apiClient.getDiscover.mockResolvedValue({ candidates: CANDIDATES });
    await press(control(r.root, 'button', 'Réessayer'));
    await flush();
    expect(hasText(r.root, 'Inès, 27')).toBe(true);
    r.unmount();

    apiClient.getDiscover.mockRejectedValue(httpError(401, 'Non autorisé'));
    const onUnauthorized = jest.fn();
    const r2 = await render(<DiscoverScreen onUnauthorized={onUnauthorized} />);
    await flush();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    r2.unmount();
  });
});

describe('MatchesScreen', () => {
  it('liste les matchs avec score et dates', async () => {
    apiClient.getMatches.mockResolvedValue({
      matches: [
        {
          id: 'm1', first_name: 'Inès', age: 27, city: 'Lyon', avatar_url: null, score: 0.82,
          matched_at: '2026-09-01T10:00:00Z', expires_at: '2026-09-15T10:00:00Z',
        },
      ],
    });
    const r = await render(<MatchesScreen />);
    await flush();
    expect(hasText(r.root, 'Inès, 27')).toBe(true);
    expect(hasText(r.root, '82%')).toBe(true);
    expect(hasText(r.root, 'Match le 1 septembre')).toBe(true);
    expect(hasText(r.root, 'expire le 15 septembre')).toBe(true);
    r.unmount();
  });

  it('état vide avec lien vers Découvrir', async () => {
    apiClient.getMatches.mockResolvedValue({ matches: [] });
    const onNavigateDiscover = jest.fn();
    const r = await render(<MatchesScreen onNavigateDiscover={onNavigateDiscover} />);
    await flush();
    expect(hasText(r.root, 'Pas encore de match')).toBe(true);
    await press(control(r.root, 'button', 'Trouver des matchs'));
    expect(onNavigateDiscover).toHaveBeenCalledTimes(1);
    r.unmount();
  });

  it('erreur annoncée', async () => {
    apiClient.getMatches.mockRejectedValue(httpError(500, 'Boom'));
    const r = await render(<MatchesScreen />);
    await flush();
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Boom');
    r.unmount();
  });
});

describe('TabBar', () => {
  it("marque l'onglet courant et navigue", async () => {
    const onNavigate = jest.fn();
    const r = await render(<TabBar current="discover" onNavigate={onNavigate} />);
    const tab = (label) => control(r.root, 'tab', label);
    expect(tab('Découvrir').props.accessibilityState.selected).toBe(true);
    expect(tab('Accueil').props.accessibilityState.selected).toBe(false);
    for (const label of ['Accueil', 'Découvrir', 'Matchs']) {
      expect(pressableStyle(tab(label)).minHeight).toBeGreaterThanOrEqual(touch.min);
    }
    await press(tab('Matchs'));
    expect(onNavigate).toHaveBeenLastCalledWith('matches');
    await press(tab('Accueil'));
    expect(onNavigate).toHaveBeenLastCalledWith('home');
    r.unmount();
  });
});
