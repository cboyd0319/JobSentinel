/**
 * Default onboarding tour steps for JobSentinel
 */
export const defaultTourSteps = [
  {
    target: "[data-tour='search-button']",
    title: "Search for Jobs",
    content: "Click here to manually scan job boards for new positions matching your preferences.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='settings-button']",
    title: "Configure Settings",
    content: "Set up your job search criteria, notification preferences, and connect LinkedIn/Indeed.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='theme-toggle']",
    title: "Toggle Dark Mode",
    content: "Switch between light and dark themes. Your preference is saved automatically.",
    placement: "bottom" as const,
  },
  {
    target: "[data-tour='quick-nav']",
    title: "Quick Navigation",
    content: "Access Applications, Resume Matcher, Salary AI, and Market Intelligence from here.",
    placement: "top" as const,
  },
  {
    target: "[data-tour='job-filters']",
    title: "Filter & Sort Jobs",
    content: "Use filters to narrow down jobs by score, source, or location. Export your results to CSV.",
    placement: "bottom" as const,
  },
];
