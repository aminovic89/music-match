import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@music-match/shared';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingNavigator from './src/screens/onboarding/OnboardingNavigator';

const TOKEN_KEY = 'mm_token';
// Capté au retour du flow OAuth Spotify (voir apps/api/src/routes/auth.js,
// redirection mobile) pour ramener directement l'utilisateur à l'étape Import.
const ONBOARDING_IMPORT_URL_RE = /^musicmatch:\/\/onboarding-import\?token=(.+)$/;

type Screen = 'loading' | 'login' | 'register' | 'onboarding' | 'home';
type OnboardingInitialStep = 'import' | undefined;

// SecureStore n'a pas d'implémentation sur web (et pourrait échouer sur un
// vrai device pour d'autres raisons) — on ne bloque jamais la navigation
// sur un échec de persistance, on tente juste au mieux.
async function persistToken(value: string | null) {
  try {
    if (value) {
      await SecureStore.setItemAsync(TOKEN_KEY, value);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (_err) {
    // best-effort — la session reste valide en mémoire pour cette ouverture
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState<OnboardingInitialStep>(undefined);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((stored) => {
        if (stored) {
          apiClient.setToken(stored);
          setToken(stored);
          setScreen('home');
        } else {
          setScreen('login');
        }
      })
      .catch(() => setScreen('login'));
  }, []);

  useEffect(() => {
    const handleUrl = (url: string) => {
      const match = url.match(ONBOARDING_IMPORT_URL_RE);
      if (!match) return;
      const newToken = decodeURIComponent(match[1]);
      apiClient.setToken(newToken);
      setToken(newToken);
      setOnboardingInitialStep('import');
      setScreen('onboarding');
      persistToken(newToken);
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    return () => subscription.remove();
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    apiClient.setToken(newToken);
    setToken(newToken);
    setScreen('home');
    persistToken(newToken);
  };

  const handleRegisterSuccess = (newToken: string) => {
    apiClient.setToken(newToken);
    setToken(newToken);
    setScreen('onboarding');
    persistToken(newToken);
  };

  const handleLogout = () => {
    apiClient.setToken(null);
    setToken(null);
    setScreen('login');
    persistToken(null);
  };

  if (screen === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <>
      {screen === 'login' && (
        <LoginScreen
          onSuccess={handleLoginSuccess}
          onNavigateRegister={() => setScreen('register')}
        />
      )}
      {screen === 'register' && (
        <RegisterScreen
          onSuccess={handleRegisterSuccess}
          onNavigateLogin={() => setScreen('login')}
        />
      )}
      {screen === 'onboarding' && (
        <OnboardingNavigator
          token={token}
          initialStep={onboardingInitialStep}
          onComplete={() => setScreen('home')}
        />
      )}
      {screen === 'home' && <HomeScreen onLogout={handleLogout} />}
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
});
