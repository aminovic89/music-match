// Colonne de contenu des pages connectées : gouttière 16px en mobile,
// largeur de lecture confortable sur desktop.
const WIDTHS = { sm: 'max-w-xl', md: 'max-w-2xl', lg: 'max-w-4xl' };

export default function PageContainer({ width = 'md', className = '', children }) {
  return (
    <main className={`mx-auto flex w-full flex-1 flex-col px-4 pt-6 sm:px-6 md:pt-10 ${WIDTHS[width]} ${className}`}>
      {children}
    </main>
  );
}
