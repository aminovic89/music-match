import Link from 'next/link';
import Icon from './Icon';
import { focusRing } from './Button';

// Ligne de menu (lien) : icône, titre, description, chevron. Toute la ligne
// est cliquable (≥ 56px). Miroir du ListRow mobile.
export default function ListRow({ href, icon, title, description }) {
  return (
    <Link
      href={href}
      className={`group flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong hover:bg-surface-2 ${focusRing}`}
    >
      {icon && (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-text">
          <Icon name={icon} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-fg">{title}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <Icon name="chevronRight" className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
