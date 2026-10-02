import React, { act } from 'react';
import { TextInput } from 'react-native';
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

// ProfileScreen importe expo-image-picker (module natif) : inutile ici.
jest.mock('expo-image-picker', () => ({}));

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

  describe('suppression de titres', () => {
    const spotifyTracks = Array.from({ length: 12 }, (_, i) => ({
      track_id: `sp${i}`, track_name: `Spotify ${i}`, artist_name: `Artiste ${i}`, source: 'spotify',
    }));

    it("un titre retiré n'est pas réimporté et disparaît du payload", async () => {
      apiClient.getMusicProfile.mockResolvedValue({ tracks: spotifyTracks });
      apiClient.saveTracks.mockResolvedValue({ profile: { top_artists: [] } });
      const r = await render(<MusicEditScreen token="tok" onBack={() => {}} />);
      await flush();
      await flush();

      // Aucun import automatique : la sélection reste celle du profil enregistré.
      expect(control(r.root, 'button', 'Analyser (12)')).toBeTruthy();

      await press(control(r.root, 'button', 'Retirer Spotify 0'));
      await press(control(r.root, 'button', 'Retirer Spotify 1'));
      await flush();
      await press(control(r.root, 'button', 'Analyser (10)'));
      await flush();

      const payload = apiClient.saveTracks.mock.calls[0][0];
      expect(payload.map((t) => t.track_id)).toEqual(spotifyTracks.slice(2).map((t) => t.track_id));
      r.unmount();
    });

    it("le retour depuis l'ADN ne réimporte pas les titres retirés", async () => {
      apiClient.getMusicProfile.mockResolvedValue({ tracks: spotifyTracks });
      apiClient.saveTracks.mockResolvedValue({ profile: { top_artists: [] } });
      const r = await render(<MusicEditScreen token="tok" onBack={() => {}} />);
      await flush();
      await press(control(r.root, 'button', 'Retirer Spotify 0'));
      await press(control(r.root, 'button', 'Retirer Spotify 1'));
      await press(control(r.root, 'button', 'Analyser (10)'));
      await flush();
      await press(control(r.root, 'button', 'Modifier ou supprimer mes titres'));
      await flush();
      await flush();
      expect(control(r.root, 'button', 'Analyser (10)')).toBeTruthy();
      r.unmount();
    });
  });

  describe('profil déjà analysé', () => {
    const profile = { top_artists: ['Angèle'], top_moods: [], avg_energy: null, tracks_count: 10 };

    it('affiche la synthèse au lieu des titres saisis', async () => {
      apiClient.getMusicProfile.mockResolvedValue({ profile, tracks: saved });
      const r = await render(<MusicEditScreen token="tok" onBack={() => {}} />);
      await flush();

      expect(hasText(r.root, 'Ton ADN musical')).toBe(true);
      expect(hasText(r.root, "Synthèse de l'analyse de tes 10 titres")).toBe(true);
      expect(hasText(r.root, 'Angèle')).toBe(true);
      expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Retirer Titre 0')).toHaveLength(0);
      expect(control(r.root, 'button', 'Ajouter des titres')).toBeTruthy();
      expect(control(r.root, 'button', 'Modifier ou supprimer mes titres')).toBeTruthy();
      r.unmount();
    });

    it('ajout depuis la synthèse, puis nouvelle analyse avec confirmation', async () => {
      apiClient.getMusicProfile.mockResolvedValue({ profile, tracks: saved });
      apiClient.saveTracks.mockResolvedValue({ profile: { top_artists: ['Angèle'] } });
      const r = await render(<MusicEditScreen token="tok" onBack={() => {}} />);
      await flush();

      await press(control(r.root, 'button', 'Ajouter des titres'));
      await flush();
      expect(input(r.root, 'Titre').props.autoFocus).toBe(true);
      await type(r.root, 'Titre', 'Balance ton quoi');
      await type(r.root, 'Artiste', 'Angèle');
      await press(control(r.root, 'button', 'Ajouter ce titre'));
      await press(control(r.root, 'button', 'Analyser (11)'));
      await flush();

      const payload = apiClient.saveTracks.mock.calls[0][0];
      expect(payload).toHaveLength(11);
      expect(payload[10]).toMatchObject({ track_name: 'Balance ton quoi', artist_name: 'Angèle', source: 'manual' });
      expect(hasText(r.root, "Synthèse de l'analyse de tes 11 titres")).toBe(true);
      const ok = r.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Succès : Profil musical mis à jour');
      expect(ok.length).toBeGreaterThan(0);
      r.unmount();
    });

    it('Annuler revient à la synthèse sans garder les suppressions', async () => {
      apiClient.getMusicProfile.mockResolvedValue({ profile, tracks: saved });
      const r = await render(<MusicEditScreen token="tok" onBack={() => {}} />);
      await flush();

      await press(control(r.root, 'button', 'Modifier ou supprimer mes titres'));
      await press(control(r.root, 'button', 'Retirer Titre 0'));
      expect(control(r.root, 'button', 'Analyser (9)')).toBeTruthy();
      await press(control(r.root, 'button', 'Annuler'));
      expect(hasText(r.root, 'Ton ADN musical')).toBe(true);
      expect(apiClient.saveTracks).not.toHaveBeenCalled();

      await press(control(r.root, 'button', 'Modifier ou supprimer mes titres'));
      expect(control(r.root, 'button', 'Analyser (10)')).toBeTruthy();
      r.unmount();
    });

    it('modifie un titre en place (devient une saisie manuelle)', async () => {
      apiClient.getMusicProfile.mockResolvedValue({ profile, tracks: saved });
      apiClient.saveTracks.mockResolvedValue({ profile });
      const r = await render(<MusicEditScreen token="tok" onBack={() => {}} />);
      await flush();

      await press(control(r.root, 'button', 'Modifier ou supprimer mes titres'));
      await press(control(r.root, 'button', 'Modifier Titre 2'));
      // Les champs du formulaire de modification suivent ceux de l'ajout manuel.
      const editField = (label) =>
        r.root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === label)[1];
      expect(editField('Titre').props.value).toBe('Titre 2');
      await act(async () => { editField('Titre').props.onChangeText('Titre corrigé'); });
      await press(control(r.root, 'button', 'Valider'));

      // Doublon refusé
      await press(control(r.root, 'button', 'Modifier Titre 3'));
      await act(async () => { editField('Titre').props.onChangeText('Titre 4'); });
      await act(async () => { editField('Artiste').props.onChangeText('Artiste 4'); });
      await press(control(r.root, 'button', 'Valider'));
      expect(hasText(r.root, 'Ce titre est déjà dans ta liste')).toBe(true);
      await press(control(r.root, 'button', 'Annuler'));

      await press(control(r.root, 'button', 'Analyser (10)'));
      await flush();
      const payload = apiClient.saveTracks.mock.calls[0][0];
      expect(payload[2]).toMatchObject({ track_name: 'Titre corrigé', artist_name: 'Artiste 2', source: 'manual' });
      expect(payload[3]).toMatchObject({ track_id: 't3', track_name: 'Titre 3' });
      r.unmount();
    });
  });
});
