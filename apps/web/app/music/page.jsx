'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImportStep from '@/components/onboarding/ImportStep';
import DnaStep from '@/components/onboarding/DnaStep';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-prod.azurewebsites.net';
const STEPS = { IMPORT: 0, DNA: 1 };

export default function MusicPage() {
  const router = useRouter();
  const [step, setStep] = useState(STEPS.IMPORT);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('mm_token') : null;

  const apiCall = useCallback(async (method, path, body = null) => {
    const t = localStorage.getItem('mm_token');
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }, []);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    apiCall('GET', '/api/music/profile')
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
  }, [token, router, apiCall]);

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

  if (!ready) {
    return <div className="min-h-screen bg-gray-950" />;
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === STEPS.IMPORT && (
          <ImportStep
            token={token}
            selected={selectedTracks}
            onSelectedChange={setSelectedTracks}
            onSubmit={handleTracksSubmit}
            onBack={() => router.push('/home')}
            loading={loading}
          />
        )}

        {step === STEPS.DNA && (
          <DnaStep
            profile={musicProfile}
            onComplete={() => router.push('/home')}
            onBack={() => setStep(STEPS.IMPORT)}
          />
        )}
      </div>
    </div>
  );
}
