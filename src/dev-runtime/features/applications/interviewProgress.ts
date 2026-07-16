export type MockInterviewPrepState = Record<string, MockPrepChecklistItem[]>;
export type MockInterviewFollowUpState = Record<string, MockFollowUpReminder>;

interface MockPrepChecklistItem {
  itemId: string;
  completed: boolean;
  completedAt: string | null;
}

interface MockFollowUpReminder {
  interviewId: number;
  thankYouSent: boolean;
  sentAt: string | null;
}

export function normalizeInterviewPrepState(
  value: Record<string, unknown>,
): MockInterviewPrepState {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, items]) => Array.isArray(items))
      .map(([interviewId, items]) => [
        interviewId,
        (items as unknown[]).map(normalizePrepChecklistItem),
      ]),
  );
}

export function normalizeInterviewFollowUpState(
  value: Record<string, unknown>,
): MockInterviewFollowUpState {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, followup]) => isRecord(followup))
      .map(([interviewId, followup]) => [
        interviewId,
        normalizeFollowUpReminder(followup),
      ]),
  );
}

export function getMockInterviewPrepChecklist(
  args: Record<string, unknown> | undefined,
  state: MockInterviewPrepState,
): MockPrepChecklistItem[] {
  const interviewId = getInterviewIdArg(args);
  return interviewId ? state[String(interviewId)] ?? [] : [];
}

export function saveMockInterviewPrepItem(
  args: Record<string, unknown> | undefined,
  state: MockInterviewPrepState,
): MockInterviewPrepState {
  const interviewId = getInterviewIdArg(args);
  const itemId = getStringArg(args, "itemId") ?? getStringArg(args, "item_id");
  if (!interviewId || !itemId) {
    throw new Error("interviewId and itemId are required");
  }

  const completed = booleanValue(getArg(args, "completed"), false);
  const key = String(interviewId);
  const existingItems = state[key] ?? [];
  const nextItem: MockPrepChecklistItem = {
    itemId,
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  };

  return {
    ...state,
    [key]: [
      ...existingItems.filter((item) => item.itemId !== itemId),
      nextItem,
    ],
  };
}

export function getMockInterviewFollowup(
  args: Record<string, unknown> | undefined,
  state: MockInterviewFollowUpState,
): MockFollowUpReminder | null {
  const interviewId = getInterviewIdArg(args);
  return interviewId ? state[String(interviewId)] ?? null : null;
}

export function saveMockInterviewFollowup(
  args: Record<string, unknown> | undefined,
  state: MockInterviewFollowUpState,
): {
  followup: MockFollowUpReminder;
  state: MockInterviewFollowUpState;
} {
  const interviewId = getInterviewIdArg(args);
  if (!interviewId) {
    throw new Error("interviewId is required");
  }

  const thankYouSent = booleanValue(
    getArg(args, "thankYouSent") ?? getArg(args, "thank_you_sent"),
    false,
  );
  const followup: MockFollowUpReminder = {
    interviewId,
    thankYouSent,
    sentAt: thankYouSent ? new Date().toISOString() : null,
  };

  return {
    followup,
    state: {
      ...state,
      [String(interviewId)]: followup,
    },
  };
}

function normalizePrepChecklistItem(value: unknown): MockPrepChecklistItem {
  const source = isRecord(value) ? value : {};
  return {
    itemId: typeof source.itemId === "string" ? source.itemId : "",
    completed: typeof source.completed === "boolean" ? source.completed : false,
    completedAt: nullableString(source.completedAt),
  };
}

function normalizeFollowUpReminder(value: unknown): MockFollowUpReminder {
  const source = isRecord(value) ? value : {};
  return {
    interviewId: numberValue(source.interviewId, 0),
    thankYouSent: booleanValue(source.thankYouSent, false),
    sentAt: nullableString(source.sentAt),
  };
}

function getInterviewIdArg(args?: Record<string, unknown>): number | undefined {
  return getNumericArg(args, "interviewId") ?? getNumericArg(args, "interview_id");
}

function getStringArg(
  args: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = getArg(args, key);
  return typeof value === "string" ? value : undefined;
}

function getNumericArg(
  args: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = getArg(args, key);
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getArg(
  args: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const nestedArgs = args?.payload as Record<string, unknown> | undefined;
  return args?.[key] ?? nestedArgs?.[key];
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
