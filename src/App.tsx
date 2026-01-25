import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import { default as ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { SkipToContent } from "./components/SkipToContent";
import { CommandPalette } from "./components/CommandPalette";
import { default as PageErrorBoundary } from "./components/PageErrorBoundary";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import { OnboardingProvider, useOnboarding } from "./components/OnboardingTour";
import { Navigation } from "./components/Navigation";
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from "./contexts/KeyboardShortcutsContext";
import { logError } from "./utils/errorUtils";
import { defaultTourSteps } from "./config/tourSteps";

// Lazy load pages for better initial load performance
const SetupWizard = lazy(() => import("./pages/SetupWizard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Applications = lazy(() => import("./pages/Applications"));
const Resume = lazy(() => import("./pages/Resume"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const ResumeOptimizer = lazy(() => import("./pages/ResumeOptimizer"));
const Salary = lazy(() => import("./pages/Salary"));
const Market = lazy(() => import("./pages/Market"));
const ApplicationProfile = lazy(() => import("./pages/ApplicationProfile"));

// Loading fallback for lazy-loaded pages
function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner message={message} />
    </div>
  );
}

// Global keyboard help modal - consumes context
function GlobalKeyboardHelp() {
  const { isHelpOpen, closeHelp } = useKeyboardShortcuts();
  return <KeyboardShortcutsHelp isOpen={isHelpOpen} onClose={closeHelp} />;
}

// Auto-start tour after setup completion
function TourStartTrigger({ shouldStart, onStarted }: { shouldStart: boolean; onStarted: () => void }) {
  const { startTour, hasCompletedTour } = useOnboarding();

  useEffect(() => {
    if (shouldStart && !hasCompletedTour) {
      // Small delay to let the dashboard render first
      const timer = setTimeout(() => {
        startTour();
        onStarted();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldStart, hasCompletedTour, startTour, onStarted]);

  return null;
}

type Page = "dashboard" | "applications" | "resume" | "resume-builder" | "ats-optimizer" | "salary" | "market" | "automation";

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [shouldStartTour, setShouldStartTour] = useState(false);

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
    // Trigger tour after setup completes
    setShouldStartTour(true);
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  // Moved before early returns to comply with hooks rules
  const openSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

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

  return (
    <ErrorBoundary>
      <KeyboardShortcutsProvider
        onNavigate={(page) => navigateTo(page as Page)}
        onOpenSettings={openSettings}
      >
        <OnboardingProvider steps={defaultTourSteps}>
          <SkipToContent />
          <CommandPalette />
          <GlobalKeyboardHelp />
          <TourStartTrigger shouldStart={shouldStartTour} onStarted={() => setShouldStartTour(false)} />
          
          {/* Navigation sidebar */}
          <Navigation currentPage={currentPage} onNavigate={navigateTo} />
          
          {/* Main content with left margin for sidebar */}
          <div className="min-h-screen ml-16" id="main-content">
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
              {currentPage === "resume-builder" && (
                <PageErrorBoundary pageName="Resume Builder" onBack={() => navigateTo("dashboard")}>
                  <ResumeBuilder onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
              {currentPage === "ats-optimizer" && (
                <PageErrorBoundary pageName="ATS Optimizer" onBack={() => navigateTo("dashboard")}>
                  <ResumeOptimizer onBack={() => navigateTo("dashboard")} onNavigate={navigateTo} />
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
              {currentPage === "automation" && (
                <PageErrorBoundary pageName="One-Click Apply" onBack={() => navigateTo("dashboard")}>
                  <ApplicationProfile onBack={() => navigateTo("dashboard")} />
                </PageErrorBoundary>
              )}
            </Suspense>
          </div>
        </OnboardingProvider>
      </KeyboardShortcutsProvider>
    </ErrorBoundary>
  );
}

export default App;
