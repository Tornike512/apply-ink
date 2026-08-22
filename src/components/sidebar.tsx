import Link from "next/link";
import {
  BriefcaseIcon,
  BellIcon,
  TargetIcon,
  FileTextIcon,
  IdCardIcon,
  SettingsIcon,
} from "@/assets";
import { Logo } from "@/components/logo";
import { SidebarButton } from "@/components/sidebar-button";
import { SidebarFooter } from "@/components/sidebar-footer";

const NAV_ITEMS = [
  { label: "Jobs", icon: BriefcaseIcon },
  { label: "Matches", icon: TargetIcon },
  { label: "Applications", icon: FileTextIcon },
  { label: "Messages", icon: BellIcon },
  { label: "Resume", icon: IdCardIcon },
  { label: "Settings", icon: SettingsIcon },
];

type SidebarProps = {
  active: string;
  onSelect: (label: string) => void;
  messageCount?: number;
  userName?: string;
};

export function Sidebar({
  active,
  onSelect,
  messageCount = 0,
  userName = "Apply Ink user",
}: SidebarProps) {
  return (
    <aside className="sticky top-0 left-0 z-20 flex h-svh w-64 shrink-0 self-start flex-col gap-8 border-r border-sand/70 bg-surface p-4">
      <Link href="/" aria-label="Apply Ink home">
        <Logo className="px-2 pt-2" />
      </Link>
      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <SidebarButton
            key={label}
            label={label}
            icon={<Icon width={18} height={18} />}
            active={active === label}
            count={label === "Messages" ? messageCount : undefined}
            onClick={() => onSelect(label)}
          />
        ))}
      </nav>
      <SidebarFooter name={userName} plan="Application profile" />
    </aside>
  );
}
