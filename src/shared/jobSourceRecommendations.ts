import { TECH_SOURCE_TERMS } from "./jobSourceRecommendationTaxonomy";

interface JobSourceDefaults {
  remoteokEnabled: boolean;
  hnHiringEnabled: boolean;
  weworkremotelyEnabled: boolean;
}

export function searchLooksTechFocused(terms: string[]): boolean {
  return terms
    .map(normalizeSearchTerm)
    .some((term) =>
      TECH_SOURCE_TERMS.some((techTerm) => term.includes(` ${techTerm} `)),
    );
}

export function getSearchSourceDefaults(search: {
  titles: string[];
  keywords: string[];
  allowRemote: boolean;
}): JobSourceDefaults {
  const isTechFocused = searchLooksTechFocused([
    ...search.titles,
    ...search.keywords,
  ]);

  return {
    remoteokEnabled: isTechFocused && search.allowRemote,
    hnHiringEnabled: isTechFocused,
    weworkremotelyEnabled: isTechFocused && search.allowRemote,
  };
}

function normalizeSearchTerm(term: string): string {
  return ` ${term
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}
