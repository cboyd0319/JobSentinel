/**
 * Default onboarding tour steps for JobSentinel
 * Written in plain English for users of all technical backgrounds
 */
export const defaultTourSteps = [
  {
    target: "[data-tour='search-button']",
    title: "Find New Jobs",
    content: "Use this search button to check for jobs. JobSentinel checks your selected sources and shows matches based on your saved search.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='settings-button']",
    title: "Tell JobSentinel What Matters",
    content: "Change your job titles, skills, salary preferences, or notifications so alerts match your current search.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='theme-toggle']",
    title: "Light or Dark Mode",
    content: "Prefer a dark screen? Toggle this to switch. Your choice is remembered automatically.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='quick-nav']",
    title: "More Tools",
    content: "Track your applications, compare your resume to job posts, see salary insights, and explore hiring trends.",
    placement: "top" as const,
  },
  {
    target: "[data-tour='job-filters']",
    title: "Filter Your Results",
    content: "Too many jobs? Use these filters to narrow by match strength, source, or bookmarked jobs.",
    placement: "bottom" as const,
  },
];
