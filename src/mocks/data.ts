/**
 * Mock data for development without backend
 * Shows diverse job types across different career paths
 */

export const mockJobs = [
  {
    id: 1,
    hash: "job-hash-1",
    title: "SEO Manager",
    company: "Shopify",
    location: "Remote",
    description: "Lead SEO strategy for our e-commerce platform. Experience with Google Analytics, Semrush, technical SEO, and content optimization required. You'll work with our marketing team to drive organic growth...",
    url: "https://example.com/jobs/1",
    source: "greenhouse",
    salary_min: 95000,
    salary_max: 130000,
    remote: true,
    score: 0.92,
    hidden: false,
    bookmarked: true,
    notes: "Great fit - has Shopify experience requirement",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    hash: "job-hash-2",
    title: "Senior Software Engineer",
    company: "Stripe",
    location: "San Francisco, CA",
    description: "Build reliable, scalable payment infrastructure. Strong experience with distributed systems, API design, and either Go, Ruby, or Java required...",
    url: "https://example.com/jobs/2",
    source: "greenhouse",
    salary_min: 180000,
    salary_max: 250000,
    remote: false,
    score: 0.88,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 3,
    hash: "job-hash-3",
    title: "Product Manager",
    company: "Figma",
    location: "Remote",
    description: "Own the product roadmap for our collaboration features. Work closely with design and engineering to ship delightful user experiences. 5+ years PM experience required...",
    url: "https://example.com/jobs/3",
    source: "lever",
    salary_min: 160000,
    salary_max: 200000,
    remote: true,
    score: 0.85,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 4,
    hash: "job-hash-4",
    title: "Data Scientist",
    company: "Airbnb",
    location: "Remote",
    description: "Apply machine learning to improve search and recommendations. Strong Python, SQL, and experimentation experience required. PhD or MS preferred...",
    url: "https://example.com/jobs/4",
    source: "greenhouse",
    salary_min: 170000,
    salary_max: 220000,
    remote: true,
    score: 0.82,
    hidden: false,
    bookmarked: true,
    notes: "Need to brush up on ML algorithms",
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 5,
    hash: "job-hash-5",
    title: "E-Commerce Manager",
    company: "Wayfair",
    location: "Boston, MA",
    description: "Drive conversion optimization and merchandising strategy for our home goods categories. Experience with Salesforce Commerce Cloud, A/B testing, and e-commerce analytics...",
    url: "https://example.com/jobs/5",
    source: "indeed",
    salary_min: 85000,
    salary_max: 120000,
    remote: false,
    score: 0.79,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: 6,
    hash: "job-hash-6",
    title: "UX Designer",
    company: "Notion",
    location: "Remote",
    description: "Design intuitive workflows for knowledge management. Proficiency in Figma, user research, and design systems. Portfolio demonstrating B2B SaaS work required...",
    url: "https://example.com/jobs/6",
    source: "greenhouse",
    salary_min: 140000,
    salary_max: 180000,
    remote: true,
    score: 0.76,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 518400000).toISOString(),
  },
  {
    id: 7,
    hash: "job-hash-7",
    title: "Account Executive",
    company: "HubSpot",
    location: "Remote",
    description: "Sell our marketing automation platform to mid-market companies. 3+ years B2B SaaS sales experience. Proven track record of exceeding quota...",
    url: "https://example.com/jobs/7",
    source: "linkedin",
    salary_min: 80000,
    salary_max: 160000,
    remote: true,
    score: 0.73,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: 8,
    hash: "job-hash-8",
    title: "Content Marketing Manager",
    company: "Mailchimp",
    location: "Atlanta, GA",
    description: "Lead content strategy for our small business audience. SEO writing, editorial calendar management, and experience with marketing automation platforms...",
    url: "https://example.com/jobs/8",
    source: "greenhouse",
    salary_min: 75000,
    salary_max: 100000,
    remote: false,
    score: 0.71,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 691200000).toISOString(),
  },
];

export const mockConfig = {
  title_allowlist: ["SEO Manager", "E-Commerce Manager", "Digital Marketing"],
  title_blocklist: [],
  keywords_boost: ["SEO", "Google Analytics", "Shopify", "E-commerce"],
  keywords_exclude: [],
  location_preferences: {
    allow_remote: true,
    allow_hybrid: true,
    allow_onsite: true,
    cities: ["Remote", "San Francisco", "New York"],
  },
  salary_floor_usd: 80000,
  alerts: {
    slack: {
      enabled: false,
      webhook_url: "",
    },
    email: {
      enabled: false,
      smtp_server: "",
      smtp_port: 587,
      smtp_username: "",
      smtp_password: "",
      from_email: "",
      to_emails: [],
      use_starttls: true,
    },
  },
  linkedin: {
    enabled: false,
    session_cookie: "",
    query: "software engineer",
    location: "United States",
    remote_only: true,
    limit: 50,
  },
  indeed: {
    enabled: false,
    query: "software engineer",
    location: "United States",
    radius: 50,
    limit: 50,
  },
  auto_refresh: {
    enabled: true,
    interval_minutes: 30,
  },
};

export const mockStatistics = {
  total_jobs: 156,
  new_today: 18,
  high_matches: 12,
  hidden_count: 23,
  average_score: 0.78,
  by_source: {
    linkedin: 52,
    greenhouse: 41,
    lever: 28,
    indeed: 35,
  },
};

export const mockApplications = {
  saved: [
    { id: 1, job_hash: "job-hash-1", job_title: "SEO Manager", company: "Shopify", status: "saved", applied_at: null, notes: null, last_contact: null },
  ],
  applied: [
    { id: 2, job_hash: "job-hash-5", job_title: "E-Commerce Manager", company: "Wayfair", status: "applied", applied_at: new Date(Date.now() - 604800000).toISOString(), notes: "Applied via website", last_contact: null },
  ],
  phone_screen: [
    { id: 3, job_hash: "job-hash-8", job_title: "Content Marketing Manager", company: "Mailchimp", status: "phone_screen", applied_at: new Date(Date.now() - 1209600000).toISOString(), notes: "Recruiter reached out", last_contact: new Date(Date.now() - 86400000).toISOString() },
  ],
  technical: [],
  onsite: [],
  offer: [],
  accepted: [],
  rejected: [],
  withdrawn: [],
  ghosted: [],
};

export const mockApplicationStats = {
  total: 15,
  by_status: {
    to_apply: 5,
    applied: 6,
    screening_call: 2,
    phone_interview: 1,
    technical_interview: 0,
    onsite_interview: 0,
    offer_received: 1,
    offer_accepted: 0,
    offer_rejected: 0,
    rejected: 0,
    ghosted: 0,
    withdrawn: 0,
  },
  response_rate: 33.3,
  offer_rate: 16.7,
  weekly_applications: [
    { week: "2026-01", count: 3 },
    { week: "2026-02", count: 5 },
    { week: "2026-03", count: 4 },
    { week: "2026-04", count: 3 },
  ],
};

export const mockUpcomingInterviews: Array<{
  id: number;
  application_id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  interviewer_name: string | null;
  interviewer_title: string | null;
  notes: string | null;
  completed: boolean;
  outcome: string | null;
  job_title: string;
  company: string;
}> = [
  {
    id: 1,
    application_id: 3,
    interview_type: "phone",
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: 30,
    location: "Zoom",
    interviewer_name: "Sarah Chen",
    interviewer_title: "Marketing Director",
    notes: "Prepare examples of SEO campaigns",
    completed: false,
    outcome: null,
    job_title: "Content Marketing Manager",
    company: "Mailchimp",
  },
  {
    id: 2,
    application_id: 2,
    interview_type: "technical",
    scheduled_at: new Date(Date.now() + 259200000).toISOString(),
    duration_minutes: 60,
    location: "Google Meet",
    interviewer_name: "Mike Johnson",
    interviewer_title: "VP of E-Commerce",
    notes: "Case study: conversion optimization",
    completed: false,
    outcome: null,
    job_title: "E-Commerce Manager",
    company: "Wayfair",
  },
];

export const mockPendingReminders = [
  {
    id: 1,
    application_id: 2,
    reminder_type: "follow_up",
    reminder_time: new Date(Date.now() + 172800000).toISOString(),
    message: "Follow up on application status",
    job_hash: "job-hash-5",
    job_title: "E-Commerce Manager",
    company: "Wayfair",
  },
];
