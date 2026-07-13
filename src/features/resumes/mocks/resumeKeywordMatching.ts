import {
  ATS_KNOWN_KEYWORDS,
  MOCK_HUMAN_LANGUAGES,
  type MockAtsKeyword,
  type MockKeywordImportance,
} from "./resumeAnalysis";
import resumeKeywordTaxonomy from "../../../../resources/taxonomies/resume-keywords.json";
import type { MockAtsResumeSections } from "./resumeAnalysisSections";
import {
  extractMockCredentialKeywords,
  getMockSpecificCredentialKeywords,
} from "./resumeCredentialTaxonomy";
import {
  containsAnyMockKeyword,
  getConservativeMockJobSearchTerms,
  getConservativeMockSearchTerms,
} from "./resumeKeywordSearchTerms";

export { countMockEvidenceFrequency } from "./resumeKeywordSearchTerms";

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
    containsAnyMockKeyword(jobDescription, getConservativeMockJobSearchTerms(keyword))
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
    /\b(clean driving record|acceptable driving record|driving record|mvr|motor vehicle record)\b/gi,
    /\bfood[- ]handler'?s?\s+(?:certification|certificate|permit|card)\b/gi,
    /\b(certification)\b/gi,
    /\b(ph\.?d\.?(?:\s+degree)?|doctorate(?:\s+degree)?|doctoral degree|associate'?s degree|associate degree|baccalaureate degree|bachelor'?s degree|bachelor degree|master'?s degree|master degree|degree|high[- ]school diploma|high[- ]school degree|ged|high[- ]school equivalency|general education development)\b/gi,
    /\b\d+\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience\s+(?:with|in)\s+)?[a-zA-Z][a-zA-Z0-9+#/.-]*(?:\s+[a-zA-Z][a-zA-Z0-9+#/.-]*){0,3}\b/gi,
    /\b(?:minimum age(?:\s+is)?\s*)?\d{2}\s*(?:\+|(?:years?|yrs?)\s+(?:old|of\s+age))\b/gi,
    /\b(?:minimum age|age requirement|legal work age)\b/gi,
    new RegExp(
      String.raw`\b(bilingual(?:\s+(?:english|${languageAlternation}))?|(?:${languageAlternation})\s+fluency|fluent(?:\s+in)?\s+(?:${languageAlternation})|(?:${languageAlternation})\s+language|english/(?:${languageAlternation})|english and (?:${languageAlternation}))\b`,
      "gi",
    ),
    /\b(background checks?|background screenings?|pre[- ]employment screenings?|drug screens?|drug screenings?|drug tests?|drug testing)\b/gi,
    buildMockPhysicalWeightRequirementRegex(),
    /\b((?:stand|standing) for long periods?|climb(?:ing)? ladders?|physical requirements?|physical demands?)\b/gi,
    /\b(onsite|on-site|on site|remote(?:[- ](?:work|role|position|job))?|hybrid(?:[- ](?:work|role|schedule|position|job))?|reliable internet(?: connection)?|high[- ]speed internet(?: connection)?|home office|quiet workspace|dedicated workspace|relocation|relocate|willing to relocate|travel|reliable transportation|own transportation|reliable vehicle|insured vehicle|proof of auto insurance|proof of insurance|auto insurance|car insurance|vehicle insurance|commute|commuting|availability|available|schedule|weekend availability|weekend shifts?|night shift|overnight shift|third shift|3rd shift|evening shift|second shift|2nd shift|day shift|first shift|1st shift|overtime(?: availability| shifts?)?|holiday(?: availability| shifts?)?|full[- ]time(?: availability)?|part[- ]time(?: availability)?)\b/gi,
  ];
  const keywords = new Set<string>();
  const hasDegreeEquivalent = hasMockDegreeEquivalentRequirement(jobDescription);
  if (hasDegreeEquivalent) {
    keywords.add("degree or equivalent experience");
  }
  for (const keyword of extractMockCredentialKeywords(jobDescription)) {
    keywords.add(keyword);
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
  const specificCertificationKeywords = getMockSpecificCredentialKeywords();
  if ([...keywords].some((keyword) => specificCertificationKeywords.has(keyword))) {
    keywords.delete("certification");
  }
  for (const keyword of extractMockSeniorityConstraintKeywords(jobDescription)) {
    keywords.add(keyword);
  }

  return [...keywords].sort();
}

function buildMockPhysicalWeightRequirementRegex(): RegExp {
  const rules = resumeKeywordTaxonomy.physicalWeightRequirements;
  const familyPattern = rules.families
    .map((family) => family.requirementPattern)
    .join("|");
  return new RegExp(
    String.raw`\b(?:${familyPattern})${rules.optionalAmountPrefixPattern}\s+\d+\s*${rules.unitPattern}\b`,
    "gi",
  );
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
