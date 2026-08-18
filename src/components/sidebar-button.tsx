import type { ReactNode } from "react";

type SidebarButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function SidebarButton({
  icon,
  label,
  active = false,
  onClick,
}: SidebarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-espresso/40 text-cream"
          : "text-cream/75 hover:bg-espresso/25 hover:text-cream"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
