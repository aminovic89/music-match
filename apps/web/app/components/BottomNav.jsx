'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import Logo from './Logo';
import { focusRing } from './Button';

// `short` : libellé de la barre du bas. Avec 4 onglets, chacun ne fait
// plus que 80px à 320px de large : un seul mot par onglet (les mêmes que la
// TabBar mobile), sinon le texte passe sur deux lignes.
const ITEMS = [
  { href: '/home', icon: 'home', label: 'Accueil', short: 'Accueil' },
  { href: '/discover', icon: 'compass', label: 'Trouver des matchs', short: 'Découvrir' },
  { href: '/matches', icon: 'heart', label: 'Mes matchs', short: 'Matchs' },
  { href: '/messages', icon: 'chat', label: 'Messages', short: 'Messages' },
];

// Pastille de messages non lus : nombre visible (plafonné à 99+) et
// libellé complet pour les lecteurs d'écran — jamais un simple point coloré.
function UnreadBadge({ count, className = '' }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.6875rem] leading-none font-semibold tabular-nums text-white ${className}`}
    >
      <span aria-hidden="true">{count > 99 ? '99+' : count}</span>
      <span className="sr-only">{count > 1 ? `, ${count} messages non lus` : ', 1 message non lu'}</span>
    </span>
  );
}

// Navigation de l'espace connecté (mêmes routes qu'avant) :
// - mobile (< md) : barre d'onglets fixe en bas ;
// - desktop (≥ md) : en-tête collant en haut, logo + liens.
// La page active est signalée par aria-current, la couleur ET un
// indicateur (barre / fond), pas par la couleur seule.
// `unreadCount` : total des messages non lus, affiché sur l'onglet Messages
// (0 par défaut tant que le chat n'est pas câblé).
export default function BottomNav({ unreadCount = 0 }) {
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
                      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition-colors lg:px-4 ${
                        active ? 'bg-accent/15 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                      } ${focusRing}`}
                    >
                      <Icon name={item.icon} className={`size-5 ${active ? 'text-accent-text' : ''}`} />
                      {/* 4 liens : libellés courts entre md et lg (768–1023px),
                          sinon l'en-tête déborde. */}
                      <span className="lg:hidden">{item.short}</span>
                      <span className="hidden lg:inline">{item.label}</span>
                      {item.href === '/messages' && <UnreadBadge count={unreadCount} />}
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
                    <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-linear-to-r from-accent to-accent-2" />
                  )}
                  <span className="relative">
                    <Icon name={item.icon} className={`size-6 ${active ? 'text-accent-text' : ''}`} />
                    {item.href === '/messages' && (
                      <UnreadBadge count={unreadCount} className="absolute -top-1.5 left-3.5 ring-2 ring-surface" />
                    )}
                  </span>
                  <span>{item.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
