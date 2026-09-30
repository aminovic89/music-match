'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Button, { buttonClasses } from '@/components/Button';
import Card from '@/components/Card';
import FormAlert from '@/components/Alert';
import Icon from '@/components/Icon';
import ListRow from '@/components/ListRow';
import PageContainer from '@/components/PageContainer';
import Section from '@/components/Section';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
        setUser(data.user);
      })
      .catch((err) => setError(err.message));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mm_token');
    router.push('/login');
  };

  return (
    <PageContainer>
      <FormAlert id="home-error" message={error} className="mb-6" />

      {/* Salutation */}
      <div className="mb-8 flex items-center gap-4">
        <Avatar avatarUrl={user?.avatar_url} firstName={user?.first_name} size={64} ring />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {user ? `Salut ${user.first_name} !` : 'Bienvenue'}
          </h1>
          <p className="text-base text-muted">Content de te revoir.</p>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {/* Mise en avant : découverte + matchs (disponibles sur le web) */}
        <Card className="relative overflow-hidden sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-fg">Trouve tes prochains matchs</h2>
              <p className="text-sm leading-relaxed text-muted">
                Découvre des profils classés par compatibilité musicale et retrouve tes matchs.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/discover" className={buttonClasses({ fullWidth: false, className: 'w-full sm:w-auto' })}>
                <Icon name="compass" />
                Trouver des matchs
              </Link>
              <Link
                href="/matches"
                className={buttonClasses({ variant: 'secondary', fullWidth: false, className: 'w-full sm:w-auto' })}
              >
                <Icon name="heart" />
                Mes matchs
              </Link>
            </div>
          </div>
        </Card>

        <Section title="Ton compte">
          <div className="flex flex-col gap-2">
            <ListRow href="/profile" icon="user" title="Mon profil" description="Prénom, âge, ville et ce que tu recherches" />
            <ListRow href="/music" icon="music" title="Ma musique" description="Tes titres et ton ADN musical" />
          </div>
        </Section>
      </div>

      {/* Déconnexion : volontairement discrète, en bas du contenu. */}
      <div className="mt-auto flex justify-center pt-12 pb-6">
        <Button variant="ghost" fullWidth={false} onClick={handleLogout}>
          <Icon name="logout" />
          Se déconnecter
        </Button>
      </div>
    </PageContainer>
  );
}
