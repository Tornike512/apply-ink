type CompanyAvatarProps = {
  name: string;
  className?: string;
};

export function CompanyAvatar({ name, className = "" }: CompanyAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sand/60 text-xl font-bold text-terracotta ${className}`}
    >
      {name.charAt(0)}
    </span>
  );
}
