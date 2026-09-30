import Link from 'next/link';
import { focusRing } from './Button';

// Lien texte accentué. `standalone` = lien isolé (hors phrase) : on lui
// donne une zone cliquable de 44px de haut.
export default function TextLink({ standalone = false, className = '', ...props }) {
  return (
    <Link
      className={`rounded-md font-medium text-accent-text underline-offset-4 hover:underline ${standalone ? 'inline-flex min-h-11 items-center px-1' : ''} ${focusRing} ${className}`}
      {...props}
    />
  );
}
