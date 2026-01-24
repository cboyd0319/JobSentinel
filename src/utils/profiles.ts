/**
 * Career profile utilities for zero-config onboarding
 * Loads pre-configured profiles for different career paths
 */

export interface CareerProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  salaryRange: string;
  salaryFloor: number;
  titleAllowlist: string[];
  titleBlocklist: string[];
  keywordsBoost: string[];
  keywordsExclude: string[];
  locationPreferences: {
    allow_remote: boolean;
    allow_hybrid: boolean;
    allow_onsite: boolean;
  };
  sampleTitles: string[]; // First 3-4 titles for preview
}

// Career profiles embedded at build time for instant loading
// Data sourced from profiles/*.json
export const CAREER_PROFILES: CareerProfile[] = [
  {
    id: "software-engineering",
    name: "Software & Tech",
    description: "Engineers, developers, DevOps, and SRE roles",
    icon: "code",
    salaryRange: "$100k - $250k",
    salaryFloor: 100000,
    titleAllowlist: [
      "Software Engineer", "Senior Software Engineer", "Staff Software Engineer",
      "Principal Engineer", "Backend Engineer", "Frontend Engineer", "Full Stack Engineer",
      "DevOps Engineer", "SRE", "Site Reliability Engineer", "Platform Engineer",
      "Infrastructure Engineer", "Cloud Engineer", "Systems Engineer",
      "Engineering Manager", "Director of Engineering", "VP of Engineering", "CTO"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level", "Recruiter", "Sales"],
    keywordsBoost: [
      "Python", "JavaScript", "TypeScript", "Go", "Rust", "Java", "Kubernetes",
      "AWS", "GCP", "Azure", "Docker", "Terraform", "React", "Node.js",
      "PostgreSQL", "Redis", "Kafka", "gRPC", "GraphQL", "REST API",
      "Microservices", "Distributed Systems", "CI/CD", "Agile"
    ],
    keywordsExclude: ["clearance required", "polygraph"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: false },
    sampleTitles: ["Software Engineer", "DevOps Engineer", "Staff Engineer"]
  },
  {
    id: "cybersecurity",
    name: "Security",
    description: "Security engineers, analysts, and penetration testers",
    icon: "shield",
    salaryRange: "$100k - $250k",
    salaryFloor: 130000,
    titleAllowlist: [
      "Security Engineer", "Senior Security Engineer", "Staff Security Engineer",
      "Application Security Engineer", "AppSec Engineer", "Product Security Engineer",
      "Cloud Security Engineer", "Network Security Engineer", "Security Architect",
      "Security Analyst", "SOC Analyst", "Threat Analyst", "Incident Response",
      "Penetration Tester", "Red Team", "Blue Team", "Security Consultant",
      "Security Manager", "CISO", "Head of Security", "Director of Security"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level", "Physical Security", "Security Guard"],
    keywordsBoost: [
      "Application Security", "AppSec", "Cloud Security", "AWS Security",
      "Kubernetes Security", "SAST", "DAST", "Threat Modeling", "Penetration Testing",
      "Vulnerability Assessment", "Zero Trust", "IAM", "SIEM", "SOAR",
      "Incident Response", "SOC 2", "ISO 27001", "NIST", "OWASP", "Burp Suite"
    ],
    keywordsExclude: ["security clearance required", "TS/SCI", "polygraph", "physical security"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: false },
    sampleTitles: ["Security Engineer", "AppSec Engineer", "Penetration Tester"]
  },
  {
    id: "data-science",
    name: "Data & Analytics",
    description: "Data scientists, ML engineers, and analysts",
    icon: "chart",
    salaryRange: "$90k - $220k",
    salaryFloor: 90000,
    titleAllowlist: [
      "Data Scientist", "Senior Data Scientist", "Staff Data Scientist",
      "Machine Learning Engineer", "ML Engineer", "AI Engineer",
      "Data Analyst", "Senior Data Analyst", "Business Intelligence Analyst",
      "Data Engineer", "Analytics Engineer", "Research Scientist",
      "Quantitative Analyst", "Data Science Manager", "Head of Data"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level"],
    keywordsBoost: [
      "Python", "SQL", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
      "Pandas", "NumPy", "Scikit-learn", "Statistics", "A/B Testing",
      "Data Visualization", "Tableau", "Looker", "dbt", "Airflow",
      "Spark", "Databricks", "Snowflake", "BigQuery", "Experimentation"
    ],
    keywordsExclude: [],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: false },
    sampleTitles: ["Data Scientist", "ML Engineer", "Data Analyst"]
  },
  {
    id: "product-management",
    name: "Product & Design",
    description: "Product managers, designers, and UX researchers",
    icon: "lightbulb",
    salaryRange: "$100k - $200k",
    salaryFloor: 100000,
    titleAllowlist: [
      "Product Manager", "Senior Product Manager", "Principal Product Manager",
      "Group Product Manager", "Director of Product", "VP of Product", "CPO",
      "Technical Product Manager", "Product Owner",
      "Product Designer", "Senior Product Designer", "Staff Designer",
      "UX Designer", "UI Designer", "UX Researcher", "Design Manager"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level", "Associate"],
    keywordsBoost: [
      "Product Strategy", "Roadmap", "Agile", "Scrum", "User Research",
      "A/B Testing", "Data-Driven", "Cross-functional", "Stakeholder Management",
      "Figma", "User Experience", "Design Systems", "Prototyping",
      "Customer Discovery", "Product Analytics", "OKRs", "Go-to-Market"
    ],
    keywordsExclude: [],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: false },
    sampleTitles: ["Product Manager", "Product Designer", "UX Researcher"]
  },
  {
    id: "seo-digital-marketing",
    name: "Marketing & SEO",
    description: "SEO managers, growth marketers, and e-commerce",
    icon: "trending",
    salaryRange: "$70k - $150k",
    salaryFloor: 70000,
    titleAllowlist: [
      "SEO Manager", "Senior SEO Manager", "Director of SEO", "Head of SEO",
      "SEO Specialist", "SEO Analyst", "Technical SEO",
      "Digital Marketing Manager", "Growth Marketing Manager", "Performance Marketing",
      "E-Commerce Manager", "E-Commerce Director", "Marketplace Manager",
      "Paid Media Manager", "PPC Manager", "SEM Manager",
      "Marketing Manager", "Director of Marketing", "VP of Marketing", "CMO"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level"],
    keywordsBoost: [
      "SEO", "SEM", "PPC", "Google Analytics", "Google Ads", "Semrush", "Ahrefs",
      "Content Strategy", "Link Building", "Technical SEO", "On-page SEO",
      "Shopify", "Salesforce Commerce Cloud", "Magento", "E-commerce",
      "Conversion Rate Optimization", "A/B Testing", "Email Marketing",
      "Marketing Automation", "HubSpot", "Marketo", "Klaviyo"
    ],
    keywordsExclude: ["MLM", "network marketing", "commission only"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["SEO Manager", "Growth Marketing", "E-Commerce Manager"]
  },
  {
    id: "sales-business-dev",
    name: "Sales & Business",
    description: "Account executives, BDRs, and sales managers",
    icon: "briefcase",
    salaryRange: "$60k - $200k+",
    salaryFloor: 60000,
    titleAllowlist: [
      "Account Executive", "Senior Account Executive", "Enterprise Account Executive",
      "Sales Development Representative", "SDR", "BDR", "Business Development",
      "Sales Manager", "Regional Sales Manager", "Director of Sales", "VP of Sales",
      "Customer Success Manager", "Account Manager", "Partnerships Manager",
      "Sales Engineer", "Solutions Engineer", "Pre-Sales Engineer"
    ],
    titleBlocklist: ["Intern", "Internship", "Door to Door", "Canvasser"],
    keywordsBoost: [
      "B2B Sales", "SaaS Sales", "Enterprise Sales", "Solution Selling",
      "Salesforce", "HubSpot", "Outreach", "Pipeline Management",
      "Quota Attainment", "Prospecting", "Cold Calling", "Negotiation",
      "Customer Relationship", "Account Management", "Upselling"
    ],
    keywordsExclude: ["commission only", "door to door", "MLM", "network marketing"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Account Executive", "Sales Manager", "BDR"]
  },
  {
    id: "hr-recruiting",
    name: "HR & People",
    description: "Recruiters, HR business partners, and people ops",
    icon: "users",
    salaryRange: "$60k - $150k",
    salaryFloor: 60000,
    titleAllowlist: [
      "Recruiter", "Senior Recruiter", "Technical Recruiter", "Recruiting Manager",
      "Talent Acquisition", "Sourcer", "Recruiting Coordinator",
      "HR Business Partner", "HRBP", "HR Manager", "Director of HR", "VP of HR", "CHRO",
      "People Operations", "People Partner", "HR Generalist",
      "Compensation Analyst", "Benefits Manager", "Learning & Development"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level"],
    keywordsBoost: [
      "Technical Recruiting", "Full-cycle Recruiting", "Sourcing",
      "Greenhouse", "Lever", "LinkedIn Recruiter", "ATS",
      "Employer Branding", "Diversity & Inclusion", "D&I",
      "Compensation", "Benefits", "HRIS", "Workday", "Performance Management"
    ],
    keywordsExclude: ["staffing agency", "temp agency"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Technical Recruiter", "HRBP", "People Operations"]
  },
  {
    id: "finance-accounting",
    name: "Finance & Accounting",
    description: "FP&A, controllers, accountants, and analysts",
    icon: "calculator",
    salaryRange: "$60k - $180k",
    salaryFloor: 60000,
    titleAllowlist: [
      "Financial Analyst", "Senior Financial Analyst", "FP&A Analyst", "FP&A Manager",
      "Accountant", "Senior Accountant", "Staff Accountant", "CPA",
      "Controller", "Assistant Controller", "Director of Finance", "VP of Finance", "CFO",
      "Accounts Payable", "Accounts Receivable", "Billing Specialist",
      "Tax Manager", "Audit Manager", "Internal Auditor"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level"],
    keywordsBoost: [
      "Financial Modeling", "Budgeting", "Forecasting", "Variance Analysis",
      "GAAP", "SEC Reporting", "Audit", "Tax", "Revenue Recognition",
      "Excel", "NetSuite", "QuickBooks", "SAP", "Oracle Financials",
      "Month-end Close", "Financial Statements", "Cash Flow"
    ],
    keywordsExclude: [],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Financial Analyst", "Controller", "FP&A Manager"]
  },
  {
    id: "project-operations",
    name: "Operations & PM",
    description: "Project managers, program managers, and operations",
    icon: "clipboard",
    salaryRange: "$70k - $160k",
    salaryFloor: 70000,
    titleAllowlist: [
      "Project Manager", "Senior Project Manager", "Technical Project Manager",
      "Program Manager", "Senior Program Manager", "Portfolio Manager",
      "Operations Manager", "Director of Operations", "VP of Operations", "COO",
      "Business Operations", "Strategy & Operations", "Chief of Staff",
      "Scrum Master", "Agile Coach", "Delivery Manager"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level"],
    keywordsBoost: [
      "Project Management", "Program Management", "Agile", "Scrum", "Kanban",
      "PMP", "PRINCE2", "Stakeholder Management", "Risk Management",
      "Jira", "Asana", "Monday.com", "Confluence",
      "Process Improvement", "Change Management", "Cross-functional"
    ],
    keywordsExclude: [],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Project Manager", "Program Manager", "Operations Manager"]
  },
  {
    id: "content-copywriting",
    name: "Content & Writing",
    description: "Content writers, copywriters, and editors",
    icon: "pen",
    salaryRange: "$55k - $130k",
    salaryFloor: 55000,
    titleAllowlist: [
      "Content Writer", "Senior Content Writer", "Copywriter", "Senior Copywriter",
      "Content Strategist", "Content Manager", "Content Marketing Manager",
      "Editor", "Managing Editor", "Editorial Manager",
      "Technical Writer", "UX Writer", "UX Copywriter",
      "Social Media Manager", "Communications Manager", "PR Manager"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level", "Freelance", "Contract"],
    keywordsBoost: [
      "Content Strategy", "SEO Writing", "B2B Content", "SaaS Writing",
      "Technical Writing", "UX Writing", "Microcopy", "Brand Voice",
      "Editorial Calendar", "CMS", "WordPress", "Contentful",
      "Email Copy", "Landing Pages", "Conversion", "Engagement"
    ],
    keywordsExclude: ["ghostwriting only", "content mill", "pay per article"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Content Writer", "UX Writer", "Content Strategist"]
  }
];

/**
 * Get a career profile by ID
 */
export function getProfileById(id: string): CareerProfile | undefined {
  return CAREER_PROFILES.find(p => p.id === id);
}

/**
 * Convert a career profile to config format for the setup wizard
 */
export function profileToConfig(profile: CareerProfile) {
  return {
    title_allowlist: [...profile.titleAllowlist],
    title_blocklist: [...profile.titleBlocklist],
    keywords_boost: [...profile.keywordsBoost],
    keywords_exclude: [...profile.keywordsExclude],
    location_preferences: {
      ...profile.locationPreferences,
      cities: [] as string[],
    },
    salary_floor_usd: profile.salaryFloor,
    alerts: {
      slack: {
        enabled: false,
        webhook_url: "",
      },
      desktop: {
        enabled: true,
        play_sound: true,
        show_when_focused: false,
      },
    },
    // Enable free scrapers by default (no auth required, work out of the box)
    remoteok: {
      enabled: true,
      tags: [] as string[],
      limit: 50,
    },
    hn_hiring: {
      enabled: true,
      remote_only: false,
      limit: 100,
    },
    weworkremotely: {
      enabled: true,
      limit: 50,
    },
  };
}

/**
 * Get the icon component name for a profile
 */
export type ProfileIconType =
  | "code" | "shield" | "chart" | "lightbulb" | "trending"
  | "briefcase" | "users" | "calculator" | "clipboard" | "pen";
