'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import Logo from './Logo';
import { focusRing } from './Button';

const ITEMS = [
  { href: '/home', icon: 'home', label: 'Accueil' },
  { href: '/discover', icon: 'compass', label: 'Trouver des matchs' },
  { href: '/matches', icon: 'heart', label: 'Mes matchs' },
];

// Navigation de l'espace connecté (mêmes routes qu'avant) :
// - mobile (< md) : barre d'onglets fixe en bas ;
// - desktop (≥ md) : en-tête collant en haut, logo + liens.
// La page active est signalée par aria-current, la couleur ET un
// indicateur (barre / fond), pas par la couleur seule.
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-line bg-background/85 backdrop-blur md:block">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-6 px-6">
          <Link href="/home" aria-label="Music Match — accueil" className={`rounded-xl p-1 ${focusRing}`}>
            <Logo />
          </Link>
          <nav aria-label="Navigation principale">
            <ul className="flex items-center gap-1">
              {ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                        active ? 'bg-accent/15 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                      } ${focusRing}`}
                    >
                      <Icon name={item.icon} className={`size-5 ${active ? 'text-accent-text' : ''}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex w-full max-w-md">
          {ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-xs font-medium transition-colors ${
                    active ? 'text-fg' : 'text-muted hover:text-fg'
                  } ${focusRing} focus-visible:ring-offset-0 focus-visible:ring-inset`}
                >
                  {active && (
                    <span aria-hidden="true" className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-linear-to-r from-accent to-accent-2" />
                  )}
                  <Icon name={item.icon} className={`size-6 ${active ? 'text-accent-text' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
