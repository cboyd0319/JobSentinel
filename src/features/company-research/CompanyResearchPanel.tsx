import { memo, useEffect } from "react";
import { Badge } from "../../ui/Badge";
import { Card } from "../../ui/Card";
import { removeStorageValue } from "../../shared/browserStorage";
import type { CompanyResearchPanelProps } from "../../shared/companyResearch";
import { getCompanyDetails } from "./internal/companyResearchModel";

const LEGACY_CACHE_KEY = "jobsentinel_company_cache";

const InfoRow = memo(function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && (
        <div className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div>
        <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
          {value}
        </p>
      </div>
    </div>
  );
});

export const CompanyResearchPanel = memo(function CompanyResearchPanel({
  companyName,
  onClose,
}: CompanyResearchPanelProps) {
  useEffect(() => {
    removeStorageValue("local", LEGACY_CACHE_KEY);
  }, []);

  const info = getCompanyDetails(companyName);
  const toolsAndSystems = info.toolsAndSystems ?? [];
  const hasDetailedInfo = Boolean(info.industry || info.founded || info.headquarters);

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
        <div className="space-y-4">
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
          {!hasDetailedInfo && (
            <div className="text-center py-4 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Limited information available for this company.
              </p>
              <p className="text-xs text-surface-400 mt-1">
                Try the official careers page and public job or review pages for
                "{companyName}".
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});

// Icons
function BuildingIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
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

function LinkIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
