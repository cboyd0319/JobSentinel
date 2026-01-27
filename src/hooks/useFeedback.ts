import { useState, useCallback, useEffect } from "react";
import {
  FeedbackCategory,
  SystemInfo,
  ConfigSummary,
  DebugEvent,
  getSystemInfo,
  getConfigSummary,
  getDebugLog,
  saveFeedbackReport,
  openGitHubIssue,
  openGoogleDriveFeedbackFolder,
  revealInFileExplorer,
  formatDebugInfo,
} from "../services/feedbackService";

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
  submittedVia: "github" | "drive" | null;
  savedFilePath: string | null;

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
  submitViaDrive: () => Promise<void>;

  // Utility
  getFormattedDebugInfo: () => string | null;
  revealSavedFile: () => Promise<void>;
  openDriveFolder: () => Promise<void>;
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
    savedFilePath: null,
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
        console.error("Failed to load debug data:", error);
        setState(prev => ({
          ...prev,
          error: "Failed to load system information. You can still submit feedback.",
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
      savedFilePath: null,
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
      console.error("Failed to open GitHub issue:", error);
      setState(prev => ({
        ...prev,
        submitting: false,
        error: "Failed to open GitHub. Please try the Google Drive option.",
      }));
    }
  }, [state.category, state.description, getFormattedDebugInfo]);

  const submitViaDrive = useCallback(async () => {
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
          submittedVia: "drive",
          savedFilePath: filePath,
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
      console.error("Failed to save feedback report:", error);
      setState(prev => ({
        ...prev,
        submitting: false,
        error: "Failed to save file. Please try again or use GitHub Issues.",
      }));
    }
  }, [state.category, state.description, state.includeDebugInfo]);

  const revealSavedFile = useCallback(async () => {
    if (state.savedFilePath) {
      try {
        await revealInFileExplorer(state.savedFilePath);
      } catch (error) {
        console.error("Failed to reveal file:", error);
      }
    }
  }, [state.savedFilePath]);

  const openDriveFolder = useCallback(async () => {
    try {
      await openGoogleDriveFeedbackFolder();
    } catch (error) {
      console.error("Failed to open Drive folder:", error);
    }
  }, []);

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
    submitViaDrive,
    getFormattedDebugInfo,
    revealSavedFile,
    openDriveFolder,
  };
}
