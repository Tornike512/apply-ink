import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="apply.ink"
      width={112}
      height={80}
      unoptimized
      priority
      className={className}
    />
  );
}
