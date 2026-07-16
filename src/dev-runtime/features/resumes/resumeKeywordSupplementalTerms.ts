import { MOCK_HUMAN_LANGUAGES } from "./resumeAnalysis";
import resumeKeywordTaxonomy from "../../../../resources/taxonomies/resume-keywords.json";

export function extendMockLanguageFluencyTerms(keywordLower: string, terms: string[]): void {
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

export function getMockPhysicalWeightSearchTerms(keywordLower: string): string[] {
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

export function getMockSupplementalKeywordSearchTerms(keywordLower: string): string[] {
  const group = resumeKeywordTaxonomy.supplementalKeywordGroups.find((candidate) =>
    candidate.canonical === keywordLower || candidate.terms.includes(keywordLower)
  );
  if (!group) {
    return [];
  }

  return [...new Set([group.canonical, ...group.terms])];
}

export function getMockExperienceYearSearchTerms(minYears: number): string[] {
  const terms: string[] = [];
  for (let years = minYears; years <= 50; years += 1) {
    terms.push(`${years} years`);
    terms.push(`${years}+ years`);
    terms.push(`${years} yrs`);
    terms.push(`${years}+ yrs`);
  }
  return terms;
}
