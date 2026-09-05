import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import ImportScreen from './onboarding/ImportScreen';
import DnaScreen from './onboarding/DnaScreen';

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

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === STEPS.IMPORT && (
        <ImportScreen
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
          profile={musicProfile}
          onComplete={onBack}
          onBack={() => setStep(STEPS.IMPORT)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', paddingHorizontal: 24, paddingTop: 60 },
  loading: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
});
