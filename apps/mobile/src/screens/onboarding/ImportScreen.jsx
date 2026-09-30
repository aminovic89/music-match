import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import Screen, { ScreenIntro } from '../../components/Screen';
import Button from '../../components/Button';
import IconButton from '../../components/IconButton';
import TextField from '../../components/TextField';
import Section from '../../components/Section';
import FormAlert, { useAnnounce } from '../../components/Alert';
import {
  colors, radius, spacing, touch, typography, fontSize, fontWeight,
} from '../../theme';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const MIN_TRACKS = 10;

function generateManualId() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

function isDuplicate(list, track) {
  return list.some((t) =>
    t.track_id === track.track_id ||
    (normalize(t.track_name) === normalize(track.track_name) &&
      normalize(t.artist_name) === normalize(track.artist_name))
  );
}

export default function ImportScreen({ header, token, selected, onSelectedChange, onSubmit, onBack, loading, error }) {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [importingSpotify, setImportingSpotify] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualSuggestions, setManualSuggestions] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [belowMinAttempted, setBelowMinAttempted] = useState(false);
  const hasImportedSpotify = useRef(false);

  const importSpotifyTopTracks = useCallback(async () => {
    setImportingSpotify(true);
    try {
      const res = await fetch(`${API}/api/music/spotify/top-tracks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        onSelectedChange((prev) => {
          const merged = [...prev];
          for (const track of data.tracks || []) {
            if (!isDuplicate(merged, track)) merged.push(track);
          }
          return merged;
        });
      }
    } catch (_e) {}
    finally { setImportingSpotify(false); }
  }, [token, onSelectedChange]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/music/spotify/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSpotifyConnected(data.connected);
        if (data.connected && !hasImportedSpotify.current) {
          hasImportedSpotify.current = true;
          importSpotifyTopTracks();
        }
      })
      .catch(() => {});
  }, [token, importSpotifyTopTracks]);

  // Suggestions Deezer (recherche publique, pas besoin de compte connecté)
  // pour aider à la saisie manuelle. Recherche combinée titre + artiste,
  // pour que taper uniquement un artiste renvoie aussi des résultats.
  const searchManualSuggestions = useCallback(async (q) => {
    if (q.trim().length < 2) { setManualSuggestions([]); return; }
    setManualSearching(true);
    try {
      const res = await fetch(
        `${API}/api/music/search?q=${encodeURIComponent(q.trim())}&source=deezer`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setManualSuggestions(data.tracks || []);
    } catch (_e) {}
    finally { setManualSearching(false); }
  }, [token]);

  useEffect(() => {
    const q = [manualName, manualArtist].filter((s) => s.trim()).join(' ').trim();
    const t = setTimeout(() => searchManualSuggestions(q), 400);
    return () => clearTimeout(t);
  }, [manualName, manualArtist, searchManualSuggestions]);

  const addSuggestion = (track) => {
    onSelectedChange((prev) => (isDuplicate(prev, track) ? prev : [...prev, { ...track, source: 'deezer' }]));
    setManualName('');
    setManualArtist('');
    setManualSuggestions([]);
  };

  const addManualTrack = () => {
    if (!manualName.trim()) return;
    const track = {
      track_id: generateManualId(),
      track_name: manualName.trim(),
      artist_name: manualArtist.trim(),
      source: 'manual',
    };
    onSelectedChange((prev) => (isDuplicate(prev, track) ? prev : [...prev, track]));
    setManualName('');
    setManualArtist('');
    setManualSuggestions([]);
  };

  const removeTrack = (trackId) => {
    onSelectedChange((prev) => prev.filter((t) => t.track_id !== trackId));
  };

  const handleSubmitPress = () => {
    if (selected.length < MIN_TRACKS) {
      setBelowMinAttempted(true);
      return;
    }
    onSubmit(selected);
  };

  const missing = MIN_TRACKS - selected.length;
  const hint = selected.length < MIN_TRACKS
    ? (belowMinAttempted
      ? `Il te manque ${missing} titre${missing > 1 ? 's' : ''} pour enregistrer (minimum ${MIN_TRACKS})`
      : `Encore ${missing} titre${missing > 1 ? 's' : ''} pour continuer`)
    : null;
  // Le message "Il te manque…" apparaît après un appui sur Analyser : on
  // l'annonce (il est affiché dans la barre du bas, loin du focus).
  useAnnounce(belowMinAttempted && hint ? hint : null);

  const spotifyStatus = importingSpotify
    ? 'Importation de tes titres...'
    : spotifyConnected
      ? '✓ Connecté'
      : 'Importe automatiquement tes titres les plus écoutés';

  return (
    <Screen
      header={header}
      footer={
        <View style={styles.footer}>
          {hint ? (
            <Text
              style={[styles.hint, belowMinAttempted && styles.hintError]}
              accessibilityLiveRegion="polite"
            >
              {belowMinAttempted ? '! ' : ''}{hint}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button title="Retour" variant="secondary" onPress={onBack} style={styles.backBtn} />
            <Button
              title={`Analyser (${selected.length})`}
              onPress={handleSubmitPress}
              loading={loading}
              accessibilityHint={selected.length < MIN_TRACKS ? `Minimum ${MIN_TRACKS} titres` : undefined}
              style={styles.submitBtn}
            />
          </View>
        </View>
      }
    >
      <ScreenIntro
        title="Ta musique"
        subtitle={`Choisis au moins ${MIN_TRACKS} titres que tu aimes`}
      />

      <FormAlert message={error} style={styles.alert} />

      <View style={styles.sections}>
        {/* Connexion Spotify */}
        <Pressable
          onPress={() => Linking.openURL(`${API}/api/auth/spotify?platform=mobile`)}
          accessibilityRole="button"
          accessibilityLabel={`Connecter Spotify. ${spotifyStatus}`}
          accessibilityState={{ busy: importingSpotify }}
          style={({ pressed }) => [
            styles.spotifyCard,
            spotifyConnected && styles.spotifyConnected,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.spotifyIcon, spotifyConnected && styles.spotifyIconConnected]}>
            {importingSpotify
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Text style={styles.spotifyGlyph}>{spotifyConnected ? '✓' : '♪'}</Text>}
          </View>
          <View style={styles.spotifyInfo}>
            <Text style={styles.spotifyTitle}>Connecter Spotify</Text>
            <Text style={[styles.spotifyDesc, spotifyConnected && styles.spotifyDescConnected]}>
              {spotifyStatus}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* Saisie manuelle + suggestions Deezer en direct */}
        <Section title="Ou ajoute un titre manuellement">
          <TextField
            label="Titre"
            value={manualName}
            onChangeText={setManualName}
            placeholder="Ex. Tout oublier"
            returnKeyType="next"
            autoCorrect={false}
          />
          <TextField
            label="Artiste"
            value={manualArtist}
            onChangeText={setManualArtist}
            placeholder="Ex. Angèle"
            returnKeyType="done"
            autoCorrect={false}
          />

          {manualSearching && (
            <View style={styles.searching} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={typography.caption}>Recherche...</Text>
            </View>
          )}
          {!manualSearching && manualSuggestions.length > 0 && (
            <View style={styles.list} accessibilityLabel="Suggestions">
              {manualSuggestions.map((track) => (
                <Pressable
                  key={track.track_id}
                  onPress={() => addSuggestion(track)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ajouter ${track.track_name}, ${track.artist_name}`}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <TrackGlyph glyph="♪" />
                  <TrackInfo name={track.track_name} artist={track.artist_name} />
                  <Text style={styles.addGlyph}>+</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Button
            title="Ajouter ce titre"
            variant="secondary"
            onPress={addManualTrack}
            disabled={!manualName.trim()}
          />
        </Section>

        {/* Titres sélectionnés */}
        <Section
          title="Titres sélectionnés"
          right={
            <View
              style={[styles.counter, selected.length >= MIN_TRACKS && styles.counterOk]}
              accessible
              accessibilityLabel={`${selected.length} titre${selected.length > 1 ? 's' : ''} sélectionné${selected.length > 1 ? 's' : ''}, minimum ${MIN_TRACKS}`}
            >
              <Text style={[styles.counterText, selected.length >= MIN_TRACKS && styles.counterTextOk]}>
                {selected.length >= MIN_TRACKS ? '✓ ' : ''}{selected.length} / {MIN_TRACKS}
              </Text>
            </View>
          }
        >
          {selected.length === 0 ? (
            <View style={styles.empty}>
              <Text style={typography.subtitle}>Aucun titre pour l&apos;instant</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {selected.map((item) => (
                <View key={item.track_id} style={[styles.row, styles.rowSelected]}>
                  <TrackGlyph glyph={item.source === 'manual' ? '✎' : '♪'} />
                  <TrackInfo name={item.track_name} artist={item.artist_name} />
                  <IconButton
                    glyph="✕"
                    accessibilityLabel={`Retirer ${item.track_name}`}
                    onPress={() => removeTrack(item.track_id)}
                  />
                </View>
              ))}
            </View>
          )}
        </Section>
      </View>
    </Screen>
  );
}

function TrackGlyph({ glyph }) {
  return (
    <View style={styles.trackGlyph} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Text style={styles.trackGlyphText}>{glyph}</Text>
    </View>
  );
}

function TrackInfo({ name, artist }) {
  return (
    <View style={styles.trackInfo}>
      <Text style={styles.trackName} numberOfLines={1}>{name}</Text>
      {artist ? <Text style={styles.trackArtist} numberOfLines={1}>{artist}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  sections: { gap: spacing.xxl },
  pressed: { opacity: 0.8 },
  spotifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.control,
    padding: spacing.lg,
    borderRadius: radius.field + 2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  spotifyConnected: { borderColor: colors.successLine, backgroundColor: colors.successBg },
  spotifyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotifyIconConnected: { backgroundColor: 'rgba(110, 231, 183, 0.18)' },
  spotifyGlyph: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  spotifyInfo: { flex: 1, gap: 2 },
  spotifyTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  spotifyDesc: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  spotifyDescConnected: { color: colors.success, fontWeight: fontWeight.medium },
  chevron: { color: colors.textMuted, fontSize: 26 },
  searching: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.control + 8,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowSelected: { borderColor: colors.accentLine },
  trackGlyph: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackGlyphText: { color: colors.accentText, fontSize: fontSize.base },
  trackInfo: { flex: 1, minWidth: 0 },
  trackName: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium, lineHeight: 20 },
  trackArtist: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 16 },
  addGlyph: {
    color: colors.accentText,
    fontSize: fontSize.lg,
    minWidth: touch.min,
    textAlign: 'center',
  },
  counter: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  counterOk: { borderColor: colors.successLine, backgroundColor: colors.successBg },
  counterText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  counterTextOk: { color: colors.success },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: radius.field,
    padding: spacing.lg,
    alignItems: 'center',
  },
  footer: { gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 16, textAlign: 'center' },
  hintError: { color: colors.danger, fontWeight: fontWeight.semibold },
  actions: { flexDirection: 'row', gap: spacing.md },
  backBtn: { flex: 1, paddingHorizontal: spacing.md },
  submitBtn: { flex: 2, paddingHorizontal: spacing.md },
});
