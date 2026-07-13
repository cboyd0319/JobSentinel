// Navigation Component - Visible navigation bar for all app pages

import { memo } from "react";
import type { Page } from "./routes";

interface NavItem {
  id: Page;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

// Icons for each page (memoized for re-render prevention)
const DashboardIcon = memo(function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
});

const ApplicationsIcon = memo(function ApplicationsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
});

const ResumeIcon = memo(function ResumeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
});

const SalaryIcon = memo(function SalaryIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
});

const MarketIcon = memo(function MarketIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
});

const AutomationIcon = memo(function AutomationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
});

const BuilderIcon = memo(function BuilderIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
});

const OptimizerIcon = memo(function OptimizerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
});

const SearchLinksIcon = memo(function SearchLinksIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1-1m2.828 2.656a4 4 0 010-5.656l2-2a4 4 0 015.656 5.656l-1 1" />
    </svg>
  );
});

// Navigation dimensions (extracted to prevent re-creation on each render)
const NAV_WIDTHS = {
  collapsed: "64px",
} as const;

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortcut: "Cmd/Ctrl+1", icon: <DashboardIcon /> },
  { id: "applications", label: "Applications", shortcut: "Cmd/Ctrl+2", icon: <ApplicationsIcon /> },
  { id: "resume", label: "Resumes", shortcut: "Cmd/Ctrl+3", icon: <ResumeIcon /> },
  { id: "salary", label: "Salary", shortcut: "Cmd/Ctrl+4", icon: <SalaryIcon /> },
  { id: "market", label: "Hiring Trends", shortcut: "Cmd/Ctrl+5", icon: <MarketIcon /> },
  { id: "automation", label: "Application Assist", shortcut: "Cmd/Ctrl+6", icon: <AutomationIcon /> },
  { id: "resume-builder", label: "Resume Builder", shortcut: "Cmd/Ctrl+7", icon: <BuilderIcon /> },
  { id: "ats-optimizer", label: "Resume Match", shortcut: "Cmd/Ctrl+8", icon: <OptimizerIcon /> },
  { id: "search-links", label: "Search Links", shortcut: "Cmd/Ctrl+9", icon: <SearchLinksIcon /> },
];

export const Navigation = memo(function Navigation({ currentPage, onNavigate }: NavigationProps) {
  return (
    <nav
      className="fixed left-0 top-0 h-full bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 z-40 transition-all duration-200"
      style={{ width: NAV_WIDTHS.collapsed }}
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full py-4">
        {/* Logo */}
        <div className="px-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-sentinel-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${currentPage === item.id
                  ? "bg-sentinel-100 dark:bg-sentinel-900 text-sentinel-700 dark:text-sentinel-300"
                  : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white"
                }
              `}
              aria-label={`${item.label} (${item.shortcut})`}
              aria-current={currentPage === item.id ? "page" : undefined}
              title={`${item.label} (${item.shortcut})`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
});

export default Navigation;
