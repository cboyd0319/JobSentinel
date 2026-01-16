import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ErrorBoundary, LoadingSpinner, SkipToContent, CommandPalette, PageErrorBoundary } from "./components";
import { KeyboardShortcutsProvider } from "./contexts/KeyboardShortcutsContext";
import { logError } from "./utils/errorUtils";

// Lazy load pages for better initial load performance
const SetupWizard = lazy(() => import("./pages/SetupWizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Applications = lazy(() => import("./pages/Applications"));
const Resume = lazy(() => import("./pages/Resume"));
const Salary = lazy(() => import("./pages/Salary"));
const Market = lazy(() => import("./pages/Market"));

// Loading fallback for lazy-loaded pages
function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner message={message} />
    </div>
  );
}

type Page = "dashboard" | "applications" | "resume" | "salary" | "market";

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showSettings, setShowSettings] = useState(false);

  const checkFirstRun = useCallback(async () => {
    try {
      const firstRun = await invoke<boolean>("is_first_run");
      setIsFirstRun(firstRun);
    } catch (error) {
      logError("Failed to check first run:", error);
      setIsFirstRun(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkFirstRun();
  }, [checkFirstRun]);

  const handleSetupComplete = () => {
    setIsFirstRun(false);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <LoadingSpinner message="Initializing JobSentinel..." />;
  }

  if (isFirstRun) {
    return (
      <ErrorBoundary>
        <SkipToContent />
        <div className="min-h-screen" id="main-content">
          <Suspense fallback={<PageLoader message="Loading setup wizard..." />}>
            <SetupWizard onComplete={handleSetupComplete} />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  return (
    <ErrorBoundary>
      <KeyboardShortcutsProvider
        onNavigate={(page) => navigateTo(page as Page)}
        onOpenSettings={openSettings}
      >
        <SkipToContent />
        <CommandPalette />
        <div className="min-h-screen" id="main-content">
          <Suspense fallback={<PageLoader />}>
            {currentPage === "dashboard" && (
              <PageErrorBoundary pageName="Dashboard">
                <Dashboard
                  onNavigate={navigateTo}
                  showSettings={showSettings}
                  onShowSettingsChange={setShowSettings}
                />
              </PageErrorBoundary>
            )}
            {currentPage === "applications" && (
              <PageErrorBoundary pageName="Applications" onBack={() => navigateTo("dashboard")}>
                <Applications onBack={() => navigateTo("dashboard")} />
              </PageErrorBoundary>
            )}
            {currentPage === "resume" && (
              <PageErrorBoundary pageName="Resume" onBack={() => navigateTo("dashboard")}>
                <Resume onBack={() => navigateTo("dashboard")} />
              </PageErrorBoundary>
            )}
            {currentPage === "salary" && (
              <PageErrorBoundary pageName="Salary" onBack={() => navigateTo("dashboard")}>
                <Salary onBack={() => navigateTo("dashboard")} />
              </PageErrorBoundary>
            )}
            {currentPage === "market" && (
              <PageErrorBoundary pageName="Market" onBack={() => navigateTo("dashboard")}>
                <Market onBack={() => navigateTo("dashboard")} />
              </PageErrorBoundary>
            )}
          </Suspense>
        </div>
      </KeyboardShortcutsProvider>
    </ErrorBoundary>
  );
}

export default App;
