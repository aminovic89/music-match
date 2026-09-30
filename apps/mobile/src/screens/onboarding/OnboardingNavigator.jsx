import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import StepProgress from '../../components/StepProgress';
import { colors } from '../../theme';
import IntentScreen from './IntentScreen';
import ImportScreen from './ImportScreen';
import DnaScreen from './DnaScreen';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const STEPS = { INTENT: 0, IMPORT: 1, DNA: 2 };
// Libellés affichés à côté de "Étape n sur 3".
const STEP_LABELS = ['Ton intention', 'Ta musique', 'Ton ADN musical'];

export default function OnboardingNavigator({ token, initialStep, onComplete }) {
  const [step, setStep] = useState(initialStep === 'import' ? STEPS.IMPORT : STEPS.INTENT);
  const [intent, setIntent] = useState('romantic');
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);

  const apiCall = useCallback(async (method, path, body = null) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, [token]);

  const handleIntentSave = async (selectedIntent) => {
    setLoading(true);
    setError(null);
    try {
      await apiCall('PATCH', '/api/users/me', { intent: selectedIntent });
      setIntent(selectedIntent);
      setStep(STEPS.IMPORT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTracksSubmit = async (tracks) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('POST', '/api/music/tracks', tracks);
      setMusicProfile(data.profile);
      setStep(STEPS.DNA);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chaque étape est un écran complet (Screen) ; la progression est
  // passée comme en-tête pour rester fixe en haut pendant le scroll.
  const progress = (
    <StepProgress current={step + 1} total={3} label={STEP_LABELS[step]} />
  );

  return (
    <View style={styles.container}>
      {step === STEPS.INTENT && (
        <IntentScreen
          header={progress}
          initialIntent={intent}
          onSave={handleIntentSave}
          loading={loading}
          error={error}
        />
      )}

      {step === STEPS.IMPORT && (
        <ImportScreen
          header={progress}
          token={token}
          selected={selectedTracks}
          onSelectedChange={setSelectedTracks}
          onSubmit={handleTracksSubmit}
          onBack={() => { setStep(STEPS.INTENT); setError(null); }}
          loading={loading}
          error={error}
        />
      )}

      {step === STEPS.DNA && (
        <DnaScreen
          header={progress}
          profile={musicProfile}
          onComplete={onComplete}
          onBack={() => setStep(STEPS.IMPORT)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
