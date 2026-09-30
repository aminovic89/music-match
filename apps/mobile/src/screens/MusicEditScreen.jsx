import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import ImportScreen from './onboarding/ImportScreen';
import DnaScreen from './onboarding/DnaScreen';
import Screen, { ScreenHeader } from '../components/Screen';
import { colors, spacing, typography } from '../theme';

const STEPS = { IMPORT: 0, DNA: 1 };

export default function MusicEditScreen({ token, onBack }) {
  const [step, setStep] = useState(STEPS.IMPORT);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiClient.getMusicProfile()
      .then((data) => {
        setSelectedTracks(
          (data.tracks || []).map((t) => ({
            track_id: t.track_id,
            track_name: t.track_name,
            artist_name: t.artist_name,
            source: t.source,
          }))
        );
      })
      .catch(() => {}) // pas encore de profil musical — on démarre à vide
      .finally(() => setReady(true));
  }, []);

  const handleTracksSubmit = async (tracks) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.saveTracks(tracks);
      setMusicProfile(data.profile);
      setStep(STEPS.DNA);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // En-tête commun aux deux étapes : l'utilisateur sait qu'il modifie sa
  // musique (et non qu'il refait l'onboarding) et peut revenir à l'accueil.
  const header = <ScreenHeader title="Modifier ma musique" onBack={onBack} />;

  if (!ready) {
    return (
      <Screen header={header} center scroll={false}>
        <View style={styles.loading} accessible accessibilityLabel="Chargement de ta musique">
          <ActivityIndicator color={colors.accentText} size="large" />
          <Text style={typography.subtitle}>Chargement de ta musique…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {step === STEPS.IMPORT && (
        <ImportScreen
          header={header}
          token={token}
          selected={selectedTracks}
          onSelectedChange={setSelectedTracks}
          onSubmit={handleTracksSubmit}
          onBack={onBack}
          loading={loading}
          error={error}
        />
      )}

      {step === STEPS.DNA && (
        <DnaScreen
          header={header}
          profile={musicProfile}
          onComplete={onBack}
          onBack={() => setStep(STEPS.IMPORT)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: 'center', gap: spacing.md },
});
