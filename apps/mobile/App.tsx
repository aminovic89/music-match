import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apiClient } from '@music-match/shared';
import { colors } from './src/theme';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import MatchesScreen from './src/screens/MatchesScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import useChat from './src/chat/useChat';
import TabBar from './src/components/TabBar';
import { AboveTabBarContext } from './src/components/Screen';
import ProfileScreen from './src/screens/ProfileScreen';
import MusicEditScreen from './src/screens/MusicEditScreen';
import OnboardingNavigator from './src/screens/onboarding/OnboardingNavigator';

const TOKEN_KEY = 'mm_token';
// Capté au retour du flow OAuth Spotify (voir apps/api/src/routes/auth.js,
// redirection mobile) pour ramener directement l'utilisateur à l'étape Import.
const ONBOARDING_IMPORT_URL_RE = /^musicmatch:\/\/onboarding-import\?token=(.+)$/;

type Screen = 'loading' | 'login' | 'register' | 'onboarding' | 'home' | 'discover' | 'matches' | 'messages' | 'conversation' | 'profile' | 'music';
type Tab = 'home' | 'discover' | 'matches' | 'messages';
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
  } catch {
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

  const handleLogout = useCallback(() => {
    apiClient.setToken(null);
    setToken(null);
    setScreen('login');
    persistToken(null);
  }, []);

  // Chat : socket + données, liés à la session (fermés quand token = null).
  const chat = useChat(token, { onUnauthorized: handleLogout });

  // "Écrire" depuis les matchs / la célébration : reçoit le match
  // ({ user_id }) ; on accepte aussi directement un id d'utilisateur.
  const handleWrite = useCallback(
    async (target: string | { user_id: string }) => {
      const userId = typeof target === 'string' ? target : target.user_id;
      const found = await chat.openWithUser(userId);
      setScreen(found ? 'conversation' : 'messages');
    },
    [chat.openWithUser] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleCloseConversation = () => {
    chat.close();
    setScreen('messages');
  };

  const handleNavigateTab = (tab: Tab) => {
    if (tab === 'messages') chat.reloadConversations();
    setScreen(tab);
  };

  const activeConversation = chat.conversations.find((c: { id: string }) => c.id === chat.openId);

  if (screen === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accentText} size="large" />
      </View>
    );
  }

  // SafeAreaProvider : requis par useSafeAreaInsets (écrans auth, cf.
  // src/components/AuthScreen.jsx).
  return (
    <SafeAreaProvider>
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
      {(screen === 'home' || screen === 'discover' || screen === 'matches' || screen === 'messages') && (
        <View style={styles.flex}>
          {/* Les écrans à onglets ne rajoutent pas l'inset bas : la TabBar
              en dessous s'en charge (sinon double espace au-dessus). */}
          <AboveTabBarContext.Provider value={true}>
            <View style={styles.flex}>
              {screen === 'home' && (
                <HomeScreen
                  onLogout={handleLogout}
                  onNavigateProfile={() => setScreen('profile')}
                  onNavigateMusic={() => setScreen('music')}
                  onNavigateDiscover={() => setScreen('discover')}
                  onNavigateMatches={() => setScreen('matches')}
                />
              )}
              {screen === 'discover' && (
                <DiscoverScreen
                  onNavigateMatches={() => setScreen('matches')}
                  onNavigateMusic={() => setScreen('music')}
                  onUnauthorized={handleLogout}
                  onWrite={handleWrite}
                />
              )}
              {screen === 'matches' && (
                <MatchesScreen
                  onNavigateDiscover={() => setScreen('discover')}
                  onUnauthorized={handleLogout}
                  onWrite={handleWrite}
                />
              )}
              {screen === 'messages' && (
                <MessagesScreen
                  conversations={chat.conversations}
                  loading={chat.conversationsLoading}
                  error={chat.conversationsError}
                  onRetry={chat.reloadConversations}
                  onOpenConversation={(id: string) => {
                    chat.open(id);
                    setScreen('conversation');
                  }}
                  onNavigateDiscover={() => setScreen('discover')}
                  onNavigateMatches={() => setScreen('matches')}
                />
              )}
            </View>
          </AboveTabBarContext.Provider>
          <TabBar
            current={screen as Tab}
            onNavigate={handleNavigateTab}
            badges={{ messages: chat.unreadTotal }}
          />
        </View>
      )}
      {screen === 'conversation' && activeConversation && (
        <ConversationScreen
          peer={activeConversation.user}
          currentUserId={chat.currentUserId ?? ''}
          messages={chat.messages}
          loading={chat.messagesLoading}
          error={chat.messagesError}
          onReload={chat.reloadMessages}
          peerTyping={chat.peerTyping}
          connection={chat.connection}
          onSend={chat.send}
          onRetry={chat.retry}
          onTyping={chat.typing}
          onStopTyping={chat.stopTyping}
          onBack={handleCloseConversation}
        />
      )}
      {screen === 'profile' && <ProfileScreen onBack={() => setScreen('home')} />}
      {screen === 'music' && <MusicEditScreen token={token} onBack={() => setScreen('home')} />}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});
