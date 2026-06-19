export const PAY_TRANSPARENCY_LAST_REVIEWED = "2026-06-19";

export interface PayTransparencyRule {
  regionCode: string;
  regionLabel: string;
  effectiveDate: string;
  coveredEmployers: string;
  requirementSummary: string;
  sourceLabel: string;
  sourceUrl: string;
  matchers: RegExp[];
}

export interface PayTransparencyGuidance {
  title: string;
  description: string;
  ariaLabel: string;
  regionLabel: string;
  sourceUrl: string;
}

export interface PayTransparencyGuidanceInput {
  location: string | null | undefined;
  salaryMin: number | null | undefined;
  salaryMax: number | null | undefined;
}

export const PAY_TRANSPARENCY_RULES: readonly PayTransparencyRule[] = [
  {
    regionCode: "US-CO",
    regionLabel: "Colorado",
    effectiveDate: "2021-01-01",
    coveredEmployers: "Covered employers with Colorado work or remote work that can be done in Colorado.",
    requirementSummary: "Covered job postings generally need a compensation range and benefits information.",
    sourceLabel: "Colorado Department of Labor and Employment",
    sourceUrl:
      "https://cdle.colorado.gov/dlss/labor-laws-by-topic/equal-pay-for-equal-work-act",
    matchers: [/\bColorado\b|\bCO\b|\bDenver\b|\bBoulder\b|\bAurora\b/i],
  },
  {
    regionCode: "US-CA",
    regionLabel: "California",
    effectiveDate: "2023-01-01",
    coveredEmployers: "Covered employers posting roles that may be filled in California.",
    requirementSummary: "Covered employers generally need to include a pay scale in job postings.",
    sourceLabel: "California Department of Industrial Relations",
    sourceUrl: "https://www.dir.ca.gov/dlse/california_equal_pay_act.htm",
    matchers: [
      /\bCalifornia\b|\bCA\b|\bSan Francisco\b|\bLos Angeles\b|\bSan Diego\b|\bSan Jose\b|\bSacramento\b/i,
    ],
  },
  {
    regionCode: "US-WA",
    regionLabel: "Washington",
    effectiveDate: "2023-01-01",
    coveredEmployers: "Covered employers advertising roles that may be filled in Washington state.",
    requirementSummary: "Covered postings generally need a wage scale or salary range and benefits information.",
    sourceLabel: "Washington State Department of Labor and Industries",
    sourceUrl:
      "https://www.lni.wa.gov/workers-rights/wages/equal-pay-opportunities-act/",
    matchers: [
      /\bWA\b|\bSeattle\b|\bSpokane\b|\bTacoma\b|\bBellevue\b/i,
      /\bWashington\b(?!\s*,?\s*D\.?C\.?)/i,
    ],
  },
  {
    regionCode: "US-NY",
    regionLabel: "New York",
    effectiveDate: "2023-09-17",
    coveredEmployers: "Covered advertisements for jobs, promotions, or transfer opportunities in New York.",
    requirementSummary: "Covered advertisements generally need a compensation range.",
    sourceLabel: "New York State Department of Labor",
    sourceUrl: "https://dol.ny.gov/pay-transparency",
    matchers: [/\bNew York\b|\bNY\b|\bNYC\b|\bBrooklyn\b|\bBuffalo\b|\bAlbany\b/i],
  },
  {
    regionCode: "US-IL",
    regionLabel: "Illinois",
    effectiveDate: "2025-01-01",
    coveredEmployers: "Covered postings for work performed at least partly in Illinois or reporting to Illinois.",
    requirementSummary: "Covered postings generally need pay scale and benefits information.",
    sourceLabel: "Illinois Department of Labor",
    sourceUrl:
      "https://labor.illinois.gov/laws-rules/conmed/equal-pay-act-salary-transparency.html",
    matchers: [/\bIllinois\b|\bIL\b|\bChicago\b|\bSpringfield\b|\bEvanston\b/i],
  },
  {
    regionCode: "US-MN",
    regionLabel: "Minnesota",
    effectiveDate: "2025-01-01",
    coveredEmployers: "Covered employers advertising job openings for Minnesota work.",
    requirementSummary: "Covered postings generally need a starting salary range and benefits information.",
    sourceLabel: "Minnesota Revisor of Statutes",
    sourceUrl: "https://www.revisor.mn.gov/statutes/cite/181.173",
    matchers: [/\bMinnesota\b|\bMN\b|\bMinneapolis\b|\bSaint Paul\b|\bSt\. Paul\b/i],
  },
  {
    regionCode: "US-MD",
    regionLabel: "Maryland",
    effectiveDate: "2024-10-01",
    coveredEmployers: "Covered postings for work that will be physically performed at least partly in Maryland.",
    requirementSummary: "Covered postings generally need wage-range, benefits, and other compensation disclosures.",
    sourceLabel: "Maryland Department of Labor",
    sourceUrl: "https://labor.maryland.gov/labor/wages/esswagerangefaq.shtml",
    matchers: [/\bMaryland\b|\bMD\b|\bBaltimore\b|\bAnnapolis\b|\bRockville\b/i],
  },
  {
    regionCode: "US-MA",
    regionLabel: "Massachusetts",
    effectiveDate: "2025-10-29",
    coveredEmployers: "Covered employers and covered job postings in Massachusetts.",
    requirementSummary: "Covered postings generally need a pay range.",
    sourceLabel: "Massachusetts Attorney General",
    sourceUrl: "https://www.mass.gov/info-details/pay-transparency-in-massachusetts",
    matchers: [
      /\bMassachusetts\b|\bMA\b|\bBoston\b|\bCambridge\b|\bSomerville\b|\bWorcester\b/i,
    ],
  },
  {
    regionCode: "US-NJ",
    regionLabel: "New Jersey",
    effectiveDate: "2025-06-01",
    coveredEmployers: "Covered employers advertising roles in New Jersey.",
    requirementSummary: "Covered postings generally need hourly wage or salary ranges and benefits information.",
    sourceLabel: "New Jersey Department of Labor and Workforce Development",
    sourceUrl: "https://www.nj.gov/labor/myworkrights/wages/pay-transparency/",
    matchers: [/\bNew Jersey\b|\bNJ\b|\bNewark\b|\bJersey City\b|\bTrenton\b/i],
  },
  {
    regionCode: "US-VT",
    regionLabel: "Vermont",
    effectiveDate: "2025-07-01",
    coveredEmployers: "Covered employers advertising Vermont job openings.",
    requirementSummary: "Covered postings generally need compensation range information.",
    sourceLabel: "Vermont General Assembly",
    sourceUrl:
      "https://legislature.vermont.gov/Documents/2024/Docs/ACTS/ACT155/ACT155%20As%20Enacted.pdf",
    matchers: [/\bVermont\b|\bVT\b|\bBurlington\b|\bMontpelier\b|\bRutland\b/i],
  },
  {
    regionCode: "US-HI",
    regionLabel: "Hawaii",
    effectiveDate: "2024-01-01",
    coveredEmployers: "Covered employers advertising job listings in Hawaii.",
    requirementSummary: "Covered job listings generally need an hourly rate or salary range.",
    sourceLabel: "Hawaii Civil Rights Commission",
    sourceUrl:
      "https://labor.hawaii.gov/hcrc/files/2023/11/Act-203-Pay-Transparency-FAQs.pdf",
    matchers: [/\bHawaii\b|\bHI\b|\bHonolulu\b|\bMaui\b|\bKauai\b|\bOahu\b/i],
  },
  {
    regionCode: "US-DC",
    regionLabel: "District of Columbia",
    effectiveDate: "2024-06-30",
    coveredEmployers: "Covered employers advertising work in the District of Columbia.",
    requirementSummary: "Covered postings generally need minimum and maximum projected salary or hourly pay.",
    sourceLabel: "Council of the District of Columbia",
    sourceUrl:
      "https://lims.dccouncil.gov/downloads/LIMS/52388/Signed_Act/B25-0194-Signed_Act.pdf",
    matchers: [
      /\bDistrict of Columbia\b|\bD\.?C\.?\b|\bWashington,\s*D\.?C\.?\b|\bWashington DC\b/i,
    ],
  },
];

function hasCompleteUsablePayRange(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
) {
  return (
    salaryMin != null &&
    salaryMax != null &&
    Number.isFinite(salaryMin) &&
    Number.isFinite(salaryMax) &&
    salaryMin > 0 &&
    salaryMax >= salaryMin
  );
}

export function findPayTransparencyRule(
  location: string | null | undefined,
): PayTransparencyRule | null {
  const normalizedLocation = location?.trim();

  if (!normalizedLocation) {
    return null;
  }

  return (
    PAY_TRANSPARENCY_RULES.find((rule) =>
      rule.matchers.some((matcher) => matcher.test(normalizedLocation)),
    ) ?? null
  );
}

export function getPayTransparencyGuidance({
  location,
  salaryMin,
  salaryMax,
}: PayTransparencyGuidanceInput): PayTransparencyGuidance | null {
  if (hasCompleteUsablePayRange(salaryMin, salaryMax)) {
    return null;
  }

  const rule = findPayTransparencyRule(location);

  if (!rule) {
    return null;
  }

  return {
    title: "Check pay range",
    description: `${rule.regionLabel} has pay-range posting rules for covered employers. This saved job has no usable pay range, so open the employer posting and confirm the written range before applying.`,
    ariaLabel: `pay range to check for ${rule.regionLabel}`,
    regionLabel: rule.regionLabel,
    sourceUrl: rule.sourceUrl,
  };
}
