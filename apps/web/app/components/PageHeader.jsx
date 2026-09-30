import Link from 'next/link';
import Icon from './Icon';
import { focusRing } from './Button';

// En-tête de page : lien retour optionnel (44px), titre h1, sous-titre,
// action à droite optionnelle. Miroir de ScreenHeader + ScreenIntro mobile.
export default function PageHeader({ title, subtitle, backHref, backLabel = 'Retour', right, className = '' }) {
  return (
    <header className={`mb-6 flex flex-col gap-3 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className={`-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted hover:text-fg ${focusRing}`}
        >
          <Icon name="chevronLeft" className="size-5" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-fg sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-base text-pretty text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
