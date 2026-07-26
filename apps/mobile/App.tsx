import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@music-match/shared';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingNavigator from './src/screens/onboarding/OnboardingNavigator';

const TOKEN_KEY = 'mm_token';

type Screen = 'loading' | 'login' | 'register' | 'onboarding' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((stored) => {
      if (stored) {
        apiClient.setToken(stored);
        setToken(stored);
        setScreen('home');
      } else {
        setScreen('login');
      }
    });
  }, []);

  const handleLoginSuccess = async (newToken: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    apiClient.setToken(newToken);
    setToken(newToken);
    setScreen('home');
  };

  const handleRegisterSuccess = async (newToken: string) => {
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    apiClient.setToken(newToken);
    setToken(newToken);
    setScreen('onboarding');
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    apiClient.setToken(null);
    setToken(null);
    setScreen('login');
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
        <OnboardingNavigator token={token} onComplete={() => setScreen('home')} />
      )}
      {screen === 'home' && <HomeScreen onLogout={handleLogout} />}
      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
});
