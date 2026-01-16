/**
 * Mock data for development without backend
 */

export const mockJobs = [
  {
    id: 1,
    hash: "job-hash-1",
    title: "Senior Software Engineer",
    company: "TechCorp",
    location: "San Francisco, CA",
    description: "We are looking for a senior software engineer to join our team...",
    url: "https://example.com/jobs/1",
    source: "linkedin",
    salary_min: 150000,
    salary_max: 200000,
    remote: true,
    score: 0.92,
    hidden: false,
    bookmarked: true,
    notes: "Great company culture",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 2,
    hash: "job-hash-2",
    title: "Full Stack Developer",
    company: "StartupXYZ",
    location: "Remote",
    description: "Join our fast-growing startup as a full stack developer...",
    url: "https://example.com/jobs/2",
    source: "greenhouse",
    salary_min: 120000,
    salary_max: 160000,
    remote: true,
    score: 0.85,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 3,
    hash: "job-hash-3",
    title: "Backend Engineer",
    company: "DataFlow Inc",
    location: "New York, NY",
    description: "Build scalable backend systems for data processing...",
    url: "https://example.com/jobs/3",
    source: "lever",
    salary_min: 140000,
    salary_max: 180000,
    remote: false,
    score: 0.78,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 4,
    hash: "job-hash-4",
    title: "DevOps Engineer",
    company: "CloudScale",
    location: "Seattle, WA",
    description: "Manage and improve our cloud infrastructure...",
    url: "https://example.com/jobs/4",
    source: "indeed",
    salary_min: 130000,
    salary_max: 170000,
    remote: true,
    score: 0.71,
    hidden: false,
    bookmarked: true,
    notes: "Good benefits package",
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 5,
    hash: "job-hash-5",
    title: "Frontend Developer",
    company: "DesignHub",
    location: "Austin, TX",
    description: "Create beautiful user interfaces with React...",
    url: "https://example.com/jobs/5",
    source: "linkedin",
    salary_min: 110000,
    salary_max: 150000,
    remote: true,
    score: 0.65,
    hidden: false,
    bookmarked: false,
    notes: null,
    created_at: new Date(Date.now() - 432000000).toISOString(),
  },
];

export const mockConfig = {
  keywords: ["software engineer", "full stack", "backend"],
  locations: ["San Francisco", "Remote", "New York"],
  min_salary: 100000,
  excluded_companies: ["BadCorp"],
  alert_webhook: null,
  email_notifications: null,
  auto_refresh: {
    enabled: true,
    interval_minutes: 30,
  },
};

export const mockStatistics = {
  total_jobs: 127,
  new_today: 12,
  high_matches: 23,
  hidden_count: 15,
  by_source: {
    linkedin: 45,
    greenhouse: 32,
    lever: 28,
    indeed: 22,
  },
};

export const mockApplications = {
  saved: [
    { id: 1, job_hash: "job-hash-1", job_title: "Senior Software Engineer", company: "TechCorp", status: "saved", applied_at: null, notes: null, last_contact: null },
  ],
  applied: [
    { id: 2, job_hash: "job-hash-2", job_title: "Full Stack Developer", company: "StartupXYZ", status: "applied", applied_at: new Date(Date.now() - 604800000).toISOString(), notes: "Applied via website", last_contact: null },
  ],
  phone_screen: [
    { id: 3, job_hash: "job-hash-3", job_title: "Backend Engineer", company: "DataFlow Inc", status: "phone_screen", applied_at: new Date(Date.now() - 1209600000).toISOString(), notes: "Scheduled for Thursday", last_contact: new Date(Date.now() - 86400000).toISOString() },
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
    duration_minutes: 45,
    location: "Zoom",
    interviewer_name: "Jane Smith",
    interviewer_title: "Engineering Manager",
    notes: "Prepare system design questions",
    completed: false,
    outcome: null,
    job_title: "Backend Engineer",
    company: "DataFlow Inc",
  },
  {
    id: 2,
    application_id: 2,
    interview_type: "technical",
    scheduled_at: new Date(Date.now() + 259200000).toISOString(),
    duration_minutes: 60,
    location: "Google Meet",
    interviewer_name: "John Doe",
    interviewer_title: "Senior Engineer",
    notes: null,
    completed: false,
    outcome: null,
    job_title: "Full Stack Developer",
    company: "StartupXYZ",
  },
];

export const mockPendingReminders = [
  {
    id: 1,
    application_id: 2,
    reminder_type: "follow_up",
    reminder_time: new Date(Date.now() + 172800000).toISOString(),
    message: "Follow up on application status",
    job_hash: "job-hash-2",
    job_title: "Full Stack Developer",
    company: "StartupXYZ",
  },
];
