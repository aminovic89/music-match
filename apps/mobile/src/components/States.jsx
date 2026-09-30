import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography, fontSize, fontWeight, lineHeight } from '../theme';

// États de page, miroir de apps/web/app/components/States.jsx.

export function LoadingState({ label = 'Chargement...' }) {
  return (
    <View
      style={styles.loading}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator color={colors.accentText} size="large" />
      <Text style={typography.subtitle}>{label}</Text>
    </View>
  );
}

// `glyph` : symbole décoratif (♪, ♥, ◎…) ; `children` : action(s).
export function EmptyState({ glyph, title, text, children }) {
  return (
    <View style={styles.empty}>
      {glyph ? (
        <View style={styles.glyphBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.glyph}>{glyph}</Text>
        </View>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {text ? <Text style={[typography.subtitle, styles.text]}>{text}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  glyphBox: {
    width: 56,
    height: 56,
    borderRadius: radius.field + 2,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { color: colors.accentText, fontSize: fontSize['2xl'] },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  text: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', marginTop: spacing.sm, gap: spacing.sm },
});
