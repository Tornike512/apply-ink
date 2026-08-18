import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo-mark.png"
        alt=""
        width={34}
        height={39}
        priority
        unoptimized
      />
      <Image
        src="/wordmark.png"
        alt="apply.ink"
        width={120}
        height={28}
        priority
        unoptimized
      />
    </span>
  );
}
