import Link from 'next/link';
import Card from './Card';
import Logo from './Logo';
import { focusRing } from './Button';

// Coquille commune des écrans d'authentification (login, register,
// mot de passe oublié / reset) : marque, carte centrée, pied de page.
// Gouttière 16px en mobile ; les halos décoratifs sont clippés par
// overflow-hidden pour ne jamais créer de scroll horizontal.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden bg-background px-4 py-8 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-[28rem] rounded-full bg-accent-2/15 blur-3xl" />
      </div>

      <header className="flex justify-center">
        <Link href="/" aria-label="Music Match — accueil" className={`rounded-xl p-1 ${focusRing}`}>
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-md">
          <Card>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-balance text-fg sm:text-[1.75rem]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted sm:text-base">
                  {subtitle}
                </p>
              )}
            </div>
            {children}
          </Card>

          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
