import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, touch, fontSize, fontWeight, lineHeight, radius } from '../theme';

// Largeur max du contenu (tablettes) : les écrans restent lisibles au
// lieu de s'étirer sur 1000pt.
const MAX_CONTENT_WIDTH = 560;

// Clavier visible ? (iOS : événements "will" pour réagir avant l'animation.)
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

// En-tête d'écran : bouton retour (chevron, 44pt, libellé "Retour" pour
// les lecteurs d'écran) + titre. Le titre peut passer sur 2 lignes avec
// une grande taille de police plutôt que d'être tronqué.
export function ScreenHeader({ title, onBack, backLabel = 'Retour' }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
      ) : null}
      {title ? (
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={[styles.headerTitle, !onBack && styles.headerTitleAlone]}
        >
          {title}
        </Text>
      ) : null}
    </View>
  );
}

// Titre de page + sous-titre, en tête du contenu scrollable.
export function ScreenIntro({ title, subtitle, style }) {
  return (
    <View style={[styles.intro, style]}>
      <Text accessibilityRole="header" style={styles.introTitle}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.introSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// Coquille commune des écrans "app" (hors auth) :
// - safe area (encoche, barre de gestes, edge-to-edge Android) — remplace
//   les anciens paddingTop: 60 en dur ;
// - en-tête : `header` (nœud libre, ex. progression d'onboarding) ou
//   `title` + `onBack` ;
// - contenu scrollable (`scroll`, par défaut) ou fixe ;
// - `footer` : barre d'actions collée en bas. Masquée tant que le clavier
//   est ouvert (sur iPhone SE, clavier + barre ne laissent sinon que
//   ~150pt de contenu) ; elle réapparaît à la fermeture du clavier.
// - `center` : contenu centré verticalement (chargement, état vide).
export default function Screen({
  title,
  onBack,
  header,
  footer,
  scroll = true,
  center = false,
  hideFooterWithKeyboard = true,
  children,
  contentStyle,
}) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const showFooter = !!footer && !(hideFooterWithKeyboard && keyboardVisible);

  const headerNode =
    header !== undefined ? header : title || onBack ? <ScreenHeader title={title} onBack={onBack} /> : null;

  const sidePadding = {
    paddingLeft: insets.left + spacing.gutter,
    paddingRight: insets.right + spacing.gutter,
  };
  const bottomPadding = showFooter ? spacing.xl : insets.bottom + spacing.xl;

  const inner = <View style={[styles.inner, center && styles.center, contentStyle]}>{children}</View>;

  return (
    <View style={styles.root}>
      <View style={[{ paddingTop: insets.top + spacing.xs }, sidePadding]}>
        <View style={styles.constrained}>{headerNode}</View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, sidePadding, { paddingBottom: bottomPadding }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {inner}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scrollContent, sidePadding, { paddingBottom: bottomPadding }]}>{inner}</View>
        )}

        {showFooter ? (
          <View style={[styles.footer, sidePadding, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.constrained}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  constrained: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  scrollContent: { flexGrow: 1, paddingTop: spacing.md },
  inner: { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: touch.min + 8, gap: spacing.xs },
  back: {
    minWidth: touch.min,
    minHeight: touch.min,
    marginLeft: -spacing.sm, // aligne visuellement le chevron sur la gouttière
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  backPressed: { backgroundColor: colors.surface2 },
  backChevron: { color: colors.text, fontSize: 34, lineHeight: 38, marginTop: -4 },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semibold,
  },
  headerTitleAlone: { textAlign: 'center' },
  intro: { gap: spacing.sm, marginBottom: spacing.xl },
  introTitle: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.4,
  },
  introSubtitle: { color: colors.textMuted, fontSize: fontSize.base, lineHeight: lineHeight.base },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingTop: spacing.md,
  },
});
