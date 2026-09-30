'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ImportStep from '@/components/onboarding/ImportStep';
import DnaStep from '@/components/onboarding/DnaStep';
import FormAlert from '@/components/Alert';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import { LoadingState } from '@/components/States';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
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

  // En-tête commun : on modifie sa musique (pas un nouvel onboarding).
  const header = <PageHeader title="Modifier ma musique" backHref="/home" className="mb-8" />;

  if (!ready) {
    return (
      <PageContainer width="sm">
        {header}
        <LoadingState label="Chargement de ta musique…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="sm">
      {header}
      <FormAlert id="music-error" message={error} className="mb-6" />

      {step === STEPS.IMPORT && (
        <ImportStep
          titleAs="h2"
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
          titleAs="h2"
          profile={musicProfile}
          onComplete={() => router.push('/home')}
          onBack={() => setStep(STEPS.IMPORT)}
        />
      )}
    </PageContainer>
  );
}
