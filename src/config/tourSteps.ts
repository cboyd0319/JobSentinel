/**
 * Default onboarding tour steps for JobSentinel
 * Written in plain English for users of all technical backgrounds
 */
export const defaultTourSteps = [
  {
    target: "[data-tour='search-button']",
    title: "Find New Jobs",
    content: "Click here to search for jobs! We'll scan multiple job boards and show you the best matches based on your profile.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='settings-button']",
    title: "Customize Your Search",
    content: "Change your job titles, skills, salary preferences, or set up notifications to get alerts when great jobs appear.",
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
    content: "Track your applications, compare your resume to job posts, see salary insights, and explore job market trends.",
    placement: "top" as const,
  },
  {
    target: "[data-tour='job-filters']",
    title: "Filter Your Results",
    content: "Too many jobs? Use these filters to narrow down by quality score, job board source, or just show bookmarked jobs.",
    placement: "bottom" as const,
  },
];
