'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import { buttonClasses } from '@/components/Button';
import FormAlert from '@/components/Alert';
import Icon from '@/components/Icon';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import { EmptyState, LoadingState } from '@/components/States';

// Dates de match / d'expiration (données déjà renvoyées par l'API).
const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
    <PageContainer width="sm">
      <PageHeader
        title="Mes matchs"
        subtitle="Les personnes avec qui le like est réciproque"
        right={
          !loading && matches.length > 0 ? (
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold tabular-nums text-fg">
              {matches.length}
              <span className="sr-only"> match{matches.length > 1 ? 's' : ''}</span>
            </span>
          ) : null
        }
      />

      <FormAlert id="matches-error" message={error} className="mb-6" />

      {loading ? (
        <LoadingState label="Chargement..." />
      ) : matches.length === 0 ? (
        !error && (
          <EmptyState
            icon="heart"
            title="Pas encore de match"
            text="Like des profils : quand c'est réciproque, ils apparaissent ici."
          >
            <Link href="/discover" className={buttonClasses()}>
              <Icon name="compass" />
              Trouver des matchs
            </Link>
          </EmptyState>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => {
            const pct = Math.round(match.score * 100);
            const matchedOn = formatDate(match.matched_at);
            const expiresOn = formatDate(match.expires_at);
            return (
              <li
                key={match.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card"
              >
                <Avatar avatarUrl={match.avatar_url} firstName={match.first_name} size={56} ring />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-base font-semibold text-fg">
                    {match.first_name}, {match.age}
                  </p>
                  {match.city && <p className="truncate text-sm text-muted">{match.city}</p>}
                  {(matchedOn || expiresOn) && (
                    <p className="text-xs text-muted">
                      {matchedOn && <>Match le {matchedOn}</>}
                      {matchedOn && expiresOn && ' · '}
                      {expiresOn && <>expire le {expiresOn}</>}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-accent/45 bg-accent/15 px-3 py-1 text-sm font-semibold tabular-nums text-accent-text">
                  {pct}%<span className="sr-only"> compatible</span>
                </span>
                {/* Entrée vers le chat : l'API des matchs renvoie `user_id`
                    (pas l'id de conversation), /messages retrouve la
                    conversation à partir de ce paramètre. Pleine largeur
                    sous la ligne en mobile, à droite à partir de sm. */}
                {match.user_id && (
                  <Link
                    href={`/messages?u=${encodeURIComponent(match.user_id)}`}
                    className={buttonClasses({
                      variant: 'secondary',
                      fullWidth: false,
                      className: 'w-full sm:w-auto',
                    })}
                  >
                    <Icon name="chat" />
                    Écrire<span className="sr-only"> à {match.first_name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
