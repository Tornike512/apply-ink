import { ChevronRightIcon } from "@/assets";

type SidebarFooterProps = {
  name: string;
  plan: string;
};

export function SidebarFooter({ name, plan }: SidebarFooterProps) {
  return (
    <div className="mt-auto border-t border-sand/70 pt-4">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-sand/30"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-espresso text-sm font-semibold text-cream">
          {name.charAt(0)}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold text-espresso">
            {name}
          </span>
          <span className="block truncate text-xs text-terracotta">{plan}</span>
        </span>
        <ChevronRightIcon width={18} height={18} className="text-espresso/50" />
      </button>
    </div>
  );
}
