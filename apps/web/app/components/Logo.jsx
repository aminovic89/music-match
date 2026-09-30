// Marque Music Match : pastille dégradée (égaliseur) + wordmark.
export function LogoMark({ className = 'size-10' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center gap-[3px] rounded-xl bg-linear-to-br from-accent to-accent-2 shadow-glow ${className}`}
    >
      <span className="h-[30%] w-[7%] rounded-full bg-white/90" />
      <span className="h-[55%] w-[7%] rounded-full bg-white" />
      <span className="h-[40%] w-[7%] rounded-full bg-white/90" />
      <span className="h-[65%] w-[7%] rounded-full bg-white" />
    </span>
  );
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-9" />
      <span className="text-lg font-semibold tracking-tight text-fg">Music Match</span>
    </span>
  );
}
