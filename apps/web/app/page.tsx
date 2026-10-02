'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BackgroundGlow from './components/BackgroundGlow';
import { buttonClasses } from './components/Button';
import Card from './components/Card';
import Logo, { LogoMark } from './components/Logo';
import MatchPreview from './components/MatchPreview';

const STEPS = [
  {
    title: 'Importe ta musique',
    text: 'Cherche et choisis au moins 10 titres que tu aimes.',
  },
  {
    title: 'Découvre ton ADN musical',
    text: 'Tes artistes dominants et tes moods, tirés de ce que tu écoutes vraiment.',
  },
  {
    title: 'Matche sur vos goûts',
    text: 'Parcours des profils classés par compatibilité. Un like réciproque, et c’est un match.',
  },
];

type AuthState = 'pending' | 'authenticated' | 'guest';

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
};
const getSnapshot = (): AuthState =>
  localStorage.getItem('mm_token') ? 'authenticated' : 'guest';
const getServerSnapshot = (): AuthState => 'pending';

export default function Home() {
  const router = useRouter();
  const auth = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (auth === 'authenticated') router.replace('/home');
  }, [auth, router]);

  // Pendant la vérification du token (ou la redirection vers /home) : logo animé plutôt qu'un écran vide.
  if (auth !== 'guest') {
    return (
      <div role="status" className="flex min-h-dvh flex-1 items-center justify-center bg-background">
        <LogoMark className="size-14" animated />
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden bg-background">
      <BackgroundGlow />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />
        <Link href="/login" className={buttonClasses({ variant: 'ghost', fullWidth: false, className: 'min-h-11 px-4 text-sm' })}>
          Se connecter
        </Link>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="hero-title"
          className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-20 lg:pb-24"
        >
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-sm text-muted">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-2-text" />
              Pour une histoire ou une amitié
            </p>
            <h1
              id="hero-title"
              className="mt-5 text-4xl font-semibold tracking-tight text-balance text-fg sm:text-5xl lg:text-6xl"
            >
              Trouve des gens qui ressentent{' '}
              <span className="whitespace-nowrap bg-linear-to-r from-accent-text to-accent-2-text bg-clip-text text-transparent">
                la musique
              </span>{' '}
              comme toi.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted sm:text-lg lg:mx-0">
              Choisis tes titres un à un, découvre ton ADN musical et
              rencontre des profils qui vibrent sur les mêmes sons que toi.
            </p>
            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className={buttonClasses({ fullWidth: false, className: 'w-full sm:w-auto sm:px-7' })}>
                Créer un compte
              </Link>
              <Link
                href="/login"
                className={buttonClasses({ variant: 'secondary', fullWidth: false, className: 'w-full sm:w-auto sm:px-7' })}
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>

          <MatchPreview className="lg:ml-auto lg:max-w-md" />
        </section>

        <section aria-labelledby="how-title" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
          <h2 id="how-title" className="text-center text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Comment ça marche
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="flex h-full gap-4 sm:block">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-accent-2 text-base font-semibold text-white"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-fg sm:mt-4">
                      <span className="sr-only">Étape {i + 1} : </span>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="cta-title" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
          <Card className="text-center sm:py-12">
            <h2 id="cta-title" className="text-2xl font-semibold tracking-tight text-balance text-fg sm:text-3xl">
              Ta prochaine rencontre a peut-être les mêmes playlists
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">Crée ton profil en quelques minutes.</p>
            <Link
              href="/register"
              className={buttonClasses({ fullWidth: false, className: 'mt-6 w-full sm:w-auto sm:px-8' })}
            >
              Commencer
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <span className="inline-flex items-center gap-2">
            <LogoMark className="size-6 rounded-lg" />
            Music Match
          </span>
          <span>La rencontre par la musique.</span>
        </div>
      </footer>
    </div>
  );
}
