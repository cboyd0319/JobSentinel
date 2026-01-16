type IllustrationType = "search" | "jobs" | "applications" | "resume" | "salary" | "market" | "error" | "success" | "empty";

interface EmptyStateProps {
  icon?: React.ReactNode;
  illustration?: IllustrationType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, illustration, title, description, action }: EmptyStateProps) {
  const renderIllustration = () => {
    if (icon) {
      return (
        <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-surface-400 dark:text-surface-500">{icon}</div>
        </div>
      );
    }

    if (illustration) {
      return (
        <div className="mb-6">
          {illustrations[illustration]}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="text-center py-12 px-4">
      {renderIllustration()}
      <h3 className="font-display text-display-md text-surface-700 dark:text-surface-300 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

// SVG Illustrations for different empty states
const illustrations: Record<IllustrationType, React.ReactNode> = {
  search: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <circle cx="52" cy="52" r="24" className="stroke-sentinel-400" strokeWidth="4" fill="none" />
      <line x1="70" y1="70" x2="88" y2="88" className="stroke-sentinel-400" strokeWidth="4" strokeLinecap="round" />
      <circle cx="52" cy="52" r="12" className="fill-sentinel-100 dark:fill-sentinel-900/30" />
      <path d="M48 48 L56 56 M56 48 L48 56" className="stroke-sentinel-400" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  jobs: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <rect x="32" y="40" width="64" height="48" rx="4" className="fill-white dark:fill-surface-700 stroke-sentinel-400" strokeWidth="3" />
      <rect x="48" y="32" width="32" height="12" rx="2" className="fill-sentinel-100 dark:fill-sentinel-900/30 stroke-sentinel-400" strokeWidth="2" />
      <line x1="44" y1="56" x2="84" y2="56" className="stroke-surface-300 dark:stroke-surface-600" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="68" x2="72" y2="68" className="stroke-surface-300 dark:stroke-surface-600" strokeWidth="3" strokeLinecap="round" />
      <line x1="44" y1="80" x2="60" y2="80" className="stroke-surface-300 dark:stroke-surface-600" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  applications: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <rect x="24" y="36" width="24" height="56" rx="4" className="fill-blue-100 dark:fill-blue-900/30 stroke-blue-400" strokeWidth="2" />
      <rect x="52" y="36" width="24" height="56" rx="4" className="fill-yellow-100 dark:fill-yellow-900/30 stroke-yellow-400" strokeWidth="2" />
      <rect x="80" y="36" width="24" height="56" rx="4" className="fill-green-100 dark:fill-green-900/30 stroke-green-400" strokeWidth="2" />
      <rect x="28" y="44" width="16" height="4" rx="1" className="fill-blue-300 dark:fill-blue-600" />
      <rect x="28" y="52" width="12" height="4" rx="1" className="fill-blue-200 dark:fill-blue-700" />
      <rect x="56" y="44" width="16" height="4" rx="1" className="fill-yellow-300 dark:fill-yellow-600" />
      <rect x="84" y="44" width="16" height="4" rx="1" className="fill-green-300 dark:fill-green-600" />
    </svg>
  ),
  resume: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <rect x="36" y="28" width="56" height="72" rx="4" className="fill-white dark:fill-surface-700 stroke-purple-400" strokeWidth="3" />
      <circle cx="64" cy="48" r="12" className="fill-purple-100 dark:fill-purple-900/30 stroke-purple-400" strokeWidth="2" />
      <line x1="48" y1="68" x2="80" y2="68" className="stroke-surface-300 dark:stroke-surface-600" strokeWidth="3" strokeLinecap="round" />
      <line x1="48" y1="78" x2="72" y2="78" className="stroke-surface-300 dark:stroke-surface-600" strokeWidth="3" strokeLinecap="round" />
      <line x1="48" y1="88" x2="64" y2="88" className="stroke-surface-300 dark:stroke-surface-600" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  salary: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <circle cx="64" cy="64" r="32" className="fill-green-100 dark:fill-green-900/30 stroke-green-400" strokeWidth="3" />
      <text x="64" y="72" textAnchor="middle" className="fill-green-600 dark:fill-green-400 text-3xl font-bold" fontFamily="system-ui">$</text>
      <path d="M40 48 L48 40 L56 48" className="stroke-green-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M88 80 L80 88 L72 80" className="stroke-green-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  market: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <rect x="28" y="72" width="16" height="24" rx="2" className="fill-orange-300 dark:fill-orange-600" />
      <rect x="48" y="56" width="16" height="40" rx="2" className="fill-orange-400 dark:fill-orange-500" />
      <rect x="68" y="40" width="16" height="56" rx="2" className="fill-orange-500 dark:fill-orange-400" />
      <rect x="88" y="48" width="16" height="48" rx="2" className="fill-orange-400 dark:fill-orange-500" />
      <path d="M24 36 L44 48 L64 32 L84 44 L104 28" className="stroke-sentinel-500" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="24" cy="36" r="4" className="fill-sentinel-500" />
      <circle cx="44" cy="48" r="4" className="fill-sentinel-500" />
      <circle cx="64" cy="32" r="4" className="fill-sentinel-500" />
      <circle cx="84" cy="44" r="4" className="fill-sentinel-500" />
      <circle cx="104" cy="28" r="4" className="fill-sentinel-500" />
    </svg>
  ),
  error: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-red-50 dark:fill-red-900/20" />
      <circle cx="64" cy="64" r="40" className="fill-red-100 dark:fill-red-900/30 stroke-red-400" strokeWidth="3" />
      <line x1="48" y1="48" x2="80" y2="80" className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
      <line x1="80" y1="48" x2="48" y2="80" className="stroke-red-500" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  success: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-green-50 dark:fill-green-900/20" />
      <circle cx="64" cy="64" r="40" className="fill-green-100 dark:fill-green-900/30 stroke-green-400" strokeWidth="3" />
      <path d="M48 64 L60 76 L80 52" className="stroke-green-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  empty: (
    <svg className="w-32 h-32 mx-auto" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="56" className="fill-surface-100 dark:fill-surface-800" />
      <rect x="36" y="44" width="56" height="40" rx="4" className="fill-white dark:fill-surface-700 stroke-surface-300 dark:stroke-surface-600" strokeWidth="2" strokeDasharray="4 2" />
      <circle cx="64" cy="64" r="8" className="fill-surface-200 dark:fill-surface-600" />
      <path d="M60 64 L68 64 M64 60 L64 68" className="stroke-surface-400" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};
