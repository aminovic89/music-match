'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SpotifyCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('mm_token', token);
    }
    router.replace('/onboarding');
  }, [params, router]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <p className="text-gray-400 text-sm">Connexion à Spotify...</p>
      <Suspense fallback={null}>
        <SpotifyCallback />
      </Suspense>
    </div>
  );
}
