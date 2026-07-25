'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '../components/Avatar';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';

export default function DiscoverPage() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('mm_token') : null;
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchCelebration, setMatchCelebration] = useState(null);

  const fetchDiscover = useCallback(async (authToken) => {
    try {
      const res = await fetch(`${API}/api/matching/discover`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const data = await res.json();
      if (res.status === 404) {
        setNoProfile(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNoProfile(false);
      setCandidates(data.candidates);
      setCurrentIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    fetchDiscover(token);
  };

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    fetch(`${API}/api/matching/discover`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (res.status === 404) {
          setNoProfile(true);
          return;
        }
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setCandidates(data.candidates);
        setCurrentIndex(0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePass = () => {
    // Le backend n'a pas de notion de "pass" — ce profil peut réapparaître
    // à un prochain rafraîchissement de la liste, limitation assumée en v1.
    setCurrentIndex((i) => i + 1);
  };

  const handleLike = async () => {
    const candidate = candidates[currentIndex];
    if (!candidate) return;
    setLiking(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/matching/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to_user_id: candidate.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (data.matched) {
        setMatchCelebration({ first_name: candidate.first_name });
      } else {
        setCurrentIndex((i) => i + 1);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLiking(false);
    }
  };

  const dismissCelebration = () => {
    setMatchCelebration(null);
    setCurrentIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <p className="text-gray-400 text-sm">Chargement des profils...</p>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-4xl mb-4">🎵</div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Complète ton profil musical
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            Importe ta musique pour découvrir des profils compatibles.
          </p>
          <Link
            href="/onboarding"
            className="inline-block py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
          >
            Importer ma musique
          </Link>
        </div>
      </div>
    );
  }

  const candidate = candidates[currentIndex];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {matchCelebration ? (
          <div className="p-6 rounded-xl border border-violet-500 bg-violet-500/10">
            <div className="text-4xl mb-3">🎉</div>
            <h1 className="text-xl font-semibold text-white mb-6">
              C&apos;est un match avec {matchCelebration.first_name} !
            </h1>
            <div className="flex flex-col gap-3">
              <button
                onClick={dismissCelebration}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
              >
                Continuer à découvrir
              </button>
              <Link
                href="/matches"
                className="w-full py-3 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-500 transition-colors"
              >
                Voir mes matchs
              </Link>
            </div>
          </div>
        ) : candidate ? (
          <div className="p-6 rounded-xl border border-gray-700 bg-gray-900">
            <Avatar avatarUrl={candidate.avatar_url} firstName={candidate.first_name} size={64} />
            <h1 className="text-lg font-semibold text-white mt-3">
              {candidate.first_name}, {candidate.age}
            </h1>
            {candidate.city && (
              <p className="text-gray-400 text-sm">{candidate.city}</p>
            )}
            <p className="text-violet-400 text-sm font-medium mt-1 mb-6">
              {Math.round(candidate.score * 100)}% compatible
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePass}
                disabled={liking}
                className="px-6 py-3 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-500 disabled:opacity-50 transition-colors"
              >
                ⏭️ Passer
              </button>
              <button
                onClick={handleLike}
                disabled={liking}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
              >
                {liking ? '...' : '❤️ Liker'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">🔍</div>
            <h1 className="text-lg font-semibold text-white mb-2">
              Plus de profils pour l&apos;instant
            </h1>
            <p className="text-gray-400 text-sm mb-8">
              Reviens plus tard, de nouveaux profils arrivent régulièrement.
            </p>
            <button
              onClick={handleRefresh}
              className="py-3 px-6 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
            >
              🔄 Rafraîchir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
