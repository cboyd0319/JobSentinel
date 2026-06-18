import resumeKeywordTaxonomy from "../../shared/resumeKeywordTaxonomy.json";

type CredentialKeywordGroup = {
  canonical: string;
  terms: string[];
  requirementTerms?: string[];
  preserveRequirementText?: boolean;
  catalogTerms?: string[];
};

const credentialKeywordGroups =
  resumeKeywordTaxonomy.credentialKeywordGroups as CredentialKeywordGroup[];

export function getMockCredentialSearchTerms(keywordLower: string): string[] {
  const group = credentialKeywordGroups.find((candidate) =>
    candidate.canonical === keywordLower ||
    candidate.terms.includes(keywordLower)
  );
  if (!group) return [];

  return uniqueTerms([group.canonical, ...group.terms]);
}

export function getMockCredentialCatalogTerms(): string[] {
  return uniqueTerms(
    credentialKeywordGroups.flatMap((group) =>
      group.catalogTerms && group.catalogTerms.length > 0
        ? group.catalogTerms
        : [group.canonical]
    ),
  );
}

export function getMockSpecificCredentialKeywords(): Set<string> {
  return new Set(
    credentialKeywordGroups.flatMap((group) => [
      group.canonical,
      ...group.terms,
      ...(group.requirementTerms ?? []),
      ...(group.catalogTerms ?? []),
    ]),
  );
}

export function isMockCredentialKeyword(keywordLower: string): boolean {
  return credentialKeywordGroups.some((group) =>
    group.canonical === keywordLower ||
    group.terms.includes(keywordLower) ||
    (group.requirementTerms ?? []).includes(keywordLower) ||
    (group.catalogTerms ?? []).includes(keywordLower)
  );
}

export function extractMockCredentialKeywords(text: string): string[] {
  const keywords: string[] = [];

  for (const group of credentialKeywordGroups) {
    const requirementTerms = group.requirementTerms && group.requirementTerms.length > 0
      ? group.requirementTerms
      : [group.canonical, ...group.terms];
    const matchedTerm = requirementTerms.find((term) => wholeTermRegex(term).test(text));
    if (matchedTerm) {
      const keyword = group.preserveRequirementText === false ? group.canonical : matchedTerm;
      if (!keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    }
  }

  return keywords;
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    if (seen.has(term)) return false;
    seen.add(term);
    return true;
  });
}

function wholeTermRegex(term: string): RegExp {
  return new RegExp(
    String.raw`(?:^|[^A-Za-z0-9_])${literalTermPattern(term)}(?:$|[^A-Za-z0-9_])`,
    "i",
  );
}

function literalTermPattern(term: string): string {
  return escapeRegExp(term).replace(/\\ /g, String.raw`[\s-]+`);
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
