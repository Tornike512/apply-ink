type TabsProps = {
  tabs: { label: string; value: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
};

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex gap-2 border-b border-sand">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onTabChange(tab.value)}
          className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === tab.value
              ? "text-sienna"
              : "text-espresso/60 hover:text-espresso"
          }`}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-sienna" />
          )}
        </button>
      ))}
    </div>
  );
}
