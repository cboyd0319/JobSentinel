import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Page } from "./routes";
import { default as ErrorBoundary } from "../components/ErrorBoundary";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { SkipToContent } from "../components/SkipToContent";
import { CommandPalette } from "../components/CommandPalette";
import { default as PageErrorBoundary } from "../components/PageErrorBoundary";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp";
import { OnboardingProvider } from "../components/OnboardingTour";
import { useOnboarding } from "../hooks/useOnboarding";
import { Navigation } from "./Navigation";
import { KeyboardShortcutsProvider } from "../contexts/KeyboardShortcutsContext";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { logError } from "../utils/errorUtils";
import { defaultTourSteps } from "../config/tourSteps";
import {
  copySanitizedDebugReport,
  saveSanitizedDebugReport,
} from "../services/feedbackService";

// Lazy load pages for better initial load performance
const SetupWizard = lazy(() => import("../pages/SetupWizard"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Applications = lazy(() => import("../pages/Applications"));
const Resume = lazy(() => import("../pages/Resume"));
const ResumeBuilder = lazy(() => import("../pages/ResumeBuilder"));
const ResumeOptimizer = lazy(() => import("../pages/ResumeOptimizer"));
const Salary = lazy(() => import("../pages/Salary"));
const Market = lazy(() => import("../pages/Market"));
const ApplicationProfile = lazy(() => import("../pages/ApplicationProfile"));

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

export function StartupRecovery({
  onRetry,
}: {
  onRetry: () => void;
}) {
  const [reportStatus, setReportStatus] = useState<
    "idle" | "copying" | "copied" | "saving" | "saved" | "failed"
  >("idle");

  const copyReport = async () => {
    setReportStatus("copying");
    try {
      await copySanitizedDebugReport();
      setReportStatus("copied");
    } catch (error) {
      logError("Failed to copy startup support report:", error);
      setReportStatus("failed");
    }
  };

  const saveReport = async () => {
    setReportStatus("saving");
    try {
      const saved = await saveSanitizedDebugReport();
      setReportStatus(saved ? "saved" : "idle");
    } catch (error) {
      logError("Failed to save startup support report:", error);
      setReportStatus("failed");
    }
  };

  return (
    <ErrorBoundary>
      <SkipToContent />
      <main
        className="min-h-screen bg-surface-950 text-white flex items-center justify-center px-6"
        id="main-content"
        tabIndex={-1}
      >
        <section className="w-full max-w-lg rounded-card border border-surface-700 bg-surface-900 p-8 shadow-xl">
          <h1 className="font-display text-display-lg mb-3">
            JobSentinel could not open saved setup
          </h1>
          <p className="text-sm text-surface-300 mb-6">
            Your saved jobs and settings stay on this device. Try again, or save
            a safe support report before closing and reopening JobSentinel.
          </p>
          <div className="space-y-3">
            <button
              className="w-full rounded-lg bg-sentinel-500 px-4 py-3 text-sm font-semibold text-white hover:bg-sentinel-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-400"
              onClick={onRetry}
            >
              Try Again
            </button>
            <button
              className="w-full rounded-lg bg-surface-800 px-4 py-3 text-sm font-semibold text-surface-100 hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 disabled:opacity-50"
              disabled={reportStatus === "copying"}
              onClick={() => void copyReport()}
            >
              {reportStatus === "copying" ? "Copying..." : "Copy Safe Support Report"}
            </button>
            <button
              className="w-full rounded-lg bg-surface-800 px-4 py-3 text-sm font-semibold text-surface-100 hover:bg-surface-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-surface-400 disabled:opacity-50"
              disabled={reportStatus === "saving"}
              onClick={() => void saveReport()}
            >
              {reportStatus === "saving" ? "Saving..." : "Save Safe Support Report"}
            </button>
          </div>
          {reportStatus === "copied" && (
            <p className="mt-4 text-sm text-success" role="status">
              Safe support report copied
            </p>
          )}
          {reportStatus === "saved" && (
            <p className="mt-4 text-sm text-success" role="status">
              Safe support report saved for review
            </p>
          )}
          {reportStatus === "failed" && (
            <p className="mt-4 text-sm text-danger" role="status">
              Could not create safe support report
            </p>
          )}
        </section>
      </main>
    </ErrorBoundary>
  );
}

function App() {
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [openImportOnDashboard, setOpenImportOnDashboard] = useState(false);
  const [shouldStartTour, setShouldStartTour] = useState(false);

  const checkFirstRun = useCallback(async () => {
    try {
      setStartupError(false);
      setLoading(true);
      const firstRun = await invoke<boolean>("is_first_run");
      setIsFirstRun(firstRun);
    } catch (error) {
      logError("Failed to check first run:", error);
      setStartupError(true);
      setIsFirstRun(false);
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

  const openJobImportFromApplications = useCallback(() => {
    setOpenImportOnDashboard(true);
    setCurrentPage("dashboard");
  }, []);

  if (loading) {
    return <LoadingSpinner message="Initializing JobSentinel..." />;
  }

  if (startupError) {
    return <StartupRecovery onRetry={() => void checkFirstRun()} />;
  }

  if (isFirstRun) {
    return (
      <ErrorBoundary>
        <SkipToContent />
        <div className="min-h-screen" id="main-content" tabIndex={-1}>
          <Suspense fallback={<PageLoader message="Getting JobSentinel ready..." />}>
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
          <div className="min-h-screen ml-16 overflow-x-hidden" id="main-content" tabIndex={-1}>
            <Suspense fallback={<PageLoader />}>
              {currentPage === "dashboard" && (
                <PageErrorBoundary pageName="Dashboard">
                  <Dashboard
                    onNavigate={navigateTo}
                    showSettings={showSettings}
                    onShowSettingsChange={setShowSettings}
                    openImportOnMount={openImportOnDashboard}
                    onImportHandled={() => setOpenImportOnDashboard(false)}
                  />
                </PageErrorBoundary>
              )}
              {currentPage === "applications" && (
                <PageErrorBoundary pageName="Applications" onBack={() => navigateTo("dashboard")}>
                  <Applications
                    onBack={() => navigateTo("dashboard")}
                    onImportJob={openJobImportFromApplications}
                  />
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
                <PageErrorBoundary pageName="Resume Match" onBack={() => navigateTo("dashboard")}>
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
                <PageErrorBoundary pageName="Application Assist" onBack={() => navigateTo("dashboard")}>
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
