export const COMMON_WORK_TO_AVOID = [
  "night shift",
  "weekend work",
  "heavy travel",
  "mandatory overtime",
] as const;

export const COMMON_STARTER_JOB_TITLES = [
  "Office Assistant",
  "Customer Service Representative",
  "Sales Associate",
  "Warehouse Associate",
  "Medical Assistant",
  "Bookkeeper",
] as const;

export type CommonWorkToAvoid = (typeof COMMON_WORK_TO_AVOID)[number];
export type CommonStarterJobTitle = (typeof COMMON_STARTER_JOB_TITLES)[number];
