import { useState, useCallback, useMemo } from "react";

interface Tab<T extends string = string> {
  id: T;
  label: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
}

interface UseTabsOptions<T extends string> {
  defaultTab?: T;
  onChange?: (tabId: T) => void;
}

interface UseTabsResult<T extends string> {
  activeTab: T;
  setActiveTab: (tabId: T) => void;
  isActive: (tabId: T) => boolean;
  getTabProps: (tab: Tab<T>) => {
    onClick: () => void;
    role: "tab";
    "aria-selected": boolean;
    "aria-controls": string;
    id: string;
    disabled?: boolean;
  };
  getPanelProps: (tabId: T) => {
    role: "tabpanel";
    "aria-labelledby": string;
    id: string;
    hidden: boolean;
  };
}

/**
 * Custom hook for managing tab navigation state with ARIA attributes.
 * Reduces boilerplate for tab state management and accessibility.
 *
 * @example
 * type TabId = "overview" | "skills" | "companies";
 * const tabs: Tab<TabId>[] = [
 *   { id: "overview", label: "Overview", icon: "📊" },
 *   { id: "skills", label: "Skills", icon: "🔧", badge: 5 },
 *   { id: "companies", label: "Companies", icon: "🏢" },
 * ];
 *
 * const tabState = useTabs<TabId>({
 *   defaultTab: "overview",
 *   onChange: (tabId) => console.log("Tab changed:", tabId),
 * });
 *
 * // Usage
 * <div role="tablist">
 *   {tabs.map((tab) => (
 *     <button key={tab.id} {...tabState.getTabProps(tab)}>
 *       {tab.label}
 *       {tab.badge && <Badge>{tab.badge}</Badge>}
 *     </button>
 *   ))}
 * </div>
 *
 * <div {...tabState.getPanelProps("overview")}>Overview content</div>
 * <div {...tabState.getPanelProps("skills")}>Skills content</div>
 * <div {...tabState.getPanelProps("companies")}>Companies content</div>
 */
export function useTabs<T extends string>(
  options: UseTabsOptions<T> = {}
): UseTabsResult<T> {
  const { defaultTab, onChange } = options;

  // Type assertion needed because TypeScript can't infer the exact string literal type
  const [activeTab, setActiveTabInternal] = useState<T>(
    defaultTab as T || ("" as T)
  );

  const setActiveTab = useCallback(
    (tabId: T) => {
      setActiveTabInternal(tabId);
      onChange?.(tabId);
    },
    [onChange]
  );

  const isActive = useCallback(
    (tabId: T) => activeTab === tabId,
    [activeTab]
  );

  const getTabProps = useCallback(
    (tab: Tab<T>) => ({
      onClick: () => !tab.disabled && setActiveTab(tab.id),
      role: "tab" as const,
      "aria-selected": activeTab === tab.id,
      "aria-controls": `${tab.id}-panel`,
      id: `${tab.id}-tab`,
      ...(tab.disabled && { disabled: true }),
    }),
    [activeTab, setActiveTab]
  );

  const getPanelProps = useCallback(
    (tabId: T) => ({
      role: "tabpanel" as const,
      "aria-labelledby": `${tabId}-tab`,
      id: `${tabId}-panel`,
      hidden: activeTab !== tabId,
    }),
    [activeTab]
  );

  return useMemo(
    () => ({
      activeTab,
      setActiveTab,
      isActive,
      getTabProps,
      getPanelProps,
    }),
    [activeTab, setActiveTab, isActive, getTabProps, getPanelProps]
  );
}
