// Surface de contenu (formulaires, panneaux).
export default function Card({ as: Tag = 'div', className = '', ...props }) {
  return (
    <Tag
      className={`rounded-card border border-line bg-surface/90 p-6 shadow-card backdrop-blur-sm sm:p-8 ${className}`}
      {...props}
    />
  );
}
