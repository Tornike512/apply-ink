export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta text-base font-bold text-cream">
        a.
      </span>
      <span className="text-lg font-semibold tracking-tight text-cream">
        apply.ink
      </span>
    </div>
  );
}
