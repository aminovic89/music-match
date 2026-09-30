import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from './Card';
import Logo from './Logo';
import { colors, spacing, typography } from '../theme';

// Coquille commune des écrans d'authentification (miroir de AuthShell web) :
// marque, carte centrée, pied de page.
// - Safe area : insets ajoutés au padding du ScrollView (encoche, Dynamic
//   Island, barre de gestes, Android edge-to-edge).
// - Clavier : KeyboardAvoidingView (padding sur iOS ; rien sur Android, cf.
//   guide Expo "Keyboard handling") + ScrollView, pour que le champ actif
//   et le bouton restent atteignables sur un iPhone SE clavier ouvert.
// - Petits écrans (< 360pt) : carte plus compacte.
export default function AuthScreen({ title, subtitle, children, footer }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 360;

  return (
    <View style={styles.root}>
      <Glow />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
              paddingLeft: insets.left + spacing.gutter,
              paddingRight: insets.right + spacing.gutter,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Logo style={styles.logo} />

          <View style={styles.main}>
            <Card compact={compact}>
              <View style={styles.header}>
                <Text style={[typography.title, styles.center]} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={[typography.subtitle, styles.center, styles.subtitle]}>{subtitle}</Text>
                ) : null}
              </View>
              {children}
            </Card>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Halos décoratifs (équivalent BackgroundGlow web). Pas de blur CSS en RN :
// un disque dont le boxShadow très diffus fait le halo. Clippés par
// overflow: 'hidden' sur la racine.
function Glow() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.noTouch]}
    >
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  flex: { flex: 1 },
  noTouch: { pointerEvents: 'none' },
  scroll: { flexGrow: 1 },
  logo: { alignSelf: 'center' },
  main: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 448, // max-w-md web (tablettes)
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  header: { marginBottom: spacing.xl },
  center: { textAlign: 'center' },
  subtitle: { marginTop: spacing.sm },
  footer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120 },
  glowTop: {
    top: -200,
    alignSelf: 'center',
    backgroundColor: colors.glowAccent,
    boxShadow: `0px 0px 160px 120px ${colors.glowAccent}`,
  },
  glowBottom: {
    bottom: -220,
    right: -160,
    backgroundColor: colors.glowAccent2,
    boxShadow: `0px 0px 140px 100px ${colors.glowAccent2}`,
  },
});
