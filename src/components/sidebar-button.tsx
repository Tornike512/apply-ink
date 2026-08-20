import type { ReactNode } from "react";

type SidebarButtonProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
};

export function SidebarButton({
  icon,
  label,
  active = false,
  count,
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
      <span className="flex-1 text-left">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
            active ? "bg-cream text-sienna" : "bg-sienna text-cream"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
