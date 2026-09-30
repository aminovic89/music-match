import React from 'react';
import { apiClient } from '@music-match/shared';
import ProfileScreen from '../screens/ProfileScreen';
import MusicEditScreen from '../screens/MusicEditScreen';
import { render, flush, control, byRole, hasText, press, type, input } from '../testUtils';

jest.mock('@music-match/shared', () => ({
  apiClient: {
    getMe: jest.fn(),
    updateMe: jest.fn(),
    getMusicProfile: jest.fn(),
    saveTracks: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const user = {
  first_name: 'Léa', age: 27, city: 'Lyon', intent: 'romantic', gender: 'female', looking_for: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ connected: false }) })
  );
});

describe('ProfileScreen', () => {
  it('chargement : état accessible, puis formulaire libellé', async () => {
    let resolve;
    apiClient.getMe.mockReturnValue(new Promise((r) => { resolve = r; }));
    const r = await render(<ProfileScreen onBack={() => {}} />);
    expect(hasText(r.root, 'Chargement du profil…')).toBe(true);

    resolve({ user });
    await flush();
    expect(input(r.root, 'Prénom').props.value).toBe('Léa');
    expect(input(r.root, 'Âge').props.value).toBe('27');
    expect(input(r.root, 'Ville').props.value).toBe('Lyon');
    r.unmount();
  });

  it('erreur de chargement annoncée dans une alerte', async () => {
    apiClient.getMe.mockRejectedValue(new Error('Session expirée'));
    const r = await render(<ProfileScreen onBack={() => {}} />);
    await flush();
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Session expirée');
    r.unmount();
  });

  it('radios genre (état coché, désélection) et payload de sauvegarde inchangé', async () => {
    apiClient.getMe.mockResolvedValue({ user });
    apiClient.updateMe.mockResolvedValue({});
    const r = await render(<ProfileScreen onBack={() => {}} />);
    await flush();

    const genre = byRole(r.root, 'radiogroup').find((g) => g.props.accessibilityLabel === 'Genre');
    const femme = genre.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Femme')[0];
    expect(femme.props.accessibilityState.checked).toBe(true);
    await press(femme); // re-toucher = désélectionner (comportement existant)

    await press(control(r.root, 'radio', 'Une amitié'));
    await type(r.root, 'Ville', 'Paris');
    await press(control(r.root, 'button', 'Enregistrer'));
    await flush();

    expect(apiClient.updateMe).toHaveBeenCalledWith({
      first_name: 'Léa',
      age: 27,
      city: 'Paris',
      intent: 'friendship',
      gender: null,
      looking_for: null,
    });
    const alerts = r.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Succès : Profil mis à jour');
    expect(alerts.length).toBeGreaterThan(0);
    r.unmount();
  });

  it('Enregistrer désactivé et expliqué si prénom ou âge manquant', async () => {
    apiClient.getMe.mockResolvedValue({ user });
    const r = await render(<ProfileScreen onBack={() => {}} />);
    await flush();
    await type(r.root, 'Âge', '');

    const save = control(r.root, 'button', 'Enregistrer');
    expect(save.props.disabled).toBe(true);
    expect(hasText(r.root, 'Renseigne ton prénom et ton âge pour enregistrer.')).toBe(true);
    r.unmount();
  });

  it('Retour appelle onBack', async () => {
    apiClient.getMe.mockResolvedValue({ user });
    const onBack = jest.fn();
    const r = await render(<ProfileScreen onBack={onBack} />);
    await flush();
    await press(control(r.root, 'button', 'Retour'));
    expect(onBack).toHaveBeenCalled();
    r.unmount();
  });
});

describe('MusicEditScreen', () => {
  const saved = Array.from({ length: 10 }, (_, i) => ({
    track_id: `t${i}`, track_name: `Titre ${i}`, artist_name: `Artiste ${i}`, source: 'deezer', extra: 'x',
  }));

  it('chargement, en-tête "Modifier ma musique", sauvegarde du même payload', async () => {
    let resolve;
    apiClient.getMusicProfile.mockReturnValue(new Promise((res) => { resolve = res; }));
    apiClient.saveTracks.mockResolvedValue({ profile: { top_artists: ['Artiste 0'] } });
    const onBack = jest.fn();
    const r = await render(<MusicEditScreen token="tok" onBack={onBack} />);

    expect(hasText(r.root, 'Chargement de ta musique…')).toBe(true);
    expect(hasText(r.root, 'Modifier ma musique')).toBe(true);

    resolve({ tracks: saved });
    await flush();
    expect(control(r.root, 'button', 'Retirer Titre 0')).toBeTruthy();

    await press(control(r.root, 'button', 'Analyser (10)'));
    await flush();
    expect(apiClient.saveTracks).toHaveBeenCalledWith(
      saved.map(({ track_id, track_name, artist_name, source }) => ({ track_id, track_name, artist_name, source }))
    );
    expect(hasText(r.root, 'Ton ADN musical')).toBe(true);

    // Chevron retour de l'en-tête → accueil
    const backButtons = r.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Retour');
    await press(backButtons[0]);
    expect(onBack).toHaveBeenCalled();
    r.unmount();
  });
});
