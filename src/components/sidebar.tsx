import {
  BriefcaseIcon,
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
  { label: "CV Wall", icon: IdCardIcon },
  { label: "Settings", icon: SettingsIcon },
];

type SidebarProps = {
  active: string;
  onSelect: (label: string) => void;
};

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-8 border-r border-sand/70 bg-surface p-4">
      <Logo className="px-2 pt-2" />
      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <SidebarButton
            key={label}
            label={label}
            icon={<Icon width={18} height={18} />}
            active={active === label}
            onClick={() => onSelect(label)}
          />
        ))}
      </nav>
      <SidebarFooter name="Nikhil" plan="Premium Plan" />
    </aside>
  );
}
