type SpinnerSize = "sm" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-5 w-5 border-2",
  lg: "h-12 w-12 border-4",
};

type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
};

export function Spinner({ size = "sm", className = "" }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-sand border-t-sienna ${sizeClasses[size]} ${className}`}
    />
  );
}
