import Image from "next/image";

type CompanyAvatarProps = {
  name: string;
  color?: string;
  logoUrl?: string;
  className?: string;
};

export function CompanyAvatar({
  name,
  color,
  logoUrl,
  className = "",
}: CompanyAvatarProps) {
  if (logoUrl) {
    return (
      <span
        aria-hidden="true"
        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-sand bg-surface ${className}`}
      >
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes="56px"
          unoptimized
          className="object-contain"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={color ? { backgroundColor: color } : undefined}
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${
        color ? "text-white" : "bg-sand/60 text-terracotta"
      } ${className}`}
    >
      {name.charAt(0)}
    </span>
  );
}
