import {
  ATS_POWER_WORDS,
  type MockAtsKeyword,
} from "./resumeAnalysis";

type ExtractMockAtsKeywords = (jobDescription: string) => MockAtsKeyword[];

export function improveMockBulletPoint(
  args: Record<string, unknown> | undefined,
  extractMockAtsKeywords: ExtractMockAtsKeywords,
): string {
  const bullet = getStringArg(args, "bullet")?.trim() ?? "";
  let improved = bullet;
  const lower = improved.toLowerCase();

  if (!ATS_POWER_WORDS.some((word) => lower.startsWith(word))) {
    const vagueAction = ["was responsible for", "worked on", "helped with"]
      .some((phrase) => lower.includes(phrase));

    if (vagueAction) {
      improved += " (choose a clearer action verb only if it is true)";
    }
  }

  if (!/\d|%/.test(improved)) {
    improved += " (add a true number, outcome, or concrete detail if you have one)";
  }

  const jobContext = getStringArg(args, "jobContext") ?? getStringArg(args, "job_context");
  if (jobContext) {
    const requiredKeywords = extractMockAtsKeywords(jobContext)
      .filter((candidate) => candidate.importance === "Required")
      .map((candidate) => candidate.keyword)
      .filter((keyword) => !improved.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 2);
    if (requiredKeywords.length > 0) {
      improved += ` (review if these are true and worth making visible: ${requiredKeywords.join(", ")})`;
    }
    improved = appendMockRoleSpecificEvidencePrompt(improved, jobContext);
  }

  improved = appendMockInterviewDefensePrompt(improved);

  return improved;
}

function appendMockRoleSpecificEvidencePrompt(text: string, jobContext: string): string {
  const prompt = getMockRoleSpecificEvidencePrompt(jobContext);
  if (!prompt || text.includes(prompt)) return text;
  return `${text} (${prompt})`;
}

function getMockRoleSpecificEvidencePrompt(jobContext: string): string | null {
  const lower = jobContext.toLowerCase();
  const healthcareTerms = [
    "patient care",
    "healthcare",
    "nursing",
    "rn license",
    "registered nurse",
    "lpn",
    "cna",
    "medication administration",
    "clinical",
    "medical record",
    "vital sign",
    "care plan",
    "home health",
    "hospital",
    "clinic",
  ];

  if (healthcareTerms.some((term) => lower.includes(term))) {
    return "healthcare evidence to check: scope of practice, patient safety, documentation, and required credentials";
  }

  const tradesFieldTerms = [
    "maintenance technician",
    "equipment repair",
    "field service",
    "forklift",
    "osha",
    "work order",
    "work orders",
    "installation",
    "installer",
    "hvac",
    "plumbing",
    "electrical",
    "welding",
    "machine operator",
    "warehouse safety",
  ];

  if (tradesFieldTerms.some((term) => lower.includes(term))) {
    return "trades-field evidence to check: equipment or tools used, safety rules, work orders, downtime or quality impact, and required licenses";
  }

  const careerChangeTerms = [
    "career change",
    "career-change",
    "career transition",
    "career-transition",
    "transitioning careers",
    "returnship",
    "return to work",
    "transferable skills",
    "transferable experience",
  ];

  if (careerChangeTerms.some((term) => lower.includes(term))) {
    return "career-change evidence to check: transferable work, training, adjacent experience, scope, and truthful gaps or transitions";
  }

  const earlyCareerTerms = [
    "entry-level",
    "entry level",
    "new graduate",
    "new grad",
    "recent graduate",
    "trainee",
    "apprentice",
    "apprenticeship",
    "internship",
  ];

  if (earlyCareerTerms.some((term) => lower.includes(term))) {
    return "early-career evidence to check: training or coursework, projects or volunteer work, supervised responsibilities, transferable skills, and readiness to learn";
  }

  const educationAcademicTerms = [
    "teaching",
    "teacher",
    "classroom",
    "student",
    "curriculum",
    "lesson plan",
    "instructional design",
    "academic",
    "faculty",
    "university",
    "school counselor",
    "research methods",
    "publication",
    "thesis",
    "dissertation",
  ];

  if (educationAcademicTerms.some((term) => lower.includes(term))) {
    return "education-academic evidence to check: learner or research audience, standards or methods, outcomes, collaboration, and ethics";
  }

  const federalTerms = [
    "federal",
    "usajobs",
    "specialized experience",
    "grade level",
    "gs-",
    "public trust",
    "occupational series",
    "job announcement",
    "announcement number",
    "required documents",
  ];

  if (federalTerms.some((term) => lower.includes(term))) {
    return "federal evidence to check: specialized experience, grade level, announcement duties, dates and hours, citizenship or clearance, and required documents";
  }

  const regulatedWorkTerms = [
    "legal research",
    "case files",
    "case file",
    "document review",
    "records management",
    "policy analysis",
    "grant administration",
    "financial reconciliation",
    "loan processing",
    "compliance",
    "audit",
    "government",
    "public sector",
  ];

  if (regulatedWorkTerms.some((term) => lower.includes(term))) {
    return "regulated-work evidence to check: records accuracy, deadlines, confidentiality, compliance, and audit trail";
  }

  const executiveLeadershipTerms = [
    "executive",
    "director-level",
    "director level",
    "vice president",
    "senior leadership",
    "executive leadership",
    "people management",
    "budget ownership",
    "p&l",
    "organizational strategy",
    "change management",
    "board",
    "chief",
    "c-suite",
  ];

  if (executiveLeadershipTerms.some((term) => lower.includes(term))) {
    return "executive-leadership evidence to check: scope of ownership, team or budget size, decision authority, measurable business impact, and change risk";
  }

  const securityTerms = [
    "cybersecurity",
    "information security",
    "security operations",
    "soc analyst",
    "incident response",
    "vulnerability management",
    "risk management framework",
    "nist",
    "fedramp",
    "siem",
    "threat detection",
  ];

  if (securityTerms.some((term) => lower.includes(term))) {
    return "security evidence to check: authorized scope, risk reduced, controls or incidents handled, compliance context, and sensitive-data handling";
  }

  const serviceOperationsTerms = [
    "customer service",
    "customer support",
    "client service",
    "client support",
    "guest service",
    "guest services",
    "front desk",
    "front-desk",
    "reception",
    "receptionist",
    "case management",
    "case coordination",
    "scheduling",
    "appointment setting",
    "calendar management",
    "client intake",
    "operations",
    "escalation",
    "service quality",
  ];

  if (serviceOperationsTerms.some((term) => lower.includes(term))) {
    return "service-operations evidence to check: customer impact, volume, escalation path, documentation, and response quality";
  }

  const designCreativeTerms = [
    "product design",
    "user experience",
    "ux",
    "ui design",
    "interaction design",
    "visual design",
    "graphic design",
    "content design",
    "brand design",
    "creative direction",
    "design portfolio",
    "designer",
    "figma",
    "prototype",
    "accessibility",
  ];

  if (designCreativeTerms.some((term) => lower.includes(term))) {
    return "design-creative evidence to check: user problem, audience, constraints, decisions, accessibility, and shipped outcome";
  }

  const technicalDataTerms = [
    "software",
    "developer",
    "engineering",
    "data analysis",
    "data analyst",
    "machine learning",
    "model monitoring",
    "analytics",
    "sql",
    "python",
    "dashboard",
    "api",
    "product",
  ];

  if (technicalDataTerms.some((term) => lower.includes(term))) {
    return "technical-data evidence to check: shipped work, users or decisions supported, reliability, data sources, and measurable outcomes";
  }

  const salesMarketingTerms = [
    "sales",
    "pipeline",
    "account",
    "quota",
    "renewal",
    "retention",
    "marketing",
    "campaign",
    "audience",
    "conversion",
    "revenue",
    "lead generation",
    "channel",
  ];

  if (salesMarketingTerms.some((term) => lower.includes(term))) {
    return "sales-marketing evidence to check: quota or pipeline, audience or account scope, conversion or revenue impact, retention, and budget";
  }

  return null;
}

function appendMockInterviewDefensePrompt(text: string): string {
  const prompt = "problem, your role, action, result, and evidence";
  if (text.includes(prompt)) return text;
  return `${text} (before using, make sure you can explain the ${prompt})`;
}

function getStringArg(args: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = args?.[key];
  return typeof value === "string" ? value : undefined;
}
