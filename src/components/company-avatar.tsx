type CompanyAvatarProps = {
  name: string;
  color?: string;
  className?: string;
};

export function CompanyAvatar({
  name,
  color,
  className = "",
}: CompanyAvatarProps) {
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
