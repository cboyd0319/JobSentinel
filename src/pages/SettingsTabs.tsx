import {
  useCallback,
  useRef,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

type SettingsTab = "basic" | "advanced";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onActiveTabChange: Dispatch<SetStateAction<SettingsTab>>;
}

const orderedTabs = ["basic", "advanced"] as const;

export function SettingsTabs({
  activeTab,
  onActiveTabChange,
}: SettingsTabsProps) {
  const tabRefs = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    basic: null,
    advanced: null,
  });

  const focusTab = useCallback((tab: SettingsTab) => {
    onActiveTabChange(tab);
    requestAnimationFrame(() => tabRefs.current[tab]?.focus());
  }, [onActiveTabChange]);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentTab: SettingsTab) => {
      const currentIndex = orderedTabs.indexOf(currentTab);
      const nextTab = (() => {
        switch (event.key) {
          case "ArrowLeft":
          case "ArrowUp":
            return orderedTabs[(currentIndex - 1 + orderedTabs.length) % orderedTabs.length];
          case "ArrowRight":
          case "ArrowDown":
            return orderedTabs[(currentIndex + 1) % orderedTabs.length];
          case "Home":
            return orderedTabs[0];
          case "End":
            return orderedTabs[orderedTabs.length - 1];
          default:
            return null;
        }
      })();

      if (!nextTab) return;

      event.preventDefault();
      focusTab(nextTab);
    },
    [focusTab],
  );

  return (
    <div
      role="tablist"
      aria-label="Settings tabs"
      className="flex border-b border-surface-200 dark:border-surface-700 mb-6"
    >
      <SettingsTabButton
        active={activeTab === "basic"}
        controls="basic-settings-panel"
        id="basic-settings-tab"
        label="Search Preferences"
        refCallback={(element) => {
          tabRefs.current.basic = element;
        }}
        onClick={() => onActiveTabChange("basic")}
        onKeyDown={(event) => handleTabKeyDown(event, "basic")}
      />
      <SettingsTabButton
        active={activeTab === "advanced"}
        controls="advanced-settings-panel"
        id="advanced-settings-tab"
        label="Sources & Alerts"
        refCallback={(element) => {
          tabRefs.current.advanced = element;
        }}
        onClick={() => onActiveTabChange("advanced")}
        onKeyDown={(event) => handleTabKeyDown(event, "advanced")}
      />
    </div>
  );
}

interface SettingsTabButtonProps {
  active: boolean;
  controls: string;
  id: string;
  label: string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  refCallback: (element: HTMLButtonElement | null) => void;
}

function SettingsTabButton({
  active,
  controls,
  id,
  label,
  onClick,
  onKeyDown,
  refCallback,
}: SettingsTabButtonProps) {
  return (
    <button
      role="tab"
      ref={refCallback}
      aria-selected={active}
      aria-controls={controls}
      id={id}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-sentinel-500 text-sentinel-600 dark:text-sentinel-400"
          : "border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
      }`}
    >
      {label}
    </button>
  );
}
