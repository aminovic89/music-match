'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setUser(data);
      })
      .catch((err) => setError(err.message));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mm_token');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="text-4xl mb-4">🎉</div>
        <h1 className="text-2xl font-semibold text-white mb-2">
          {user ? `Salut ${user.first_name} !` : 'Bienvenue'}
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Ton profil est prêt. Les matchs arrivent bientôt ici.
        </p>

        <button
          onClick={handleLogout}
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
