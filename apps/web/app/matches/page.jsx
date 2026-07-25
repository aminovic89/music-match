'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '../components/Avatar';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';

export default function MatchesPage() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('mm_token') : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${API}/api/matching/matches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setMatches(data.matches);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white text-center mb-6">
          Mes matchs 💜
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm text-center">Chargement...</p>
        ) : matches.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-6">
              Pas encore de match — va découvrir des profils !
            </p>
            <Link
              href="/discover"
              className="inline-block py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
            >
              Découvrir des profils
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="p-4 rounded-xl border border-gray-700 bg-gray-900 flex items-center gap-4"
              >
                <Avatar avatarUrl={match.avatar_url} firstName={match.first_name} size={48} />
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">
                    {match.first_name}, {match.age}
                  </div>
                  {match.city && (
                    <div className="text-gray-400 text-sm">{match.city}</div>
                  )}
                </div>
                <div className="text-violet-400 text-sm font-medium">
                  {Math.round(match.score * 100)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
