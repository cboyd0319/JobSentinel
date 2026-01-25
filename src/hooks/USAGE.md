# Custom Hooks Usage Guide

This document provides examples of how to use the custom hooks extracted from JobSentinel page components.

## useModal

Manages modal state with backdrop click and keyboard escape handlers.

### Before (Applications.tsx pattern)

```tsx
const [showTemplates, setShowTemplates] = useState(false);

const handleShowTemplates = useCallback(() => setShowTemplates(true), []);
const handleCloseTemplates = useCallback(() => setShowTemplates(false), []);

const handleTemplatesBackdropClick = useCallback((e: React.MouseEvent) => {
  if (e.target === e.currentTarget) setShowTemplates(false);
}, []);

const handleTemplatesKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === "Escape") setShowTemplates(false);
}, []);

// Usage
<Button onClick={handleShowTemplates}>Templates</Button>
{showTemplates && (
  <div
    onClick={handleTemplatesBackdropClick}
    onKeyDown={handleTemplatesKeyDown}
  >
    <Modal onClose={handleCloseTemplates} />
  </div>
)}
```

### After (with useModal)

```tsx
const templatesModal = useModal({
  closeOnEscape: true,
  closeOnBackdropClick: true,
  onClose: () => console.log("Templates modal closed"),
});

// Usage
<Button onClick={templatesModal.open}>Templates</Button>
{templatesModal.isOpen && (
  <div
    onClick={templatesModal.backdropClickHandler}
    onKeyDown={templatesModal.keyDownHandler}
  >
    <Modal onClose={templatesModal.close} />
  </div>
)}
```

**Saves:** 13 lines of boilerplate per modal

## useTabs

Manages tab navigation with ARIA attributes and accessibility.

### Before (Market.tsx pattern)

```tsx
type TabId = "overview" | "skills" | "companies";
const [activeTab, setActiveTab] = useState<TabId>("overview");

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "skills", label: "Skills", icon: "🔧" },
];

// Usage
<div role="tablist">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      role="tab"
      aria-selected={activeTab === tab.id}
      aria-controls={`${tab.id}-panel`}
      id={`${tab.id}-tab`}
    >
      {tab.label}
    </button>
  ))}
</div>

{activeTab === "overview" && <div>Overview content</div>}
{activeTab === "skills" && <div>Skills content</div>}
```

### After (with useTabs)

```tsx
type TabId = "overview" | "skills" | "companies";
const tabs: Tab<TabId>[] = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "skills", label: "Skills", icon: "🔧", badge: 5 },
];

const tabState = useTabs<TabId>({
  defaultTab: "overview",
  onChange: (tabId) => console.log("Tab changed:", tabId),
});

// Usage
<div role="tablist">
  {tabs.map((tab) => (
    <button key={tab.id} {...tabState.getTabProps(tab)}>
      {tab.label}
      {tab.badge && <Badge>{tab.badge}</Badge>}
    </button>
  ))}
</div>

<div {...tabState.getPanelProps("overview")}>Overview content</div>
<div {...tabState.getPanelProps("skills")}>Skills content</div>
```

**Saves:** Automatic ARIA attributes, cleaner conditional rendering, centralized tab state

## useFetchOnMount

Fetches data on component mount with AbortController cleanup and error handling.

### Before (Market.tsx pattern)

```tsx
const [data, setData] = useState<Data | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const toast = useToast();

const fetchData = useCallback(async (signal?: AbortSignal) => {
  try {
    setLoading(true);
    setError(null);
    const result = await invoke<Data>("get_data");
    if (signal?.aborted) return;
    setData(result);
  } catch (err) {
    if (signal?.aborted) return;
    logError("Failed to fetch:", err);
    const errorMsg = getErrorMessage(err);
    setError(errorMsg);
    toast.error("Failed to load", errorMsg);
  } finally {
    if (!signal?.aborted) {
      setLoading(false);
    }
  }
}, [toast]);

useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, [fetchData]);
```

### After (with useFetchOnMount)

```tsx
const { data, loading, error, refetch } = useFetchOnMount(
  async (signal) => {
    const result = await invoke<Data>("get_data");
    if (signal.aborted) return null;
    return result;
  },
  {
    onSuccess: (data) => console.log("Data loaded:", data),
    errorMessage: "Failed to load data",
  }
);
```

**Saves:** 25+ lines of boilerplate per fetch operation

## Combining Hooks

Real-world example from a page component:

```tsx
export default function MyPage({ onBack }: PageProps) {
  // Fetch data on mount
  const { data, loading, error, refetch } = useFetchOnMount(
    async (signal) => {
      const [items, stats] = await Promise.all([
        invoke("get_items"),
        invoke("get_stats"),
      ]);
      if (signal.aborted) return null;
      return { items, stats };
    },
    {
      errorMessage: "Failed to load page data",
    }
  );

  // Tab navigation
  const tabState = useTabs({
    defaultTab: "list",
    onChange: (tab) => console.log("Switched to:", tab),
  });

  // Modal state
  const detailsModal = useModal();
  const settingsModal = useModal({
    onClose: () => refetch(), // Refetch after settings change
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <Button onClick={settingsModal.open}>Settings</Button>

      <div role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} {...tabState.getTabProps(tab)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div {...tabState.getPanelProps("list")}>
        {data.items.map((item) => (
          <Card key={item.id} onClick={detailsModal.open}>
            {item.name}
          </Card>
        ))}
      </div>

      {detailsModal.isOpen && (
        <div
          onClick={detailsModal.backdropClickHandler}
          onKeyDown={detailsModal.keyDownHandler}
        >
          <Modal onClose={detailsModal.close}>Details</Modal>
        </div>
      )}

      {settingsModal.isOpen && (
        <div
          onClick={settingsModal.backdropClickHandler}
          onKeyDown={settingsModal.keyDownHandler}
        >
          <Modal onClose={settingsModal.close}>Settings</Modal>
        </div>
      )}
    </div>
  );
}
```

**Total savings:** ~50 lines of boilerplate replaced with 10 lines of hooks

## Migration Guide

To migrate existing page components:

1. **Find modal patterns** - Look for `useState<boolean>` with backdrop/escape handlers → Replace with `useModal`
2. **Find tab patterns** - Look for `activeTab` state with ARIA attributes → Replace with `useTabs`
3. **Find fetch patterns** - Look for `useEffect` + `useState` + AbortController → Replace with `useFetchOnMount`
4. **Test thoroughly** - All hooks have unit tests in `.test.ts` files

## TypeScript Benefits

All hooks are fully typed:

- `useModal` - No generic needed, simple boolean state
- `useTabs<T>` - Generic tab ID type for type-safe tab navigation
- `useFetchOnMount<T>` - Generic data type for type-safe fetch results

Example:

```tsx
type TabId = "overview" | "details" | "settings";
const tabs = useTabs<TabId>({ defaultTab: "overview" });
// tabs.setActiveTab("invalid") // TypeScript error!
// tabs.setActiveTab("overview") // OK
```
