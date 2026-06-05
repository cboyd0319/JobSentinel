import { useState, useEffect, memo } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { LoadingSpinner } from './LoadingSpinner';
import { COMPANY_CACHE_TTL } from '../utils/constants';
import { readStorageValue, writeStorageValue } from '../utils/browserStorage';

import { KNOWN_COMPANIES, type CompanyInfo } from './companyResearchData';

interface CompanyResearchPanelProps {
  companyName: string;
  onClose?: () => void;
}

const CACHE_KEY = 'jobsentinel_company_cache';

interface CacheEntry {
  data: CompanyInfo;
  timestamp: number;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    const stored = readStorageValue('local', CACHE_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, CacheEntry] =>
        isCacheEntry(entry[1])
      )
    );
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCompanyInfo(value: unknown): value is CompanyInfo {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  const optionalStringKeys = [
    "description",
    "industry",
    "founded",
    "headquarters",
    "employeeCount",
    "website",
    "linkedinUrl",
    "fundingStage",
    "totalFunding",
    "remotePolicy",
  ];
  const hasInvalidString = optionalStringKeys.some((key) => {
    const candidate = value[key];
    return candidate !== undefined && typeof candidate !== "string";
  });

  return (
    !hasInvalidString &&
    (value.glassdoorRating === undefined ||
      (typeof value.glassdoorRating === "number" && Number.isFinite(value.glassdoorRating))) &&
    (value.toolsAndSystems === undefined || isStringArray(value.toolsAndSystems)) &&
    (value.techStack === undefined || isStringArray(value.techStack))
  );
}

function isCacheEntry(value: unknown): value is CacheEntry {
  return (
    isRecord(value) &&
    isCompanyInfo(value.data) &&
    typeof value.timestamp === "number" &&
    Number.isFinite(value.timestamp)
  );
}

function saveCache(cache: Record<string, CacheEntry>): void {
  writeStorageValue('local', CACHE_KEY, JSON.stringify(cache));
}

function getCachedCompany(name: string): CompanyInfo | null {
  const cache = loadCache();
  const key = name.toLowerCase().trim();
  const entry = cache[key];

  if (entry && Date.now() - entry.timestamp < COMPANY_CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCachedCompany(name: string, data: CompanyInfo): void {
  const cache = loadCache();
  const key = name.toLowerCase().trim();
  cache[key] = { data, timestamp: Date.now() };

  // Keep cache size reasonable (max 100 companies)
  const keys = Object.keys(cache);
  if (keys.length > 100) {
    const oldest = keys.sort((a, b) => (cache[a]?.timestamp ?? 0) - (cache[b]?.timestamp ?? 0))[0];
    if (oldest) {
      delete cache[oldest];
    }
  }

  saveCache(cache);
}

function getToolsAndSystems(info: CompanyInfo): string[] {
  return info.toolsAndSystems ?? info.techStack ?? [];
}

async function fetchCompanyInfo(companyName: string): Promise<CompanyInfo> {
  // Check cache first
  const cached = getCachedCompany(companyName);
  if (cached) {
    return cached;
  }

  // Check known companies database
  const normalizedName = companyName.toLowerCase().trim();
  const knownCompany = Object.entries(KNOWN_COMPANIES).find(([key]) =>
    normalizedName.includes(key) || key.includes(normalizedName)
  );

  if (knownCompany) {
    const info: CompanyInfo = {
      name: companyName,
      ...knownCompany[1],
    };
    setCachedCompany(companyName, info);
    return info;
  }

  // For unknown companies, return basic info
  const info: CompanyInfo = {
    name: companyName,
    description: `JobSentinel does not have local company details for ${companyName} yet.`,
  };

  // Cache even basic info to avoid repeated lookups
  setCachedCompany(companyName, info);
  return info;
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${
            star <= fullStars
              ? 'text-yellow-400'
              : star === fullStars + 1 && hasHalf
              ? 'text-yellow-400'
              : 'text-surface-300 dark:text-surface-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-medium text-surface-700 dark:text-surface-300">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

const InfoRow = memo(function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && (
        <div className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{value}</p>
      </div>
    </div>
  );
});

export const CompanyResearchPanel = memo(function CompanyResearchPanel({ companyName, onClose }: CompanyResearchPanelProps) {
  const [loading, setLoading] = useState(true);
  const [takingLong, setTakingLong] = useState(false);
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Show local lookup delay message after 5 seconds.
    const slowLoadingId = setTimeout(() => {
      if (!cancelled) {
        setTakingLong(true);
      }
    }, 5000);

    // Timeout to prevent infinite spinner
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Company details are taking too long to show.');
        setLoading(false);
      }
    }, 15000);

    async function loadInfo() {
      setLoading(true);
      setTakingLong(false);
      setError(null);

      try {
        const data = await fetchCompanyInfo(companyName);
        if (!cancelled) {
          setInfo(data);
        }
      } catch {
        if (!cancelled) {
          setError('Could not show company details.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTakingLong(false);
          clearTimeout(timeoutId);
          clearTimeout(slowLoadingId);
        }
      }
    }

    loadInfo();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(slowLoadingId);
    };
  }, [companyName, retryCount]);

  const handleRetry = () => {
    setRetryCount(c => c + 1);
  };

  const toolsAndSystems = info ? getToolsAndSystems(info) : [];
  const hasDetailedInfo = info && (info.industry || info.founded || info.headquarters);

  return (
    <Card className="w-full max-w-md">
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400" />
            </div>
            <div>
              <h3 className="font-medium text-surface-900 dark:text-white">
                {companyName}
              </h3>
              <p className="text-xs text-surface-500">Company Research</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner />
            {takingLong && (
              <p className="mt-3 text-sm text-surface-500 dark:text-surface-400 text-center">
                Still checking local company details...
              </p>
            )}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRetry}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {/* Rating */}
            {info.glassdoorRating && (
              <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700">
                <span className="text-sm text-surface-600 dark:text-surface-400">Glassdoor Rating</span>
                <RatingStars rating={info.glassdoorRating} />
              </div>
            )}

            {/* Quick badges */}
            <div className="flex flex-wrap gap-2">
              {info.industry && (
                <Badge variant="sentinel">{info.industry}</Badge>
              )}
              {info.fundingStage && (
                <Badge variant="alert">{info.fundingStage}</Badge>
              )}
              {info.remotePolicy && (
                <Badge variant="surface">{info.remotePolicy}</Badge>
              )}
            </div>

            {/* Detailed info */}
            {hasDetailedInfo && (
              <div className="grid grid-cols-2 gap-x-4">
                {info.founded && (
                  <InfoRow
                    label="Founded"
                    value={info.founded}
                    icon={<CalendarIcon />}
                  />
                )}
                {info.headquarters && (
                  <InfoRow
                    label="Headquarters"
                    value={info.headquarters}
                    icon={<LocationIcon />}
                  />
                )}
                {info.employeeCount && (
                  <InfoRow
                    label="Employees"
                    value={info.employeeCount}
                    icon={<UsersIcon />}
                  />
                )}
                {info.totalFunding && (
                  <InfoRow
                    label="Total Funding"
                    value={info.totalFunding}
                    icon={<CurrencyIcon />}
                  />
                )}
              </div>
            )}

            {/* Tools and systems */}
            {toolsAndSystems.length > 0 && (
              <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">
                  Tools and systems
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {toolsAndSystems.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-1 bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {info.description && (
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                {info.description}
              </p>
            )}

            {/* Links */}
            {info.website && (
              <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
                <a
                  href={info.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline"
                >
                  <LinkIcon className="w-4 h-4" />
                  Visit Website
                </a>
              </div>
            )}

            {/* No detailed info message */}
            {!hasDetailedInfo && !info.glassdoorRating && (
              <div className="text-center py-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  Limited information available for this company.
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  Try the official careers page and public job or review pages for "{companyName}".
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
});

// Icons
function BuildingIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
