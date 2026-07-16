import { getArg, getStringArg } from "../../../test-support/mocks/handlers/commandHelpers";

export type MockTemplateCategory =
  | "general"
  | "tech"
  | "creative"
  | "finance"
  | "healthcare"
  | "sales"
  | "custom"
  | "thankyou"
  | "followup"
  | "withdrawal";

export interface MockCoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: MockTemplateCategory;
  createdAt: string;
  updatedAt: string;
}

interface MockCoverLetterTemplateCommandState {
  coverLetterTemplates: MockCoverLetterTemplate[];
}

export interface MockCoverLetterTemplateCommandResult {
  handled: boolean;
  shouldSave: boolean;
  state: MockCoverLetterTemplateCommandState;
  value: unknown;
}

const TEMPLATE_CATEGORIES: readonly MockTemplateCategory[] = [
  "general",
  "tech",
  "creative",
  "finance",
  "healthcare",
  "sales",
  "custom",
  "thankyou",
  "followup",
  "withdrawal",
];

export function handleMockCoverLetterTemplateCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  state: MockCoverLetterTemplateCommandState,
): MockCoverLetterTemplateCommandResult {
  switch (command) {
    case "seed_default_templates":
      return seedDefaultTemplates(state);
    case "list_cover_letter_templates":
      return withoutSave(
        state,
        state.coverLetterTemplates.map((template) => ({ ...template })),
      );
    case "get_cover_letter_template":
      return withoutSave(
        state,
        state.coverLetterTemplates.find(
          (template) => template.id === getStringArg(args, "id"),
        ) ?? null,
      );
    case "create_cover_letter_template":
      return createCoverLetterTemplate(args, state);
    case "update_cover_letter_template":
      return updateCoverLetterTemplate(args, state);
    case "delete_cover_letter_template":
      return deleteCoverLetterTemplate(args, state);
    case "import_cover_letter_templates":
      return importCoverLetterTemplates(args, state);
    default:
      return { handled: false, shouldSave: false, state, value: undefined };
  }
}

export function getNextMockCoverLetterTemplateId(
  templates: MockCoverLetterTemplate[],
): string {
  const maxId = templates.reduce((max, template) => {
    const match = /^mock-cover-letter-template-(\d+)$/.exec(template.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `mock-cover-letter-template-${maxId + 1}`;
}

export function normalizeMockCoverLetterTemplate(
  value: unknown,
  fallbackId: string,
): MockCoverLetterTemplate {
  const source = isRecord(value) ? value : {};
  const now = new Date().toISOString();

  return {
    id: typeof source.id === "string" && source.id.length > 0
      ? source.id
      : fallbackId,
    name: typeof source.name === "string" && source.name.trim().length > 0
      ? source.name.trim()
      : "Cover Letter Template",
    content: typeof source.content === "string" ? source.content : "",
    category: isTemplateCategory(source.category) ? source.category : "general",
    createdAt: typeof source.createdAt === "string" && source.createdAt.length > 0
      ? source.createdAt
      : now,
    updatedAt: typeof source.updatedAt === "string" && source.updatedAt.length > 0
      ? source.updatedAt
      : now,
  };
}

function getDefaultMockCoverLetterTemplates(): MockCoverLetterTemplate[] {
  const now = new Date().toISOString();
  const defaults: Array<
    Pick<MockCoverLetterTemplate, "name" | "category" | "content">
  > = [
    {
      name: "Professional Cover Letter",
      category: "general",
      content: "Dear {hiring_manager},\n\nI am interested in the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Customer Support Cover Letter",
      category: "general",
      content: "Dear {hiring_manager},\n\nI can bring {skill1} and {skill2} experience to the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Thank You - Post Interview",
      category: "thankyou",
      content: "Dear {hiring_manager},\n\nThank you for meeting with me about the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Application Follow-Up",
      category: "followup",
      content: "Dear {hiring_manager},\n\nI wanted to follow up on my application for the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Interview Follow-Up (No Response)",
      category: "followup",
      content: "Dear {hiring_manager},\n\nI wanted to check in on the status of the {position} process at {company}.\n\nBest regards,\n{your_name}",
    },
    {
      name: "Withdraw Application",
      category: "withdrawal",
      content: "Dear {hiring_manager},\n\nI have decided to withdraw my application for the {position} role at {company}.\n\nBest regards,\n{your_name}",
    },
  ];

  return defaults.map((template, index) => ({
    id: `mock-cover-letter-template-${index + 1}`,
    createdAt: now,
    updatedAt: now,
    ...template,
  }));
}

function seedDefaultTemplates(
  state: MockCoverLetterTemplateCommandState,
): MockCoverLetterTemplateCommandResult {
  if (state.coverLetterTemplates.length > 0) {
    return withoutSave(state, 0);
  }

  const coverLetterTemplates = getDefaultMockCoverLetterTemplates();
  return {
    handled: true,
    shouldSave: true,
    state: { coverLetterTemplates },
    value: coverLetterTemplates.length,
  };
}

function createCoverLetterTemplate(
  args: Record<string, unknown> | undefined,
  state: MockCoverLetterTemplateCommandState,
): MockCoverLetterTemplateCommandResult {
  const now = new Date().toISOString();
  const nextId = getNextMockCoverLetterTemplateId(state.coverLetterTemplates);
  const template = normalizeMockCoverLetterTemplate(
    {
      id: nextId,
      name: getStringArg(args, "name"),
      content: getStringArg(args, "content"),
      category: getStringArg(args, "category"),
      createdAt: now,
      updatedAt: now,
    },
    nextId,
  );
  const coverLetterTemplates = [
    template,
    ...state.coverLetterTemplates.filter((existing) => existing.id !== template.id),
  ];

  return saved(coverLetterTemplates, { ...template });
}

function updateCoverLetterTemplate(
  args: Record<string, unknown> | undefined,
  state: MockCoverLetterTemplateCommandState,
): MockCoverLetterTemplateCommandResult {
  const id = getStringArg(args, "id");
  const existingTemplate = state.coverLetterTemplates.find(
    (template) => template.id === id,
  );
  if (!existingTemplate) return withoutSave(state, null);

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

  return saved(coverLetterTemplates, { ...updatedTemplate });
}

function deleteCoverLetterTemplate(
  args: Record<string, unknown> | undefined,
  state: MockCoverLetterTemplateCommandState,
): MockCoverLetterTemplateCommandResult {
  const id = getStringArg(args, "id");
  const coverLetterTemplates = state.coverLetterTemplates.filter(
    (template) => template.id !== id,
  );
  const deleted = coverLetterTemplates.length !== state.coverLetterTemplates.length;

  return deleted
    ? saved(coverLetterTemplates, true)
    : withoutSave(state, false);
}

function importCoverLetterTemplates(
  args: Record<string, unknown> | undefined,
  state: MockCoverLetterTemplateCommandState,
): MockCoverLetterTemplateCommandResult {
  const input = getArg(args, "templates");
  const templates = Array.isArray(input) ? input : [];
  const nextTemplates = [...state.coverLetterTemplates];
  let imported = 0;

  for (const template of templates) {
    const normalized = normalizeMockCoverLetterTemplate(
      template,
      getNextMockCoverLetterTemplateId(nextTemplates),
    );
    if (nextTemplates.some((candidate) => candidate.id === normalized.id)) continue;
    nextTemplates.push(normalized);
    imported += 1;
  }

  return imported > 0
    ? saved(nextTemplates, imported)
    : withoutSave(state, imported);
}

function saved(
  coverLetterTemplates: MockCoverLetterTemplate[],
  value: unknown,
): MockCoverLetterTemplateCommandResult {
  return {
    handled: true,
    shouldSave: true,
    state: { coverLetterTemplates },
    value,
  };
}

function withoutSave(
  state: MockCoverLetterTemplateCommandState,
  value: unknown,
): MockCoverLetterTemplateCommandResult {
  return { handled: true, shouldSave: false, state, value };
}

function isTemplateCategory(value: unknown): value is MockTemplateCategory {
  return typeof value === "string" && TEMPLATE_CATEGORIES.includes(
    value as MockTemplateCategory,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
