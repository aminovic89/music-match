import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import Screen, { ScreenIntro } from '../components/Screen';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import { LoadingState, EmptyState } from '../components/States';
import FormAlert from '../components/Alert';
import { colors, radius, spacing, typography, fontSize, fontWeight, lineHeight, shadow } from '../theme';

// Dates de match / d'expiration (déjà renvoyées par l'API).
export function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// Miroir de apps/web/app/(app)/matches/page.jsx.
export default function MatchesScreen({ onNavigateDiscover, onUnauthorized }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);

  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    unauthorizedRef.current = onUnauthorized;
  });

  useEffect(() => {
    let active = true;
    apiClient
      .getMatches()
      .then((data) => {
        if (active) setMatches(data.matches || []);
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 401 && unauthorizedRef.current) unauthorizedRef.current();
        else setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = matches.length;

  return (
    <Screen header={null}>
      <ScreenIntro title="Mes matchs" subtitle="Les personnes avec qui le like est réciproque" />
      <FormAlert message={error} style={styles.alert} />

      {loading ? (
        <LoadingState label="Chargement..." />
      ) : count === 0 ? (
        !error && (
          <EmptyState
            glyph="♥"
            title="Pas encore de match"
            text="Like des profils : quand c'est réciproque, ils apparaissent ici."
          >
            <Button title="Trouver des matchs" onPress={onNavigateDiscover} />
          </EmptyState>
        )
      ) : (
        <View style={styles.list}>
          <Text
            style={styles.count}
            accessibilityLabel={`${count} match${count > 1 ? 's' : ''}`}
          >
            {count}
          </Text>
          {matches.map((match) => {
            const pct = Math.round((match.score || 0) * 100);
            const matchedOn = formatDate(match.matched_at);
            const expiresOn = formatDate(match.expires_at);
            const dates = [matchedOn && `Match le ${matchedOn}`, expiresOn && `expire le ${expiresOn}`]
              .filter(Boolean)
              .join(' · ');
            const label = [
              `${match.first_name}, ${match.age} ans`,
              match.city,
              `${pct}% compatible`,
              dates,
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <View key={match.id} style={styles.item} accessible accessibilityLabel={label}>
                <Avatar avatarUrl={match.avatar_url} firstName={match.first_name} size={56} />
                <View style={styles.text}>
                  <Text style={styles.name} numberOfLines={2}>
                    {`${match.first_name}, ${match.age}`}
                  </Text>
                  {match.city ? <Text style={typography.subtitle}>{match.city}</Text> : null}
                  {dates ? <Text style={typography.caption}>{dates}</Text> : null}
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{`${pct}%`}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  list: { gap: spacing.md },
  count: {
    alignSelf: 'flex-start',
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card - 8,
    padding: spacing.lg,
    ...shadow.card,
  },
  text: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: fontSize.base, lineHeight: lineHeight.base, fontWeight: fontWeight.semibold },
  badge: {
    borderWidth: 1,
    borderColor: colors.accentLine,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
