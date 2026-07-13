import { useState, useCallback, useEffect } from "react";
import {
  FeedbackCategory,
  SystemInfo,
  ConfigSummary,
  DebugEvent,
  SavedFeedbackFile,
  getSystemInfo,
  getConfigSummary,
  getDebugLog,
  saveFeedbackReport,
  openGitHubIssue,
  revealSavedFeedbackFile,
  formatDebugInfo,
} from "../../../../services/feedbackService";
import { logError } from "../../../../utils/errorUtils";

export type FeedbackStep = "category" | "description" | "review" | "submit" | "success";

export interface UseFeedbackState {
  // Current step
  step: FeedbackStep;

  // Form state
  category: FeedbackCategory | null;
  description: string;
  includeDebugInfo: boolean;

  // Debug data (loaded on mount)
  systemInfo: SystemInfo | null;
  configSummary: ConfigSummary | null;
  debugEvents: DebugEvent[];

  // Loading states
  loading: boolean;
  submitting: boolean;

  // Success state
  submittedVia: "github" | "local" | null;
  savedFeedbackFile: SavedFeedbackFile | null;

  // Errors
  error: string | null;
}

export interface UseFeedbackActions {
  // Navigation
  setStep: (step: FeedbackStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;

  // Form actions
  setCategory: (category: FeedbackCategory) => void;
  setDescription: (description: string) => void;
  setIncludeDebugInfo: (include: boolean) => void;

  // Submit actions
  submitViaGitHub: () => Promise<void>;
  submitViaLocalReport: () => Promise<void>;

  // Utility
  getFormattedDebugInfo: () => string | null;
  revealSavedFile: () => Promise<void>;
}

export interface UseFeedbackResult extends UseFeedbackState, UseFeedbackActions {}

const STEP_ORDER: FeedbackStep[] = ["category", "description", "review", "submit", "success"];

export function useFeedback(): UseFeedbackResult {
  const [state, setState] = useState<UseFeedbackState>({
    step: "category",
    category: null,
    description: "",
    includeDebugInfo: true, // On by default for bugs
    systemInfo: null,
    configSummary: null,
    debugEvents: [],
    loading: true,
    submitting: false,
    submittedVia: null,
    savedFeedbackFile: null,
    error: null,
  });

  // Load debug data on mount
  useEffect(() => {
    async function loadDebugData() {
      try {
        const [systemInfo, configSummary, debugEvents] = await Promise.all([
          getSystemInfo(),
          getConfigSummary(),
          getDebugLog(),
        ]);

        setState(prev => ({
          ...prev,
          systemInfo,
          configSummary,
          debugEvents,
          loading: false,
        }));
      } catch (error) {
        logError("Failed to load feedback debug data:", error);
        setState(prev => ({
          ...prev,
          error: "Could not load safe app details. You can still submit feedback.",
          loading: false,
        }));
      }
    }

    loadDebugData();
  }, []);

  const setStep = useCallback((step: FeedbackStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const currentIndex = STEP_ORDER.indexOf(prev.step);
      const nextIndex = Math.min(currentIndex + 1, STEP_ORDER.length - 1);
      const nextStepValue = STEP_ORDER[nextIndex] as FeedbackStep;
      return { ...prev, step: nextStepValue };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      const currentIndex = STEP_ORDER.indexOf(prev.step);
      const prevIndex = Math.max(currentIndex - 1, 0);
      const prevStepValue = STEP_ORDER[prevIndex] as FeedbackStep;
      return { ...prev, step: prevStepValue };
    });
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: "category",
      category: null,
      description: "",
      includeDebugInfo: true,
      submitting: false,
      submittedVia: null,
      savedFeedbackFile: null,
      error: null,
    }));
  }, []);

  const setCategory = useCallback((category: FeedbackCategory) => {
    setState(prev => ({
      ...prev,
      category,
      // Auto-enable debug info for bugs, optional for others
      includeDebugInfo: category === "bug" ? true : prev.includeDebugInfo,
    }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setState(prev => ({ ...prev, description }));
  }, []);

  const setIncludeDebugInfo = useCallback((include: boolean) => {
    setState(prev => ({ ...prev, includeDebugInfo: include }));
  }, []);

  const getFormattedDebugInfo = useCallback((): string | null => {
    if (!state.includeDebugInfo || !state.systemInfo || !state.configSummary) {
      return null;
    }
    return formatDebugInfo(state.systemInfo, state.configSummary, state.debugEvents);
  }, [state.includeDebugInfo, state.systemInfo, state.configSummary, state.debugEvents]);

  const submitViaGitHub = useCallback(async () => {
    if (!state.category || !state.description.trim()) {
      setState(prev => ({ ...prev, error: "Please provide a category and description" }));
      return;
    }

    setState(prev => ({ ...prev, submitting: true, error: null }));

    try {
      const debugInfo = getFormattedDebugInfo();
      await openGitHubIssue(state.category, state.description, debugInfo);

      setState(prev => ({
        ...prev,
        submitting: false,
        submittedVia: "github",
        step: "success",
      }));
    } catch (error) {
      logError("Failed to open GitHub issue:", error);
      setState(prev => ({
        ...prev,
        submitting: false,
        error: "Could not open the online help page. Save a safe support report instead.",
      }));
    }
  }, [state.category, state.description, getFormattedDebugInfo]);

  const submitViaLocalReport = useCallback(async () => {
    if (!state.category || !state.description.trim()) {
      setState(prev => ({ ...prev, error: "Please provide a category and description" }));
      return;
    }

    setState(prev => ({ ...prev, submitting: true, error: null }));

    try {
      const filePath = await saveFeedbackReport(
        state.category,
        state.description,
        state.includeDebugInfo
      );

      if (filePath) {
        setState(prev => ({
          ...prev,
          submitting: false,
          submittedVia: "local",
          savedFeedbackFile: filePath,
          step: "success",
        }));
      } else {
        // User cancelled
        setState(prev => ({
          ...prev,
          submitting: false,
        }));
      }
    } catch (error) {
      logError("Failed to save feedback report:", error);
      setState(prev => ({
        ...prev,
        submitting: false,
        error: "Could not save a safe support report. Copy the report instead, or try saving again after choosing another folder.",
      }));
    }
  }, [state.category, state.description, state.includeDebugInfo]);

  const revealSavedFile = useCallback(async () => {
    if (state.savedFeedbackFile) {
      try {
        await revealSavedFeedbackFile(state.savedFeedbackFile.revealToken);
      } catch (error) {
        logError("Failed to reveal feedback file:", error);
      }
    }
  }, [state.savedFeedbackFile]);

  return {
    ...state,
    setStep,
    nextStep,
    prevStep,
    reset,
    setCategory,
    setDescription,
    setIncludeDebugInfo,
    submitViaGitHub,
    submitViaLocalReport,
    getFormattedDebugInfo,
    revealSavedFile,
  };
}
