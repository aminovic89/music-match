'use client';

import { Suspense, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import IntentStep from '@/components/onboarding/IntentStep';
import ImportStep from '@/components/onboarding/ImportStep';
import DnaStep from '@/components/onboarding/DnaStep';
import BackgroundGlow from '@/components/BackgroundGlow';
import Logo from '@/components/Logo';
import StepProgress from '@/components/StepProgress';
import FormAlert from '@/components/Alert';

const STEPS = { INTENT: 0, IMPORT: 1, DNA: 2 };
// Libellés affichés à côté de "Étape n sur 3" (identiques au mobile).
const STEP_LABELS = ['Ton intention', 'Ta musique', 'Ton ADN musical'];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(
    searchParams.get('step') === 'import' ? STEPS.IMPORT : STEPS.INTENT
  );
  const [intent, setIntent] = useState('romantic');
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('mm_token') : null;

  const apiCall = useCallback(async (method, path, body = null) => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
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

  const handleComplete = () => {
    router.push('/home');
  };

  return (
    // overflow-x-clip (pas hidden) : les barres d'actions des étapes sont
    // en position: sticky.
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-x-clip bg-background">
      <BackgroundGlow />
      <header className="mx-auto w-full max-w-xl px-4 pt-6 sm:px-6 sm:pt-10">
        <div className="mb-6 flex justify-center sm:justify-start">
          <Logo />
        </div>
        <StepProgress current={step + 1} total={3} label={STEP_LABELS[step]} />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-8 sm:px-6">
        <FormAlert id="onboarding-error" message={error} className="mb-6" />

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
            selected={selectedTracks}
            onSelectedChange={setSelectedTracks}
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
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingContent />
    </Suspense>
  );
}
