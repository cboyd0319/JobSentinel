interface OfferReviewTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function OfferReviewTextarea({
  label,
  value,
  onChange,
  placeholder,
}: OfferReviewTextareaProps) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="sm:col-span-2">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-surface-200 bg-white px-4 py-3 text-surface-800 placeholder:text-surface-400 transition-all duration-150 hover:border-surface-300 focus:border-sentinel-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-100 dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:placeholder:text-surface-500 dark:hover:border-surface-600 dark:focus-visible:ring-sentinel-900"
      />
    </div>
  );
}

export function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
