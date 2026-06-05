import { getArg, getNumericArg, getStringArg } from "./commandHelpers";
import {
  getDefaultMockCoverLetterTemplates,
  getNextMockCoverLetterTemplateId,
  getNextMockSavedSearchId,
  normalizeMockCoverLetterTemplate,
  normalizeMockNotificationPreferences,
  normalizeMockSavedSearch,
} from "./coreCommands";
import type {
  MockCoverLetterTemplate,
  MockSavedSearch,
  NotificationPreferences,
} from "./types";

export interface MockUserDataCommandState {
  coverLetterTemplates: MockCoverLetterTemplate[];
  savedSearches: MockSavedSearch[];
  searchHistory: string[];
  notificationPreferences: NotificationPreferences | null;
}

export interface MockUserDataCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockUserDataCommandState;
  value: unknown;
}

export function handleMockUserDataCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  switch (command) {
    case "seed_default_templates":
      return seedDefaultTemplates(state);

    case "list_cover_letter_templates":
      return {
        handled: true,
        shouldSave: false,
        state,
        value: state.coverLetterTemplates.map((template) => ({ ...template })),
      };

    case "get_cover_letter_template":
      return {
        handled: true,
        shouldSave: false,
        state,
        value:
          state.coverLetterTemplates.find(
            (template) => template.id === getStringArg(args, "id"),
          ) ?? null,
      };

    case "create_cover_letter_template":
      return createCoverLetterTemplate(args, state);

    case "update_cover_letter_template":
      return updateCoverLetterTemplate(args, state);

    case "delete_cover_letter_template":
      return deleteCoverLetterTemplate(args, state);

    case "get_notification_preferences":
      return getNotificationPreferences(state);

    case "save_notification_preferences":
      return {
        handled: true,
        shouldSave: true,
        state: {
          ...state,
          notificationPreferences: normalizeMockNotificationPreferences(
            getArg(args, "prefs"),
          ),
        },
        value: undefined,
      };

    case "get_search_history": {
      const limit = Math.max(0, Math.min(getNumericArg(args, "limit") ?? 20, 50));
      return {
        handled: true,
        shouldSave: false,
        state,
        value: state.searchHistory.slice(0, limit),
      };
    }

    case "list_saved_searches":
      return {
        handled: true,
        shouldSave: false,
        state,
        value: state.savedSearches.map((search) => ({ ...search })),
      };

    case "create_saved_search":
      return createSavedSearch(args, state);

    case "use_saved_search":
      return markSavedSearchUsed(args, state);

    case "delete_saved_search":
      return deleteSavedSearch(args, state);

    case "add_search_history":
      return addSearchHistory(args, state);

    case "clear_search_history":
      return {
        handled: true,
        shouldSave: true,
        state: { ...state, searchHistory: [] },
        value: undefined,
      };

    default:
      return {
        handled: false,
        shouldSave: false,
        state,
        value: undefined,
      };
  }
}

function seedDefaultTemplates(
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  if (state.coverLetterTemplates.length > 0) {
    return { handled: true, shouldSave: false, state, value: 0 };
  }

  const coverLetterTemplates = getDefaultMockCoverLetterTemplates();
  return {
    handled: true,
    shouldSave: true,
    state: { ...state, coverLetterTemplates },
    value: coverLetterTemplates.length,
  };
}

function createCoverLetterTemplate(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const now = new Date().toISOString();
  const template = normalizeMockCoverLetterTemplate(
    {
      id: getNextMockCoverLetterTemplateId(state.coverLetterTemplates),
      name: getStringArg(args, "name"),
      content: getStringArg(args, "content"),
      category: getStringArg(args, "category"),
      createdAt: now,
      updatedAt: now,
    },
    getNextMockCoverLetterTemplateId(state.coverLetterTemplates),
  );
  const coverLetterTemplates = [
    template,
    ...state.coverLetterTemplates.filter((existing) => existing.id !== template.id),
  ];

  return {
    handled: true,
    shouldSave: true,
    state: { ...state, coverLetterTemplates },
    value: { ...template },
  };
}

function updateCoverLetterTemplate(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const id = getStringArg(args, "id");
  const existingTemplate = state.coverLetterTemplates.find(
    (template) => template.id === id,
  );
  if (!existingTemplate) {
    return { handled: true, shouldSave: false, state, value: null };
  }

  const updatedTemplate = normalizeMockCoverLetterTemplate(
    {
      ...existingTemplate,
      name: getStringArg(args, "name") ?? existingTemplate.name,
      content: getStringArg(args, "content") ?? existingTemplate.content,
      category: getStringArg(args, "category") ?? existingTemplate.category,
      updatedAt: new Date().toISOString(),
    },
    getNextMockCoverLetterTemplateId(state.coverLetterTemplates),
  );
  const coverLetterTemplates = state.coverLetterTemplates.map((template) =>
    template.id === id ? updatedTemplate : template,
  );

  return {
    handled: true,
    shouldSave: true,
    state: { ...state, coverLetterTemplates },
    value: { ...updatedTemplate },
  };
}

function deleteCoverLetterTemplate(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const id = getStringArg(args, "id");
  const coverLetterTemplates = state.coverLetterTemplates.filter(
    (template) => template.id !== id,
  );
  const deleted = coverLetterTemplates.length !== state.coverLetterTemplates.length;

  return {
    handled: true,
    shouldSave: deleted,
    state: { ...state, coverLetterTemplates },
    value: deleted,
  };
}

function getNotificationPreferences(
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const notificationPreferences =
    state.notificationPreferences ?? normalizeMockNotificationPreferences(null);

  return {
    handled: true,
    shouldSave: !state.notificationPreferences,
    state: { ...state, notificationPreferences },
    value: normalizeMockNotificationPreferences(notificationPreferences),
  };
}

function createSavedSearch(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const search = {
    ...normalizeMockSavedSearch(
      getArg(args, "search"),
      getNextMockSavedSearchId(state.savedSearches),
    ),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
  const savedSearches = [
    search,
    ...state.savedSearches.filter((saved) => saved.id !== search.id),
  ];

  return {
    handled: true,
    shouldSave: true,
    state: { ...state, savedSearches },
    value: { ...search },
  };
}

function markSavedSearchUsed(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  let found = false;
  const lastUsedAt = new Date().toISOString();
  const id = getStringArg(args, "id");
  const savedSearches = state.savedSearches.map((search) => {
    if (search.id !== id) return search;
    found = true;
    return { ...search, lastUsedAt };
  });

  return {
    handled: true,
    shouldSave: found,
    state: { ...state, savedSearches },
    value: found,
  };
}

function deleteSavedSearch(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const id = getStringArg(args, "id");
  const savedSearches = state.savedSearches.filter((search) => search.id !== id);
  const deleted = savedSearches.length !== state.savedSearches.length;

  return {
    handled: true,
    shouldSave: deleted,
    state: { ...state, savedSearches },
    value: deleted,
  };
}

function addSearchHistory(
  args: Record<string, unknown> | undefined,
  state: MockUserDataCommandState,
): MockUserDataCommandResult {
  const query = getStringArg(args, "query")?.trim();
  if (!query || query.length < 2) {
    return { handled: true, shouldSave: false, state, value: undefined };
  }

  return {
    handled: true,
    shouldSave: true,
    state: {
      ...state,
      searchHistory: [
        query,
        ...state.searchHistory.filter((entry) => entry !== query),
      ].slice(0, 50),
    },
    value: undefined,
  };
}
