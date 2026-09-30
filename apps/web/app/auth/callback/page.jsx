'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BackgroundGlow from '@/components/BackgroundGlow';
import { LoadingState } from '@/components/States';

function SpotifyCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('mm_token', token);
    }
    const next = params.get('next');
    router.replace(next === 'import' ? '/onboarding?step=import' : '/onboarding');
  }, [params, router]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-background p-4">
      <BackgroundGlow />
      <LoadingState label="Connexion à Spotify..." />
      <Suspense fallback={null}>
        <SpotifyCallback />
      </Suspense>
    </div>
  );
}
