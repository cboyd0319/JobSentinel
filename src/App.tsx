import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import SetupWizard from "./pages/SetupWizard";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Resume from "./pages/Resume";
import Salary from "./pages/Salary";
import Market from "./pages/Market";
import { ErrorBoundary, LoadingSpinner, SkipToContent } from "./components";
import { logError } from "./utils/errorUtils";

type Page = "dashboard" | "applications" | "resume" | "salary" | "market";

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

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
          <SetupWizard onComplete={handleSetupComplete} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SkipToContent />
      <div className="min-h-screen" id="main-content">
        {currentPage === "dashboard" && (
          <Dashboard onNavigate={navigateTo} />
        )}
        {currentPage === "applications" && (
          <Applications onBack={() => navigateTo("dashboard")} />
        )}
        {currentPage === "resume" && (
          <Resume onBack={() => navigateTo("dashboard")} />
        )}
        {currentPage === "salary" && (
          <Salary onBack={() => navigateTo("dashboard")} />
        )}
        {currentPage === "market" && (
          <Market onBack={() => navigateTo("dashboard")} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
