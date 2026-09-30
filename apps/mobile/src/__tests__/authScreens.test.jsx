import React from 'react';
import { act } from 'react';
import { TextInput, AccessibilityInfo, StyleSheet } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { apiClient } from '@music-match/shared';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { touch } from '../theme';

jest.mock('@music-match/shared', () => ({
  apiClient: { login: jest.fn(), register: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

async function render(element) {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(element);
  });
  return renderer.root;
}

const input = (root, label) =>
  root.findAll((n) => n.type === TextInput && n.props.accessibilityLabel === label)[0];

const control = (root, role, label) =>
  root.findAll(
    (n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === role && n.props.accessibilityLabel === label
  )[0];

beforeEach(() => jest.clearAllMocks());

describe('LoginScreen', () => {
  it('affiche des champs libellés et envoie email + mot de passe inchangés', async () => {
    apiClient.login.mockResolvedValue({ token: 'tok' });
    const onSuccess = jest.fn();
    const root = await render(<LoginScreen onSuccess={onSuccess} onNavigateRegister={() => {}} />);

    const email = input(root, 'Email');
    const password = input(root, 'Mot de passe');
    expect(email).toBeTruthy();
    expect(password.props.secureTextEntry).toBe(true);

    await act(async () => {
      email.props.onChangeText('a@b.fr');
      input(root, 'Mot de passe').props.onChangeText('secret123');
    });
    await act(async () => {
      control(root, 'button', 'Se connecter').props.onPress();
    });

    expect(apiClient.login).toHaveBeenCalledWith('a@b.fr', 'secret123');
    expect(onSuccess).toHaveBeenCalledWith('tok');
  });

  it("annonce l'erreur de l'API dans une alerte accessible", async () => {
    apiClient.login.mockRejectedValue(new Error('Identifiants invalides'));
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const root = await render(<LoginScreen onSuccess={() => {}} onNavigateRegister={() => {}} />);

    await act(async () => {
      control(root, 'button', 'Se connecter').props.onPress();
    });

    const alert = root.findAll((n) => n.props.accessibilityRole === 'alert')[0];
    expect(alert.props.accessibilityLabel).toBe('Erreur : Identifiants invalides');
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    // jest-expo simule iOS par défaut → annonce explicite
    expect(announce).toHaveBeenCalledWith('Erreur : Identifiants invalides');
  });

  it('le bouton Afficher/Masquer bascule la visibilité du mot de passe', async () => {
    const root = await render(<LoginScreen onSuccess={() => {}} onNavigateRegister={() => {}} />);
    await act(async () => {
      control(root, 'button', 'Afficher le mot de passe').props.onPress();
    });
    expect(input(root, 'Mot de passe').props.secureTextEntry).toBe(false);
    expect(control(root, 'button', 'Masquer le mot de passe')).toBeTruthy();
  });

  it('lien vers inscription et cibles tactiles ≥ 44pt', async () => {
    const onNavigateRegister = jest.fn();
    const root = await render(<LoginScreen onSuccess={() => {}} onNavigateRegister={onNavigateRegister} />);

    const link = control(root, 'link', 'Crée-en un');
    link.props.onPress();
    expect(onNavigateRegister).toHaveBeenCalled();

    for (const [role, label] of [
      ['button', 'Se connecter'],
      ['button', 'Afficher le mot de passe'],
      ['link', 'Crée-en un'],
    ]) {
      const node = control(root, role, label);
      const style = StyleSheet.flatten(
        typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : node.props.style
      );
      expect(style.minHeight).toBeGreaterThanOrEqual(touch.min);
      expect(style.height).toBeUndefined();
    }
  });
});

describe('RegisterScreen', () => {
  it('envoie le même payload qu’avant (âge converti en nombre)', async () => {
    apiClient.register.mockResolvedValue({ token: 'tok2' });
    const onSuccess = jest.fn();
    const root = await render(<RegisterScreen onSuccess={onSuccess} onNavigateLogin={() => {}} />);

    await act(async () => {
      input(root, 'Prénom').props.onChangeText('Léa');
      input(root, 'Âge').props.onChangeText('27');
      input(root, 'Email').props.onChangeText('lea@ex.fr');
      input(root, 'Mot de passe').props.onChangeText('motdepasse');
    });
    expect(input(root, 'Mot de passe').props.accessibilityHint).toBe('8 caractères minimum');

    await act(async () => {
      control(root, 'button', 'Créer mon compte').props.onPress();
    });

    expect(apiClient.register).toHaveBeenCalledWith({
      first_name: 'Léa',
      age: 27,
      email: 'lea@ex.fr',
      password: 'motdepasse',
    });
    expect(onSuccess).toHaveBeenCalledWith('tok2');
  });
});
