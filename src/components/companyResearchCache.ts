import type { CompanyInfo } from './companyResearchData';

const COMPANY_RESEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  data: CompanyInfo;
  timestamp: number;
}

let companyMemoryCache: Record<string, CacheEntry> = {};

function getCompanyCacheKey(name: string): string {
  return name.toLowerCase().trim();
}

export function getCachedCompany(name: string): CompanyInfo | null {
  const entry = companyMemoryCache[getCompanyCacheKey(name)];

  if (entry && Date.now() - entry.timestamp < COMPANY_RESEARCH_CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

export function setCachedCompany(name: string, data: CompanyInfo): void {
  const key = getCompanyCacheKey(name);
  companyMemoryCache[key] = { data, timestamp: Date.now() };

  const keys = Object.keys(companyMemoryCache);
  if (keys.length > 100) {
    const oldest = keys.sort((a, b) => (companyMemoryCache[a]?.timestamp ?? 0) - (companyMemoryCache[b]?.timestamp ?? 0))[0];
    if (oldest) {
      delete companyMemoryCache[oldest];
    }
  }
}

export function clearCompanyResearchMemoryCacheForTests(): void {
  companyMemoryCache = {};
}

export function seedCompanyResearchMemoryCacheForTests(
  name: string,
  data: CompanyInfo,
  timestamp = Date.now(),
): void {
  companyMemoryCache[getCompanyCacheKey(name)] = { data, timestamp };
}
