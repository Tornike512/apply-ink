export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-sand border-t-sienna ${className}`}
    />
  );
}
