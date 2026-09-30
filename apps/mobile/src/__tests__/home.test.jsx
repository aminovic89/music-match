import React from 'react';
import { Image } from 'react-native';
import { apiClient } from '@music-match/shared';
import HomeScreen from '../screens/HomeScreen';
import { touch } from '../theme';
import { render, flush, control, byRole, hasText, press, pressableStyle } from '../testUtils';

jest.mock('@music-match/shared', () => ({
  apiClient: { getMe: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const callbacks = () => ({
  onLogout: jest.fn(),
  onNavigateProfile: jest.fn(),
  onNavigateMusic: jest.fn(),
});

beforeEach(() => jest.clearAllMocks());

describe('HomeScreen', () => {
  it('salue par le prénom (getMe inchangé) avec initiale en avatar', async () => {
    apiClient.getMe.mockResolvedValue({ user: { first_name: 'léa', avatar_url: null } });
    const r = await render(<HomeScreen {...callbacks()} />);
    await flush();
    expect(apiClient.getMe).toHaveBeenCalledTimes(1);
    expect(hasText(r.root, 'Salut léa !')).toBe(true);
    expect(hasText(r.root, 'L')).toBe(true);
    expect(hasText(r.root, 'Tes matchs sont sur le web')).toBe(true);
    r.unmount();
  });

  it('affiche la photo si avatar_url', async () => {
    apiClient.getMe.mockResolvedValue({ user: { first_name: 'Léa', avatar_url: 'https://ex.fr/a.jpg' } });
    const r = await render(<HomeScreen {...callbacks()} />);
    await flush();
    expect(r.root.findAllByType(Image)[0].props.source).toEqual({ uri: 'https://ex.fr/a.jpg' });
    r.unmount();
  });

  it('avant chargement : "Bienvenue" ; erreur annoncée dans une alerte', async () => {
    apiClient.getMe.mockRejectedValue(new Error('Session expirée'));
    const r = await render(<HomeScreen {...callbacks()} />);
    await flush();
    expect(hasText(r.root, 'Bienvenue')).toBe(true);
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Session expirée');
    r.unmount();
  });

  it('chaque action appelle le même callback (cibles ≥ 44pt)', async () => {
    apiClient.getMe.mockResolvedValue({ user: { first_name: 'Léa' } });
    const cb = callbacks();
    const r = await render(<HomeScreen {...cb} />);
    await flush();

    const profile = control(r.root, 'button', /^Mon profil/);
    const music = control(r.root, 'button', /^Ma musique/);
    const logout = control(r.root, 'button', 'Se déconnecter');
    for (const node of [profile, music, logout]) {
      expect(pressableStyle(node).minHeight).toBeGreaterThanOrEqual(touch.min);
    }

    await press(profile);
    expect(cb.onNavigateProfile).toHaveBeenCalledTimes(1);
    await press(music);
    expect(cb.onNavigateMusic).toHaveBeenCalledTimes(1);

    // Déconnexion immédiate, sans confirmation (comportement existant)
    await press(logout);
    expect(cb.onLogout).toHaveBeenCalledTimes(1);
    expect(cb.onNavigateProfile).toHaveBeenCalledTimes(1);
    expect(cb.onNavigateMusic).toHaveBeenCalledTimes(1);
    r.unmount();
  });
});
