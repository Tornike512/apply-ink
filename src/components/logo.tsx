import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="apply.ink"
      width={144}
      height={103}
      priority
      className={className}
    />
  );
}
