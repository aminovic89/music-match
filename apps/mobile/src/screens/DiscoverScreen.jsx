import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import Screen, { ScreenIntro } from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import Compatibility from '../components/Compatibility';
import TasteChips, { sharedAnnouncement } from '../components/TasteChips';
import { LoadingState, EmptyState } from '../components/States';
import { LogoMark } from '../components/Logo';
import FormAlert, { useAnnounce } from '../components/Alert';
import { colors, accentGradient, radius, spacing, typography, fontSize, fontWeight, lineHeight, shadow } from '../theme';

// Miroir de apps/web/app/(app)/discover/page.jsx. Le backend n'a pas de
// notion de "pass" : Passer avance simplement dans la liste locale (le
// profil peut réapparaître à un prochain rafraîchissement).
export default function DiscoverScreen({ onNavigateMatches, onNavigateMusic, onUnauthorized }) {
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [index, setIndex] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const likingRef = useRef(false);
  const mounted = useRef(true);
  // Ref : un callback parent recréé à chaque rendu ne doit pas relancer le chargement.
  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    unauthorizedRef.current = onUnauthorized;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleError = useCallback((err) => {
    if (err.status === 401 && unauthorizedRef.current) {
      unauthorizedRef.current();
      return true;
    }
    return false;
  }, []);

  // Chargement dans l'effet (callbacks asynchrones uniquement) ; `refresh`
  // remet l'état à zéro puis change `reloadKey` pour relancer l'effet.
  useEffect(() => {
    apiClient
      .getDiscover()
      .then((data) => {
        if (!mounted.current) return;
        setNoProfile(false);
        setCandidates(data.candidates || []);
        setIndex(0);
      })
      .catch((err) => {
        if (!mounted.current || handleError(err)) return;
        if (err.status === 404) setNoProfile(true);
        else setError(err.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, [reloadKey, handleError]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  const candidate = candidates[index];

  const pass = () => setIndex((i) => i + 1);

  const like = async () => {
    if (!candidate || likingRef.current) return;
    likingRef.current = true;
    setLiking(true);
    setError(null);
    try {
      const data = await apiClient.likeUser(candidate.id);
      if (!mounted.current) return;
      if (data.matched) setCelebration({ first_name: candidate.first_name });
      else setIndex((i) => i + 1);
    } catch (err) {
      if (mounted.current && !handleError(err)) setError(err.message);
    } finally {
      likingRef.current = false;
      if (mounted.current) setLiking(false);
    }
  };

  const dismissCelebration = () => {
    setCelebration(null);
    setIndex((i) => i + 1);
  };

  const summary = candidate
    ? [
        `${candidate.first_name}, ${candidate.age} ans, ${Math.round((candidate.score || 0) * 100)}% compatible`,
        sharedAnnouncement(candidate),
      ]
        .filter(Boolean)
        .join(', ')
    : null;
  useAnnounce(celebration ? `C'est un match avec ${celebration.first_name} !` : summary);

  const intro = (
    <ScreenIntro title="Trouver des matchs" subtitle="Des profils classés par compatibilité musicale" />
  );

  if (loading) {
    return (
      <Screen header={null}>
        {intro}
        <LoadingState label="Chargement des profils..." />
      </Screen>
    );
  }

  if (noProfile) {
    return (
      <Screen header={null}>
        {intro}
        <EmptyState
          glyph="♪"
          title="Complète ton profil musical"
          text="Importe ta musique pour découvrir des profils compatibles."
        >
          <Button title="Importer ma musique" onPress={onNavigateMusic} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen header={null}>
      {intro}
      <FormAlert message={error} style={styles.alert} />

      {celebration ? (
        <View style={[styles.celebrationBorder, accentGradient, shadow.glow]}>
          <View style={styles.celebration} accessibilityLiveRegion="polite">
            <LogoMark size={64} />
            <Text accessibilityRole="header" style={styles.celebrationTitle}>
              {`C'est un match avec ${celebration.first_name} !`}
            </Text>
            <View style={styles.celebrationActions}>
              <Button title="Continuer à découvrir" onPress={dismissCelebration} />
              <Button title="Voir mes matchs" variant="secondary" onPress={onNavigateMatches} />
            </View>
          </View>
        </View>
      ) : candidate ? (
        <View style={styles.stack}>
          {candidates.length - index > 1 && <View style={styles.ghost} pointerEvents="none" />}
          <Card compact>
            <Text style={styles.counter} accessibilityLiveRegion="polite" accessibilityLabel={summary}>
              {`Profil ${index + 1} sur ${candidates.length}`}
            </Text>
            <View style={styles.identity}>
              <Avatar avatarUrl={candidate.avatar_url} firstName={candidate.first_name} size={72} />
              <View style={styles.identityText}>
                <Text accessibilityRole="header" style={styles.name}>
                  {`${candidate.first_name}, ${candidate.age}`}
                </Text>
                {candidate.city ? <Text style={typography.subtitle}>{candidate.city}</Text> : null}
              </View>
            </View>

            <Compatibility score={candidate.score} style={styles.block} />
            <TasteChips candidate={candidate} style={styles.block} />

            <View style={styles.actions}>
              <Button title="Passer" variant="secondary" onPress={pass} disabled={liking} style={styles.action} />
              <Button title="Liker" onPress={like} loading={liking} style={styles.action} />
            </View>
          </Card>
        </View>
      ) : (
        !error && (
          <EmptyState
            glyph="◎"
            title="Plus de profils pour l'instant"
            text="Reviens plus tard, de nouveaux profils arrivent régulièrement."
          >
            <Button title="Rafraîchir" onPress={refresh} />
          </EmptyState>
        )
      )}
      {!candidate && !celebration && error ? (
        <Button title="Réessayer" variant="secondary" onPress={refresh} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  stack: { paddingTop: spacing.md },
  ghost: {
    position: 'absolute',
    top: 0,
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  counter: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: spacing.xs },
  name: {
    color: colors.text,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.3,
  },
  block: { marginTop: spacing.xl },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  action: { flex: 1, paddingHorizontal: spacing.md },
  celebrationBorder: { borderRadius: radius.card, padding: 2 },
  celebration: {
    alignItems: 'center',
    gap: spacing.xl,
    borderRadius: radius.card - 2,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  celebrationTitle: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  celebrationActions: { alignSelf: 'stretch', gap: spacing.md },
});
