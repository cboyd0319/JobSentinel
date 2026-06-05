import {
  ATS_KNOWN_KEYWORDS,
  MOCK_HUMAN_LANGUAGES,
  type MockAtsKeyword,
  type MockKeywordImportance,
} from "./resumeAnalysis";
import type { MockAtsResumeSections } from "./resumeAnalysisSections";

export function extractMockAtsKeywords(jobDescription: string): MockAtsKeyword[] {
  const lower = jobDescription.toLowerCase();
  const seen = new Set<string>();
  const hasDegreeEquivalent = hasMockDegreeEquivalentRequirement(jobDescription);
  const hardKeywords = extractMockHardConstraintKeywords(jobDescription);
  const hasCommercialDriverLicense = hardKeywords.some((keyword) =>
    [
      "commercial driver's license",
      "commercial drivers license",
      "commercial driver license",
      "cdl",
    ].includes(keyword)
  );
  const hasPluralMedicalRecords = /\bmedical records\b/.test(lower);
  const hasHyphenPluralMedicalRecords = /\bmedical-records\b/.test(lower);
  const hasSingularMedicalRecord =
    /\bmedical record\b/.test(lower) && !hasPluralMedicalRecords;
  const hasHyphenSingularMedicalRecord =
    /\bmedical-record\b/.test(lower) && !hasHyphenPluralMedicalRecords;
  const hasPluralCarePlans = /\bcare plans\b/.test(lower);
  const hasHyphenPluralCarePlans = /\bcare-plans\b/.test(lower);
  const hasSingularCarePlan =
    /\bcare plan\b/.test(lower) && !hasPluralCarePlans;
  const hasHyphenSingularCarePlan =
    /\bcare-plan\b/.test(lower) && !hasHyphenPluralCarePlans;
  const hasPluralVitalSigns = /\bvital signs\b/.test(lower);
  const hasHyphenPluralVitalSigns = /\bvital-signs\b/.test(lower);
  const hasSingularVitalSign =
    /\bvital sign\b/.test(lower) && !hasPluralVitalSigns;
  const hasHyphenSingularVitalSign =
    /\bvital-sign\b/.test(lower) && !hasHyphenPluralVitalSigns;
  const hasSpecificDegree = hardKeywords.some((keyword) =>
    isMockExactDegreeKeyword(keyword) && keyword !== "degree"
  );
  const exactHyphenVariantKeywordsToSkip = new Set<string>();
  for (const [
    normalPattern,
    hyphenPattern,
    normalKeyword,
    hyphenKeyword,
  ] of [
    [
      /\bmedication administration\b/,
      /\bmedication-administration\b/,
      "medication administration",
      "medication-administration",
    ],
    [
      /\bdocument review\b/,
      /\bdocument-review\b/,
      "document review",
      "document-review",
    ],
    [
      /\brecords management\b/,
      /\brecords-management\b/,
      "records management",
      "records-management",
    ],
    [/\bcase files\b/, /\bcase-files\b/, "case files", "case-files"],
    [
      /\blegal research\b/,
      /\blegal-research\b/,
      "legal research",
      "legal-research",
    ],
    [
      /\bpolicy analysis\b/,
      /\bpolicy-analysis\b/,
      "policy analysis",
      "policy-analysis",
    ],
    [
      /\bgrant administration\b/,
      /\bgrant-administration\b/,
      "grant administration",
      "grant-administration",
    ],
    [
      /\bfinancial reconciliation\b/,
      /\bfinancial-reconciliation\b/,
      "financial reconciliation",
      "financial-reconciliation",
    ],
    [
      /\bloan processing\b/,
      /\bloan-processing\b/,
      "loan processing",
      "loan-processing",
    ],
  ] as const) {
    if (normalPattern.test(lower)) {
      exactHyphenVariantKeywordsToSkip.add(hyphenKeyword);
    } else if (hyphenPattern.test(lower)) {
      exactHyphenVariantKeywordsToSkip.add(normalKeyword);
    }
  }
  const knownKeywords = ATS_KNOWN_KEYWORDS.filter((keyword) =>
    !(hasDegreeEquivalent && isMockExactDegreeKeyword(keyword)) &&
    !(hasSpecificDegree && keyword === "degree") &&
    !(hasPluralMedicalRecords && ["medical record", "medical-record", "medical-records"].includes(keyword)) &&
    !(hasHyphenPluralMedicalRecords && ["medical record", "medical-record", "medical records"].includes(keyword)) &&
    !(hasSingularMedicalRecord && ["medical records", "medical-record", "medical-records"].includes(keyword)) &&
    !(hasHyphenSingularMedicalRecord && ["medical record", "medical records", "medical-records"].includes(keyword)) &&
    !(hasPluralCarePlans && ["care plan", "care-plan", "care-plans"].includes(keyword)) &&
    !(hasHyphenPluralCarePlans && ["care plan", "care-plan", "care plans"].includes(keyword)) &&
    !(hasSingularCarePlan && ["care plans", "care-plan", "care-plans"].includes(keyword)) &&
    !(hasHyphenSingularCarePlan && ["care plan", "care plans", "care-plans"].includes(keyword)) &&
    !(hasPluralVitalSigns && ["vital sign", "vital-sign", "vital-signs"].includes(keyword)) &&
    !(hasHyphenPluralVitalSigns && ["vital sign", "vital-sign", "vital signs"].includes(keyword)) &&
    !(hasSingularVitalSign && ["vital signs", "vital-sign", "vital-signs"].includes(keyword)) &&
    !(hasHyphenSingularVitalSign && ["vital sign", "vital signs", "vital-signs"].includes(keyword)) &&
    !exactHyphenVariantKeywordsToSkip.has(keyword) &&
    !(
      hasCommercialDriverLicense &&
      ["driver's license", "drivers license", "driver license"].includes(keyword)
    ) &&
    getConservativeMockJobSearchTerms(keyword).some((term) => lower.includes(term))
  );
  const keywords = [
    ...knownKeywords,
    ...hardKeywords,
  ].map(canonicalMockRequirementKeyword).filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return keywords
    .map((keyword) => ({
      keyword,
      importance: getMockKeywordImportance(jobDescription, keyword),
    }));
}

function canonicalMockRequirementKeyword(keyword: string): string {
  switch (keyword.toLowerCase()) {
    case "bookkeeper":
      return "bookkeeping";
    case "qbo":
      return "quickbooks";
    case "a/p":
      return "accounts payable";
    case "a/r":
      return "accounts receivable";
    case "pos system":
    case "pos systems":
      return "point of sale";
    default:
      return keyword;
  }
}

function extractMockHardConstraintKeywords(jobDescription: string): string[] {
  const languageAlternation = MOCK_HUMAN_LANGUAGES.join("|");
  const patterns = [
    /\b(work authorization|authorized to work|visa sponsorship|u\.?s\.?\s+citizenship|u\.?s\.?\s+citizen|citizenship required)\b/gi,
    /\b(security clearance|clearance)\b/gi,
    /\bsecurity\+/gi,
    /\b(commercial driver'?s license|commercial driver license|driver'?s license|driver license|cdl|rn license|registered nurse license|nursing license|lpn|lvn|licensed practical nurse|licensed vocational nurse)\b/gi,
    /\bfood[- ]handler'?s?\s+(?:certification|certificate|permit|card)\b/gi,
    /\b(certification|cissp|certified information systems security professional|security plus|bls|basic life support|acls|advanced cardiovascular life support|cpr|cardiopulmonary resuscitation|cna|certified nursing assistant|certified nurse assistant|certified nurse aide|pmp|project management professional|servsafe|food safety certification|food[- ]handler certification|food[- ]handler certificate|food[- ]handler permit|food[- ]handlers permit|food[- ]handler card|first[- ]aid certification|first[- ]aid certified|first[- ]aid certificate|first[- ]aid|forklift certification|forklift operator certification|forklift certified|forklift license|forklift operator license|osha\s*10(?:[- ]hour)?(?:\s+certification)?|osha\s*30(?:[- ]hour)?(?:\s+certification)?)\b/gi,
    /\b(ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree|high[- ]school diploma|high[- ]school degree|ged|high[- ]school equivalency|general education development)\b/gi,
    /\b\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?[a-zA-Z][a-zA-Z0-9+#/.-]*(?:\s+[a-zA-Z][a-zA-Z0-9+#/.-]*){0,3}\b/gi,
    new RegExp(
      String.raw`\b(bilingual(?:\s+(?:english|${languageAlternation}))?|(?:${languageAlternation})\s+fluency|fluent(?:\s+in)?\s+(?:${languageAlternation})|(?:${languageAlternation})\s+language|english/(?:${languageAlternation})|english and (?:${languageAlternation}))\b`,
      "gi",
    ),
    /\b(background checks?|background screenings?|pre[- ]employment screenings?|drug screens?|drug screenings?|drug tests?|drug testing)\b/gi,
    /\b(lift(?:\s+up\s+to)?\s+\d+\s*(?:pounds?|lbs?)|(?:stand|standing) for long periods?|physical requirements?|physical demands?)\b/gi,
    /\b(onsite|on-site|on site|remote(?:[- ](?:work|role|position|job))?|hybrid(?:[- ](?:work|role|schedule|position|job))?|relocation|relocate|willing to relocate|travel|reliable transportation|own transportation|commute|commuting|availability|available|schedule|weekend availability|weekend shifts?|night shift|overnight shift|third shift|3rd shift|evening shift|second shift|2nd shift|day shift|first shift|1st shift|overtime(?: availability| shifts?)?|holiday(?: availability| shifts?)?|full[- ]time(?: availability)?|part[- ]time(?: availability)?)\b/gi,
  ];
  const keywords = new Set<string>();
  const hasDegreeEquivalent = hasMockDegreeEquivalentRequirement(jobDescription);
  if (hasDegreeEquivalent) {
    keywords.add("degree or equivalent experience");
  }

  for (const pattern of patterns) {
    let match = pattern.exec(jobDescription);
    while (match) {
      keywords.add(match[0].toLowerCase());
      match = pattern.exec(jobDescription);
    }
  }
  if (hasDegreeEquivalent) {
    for (const exactDegree of [
      "degree",
      "associate's degree",
      "associate degree",
      "associates degree",
      "baccalaureate degree",
      "bachelor's degree",
      "bachelor degree",
      "bachelors degree",
      "master's degree",
      "master degree",
      "masters degree",
      "phd",
      "ph.d",
      "ph.d.",
      "phd degree",
      "ph.d degree",
      "ph.d. degree",
      "doctorate",
      "doctorate degree",
      "doctoral degree",
    ]) {
      keywords.delete(exactDegree);
    }
  }
  if (
    [...keywords].some((keyword) =>
      [
        "commercial driver's license",
        "commercial drivers license",
        "commercial driver license",
        "cdl",
      ].includes(keyword)
    )
  ) {
    for (const genericLicense of ["driver's license", "drivers license", "driver license"]) {
      keywords.delete(genericLicense);
    }
  }
  const specificCertificationKeywords = [
    "cissp",
    "certified information systems security professional",
    "security+",
    "security plus",
    "bls",
    "basic life support",
    "acls",
    "advanced cardiovascular life support",
    "cpr",
    "cardiopulmonary resuscitation",
    "cna",
    "certified nursing assistant",
    "certified nurse assistant",
    "certified nurse aide",
    "lpn",
    "lvn",
    "licensed practical nurse",
    "licensed vocational nurse",
    "pmp",
    "project management professional",
    "servsafe",
    "food safety certification",
    "food handler certification",
    "food handler's certification",
    "food handlers certification",
    "food handler certificate",
    "food handler's certificate",
    "food handlers certificate",
    "food handler permit",
    "food handler's permit",
    "food handlers permit",
    "food handler card",
    "food handler's card",
    "food handlers card",
    "first aid",
    "first-aid",
    "first aid certification",
    "first-aid certification",
    "first aid certified",
    "first-aid certified",
    "first aid certificate",
    "first-aid certificate",
    "forklift certification",
    "forklift certified",
    "forklift operator certification",
    "forklift operator certified",
    "forklift license",
    "forklift operator license",
    "osha 10",
    "osha10",
    "osha 10 certification",
    "osha10 certification",
    "osha 10-hour",
    "osha 10-hour certification",
    "osha 10 hour",
    "osha 10 hour certification",
    "osha 30",
    "osha30",
    "osha 30 certification",
    "osha30 certification",
    "osha 30-hour",
    "osha 30-hour certification",
    "osha 30 hour",
    "osha 30 hour certification",
  ];
  if ([...keywords].some((keyword) => specificCertificationKeywords.includes(keyword))) {
    keywords.delete("certification");
  }
  for (const keyword of [...keywords]) {
    if (isMockAgeRequirementKeyword(keyword)) {
      keywords.delete(keyword);
    }
  }
  for (const keyword of extractMockSeniorityConstraintKeywords(jobDescription)) {
    keywords.add(keyword);
  }

  return [...keywords].sort();
}

function isMockAgeRequirementKeyword(keyword: string): boolean {
  const lower = keyword.toLowerCase();
  return [
    "year of age",
    "years of age",
    "yr of age",
    "yrs of age",
    "year old",
    "years old",
    "yr old",
    "yrs old",
  ].some((phrase) => lower.includes(phrase));
}

function hasMockDegreeEquivalentRequirement(text: string): boolean {
  return /\b(?:ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree)\s+(?:or|\/)\s+(?:(?:equivalent|commensurate)\s+(?:work\s+)?experience|equivalent\s+combination\s+of\s+education\s+and\s+experience)\b/i
    .test(text);
}

function isMockExactDegreeKeyword(keyword: string): boolean {
  return [
    "degree",
    "associate's degree",
    "associate degree",
    "associates degree",
    "baccalaureate degree",
    "bachelor's degree",
    "bachelor degree",
    "bachelors degree",
    "master's degree",
    "master degree",
    "masters degree",
    "phd",
    "ph.d",
    "ph.d.",
    "phd degree",
    "ph.d degree",
    "ph.d. degree",
    "doctorate",
    "doctorate degree",
    "doctoral degree",
  ].includes(keyword.toLowerCase());
}

function extractMockSeniorityConstraintKeywords(text: string): string[] {
  const patterns: Array<[RegExp, string]> = [
    [/\b(senior[- ]level|senior|sr\.)\b/i, "senior-level experience"],
    [/\b(lead[- ]level|team lead|leadership experience)\b/i, "lead-level experience"],
    [
      /\b(staff[- ]level|principal[- ]level|staff engineer|principal engineer|principal consultant)\b/i,
      "staff/principal-level experience",
    ],
    [
      /\b(people management|management experience|manager[- ]level|supervisory experience|team management)\b/i,
      "management experience",
    ],
    [/\b(director[- ]level|director experience|department director)\b/i, "director-level experience"],
    [
      /\b(executive[- ]level|executive leadership|c-suite|vice president|vp)\b/i,
      "executive-level experience",
    ],
    [/\b(mid[- ]level|intermediate)\b/i, "mid-level experience"],
  ];

  return patterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, keyword]) => keyword)
    .sort();
}

function getMockKeywordImportance(
  jobDescription: string,
  keyword: string,
): MockKeywordImportance {
  const lower = jobDescription.toLowerCase();
  const termIndexes = getConservativeMockSearchTerms(keyword)
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0);
  const keywordIndex = termIndexes.length > 0 ? Math.min(...termIndexes) : -1;
  const preferredIndex = lower.indexOf("preferred");
  const requiredIndex = lower.indexOf("required");

  if (preferredIndex >= 0 && keywordIndex >= preferredIndex) {
    return "Preferred";
  }
  if (requiredIndex >= 0 && (preferredIndex < 0 || keywordIndex < preferredIndex)) {
    return "Required";
  }
  return "Industry";
}

export function findMockKeywordLocations(
  sections: MockAtsResumeSections,
  keyword: string,
): string[] {
  const searchTerms = getConservativeMockSearchTerms(keyword);
  const locations: string[] = [];
  if (containsAnyMockKeyword(sections.summary, searchTerms)) locations.push("summary");
  if (sections.currentExperience.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("current experience");
  }
  if (sections.recentExperience.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("recent experience");
  }
  if (sections.pastExperience.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("experience");
  }
  if (sections.skills.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("skills");
  }
  if (sections.education.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("education");
  }
  if (sections.certifications.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("certifications");
  }
  if (sections.projects.some((text) => containsAnyMockKeyword(text, searchTerms))) {
    locations.push("projects");
  }
  return locations;
}

function getConservativeMockSearchTerms(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  const terms = [lower];
  const equivalenceGroups = [
    ["crm", "customer relationship management"],
    ["security clearance", "clearance"],
    ["security+", "security plus"],
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
    ["commute", "commuting"],
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
    ["bls", "basic life support"],
    ["acls", "advanced cardiovascular life support"],
    ["cpr", "cardiopulmonary resuscitation"],
    ["driver's license", "drivers license", "driver license"],
    [
      "cdl",
      "commercial driver's license",
      "commercial drivers license",
      "commercial driver license",
    ],
    ["rn", "rn license", "registered nurse", "registered nurse license"],
    [
      "lpn",
      "licensed practical nurse",
      "lvn",
      "licensed vocational nurse",
    ],
    [
      "pmp",
      "project management professional",
      "pmp certification",
      "project management professional certification",
    ],
    [
      "cna",
      "certified nursing assistant",
      "certified nurse assistant",
      "certified nurse aide",
    ],
    [
      "food safety",
      "food safety certification",
      "servsafe",
      "food handler certification",
      "food-handler certification",
      "food handler's certification",
      "food-handler's certification",
      "food handlers certification",
      "food-handlers certification",
      "food handler certificate",
      "food-handler certificate",
      "food handler's certificate",
      "food-handler's certificate",
      "food handlers certificate",
      "food-handlers certificate",
      "food handler permit",
      "food-handler permit",
      "food handler's permit",
      "food-handler's permit",
      "food handlers permit",
      "food-handlers permit",
      "food handler card",
      "food-handler card",
      "food handler's card",
      "food-handler's card",
      "food handlers card",
      "food-handlers card",
    ],
    [
      "first aid",
      "first-aid",
      "first aid certification",
      "first-aid certification",
      "first aid certified",
      "first-aid certified",
      "first aid certificate",
      "first-aid certificate",
    ],
    [
      "forklift",
      "forklift certification",
      "forklift certified",
      "forklift operator certification",
      "forklift operator certified",
      "forklift license",
      "forklift operator license",
    ],
    [
      "osha 10",
      "osha10",
      "osha 10 certification",
      "osha10 certification",
      "osha 10-hour",
      "osha 10-hour certification",
      "osha 10 hour",
      "osha 10 hour certification",
    ],
    [
      "osha 30",
      "osha30",
      "osha 30 certification",
      "osha30 certification",
      "osha 30-hour",
      "osha 30-hour certification",
      "osha 30 hour",
      "osha 30 hour certification",
    ],
    ["cissp", "certified information systems security professional"],
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
  ];

  for (const group of equivalenceGroups) {
    if (group.includes(lower)) {
      for (const term of group) {
        if (!terms.includes(term)) terms.push(term);
      }
    }
  }
  const liftWeightMatch = lower.match(
    /\blift(?:\s+up\s+to)?\s+(\d+)\s*(?:lbs?|pounds?)\b/i,
  );
  if (liftWeightMatch) {
    const amount = liftWeightMatch[1];
    for (const prefix of [`lift ${amount}`, `lift up to ${amount}`]) {
      for (const unit of ["lb", "lbs", "pound", "pounds"]) {
        const term = `${prefix} ${unit}`;
        if (!terms.includes(term)) terms.push(term);
      }
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

function getConservativeMockJobSearchTerms(keyword: string): string[] {
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

function containsAnyMockKeyword(text: string, searchTerms: string[]): boolean {
  return searchTerms.some((term) => countKeywordFrequency(text, term) > 0);
}

function countMockSearchTermFrequency(text: string, keyword: string): number {
  const searchTerms = getConservativeMockSearchTerms(keyword);
  return Math.max(
    0,
    ...searchTerms.map((term) => countKeywordFrequency(text, term)),
  );
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

function countKeywordFrequency(text: string, keyword: string): number {
  if (!keyword) return 0;
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let count = 0;
  let start = 0;

  while (start < lowerText.length) {
    const index = lowerText.indexOf(lowerKeyword, start);
    if (index === -1) break;

    if (mockKeywordMatchHasBoundaries(lowerText, lowerKeyword, index)) {
      count += 1;
    }
    start = index + lowerKeyword.length;
  }

  return count;
}

function mockKeywordMatchHasBoundaries(text: string, keyword: string, start: number): boolean {
  const end = start + keyword.length;
  const before = start > 0 ? text[start - 1] ?? "" : "";
  const after = end < text.length ? text[end] ?? "" : "";
  return !isMockKeywordTermChar(before) && !isMockKeywordTermChar(after);
}

function isMockKeywordTermChar(ch: string): boolean {
  return /^[a-z0-9+#]$/i.test(ch);
}
