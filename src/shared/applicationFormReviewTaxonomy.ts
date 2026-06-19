export const APPLICATION_FORM_REVIEW_PROVENANCE_ITEMS = [
  {
    id: "exact-question",
    label: "Exact question",
    detail:
      "Compare every prepared answer with the exact wording on the employer form before using it.",
  },
  {
    id: "confirmed-answers",
    label: "Confirmed answers",
    detail:
      "Use only profile details and saved answers you have confirmed are still true.",
  },
  {
    id: "voluntary-protected",
    label: "Voluntary personal questions",
    detail:
      "Voluntary or protected questions are your choice. JobSentinel does not answer them for you.",
  },
  {
    id: "unknowns",
    label: "Unknowns",
    detail:
      "Pause on anything uncertain until you can verify it from your records, resume, or the employer.",
  },
] as const;
