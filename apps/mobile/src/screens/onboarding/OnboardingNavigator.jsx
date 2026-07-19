import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import IntentScreen from './IntentScreen';
import ImportScreen from './ImportScreen';
import DnaScreen from './DnaScreen';

const API = process.env.EXPO_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';
const STEPS = { INTENT: 0, IMPORT: 1, DNA: 2 };

export default function OnboardingNavigator({ token, onComplete }) {
  const [step, setStep] = useState(STEPS.INTENT);
  const [intent, setIntent] = useState('romantic');
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      {step === STEPS.INTENT && (
        <IntentScreen
          initialIntent={intent}
          onSave={handleIntentSave}
          loading={loading}
          error={error}
        />
      )}

      {step === STEPS.IMPORT && (
        <ImportScreen
          token={token}
          onSubmit={handleTracksSubmit}
          onBack={() => { setStep(STEPS.INTENT); setError(null); }}
          loading={loading}
          error={error}
        />
      )}

      {step === STEPS.DNA && (
        <DnaScreen
          profile={musicProfile}
          onComplete={onComplete}
          onBack={() => setStep(STEPS.IMPORT)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', paddingHorizontal: 24, paddingTop: 60 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3f3f46' },
  dotActive: { width: 24, backgroundColor: '#7c3aed' },
});
