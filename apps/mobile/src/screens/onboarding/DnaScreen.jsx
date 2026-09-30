import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen, { ScreenIntro } from '../../components/Screen';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chip from '../../components/Chip';
import Section from '../../components/Section';
import { LogoMark } from '../../components/Logo';
import {
  colors, accentGradient, radius, spacing, typography, fontSize, fontWeight,
} from '../../theme';

const MOODS_LABELS = {
  energetic: { label: 'Énergique', emoji: '⚡' },
  chill: { label: 'Chill', emoji: '😌' },
  happy: { label: 'Joyeux', emoji: '😊' },
  melancholic: { label: 'Mélancolique', emoji: '🌙' },
  danceable: { label: 'Dansant', emoji: '💃' },
  intense: { label: 'Intense', emoji: '🔥' },
  romantic: { label: 'Romantique', emoji: '🌹' },
  neutral: { label: 'Neutre', emoji: '🎵' },
};

// Mêmes seuils que deriveMoods (apps/api/src/services/spotify.js), pour que
// la légende reste cohérente avec les moods affichés juste en dessous.
function energyLabel(pct) {
  if (pct < 40) return 'plutôt calme';
  if (pct > 70) return 'plutôt intense';
  return 'équilibrée';
}

function valenceLabel(pct) {
  if (pct < 35) return 'plutôt mélancolique';
  if (pct > 60) return 'plutôt joyeuse';
  return 'équilibrée';
}

function tempoLabel(bpm) {
  if (bpm < 90) return 'tempo lent';
  if (bpm > 120) return 'tempo rapide';
  return 'tempo modéré';
}

// Barre de métrique : libellé + valeur sur une ligne (retour à la ligne
// possible avec une grande police), barre pleine largeur dessous, légende
// en texte. Plus de largeurs fixes qui tronquaient les valeurs.
function MetricBar({ label, value, caption }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <View
      style={styles.metric}
      accessible
      accessibilityLabel={`${label} : ${pct} sur 100${caption ? `, ${caption}` : ''}`}
    >
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{pct}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, accentGradient, { width: `${pct}%` }]} />
      </View>
      {caption && <Text style={styles.metricCaption}>{caption}</Text>}
    </View>
  );
}

export default function DnaScreen({ header, profile, onComplete, onBack }) {
  if (!profile) {
    return (
      <Screen header={header} center>
        <View style={styles.emptyBox}>
          <LogoMark size={56} />
          <Text style={[typography.title, styles.emptyTitle]} accessibilityRole="header">
            Profil musical non disponible
          </Text>
          <Button title="Retour" variant="secondary" onPress={onBack} style={styles.emptyBtn} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <View style={styles.footer}>
          <Button title="Voir mes matchs" onPress={onComplete} />
          <Button title="Modifier mes titres" variant="ghost" onPress={onBack} />
        </View>
      }
    >
      <ScreenIntro
        title="Ton ADN musical"
        subtitle="Voilà ce qu'on a trouvé à partir de tes titres"
      />

      <View style={styles.cards}>
        {/* Métriques audio — seulement si on a de vraies audio features
            (titres importés via Spotify) ; les titres Deezer/manuels n'en ont pas. */}
        {profile.avg_energy != null && (
          <Card compact>
            <Section title="Audio">
              <MetricBar
                label="Énergie"
                value={profile.avg_energy}
                caption={energyLabel(Math.round(profile.avg_energy * 100))}
              />
              <MetricBar
                label="Positivité"
                value={profile.avg_valence}
                caption={valenceLabel(Math.round(profile.avg_valence * 100))}
              />
              <View
                style={styles.metric}
                accessible
                accessibilityLabel={`BPM moyen : ${Math.round(profile.avg_tempo)}, ${tempoLabel(Math.round(profile.avg_tempo))}`}
              >
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>BPM moy.</Text>
                  <Text style={styles.metricValueStrong}>{Math.round(profile.avg_tempo)}</Text>
                </View>
                <Text style={styles.metricCaption}>{tempoLabel(Math.round(profile.avg_tempo))}</Text>
              </View>
            </Section>
          </Card>
        )}

        {/* Artistes */}
        {profile.top_artists?.length > 0 && (
          <Card compact>
            <Section title="Artistes dominants">
              <View style={styles.tags}>
                {profile.top_artists.map((artist) => (
                  <Chip key={artist} label={artist} tone="accent" />
                ))}
              </View>
            </Section>
          </Card>
        )}

        {/* Moods */}
        {profile.top_moods?.length > 0 && (
          <Card compact>
            <Section title="Tes moods">
              <View style={styles.tags}>
                {profile.top_moods.map((mood) => {
                  const info = MOODS_LABELS[mood] || { label: mood, emoji: '🎵' };
                  return <Chip key={mood} label={`${info.emoji} ${info.label}`} tone="accent2" />;
                })}
              </View>
            </Section>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.md },
  metric: { gap: 6 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm },
  metricLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  metricValue: { color: colors.textMuted, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  metricValueStrong: { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
  barBg: { height: 8, backgroundColor: colors.surface2, borderRadius: radius.pill, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: radius.pill },
  metricCaption: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { gap: spacing.xs },
  emptyBox: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg },
  emptyTitle: { textAlign: 'center', fontSize: fontSize.xl },
  emptyBtn: { alignSelf: 'stretch' },
});
