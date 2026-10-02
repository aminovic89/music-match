import React from 'react';
import { Alert, ActionSheetIOS, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@music-match/shared';
import ProfileScreen from '../screens/ProfileScreen';
import { render, flush, control, byRole, press } from '../testUtils';

jest.mock('@music-match/shared', () => ({
  apiClient: { getMe: jest.fn(), updateMe: jest.fn(), uploadPhoto: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

const user = { first_name: 'Léa', age: 27, city: 'Lyon', intent: 'romantic', gender: null, looking_for: null, avatar_url: null };
const asset = { uri: 'file:///tmp/p.jpg', fileName: 'p.jpg', mimeType: 'image/jpeg', fileSize: 200000 };
const granted = { granted: true };

const byLabel = (r, label) =>
  r.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === label);

// Ouvre le sélecteur (Android : Alert à boutons) et déclenche un choix.
async function choose(r, text) {
  await press(control(r.root, 'button', /ma photo|une photo/));
  const buttons = Alert.alert.mock.calls.at(-1)[2];
  // Sans await : l'envoi peut rester en attente (test "occupé").
  await React.act(async () => {
    buttons.find((b) => b.text === text).onPress();
  });
  await flush();
}

let r;
beforeEach(async () => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
  apiClient.getMe.mockResolvedValue({ user });
  ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted);
  ImagePicker.requestCameraPermissionsAsync.mockResolvedValue(granted);
  r = await render(<ProfileScreen onBack={() => {}} />);
  await flush();
});
afterEach(() => r.unmount());

describe('ProfileScreen - photo de profil', () => {
  it('propose "Ajouter une photo" sans avatar', () => {
    expect(control(r.root, 'button', 'Ajouter une photo')).toBeTruthy();
  });

  it("galerie : envoie le fichier, met à jour l'avatar et annonce le succès", async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    apiClient.uploadPhoto.mockResolvedValue({ user: { ...user, avatar_url: 'https://blob/p.jpg' } });
    await choose(r, 'Choisir dans la galerie');

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsEditing: true, aspect: [1, 1], quality: 0.7, mediaTypes: ['images'] })
    );
    expect(apiClient.uploadPhoto).toHaveBeenCalledWith({ uri: asset.uri, name: 'p.jpg', type: 'image/jpeg' });
    expect(byLabel(r, 'Succès : Photo mise à jour')).toHaveLength(1);
    expect(control(r.root, 'button', 'Changer ma photo')).toBeTruthy();
    const img = r.root.findAll((n) => n.props.source && n.props.source.uri === 'https://blob/p.jpg');
    expect(img.length).toBeGreaterThan(0);
  });

  it('appareil photo : même chemin via launchCameraAsync', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///c.jpg' }] });
    apiClient.uploadPhoto.mockResolvedValue({ user: { ...user, avatar_url: 'https://blob/c.jpg' } });
    await choose(r, 'Prendre une photo');
    expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
    expect(apiClient.uploadPhoto).toHaveBeenCalledWith({ uri: 'file:///c.jpg', name: 'photo.jpg', type: 'image/jpeg' });
    expect(byLabel(r, 'Succès : Photo mise à jour')).toHaveLength(1);
  });

  it('iOS : utilise ActionSheetIOS', async () => {
    Platform.OS = 'ios';
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_o, cb) => cb(0));
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    await press(control(r.root, 'button', 'Ajouter une photo'));
    await flush();
    expect(sheet).toHaveBeenCalled();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
  });

  it('permission refusée : message + réglages, aucun envoi', async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });
    await choose(r, 'Prendre une photo');
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    expect(apiClient.uploadPhoto).not.toHaveBeenCalled();
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toMatch(/refusé/);
    const denial = Alert.alert.mock.calls.at(-1);
    denial[2].find((b) => b.text === 'Ouvrir les réglages').onPress();
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('sélecteur annulé : rien ne se passe', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    await choose(r, 'Choisir dans la galerie');
    expect(apiClient.uploadPhoto).not.toHaveBeenCalled();
    expect(byRole(r.root, 'alert')).toHaveLength(0);
    expect(byLabel(r, 'Succès : Photo mise à jour')).toHaveLength(0);
  });

  it('erreur API (400 trop volumineux) : alerte, avatar inchangé', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    apiClient.uploadPhoto.mockRejectedValue(Object.assign(new Error('Fichier trop volumineux (max 5 MB)'), { status: 400 }));
    await choose(r, 'Choisir dans la galerie');
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toBe('Erreur : Fichier trop volumineux (max 5 MB)');
    expect(control(r.root, 'button', 'Ajouter une photo')).toBeTruthy();
  });

  it('fichier > 5 Mo : erreur côté client, aucun envoi', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ ...asset, fileSize: 6 * 1024 * 1024 }],
    });
    await choose(r, 'Choisir dans la galerie');
    expect(apiClient.uploadPhoto).not.toHaveBeenCalled();
    expect(byRole(r.root, 'alert')[0].props.accessibilityLabel).toMatch(/trop lourde/);
  });

  it("pendant l'envoi : bouton occupé", async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [asset] });
    let resolve;
    apiClient.uploadPhoto.mockReturnValue(new Promise((res) => { resolve = res; }));
    await choose(r, 'Choisir dans la galerie');
    const busy = control(r.root, 'button', 'Envoi de la photo…');
    expect(busy.props.accessibilityState.busy).toBe(true);
    await React.act(async () => { resolve({ user: { ...user, avatar_url: 'https://blob/x.jpg' } }); });
    await flush();
    expect(control(r.root, 'button', 'Changer ma photo')).toBeTruthy();
  });
});
