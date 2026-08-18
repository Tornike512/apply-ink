const SIZE = 56;
const STROKE = 4;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type MatchRingProps = {
  percent: number;
  className?: string;
};

export function MatchRing({ percent, className = "" }: MatchRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative h-14 w-14">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
          className="h-full w-full -rotate-90"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-sand/60"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
            className="text-success"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-espresso">
          {clamped}%
        </span>
      </div>
      <span className="text-xs text-espresso/60">Match</span>
    </div>
  );
}
