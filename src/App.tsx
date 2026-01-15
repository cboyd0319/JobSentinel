import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import SetupWizard from "./pages/SetupWizard";
import Dashboard from "./pages/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { logError } from "./utils/errorUtils";

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const checkFirstRun = useCallback(async () => {
    try {
      const firstRun = await invoke<boolean>("is_first_run");
      setIsFirstRun(firstRun);
    } catch (error) {
      logError("Failed to check first run:", error);
      setIsFirstRun(true); // Default to showing setup wizard
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

  if (loading) {
    return <LoadingSpinner message="Loading JobSentinel..." />;
  }

  return (
    <ErrorBoundary>
      <div className="h-screen">
        {isFirstRun ? (
          <SetupWizard onComplete={handleSetupComplete} />
        ) : (
          <Dashboard />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
