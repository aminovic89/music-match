// Section avec titre en petites capitales (contraste AA : text-muted ≈ 8:1),
// miroir du Section mobile. `right` : élément aligné à droite (compteur…).
export default function Section({ title, right, as: Heading = 'h2', className = '', children }) {
  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && (
            <Heading className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</Heading>
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
