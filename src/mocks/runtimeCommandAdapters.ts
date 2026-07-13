import { handleMockApplicationAssistCommand } from "../features/application-assist/mocks/commands";
import { handleMockApplicationsCommand } from "../features/applications/mocks/commands";
import { handleMockCoverLetterTemplateCommand } from "../features/applications/mocks/coverLetterTemplateCommands";
import { handleMockInterviewCommand } from "../features/applications/mocks/interviewCommands";
import { handleMockDashboardCommand } from "../features/dashboard/mocks/commands";
import { handleMockJobImportCommand } from "../features/dashboard/mocks/jobImportCommands";
import { handleMockSavedSearchCommand } from "../features/dashboard/mocks/savedSearchCommands";
import { handleMockLinkedInWorkbenchCommand } from "../features/linkedin-workbench/mocks/commands";
import { handleMockMarketCommand } from "../features/market/mocks/commands";
import { handleMockOnboardingCommand } from "../features/onboarding/mocks/commands";
import { getMockActiveResume, handleMockResumeCommand } from "../features/resumes/mocks/resumeCommands";
import { handleMockSalaryCommand } from "../features/salary/mocks/commands";
import { handleMockSearchLinksCommand } from "../features/search-links/mocks/commands";
import { handleMockSettingsCommand } from "../features/settings/mocks/commands";
import { handleMockNotificationCommand } from "../features/settings/notifications/mockCommands";
import { handleMockSourceHealthCommand } from "../features/settings/sources/mocks/commands";
import { handleMockSupportCommand } from "../features/settings/support/mocks/commands";
import { mockRuntimeState, saveMockState } from "./runtimeState";

export type MockCommandAdapter = (
  command: string,
  args: Record<string, unknown> | undefined,
) => unknown;

export const applyMockDashboardCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockDashboardCommand(command, args, {
    jobs: mockRuntimeState.jobs,
  });
  if (!result.handled) return undefined;
  mockRuntimeState.jobs = result.state.jobs;
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockOnboardingCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockOnboardingCommand(command, args, {
    config: mockRuntimeState.config,
  });
  if (!result.handled) return undefined;
  mockRuntimeState.config = result.state.config;
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockSettingsCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockSettingsCommand(command, args, {
    config: mockRuntimeState.config,
    credentials: mockRuntimeState.credentials,
    credentialUnlock: mockRuntimeState.credentialUnlock,
    ghostConfig: mockRuntimeState.ghostConfig,
    bookmarkletConfig: mockRuntimeState.bookmarkletConfig,
    pendingBookmarkletImports: mockRuntimeState.pendingBookmarkletImports,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockSupportCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockSupportCommand(
    command,
    args,
    mockRuntimeState.config,
    Boolean(getMockActiveResume(mockRuntimeState.resumes)),
  );
  return result.handled ? result.value : undefined;
};

export const applyMockSearchLinksCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockSearchLinksCommand(command, args);
  return result.handled ? result.value : undefined;
};

export const applyMockJobImportCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockJobImportCommand(command, args, {
    jobs: mockRuntimeState.jobs,
  });
  if (!result.handled) return undefined;
  mockRuntimeState.jobs = result.state.jobs;
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockLinkedInCommand: MockCommandAdapter = (_command, args) => {
  const result = handleMockLinkedInWorkbenchCommand(args, {
    jobs: mockRuntimeState.jobs,
    applications: mockRuntimeState.applications,
    pendingReminders: mockRuntimeState.pendingReminders,
  });
  Object.assign(mockRuntimeState, result.state);
  saveMockState();
  return result.value;
};

export const applyMockApplicationsCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockApplicationsCommand(command, args, {
    jobs: mockRuntimeState.jobs,
    applications: mockRuntimeState.applications,
    pendingReminders: mockRuntimeState.pendingReminders,
    interviews: mockRuntimeState.interviews,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockResumeCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockResumeCommand(command, args, {
    jobs: mockRuntimeState.jobs,
    resumes: mockRuntimeState.resumes,
    userSkills: mockRuntimeState.userSkills,
    resumeDrafts: mockRuntimeState.resumeDrafts,
    recentMatches: mockRuntimeState.recentMatches,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockSalaryCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockSalaryCommand(command, args);
  return result.handled ? result.value : undefined;
};

export const applyMockMarketCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockMarketCommand(command, args, {
    marketAlerts: mockRuntimeState.marketAlerts,
  });
  if (!result.handled) return undefined;
  mockRuntimeState.marketAlerts = result.state.marketAlerts;
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockApplicationAssistCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockApplicationAssistCommand(command, args, {
    applicationProfile: mockRuntimeState.applicationProfile,
    screeningAnswers: mockRuntimeState.screeningAnswers,
    automationBrowserRunning: mockRuntimeState.automationBrowserRunning,
    nextAutomationAttemptId: mockRuntimeState.nextAutomationAttemptId,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockSourceHealthCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockSourceHealthCommand(command, args, {
    config: mockRuntimeState.config,
    scraperEnabledOverrides: mockRuntimeState.scraperEnabledOverrides,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockInterviewCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockInterviewCommand(command, args, {
    interviewPrepChecklists: mockRuntimeState.interviewPrepChecklists,
    interviewFollowups: mockRuntimeState.interviewFollowups,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockCoverLetterTemplateCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockCoverLetterTemplateCommand(command, args, {
    coverLetterTemplates: mockRuntimeState.coverLetterTemplates,
  });
  if (!result.handled) return undefined;
  mockRuntimeState.coverLetterTemplates = result.state.coverLetterTemplates;
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockNotificationCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockNotificationCommand(command, args, {
    notificationPreferences: mockRuntimeState.notificationPreferences,
  });
  if (!result.handled) return undefined;
  mockRuntimeState.notificationPreferences = result.state.notificationPreferences;
  if (result.shouldSave) saveMockState();
  return result.value;
};

export const applyMockSavedSearchCommand: MockCommandAdapter = (command, args) => {
  const result = handleMockSavedSearchCommand(command, args, {
    savedSearches: mockRuntimeState.savedSearches,
    searchHistory: mockRuntimeState.searchHistory,
  });
  if (!result.handled) return undefined;
  Object.assign(mockRuntimeState, result.state);
  if (result.shouldSave) saveMockState();
  return result.value;
};
