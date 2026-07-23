'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import IntentStep from '@/components/onboarding/IntentStep';
import ImportStep from '@/components/onboarding/ImportStep';
import DnaStep from '@/components/onboarding/DnaStep';

const STEPS = { INTENT: 0, IMPORT: 1, DNA: 2 };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(STEPS.INTENT);
  const [intent, setIntent] = useState('romantic');
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('mm_token') : null;

  const apiCall = useCallback(async (method, path, body = null) => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';
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
      setSelectedTracks(tracks);
      setMusicProfile(data.profile);
      setStep(STEPS.DNA);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-violet-500' : 'w-2 bg-gray-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === STEPS.INTENT && (
          <IntentStep
            initialIntent={intent}
            onSave={handleIntentSave}
            loading={loading}
          />
        )}

        {step === STEPS.IMPORT && (
          <ImportStep
            token={token}
            onSubmit={handleTracksSubmit}
            onBack={() => setStep(STEPS.INTENT)}
            loading={loading}
          />
        )}

        {step === STEPS.DNA && (
          <DnaStep
            profile={musicProfile}
            onComplete={handleComplete}
            onBack={() => setStep(STEPS.IMPORT)}
          />
        )}
      </div>
    </div>
  );
}
