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

export interface SourceDefaults {
  remoteokEnabled: boolean;
  hnHiringEnabled: boolean;
  weworkremotelyEnabled: boolean;
}

const TECH_SOURCE_PROFILE_IDS = new Set([
  "software-engineering",
  "cybersecurity",
  "data-science",
]);

// Keep this list role-specific so broad roles with common tools, such as
// Accountant + SQL, do not inherit software-job-board defaults.
const TECH_SOURCE_TERMS = [
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
];

function buildSourceDefaults(isTechFocused: boolean, allowRemote: boolean): SourceDefaults {
  return {
    remoteokEnabled: isTechFocused && allowRemote,
    hnHiringEnabled: isTechFocused,
    weworkremotelyEnabled: isTechFocused && allowRemote,
  };
}

export function searchLooksTechFocused(terms: string[]): boolean {
  return terms
    .map((term) => normalizeSearchTerm(term))
    .some((term) => TECH_SOURCE_TERMS.some((techTerm) => term.includes(` ${techTerm} `)));
}

function normalizeSearchTerm(term: string): string {
  return ` ${term
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

export function getProfileSourceDefaults(profile: CareerProfile): SourceDefaults {
  return buildSourceDefaults(
    TECH_SOURCE_PROFILE_IDS.has(profile.id),
    profile.locationPreferences.allow_remote,
  );
}

export function getSearchSourceDefaults(search: {
  titles: string[];
  keywords: string[];
  allowRemote: boolean;
}): SourceDefaults {
  return buildSourceDefaults(
    searchLooksTechFocused([...search.titles, ...search.keywords]),
    search.allowRemote,
  );
}

// Career profiles embedded at build time for instant loading.
export const CAREER_PROFILES: CareerProfile[] = [
  {
    id: "office-administration",
    name: "Office & Admin",
    description: "Administrative assistants, office managers, and coordinators",
    icon: "clipboard",
    salaryRange: "$40k - $95k",
    salaryFloor: 40000,
    titleAllowlist: [
      "Administrative Assistant", "Admin Assistant", "Executive Assistant",
      "Office Assistant", "Office Administrator", "Office Coordinator",
      "Office Manager", "Front Desk Coordinator", "Receptionist",
      "Administrative Coordinator", "Program Assistant", "Program Coordinator",
      "Project Coordinator", "Scheduling Coordinator", "Records Coordinator",
      "Data Entry Specialist", "Operations Assistant", "Department Coordinator"
    ],
    titleBlocklist: ["Intern", "Internship", "Unpaid", "Volunteer"],
    keywordsBoost: [
      "Scheduling", "Calendar Management", "Customer Service", "Data Entry",
      "Records Management", "Microsoft Office", "Excel", "Google Workspace",
      "Phone Support", "Email Support", "Document Preparation",
      "Office Operations", "Meeting Coordination", "Travel Coordination",
      "Filing", "Vendor Coordination", "CRM", "Invoicing"
    ],
    keywordsExclude: ["door to door", "commission only", "MLM", "unpaid"],
    locationPreferences: { allow_remote: false, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Office Manager", "Administrative Assistant", "Project Coordinator"]
  },
  {
    id: "retail-hospitality",
    name: "Retail & Hospitality",
    description: "Store, food service, guest service, and shift leads",
    icon: "briefcase",
    salaryRange: "$35k - $90k",
    salaryFloor: 35000,
    titleAllowlist: [
      "Retail Associate", "Sales Associate", "Store Associate", "Store Manager",
      "Assistant Store Manager", "Shift Lead", "Shift Supervisor",
      "Department Manager", "Customer Service Representative", "Cashier",
      "Guest Service Representative", "Front Desk Agent", "Hotel Front Desk",
      "Restaurant Manager", "Server", "Barista", "Food Service Worker",
      "Merchandising Associate", "Inventory Associate", "Team Lead"
    ],
    titleBlocklist: ["Unpaid", "Volunteer", "Commission Only", "Door to Door"],
    keywordsBoost: [
      "Customer Service", "Guest Service", "Point of Sale", "Cash Handling",
      "Inventory", "Merchandising", "Store Operations", "Opening and Closing",
      "Scheduling", "Food Safety", "Order Fulfillment", "Returns",
      "Team Training", "Complaint Resolution", "Hospitality", "Sales Floor",
      "Stocking", "Loss Prevention"
    ],
    keywordsExclude: ["door to door", "commission only", "MLM", "unpaid"],
    locationPreferences: { allow_remote: false, allow_hybrid: false, allow_onsite: true },
    sampleTitles: ["Store Manager", "Customer Service Rep", "Shift Lead"]
  },
  {
    id: "trades-field-service",
    name: "Trades & Field",
    description: "Technicians, drivers, installers, and field service roles",
    icon: "briefcase",
    salaryRange: "$45k - $110k",
    salaryFloor: 45000,
    titleAllowlist: [
      "Maintenance Technician", "Field Service Technician", "Service Technician",
      "Installation Technician", "HVAC Technician", "Electrician", "Plumber",
      "Mechanic", "Facilities Technician", "Equipment Operator",
      "Warehouse Associate", "Warehouse Supervisor", "Forklift Operator",
      "Delivery Driver", "Route Driver", "CDL Driver", "Dispatcher",
      "Logistics Coordinator", "Inventory Coordinator", "Parts Specialist"
    ],
    titleBlocklist: ["Unpaid", "Volunteer", "Commission Only", "Owner Operator"],
    keywordsBoost: [
      "Equipment Repair", "Preventive Maintenance", "Work Orders",
      "Troubleshooting", "OSHA", "Safety Procedures", "Hand Tools",
      "Power Tools", "Forklift", "CDL", "Route Planning", "Dispatch",
      "Inventory Control", "Warehouse Operations", "Installation",
      "Customer Service", "Facilities", "Quality Checks"
    ],
    keywordsExclude: ["owner operator", "lease purchase", "commission only", "unpaid"],
    locationPreferences: { allow_remote: false, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Maintenance Technician", "Field Service Tech", "Warehouse Supervisor"]
  },
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
      "Recruiter", "Senior Recruiter", "Recruiting Manager",
      "Talent Acquisition", "Sourcer", "Recruiting Coordinator",
      "HR Business Partner", "HRBP", "HR Manager", "Director of HR", "VP of HR", "CHRO",
      "People Operations", "People Partner", "HR Generalist",
      "Compensation Analyst", "Benefits Manager", "Learning & Development",
      "Employee Relations", "Onboarding Specialist", "Technical Recruiter"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level"],
    keywordsBoost: [
      "Full-cycle Recruiting", "Sourcing", "Employee Relations",
      "Onboarding", "Benefits", "Compensation", "HRIS",
      "Performance Management", "Learning & Development", "People Operations",
      "Employer Branding", "Diversity & Inclusion", "D&I",
      "Workday", "Greenhouse", "Lever", "LinkedIn Recruiter", "Technical Recruiting"
    ],
    keywordsExclude: ["staffing agency", "temp agency"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Recruiter", "HRBP", "People Operations"]
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
  },
  {
    id: "healthcare",
    name: "Healthcare",
    description: "Nurses, healthcare admin, medical professionals",
    icon: "heart",
    salaryRange: "$50k - $150k",
    salaryFloor: 50000,
    titleAllowlist: [
      "Registered Nurse", "RN", "Nurse Practitioner", "NP", "Licensed Practical Nurse",
      "Clinical Nurse", "Charge Nurse", "Nurse Manager", "Director of Nursing",
      "Healthcare Administrator", "Hospital Administrator", "Practice Manager",
      "Medical Director", "Clinical Director", "Health Services Manager",
      "Patient Care Coordinator", "Case Manager", "Clinical Research Coordinator",
      "Medical Assistant", "Clinical Assistant", "Patient Care Assistant",
      "Patient Care Technician", "Home Health Aide", "Certified Nursing Assistant",
      "CNA", "Caregiver", "Healthcare Consultant", "Medical Writer",
      "Health Informatics Specialist"
    ],
    titleBlocklist: ["Volunteer", "Student"],
    keywordsBoost: [
      "Healthcare", "Clinical", "Patient Care", "HIPAA", "EMR", "EHR",
      "Epic", "Cerner", "Medical Records", "Nursing", "BSN", "MSN",
      "Healthcare Administration", "Quality Improvement", "Patient Safety",
      "Care Coordination", "Population Health", "Value-Based Care"
    ],
    keywordsExclude: ["travel nursing agency"],
    locationPreferences: { allow_remote: false, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Registered Nurse", "Medical Assistant", "Healthcare Admin"]
  },
  {
    id: "legal",
    name: "Legal",
    description: "Attorneys, paralegals, and legal professionals",
    icon: "scale",
    salaryRange: "$60k - $250k+",
    salaryFloor: 60000,
    titleAllowlist: [
      "Attorney", "Lawyer", "Associate Attorney", "Senior Associate", "Partner",
      "General Counsel", "Legal Counsel", "Corporate Counsel", "In-House Counsel",
      "Paralegal", "Senior Paralegal", "Legal Assistant", "Legal Secretary",
      "Contracts Manager", "Compliance Officer", "Legal Operations Manager",
      "Patent Attorney", "IP Counsel", "Litigation Associate", "Transactional Attorney"
    ],
    titleBlocklist: ["Intern", "Internship", "Law Clerk", "Student"],
    keywordsBoost: [
      "JD", "Bar Admission", "Corporate Law", "Contract Negotiation", "M&A",
      "Litigation", "Compliance", "Regulatory", "Intellectual Property", "Patent",
      "Employment Law", "Securities", "Privacy Law", "GDPR", "Data Privacy",
      "Legal Research", "Westlaw", "LexisNexis", "Due Diligence"
    ],
    keywordsExclude: ["document review only", "temporary"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Corporate Counsel", "Senior Paralegal", "Compliance Officer"]
  },
  {
    id: "education",
    name: "Education",
    description: "Teachers, instructional designers, EdTech roles",
    icon: "book",
    salaryRange: "$45k - $120k",
    salaryFloor: 45000,
    titleAllowlist: [
      "Teacher", "Instructor", "Professor", "Lecturer", "Adjunct Faculty",
      "Instructional Designer", "Curriculum Developer", "Learning Designer",
      "Training Manager", "Corporate Trainer", "Learning & Development Manager",
      "Education Director", "Principal", "Dean", "Academic Director",
      "EdTech Product Manager", "Learning Experience Designer", "Course Developer"
    ],
    titleBlocklist: ["Substitute", "Aide", "Assistant Teacher", "Student Teacher"],
    keywordsBoost: [
      "Curriculum Development", "Instructional Design", "Learning Management System",
      "LMS", "E-Learning", "ADDIE", "Articulate", "Canvas", "Blackboard",
      "Assessment Design", "Educational Technology", "Adult Learning",
      "Professional Development", "Training Delivery", "Facilitation"
    ],
    keywordsExclude: ["tutoring only", "part-time only"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Instructional Designer", "Training Manager", "Curriculum Developer"]
  },
  {
    id: "customer-success",
    name: "Customer Success",
    description: "CSMs, support leads, and customer experience",
    icon: "smile",
    salaryRange: "$50k - $130k",
    salaryFloor: 50000,
    titleAllowlist: [
      "Customer Success Manager", "CSM", "Senior Customer Success Manager",
      "Customer Success Director", "VP of Customer Success", "Head of Customer Success",
      "Customer Experience Manager", "CX Manager", "Customer Support Manager",
      "Support Engineer", "Technical Support Specialist", "Support Lead",
      "Implementation Manager", "Onboarding Specialist", "Client Success Manager",
      "Account Manager", "Relationship Manager", "Customer Advocate"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Entry Level", "Tier 1"],
    keywordsBoost: [
      "Customer Success", "Customer Experience", "NPS", "CSAT", "Churn Prevention",
      "Retention", "Service Recovery", "Customer Education", "Account Support",
      "Onboarding", "Implementation", "Renewal", "CRM", "Upsell", "Cross-sell",
      "Salesforce", "Gainsight", "ChurnZero", "Zendesk", "Intercom",
      "SaaS", "B2B", "Enterprise", "Technical Support", "Troubleshooting"
    ],
    keywordsExclude: ["call center", "phone only", "high volume tickets"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: false },
    sampleTitles: ["Customer Success Manager", "Support Lead", "CX Manager"]
  },
  {
    id: "creative-media",
    name: "Creative & Media",
    description: "Designers, video producers, and creative directors",
    icon: "palette",
    salaryRange: "$55k - $150k",
    salaryFloor: 55000,
    titleAllowlist: [
      "Graphic Designer", "Senior Designer", "Art Director", "Creative Director",
      "Visual Designer", "Brand Designer", "Marketing Designer",
      "Video Producer", "Video Editor", "Motion Graphics Designer", "Animator",
      "Photographer", "Photo Editor", "Creative Producer",
      "Social Media Designer", "Digital Designer", "Multimedia Specialist"
    ],
    titleBlocklist: ["Intern", "Internship", "Junior", "Freelance", "Contract"],
    keywordsBoost: [
      "Adobe Creative Suite", "Photoshop", "Illustrator", "InDesign", "After Effects",
      "Premiere Pro", "Figma", "Sketch", "Brand Identity", "Visual Design",
      "Motion Graphics", "Video Production", "Photography", "Art Direction",
      "Creative Strategy", "Campaign Design", "Social Media Content"
    ],
    keywordsExclude: ["stock imagery only", "template-based"],
    locationPreferences: { allow_remote: true, allow_hybrid: true, allow_onsite: true },
    sampleTitles: ["Art Director", "Video Producer", "Brand Designer"]
  }
];

/**
 * Get a career profile by ID
 */
export function getProfileById(id: string): CareerProfile | undefined {
  return CAREER_PROFILES.find(p => p.id === id);
}

/**
 * Convert a career profile to config format for first-run setup
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
        enabled: false,
        play_sound: false,
        show_when_focused: false,
      },
    },
    // First-run setup shows source suggestions separately. Sources stay off
    // until the user checks them in review or turns them on in Settings.
    remoteok: {
      enabled: false,
      tags: [] as string[],
      limit: 50,
    },
    hn_hiring: {
      enabled: false,
      remote_only: false,
      limit: 100,
    },
    weworkremotely: {
      enabled: false,
      limit: 50,
    },
  };
}

/**
 * Get the icon component name for a profile
 */
export type ProfileIconType =
  | "code" | "shield" | "chart" | "lightbulb" | "trending"
  | "briefcase" | "users" | "calculator" | "clipboard" | "pen"
  | "heart" | "scale" | "book" | "smile" | "palette";
