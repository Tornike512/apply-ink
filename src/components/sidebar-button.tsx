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
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-sienna text-cream"
          : "text-espresso/75 hover:bg-sand/40 hover:text-espresso"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
