import { MOCK_HUMAN_LANGUAGES } from "./resumeAnalysis";
import type { MockAtsResumeSections } from "./resumeAnalysisSections";
import { countMockKeywordFrequency } from "./resumeKeywordFrequency";
import { getMockCredentialSearchTerms } from "./resumeCredentialTaxonomy";
import resumeKeywordTaxonomy from "../../shared/resumeKeywordTaxonomy.json";

export function getConservativeMockSearchTerms(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  const terms = [lower];
  const equivalenceGroups = [
    ["crm", "customer relationship management"],
    ["security clearance", "clearance"],
    [
      "us citizenship",
      "u.s. citizenship",
      "us citizen",
      "u.s. citizen",
    ],
    ["work authorization", "authorized to work"],
    [
      "customer service",
      "customer support",
      "client service",
      "client services",
      "client support",
      "guest service",
      "guest services",
    ],
    ["case management", "case coordination"],
    ["scheduling", "calendar management", "appointment setting"],
    [
      "onboarding",
      "new hire orientation",
      "employee orientation",
    ],
    [
      "training",
      "trained",
      "staff training",
      "employee training",
      "team training",
    ],
    ["quality assurance", "qa"],
    ["front desk", "front-desk", "reception", "receptionist"],
    ["cash handling", "cashier"],
    ["point of sale", "pos system", "pos systems"],
    ["patient care", "patient-care"],
    [
      "medical record",
      "medical records",
      "medical-record",
      "medical-records",
    ],
    ["care plan", "care plans", "care-plan", "care-plans"],
    ["vital sign", "vital signs", "vital-sign", "vital-signs"],
    ["medication administration", "medication-administration"],
    ["data entry", "data-entry"],
    [
      "data analysis",
      "data analytics",
      "data-analysis",
      "data-analytics",
      "analytics",
    ],
    ["student support", "student services"],
    [
      "parent communication",
      "family communication",
      "guardian communication",
    ],
    ["bookkeeping", "bookkeeper"],
    ["quickbooks", "qbo"],
    ["accounts payable", "a/p"],
    ["accounts receivable", "a/r"],
    [
      "inventory",
      "inventory control",
      "inventory management",
      "stock control",
      "stock management",
      "stockroom",
    ],
    ["budgeting", "budget tracking"],
    ["logistics", "shipping", "receiving", "shipping and receiving"],
    ["procurement", "purchasing"],
    ["vendor management", "supplier management"],
    ["document review", "document-review"],
    ["records management", "records-management"],
    ["case files", "case-files"],
    ["legal research", "legal-research"],
    ["policy analysis", "policy-analysis"],
    ["grant administration", "grant-administration"],
    ["financial reconciliation", "financial-reconciliation"],
    ["billing", "invoicing"],
    ["loan processing", "loan-processing"],
    ["onsite", "on-site", "on site"],
    [
      "remote",
      "remote work",
      "remote-work",
      "remote role",
      "remote position",
      "remote job",
    ],
    [
      "reliable internet",
      "reliable internet connection",
      "high-speed internet",
      "high speed internet",
      "home office",
      "quiet workspace",
      "dedicated workspace",
    ],
    [
      "hybrid",
      "hybrid work",
      "hybrid-work",
      "hybrid role",
      "hybrid schedule",
      "hybrid position",
      "hybrid job",
    ],
    ["relocation", "relocate", "willing to relocate"],
    ["reliable transportation", "own transportation"],
    ["reliable vehicle", "insured vehicle"],
    [
      "proof of auto insurance",
      "proof of insurance",
      "auto insurance",
      "car insurance",
      "vehicle insurance",
      "insured vehicle",
    ],
    ["commute", "commuting"],
    [
      "clean driving record",
      "acceptable driving record",
      "driving record",
      "mvr",
      "motor vehicle record",
    ],
    ["night shift", "overnight shift", "third shift", "3rd shift"],
    ["weekend availability", "weekend shift", "weekend shifts"],
    ["evening shift", "second shift", "2nd shift"],
    ["day shift", "first shift", "1st shift"],
    [
      "overtime availability",
      "overtime",
      "overtime shift",
      "overtime shifts",
    ],
    [
      "holiday availability",
      "holiday",
      "holiday shift",
      "holiday shifts",
    ],
    [
      "background check",
      "background checks",
      "background screening",
      "background screenings",
    ],
    [
      "pre-employment screening",
      "pre employment screening",
      "employment screening",
    ],
    [
      "drug screen",
      "drug screens",
      "drug screening",
      "drug test",
      "drug tests",
      "drug testing",
    ],
    ["availability", "available"],
    [
      "full-time availability",
      "full time availability",
      "full-time",
      "full time",
    ],
    [
      "part-time availability",
      "part time availability",
      "part-time",
      "part time",
    ],
    [
      "high school diploma",
      "high-school diploma",
      "high school degree",
      "high-school degree",
      "ged",
      "high school equivalency",
      "high-school equivalency",
      "general education development",
    ],
    [
      "associate's degree",
      "associate degree",
      "associate of applied science",
      "associate of arts",
      "associate of science",
      "associates degree",
    ],
    [
      "bachelor's degree",
      "baccalaureate degree",
      "bachelor degree",
      "bachelors degree",
      "bachelor of applied science",
      "bachelor of arts",
      "bachelor of business administration",
      "bachelor of education",
      "bachelor of engineering",
      "bachelor of fine arts",
      "bachelor of science",
      "bachelor of social work",
    ],
    [
      "master's degree",
      "master degree",
      "masters degree",
      "master of arts",
      "master of business administration",
      "master of education",
      "master of engineering",
      "master of fine arts",
      "master of science",
      "master of social work",
    ],
    [
      "phd",
      "ph.d",
      "ph.d.",
      "phd degree",
      "ph.d degree",
      "ph.d. degree",
      "doctorate",
      "doctorate degree",
      "doctoral degree",
    ],
    [
      "stand for long period",
      "stand for long periods",
      "standing for long period",
      "standing for long periods",
    ],
    ["climb ladder", "climb ladders", "climbing ladder", "climbing ladders"],
  ];

  for (const group of equivalenceGroups) {
    if (group.includes(lower)) {
      for (const term of group) {
        if (!terms.includes(term)) terms.push(term);
      }
    }
  }
  for (const term of getMockSupplementalKeywordSearchTerms(lower)) {
    if (!terms.includes(term)) {
      terms.push(term);
    }
  }
  for (const term of getMockCredentialSearchTerms(lower)) {
    if (!terms.includes(term)) {
      terms.push(term);
    }
  }
  for (const term of getMockPhysicalWeightSearchTerms(lower)) {
    if (!terms.includes(term)) {
      terms.push(term);
    }
  }

  const seniorityTerms: Record<string, string[]> = {
    "senior-level experience": [
      "senior",
      "sr.",
      "lead",
      "5 years",
      "5+ years",
      "5 yrs",
      "5+ yrs",
      ...getMockExperienceYearSearchTerms(6),
    ],
    "mid-level experience": [
      "mid-level",
      "intermediate",
      "3 years",
      "3+ years",
      "3 yrs",
      "3+ yrs",
      ...getMockExperienceYearSearchTerms(4),
    ],
    "lead-level experience": [
      "lead",
      "team lead",
      "leadership experience",
      "supervised",
      "supervisor",
      ...getMockExperienceYearSearchTerms(5),
    ],
    "staff/principal-level experience": [
      "staff",
      "principal",
      "architect",
      "10 years",
      "10+ years",
      ...getMockExperienceYearSearchTerms(11),
    ],
    "management experience": [
      "management",
      "manager",
      "managed",
      "people management",
      "supervised",
      "supervisor",
    ],
    "director-level experience": [
      "director",
      "head of",
      "department lead",
      "10 years",
      "10+ years",
      ...getMockExperienceYearSearchTerms(11),
    ],
    "executive-level experience": [
      "executive",
      "vp",
      "vice president",
      "chief",
      "c-level",
      "10 years",
      "10+ years",
      ...getMockExperienceYearSearchTerms(11),
    ],
  };
  for (const term of seniorityTerms[lower] ?? []) {
    if (!terms.includes(term)) terms.push(term);
  }
  if (lower === "degree or equivalent experience") {
    for (const term of [
      "degree",
      "bachelor's degree",
      "bachelor degree",
      "bachelor",
      "ba",
      "bs",
      "master's degree",
      "master degree",
      "master",
      "ma",
      "ms",
      "equivalent experience",
      "work experience",
      "experience",
    ]) {
      if (!terms.includes(term)) terms.push(term);
    }
  }
  extendMockLanguageFluencyTerms(lower, terms);

  return terms;
}

export function getConservativeMockJobSearchTerms(keyword: string): string[] {
  const evidenceOnlyDegreeTerms = new Set([
    "associate of applied science",
    "associate of arts",
    "associate of science",
    "bachelor of applied science",
    "bachelor of arts",
    "bachelor of business administration",
    "bachelor of education",
    "bachelor of engineering",
    "bachelor of fine arts",
    "bachelor of science",
    "bachelor of social work",
    "master of arts",
    "master of business administration",
    "master of education",
    "master of engineering",
    "master of fine arts",
    "master of science",
    "master of social work",
  ]);
  return getConservativeMockSearchTerms(keyword)
    .filter((term) => !evidenceOnlyDegreeTerms.has(term));
}

export function containsAnyMockKeyword(text: string, searchTerms: string[]): boolean {
  return searchTerms.some((term) => countMockKeywordFrequency(text, term) > 0);
}

export function countMockEvidenceFrequency(
  sections: MockAtsResumeSections,
  keyword: string,
): number {
  const base = countMockSearchTermFrequency(sections.allText, keyword);
  if (base === 0) return 0;
  const searchTerms = getConservativeMockSearchTerms(keyword);
  if (
    [...sections.currentExperience, ...sections.recentExperience].some((text) =>
      containsAnyMockKeyword(text, searchTerms)
    )
  ) {
    return base + 1;
  }
  const workEvidence = [
    ...sections.currentExperience,
    ...sections.recentExperience,
    ...sections.pastExperience,
    ...sections.projects,
  ];
  const hasMetricBackedEvidence = workEvidence.some((text) =>
    containsAnyMockKeyword(text, searchTerms) &&
      (
        hasMockMetricBackedEvidence(text) ||
        hasMockScopeBackedEvidence(text) ||
        hasMockResponsibilityBackedEvidence(text) ||
        hasMockDutyBackedEvidence(text)
      )
  );
  return hasMetricBackedEvidence ? base + 1 : base;
}

function extendMockLanguageFluencyTerms(keywordLower: string, terms: string[]): void {
  for (const language of MOCK_HUMAN_LANGUAGES) {
    if (!keywordLower.includes(language)) {
      continue;
    }

    for (const term of [
      `bilingual ${language}`,
      `${language} fluency`,
      `fluent ${language}`,
      `fluent in ${language}`,
      `${language} language`,
      `english/${language}`,
      `english and ${language}`,
      language,
    ]) {
      if (!terms.includes(term)) terms.push(term);
    }
  }
}

function getMockPhysicalWeightSearchTerms(keywordLower: string): string[] {
  const rules = resumeKeywordTaxonomy.physicalWeightRequirements;
  for (const family of rules.families) {
    const regex = new RegExp(
      String.raw`\b${family.requirementPattern}${rules.optionalAmountPrefixPattern}\s+(\d+)\s*${rules.unitPattern}\b`,
      "i",
    );
    const match = keywordLower.match(regex);
    const amount = match?.[1];
    if (!amount) {
      continue;
    }

    return family.evidencePrefixes.flatMap((prefix) =>
      rules.searchUnits.map((unit) => `${prefix} ${amount} ${unit}`),
    );
  }
  return [];
}

function getMockSupplementalKeywordSearchTerms(keywordLower: string): string[] {
  const group = resumeKeywordTaxonomy.supplementalKeywordGroups.find((candidate) =>
    candidate.canonical === keywordLower || candidate.terms.includes(keywordLower)
  );
  if (!group) {
    return [];
  }

  return [...new Set([group.canonical, ...group.terms])];
}

function getMockExperienceYearSearchTerms(minYears: number): string[] {
  const terms: string[] = [];
  for (let years = minYears; years <= 50; years += 1) {
    terms.push(`${years} years`);
    terms.push(`${years}+ years`);
    terms.push(`${years} yrs`);
    terms.push(`${years}+ yrs`);
  }
  return terms;
}

function countMockSearchTermFrequency(text: string, keyword: string): number {
  const searchTerms = getConservativeMockSearchTerms(keyword);
  return Math.max(
    0,
    ...searchTerms.map((term) => countMockKeywordFrequency(text, term)),
  );
}

function hasMockMetricBackedEvidence(text: string): boolean {
  return /\b\d+(?:\.\d+)?\s*(?:%|(?:percent|clients?|customers?|cases?|tickets?|orders?|projects?|reports?|days?|weeks?|months?)\b)|\$\s*\d/i
    .test(text);
}

function hasMockScopeBackedEvidence(text: string): boolean {
  return /\bacross\s+(?:[a-z]+\s+){0,5}(?:teams?|departments?|locations?|sites?|regions?|markets?|service\s+lines?)\b/i
    .test(text);
}

function hasMockResponsibilityBackedEvidence(text: string): boolean {
  return /\b(?:owned|managed|administered|developed|implemented|improved|operated)\b.+\b(?:workflows?|process(?:es)?|programs?|operations?|intake|cases?|systems?|tools?)\b/i
    .test(text);
}

function hasMockDutyBackedEvidence(text: string): boolean {
  return /\b(?:coordinated|processed|maintained|tracked|reviewed|prepared|scheduled|organized|documented|responded|resolved|updated|served|followed\s+up|followed-up)\b.+\b(?:requests?|appointments?|records?|orders?|cases?|tickets?|reports?|files?|forms?|calls?|emails?|inquiries|intake|follow[-\s]?ups?|tasks?|schedules?)\b/i
    .test(text);
}
