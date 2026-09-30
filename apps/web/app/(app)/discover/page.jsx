'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Button, { buttonClasses } from '@/components/Button';
import Compatibility from '@/components/Compatibility';
import FormAlert from '@/components/Alert';
import Icon from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import { EmptyState, LoadingState } from '@/components/States';
import TasteChips, { sharedAnnouncement } from '@/components/TasteChips';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  const header = (
    <PageHeader
      title="Trouver des matchs"
      subtitle="Des profils classés par compatibilité musicale"
    />
  );

  if (loading) {
    return (
      <PageContainer width="sm">
        {header}
        <LoadingState label="Chargement des profils..." />
      </PageContainer>
    );
  }

  if (noProfile) {
    return (
      <PageContainer width="sm">
        {header}
        <EmptyState
          icon="music"
          title="Complète ton profil musical"
          text="Importe ta musique pour découvrir des profils compatibles."
        >
          <Link href="/onboarding" className={buttonClasses()}>
            Importer ma musique
          </Link>
        </EmptyState>
      </PageContainer>
    );
  }

  const candidate = candidates[currentIndex];

  return (
    <PageContainer width="sm">
      {header}
      <FormAlert id="discover-error" message={error} className="mb-6" />

      {matchCelebration ? (
        <div
          role="status"
          className="rounded-card bg-linear-to-br from-accent to-accent-2 p-[2px] shadow-glow"
        >
          <div className="flex flex-col items-center gap-5 rounded-[calc(var(--radius-card)-2px)] bg-surface px-6 py-10 text-center sm:px-10">
            <LogoMark className="size-16" animated />
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-fg">
              C&apos;est un match avec {matchCelebration.first_name} !
            </h2>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <Button onClick={dismissCelebration}>Continuer à découvrir</Button>
              <Link href="/matches" className={buttonClasses({ variant: 'secondary' })}>
                Voir mes matchs
              </Link>
            </div>
          </div>
        </div>
      ) : candidate ? (
        <article aria-labelledby="candidate-name" className="relative pt-3">
          {/* Cartes "fantômes" derrière : la pile de profils à venir */}
          {candidates.length - currentIndex > 1 && (
            <div aria-hidden="true" className="absolute inset-x-6 top-0 bottom-8 rounded-card border border-line bg-surface/60" />
          )}
          {/* Mobile : avatar à côté du nom pour garder Passer / Liker visibles
              sans scroll sur un écran 375×667 ; à partir de sm, mise en page
              centrée avec grand avatar. */}
          <div className="relative rounded-card border border-line bg-surface p-5 shadow-card sm:p-8">
            <p className="mb-3 text-center text-xs font-medium text-muted sm:mb-4">
              Profil {currentIndex + 1} sur {candidates.length}
            </p>
            <div className="flex items-center gap-4 sm:flex-col sm:gap-3 sm:text-center">
              <Avatar avatarUrl={candidate.avatar_url} firstName={candidate.first_name} size={72} ring className="sm:hidden" />
              <Avatar avatarUrl={candidate.avatar_url} firstName={candidate.first_name} size={112} ring className="hidden sm:block" />
              <div className="min-w-0">
                <h2 id="candidate-name" className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                  {candidate.first_name}, {candidate.age}
                </h2>
                {candidate.city && <p className="mt-0.5 truncate text-sm text-muted sm:mt-1">{candidate.city}</p>}
              </div>
            </div>

            <Compatibility score={candidate.score} className="mt-5 sm:mt-6" />

            <TasteChips candidate={candidate} className="mt-5" />

            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8">
              <Button variant="secondary" onClick={handlePass} disabled={liking}>
                <Icon name="x" />
                Passer
              </Button>
              <Button onClick={handleLike} loading={liking}>
                {!liking && <Icon name="heart" />}
                Liker
              </Button>
            </div>
          </div>
          {/* Annonce le changement de profil aux lecteurs d'écran */}
          <p className="sr-only" aria-live="polite">
            {candidate.first_name}, {candidate.age} ans, {Math.round(candidate.score * 100)}% compatible
            {sharedAnnouncement(candidate) ? `, ${sharedAnnouncement(candidate)}` : ''}
          </p>
        </article>
      ) : (
        <EmptyState
          icon="compass"
          title="Plus de profils pour l'instant"
          text="Reviens plus tard, de nouveaux profils arrivent régulièrement."
        >
          <Button onClick={handleRefresh}>
            <Icon name="refresh" />
            Rafraîchir
          </Button>
        </EmptyState>
      )}
    </PageContainer>
  );
}
