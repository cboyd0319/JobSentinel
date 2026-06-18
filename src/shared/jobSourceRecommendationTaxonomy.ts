export const TECH_SOURCE_PROFILE_IDS = [
  "software-engineering",
  "cybersecurity",
  "data-science",
] as const;

// Role-specific terms only. Broad tool names such as SQL or AWS can appear in
// non-technical searches and should not enable tech-only job-board defaults.
export const TECH_SOURCE_TERMS = [
  "software engineer",
  "software developer",
  "web developer",
  "frontend",
  "front end",
  "frontend developer",
  "backend",
  "back end",
  "backend developer",
  "full stack",
  "full stack developer",
  "programmer",
  "devops",
  "sre",
  "site reliability",
  "platform engineer",
  "cloud engineer",
  "infrastructure engineer",
  "systems engineer",
  "cybersecurity",
  "security engineer",
  "security analyst",
  "soc analyst",
  "appsec",
  "data scientist",
  "data analyst",
  "business intelligence analyst",
  "bi analyst",
  "machine learning",
  "ml engineer",
  "ai engineer",
  "data engineer",
  "analytics engineer",
  "ux engineer",
  "design engineer",
  "react developer",
  "typescript developer",
  "javascript developer",
  "python developer",
  "rust developer",
  "java developer",
  "node developer",
  "node.js developer",
] as const;

export const REMOTE_INTENT_TERMS = ["remote"] as const;

export const STARTUP_SOURCE_TERMS = [
  "startup",
  "early stage",
  "seed",
] as const;

export const GOVERNMENT_SOURCE_TERMS = [
  "federal",
  "government",
  "clearance",
  "public sector",
] as const;

export const BUILTIN_TECH_CITY_TERMS = [
  "san francisco",
  "new york",
  "austin",
  "seattle",
  "chicago",
] as const;
