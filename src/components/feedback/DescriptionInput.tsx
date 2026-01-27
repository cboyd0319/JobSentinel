import { memo, useId } from "react";
import { FeedbackCategory } from "../../services/feedbackService";

interface DescriptionInputProps {
  category: FeedbackCategory | null;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const PLACEHOLDERS: Record<FeedbackCategory, string> = {
  bug: "Describe what went wrong...\n\nFor example:\n- What were you trying to do?\n- What happened instead?\n- Can you reproduce it?",
  feature: "Describe your idea...\n\nFor example:\n- What problem would this solve?\n- How would you like it to work?\n- Are there any examples?",
  question: "What would you like to know?\n\nFor example:\n- Ask about a feature\n- Share general feedback\n- Suggest improvements",
};

export const DescriptionInput = memo(function DescriptionInput({
  category,
  value,
  onChange,
  error,
}: DescriptionInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const placeholder = category ? PLACEHOLDERS[category] : "Select a category first...";

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-surface-700 dark:text-surface-300"
      >
        Description
        <span className="text-danger ml-1" aria-label="required">*</span>
      </label>

      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={!category}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        rows={8}
        className={`
          w-full px-4 py-3 rounded-lg border
          bg-white dark:bg-surface-800
          text-surface-800 dark:text-white
          placeholder:text-surface-400 dark:placeholder:text-surface-500
          transition-all duration-150
          resize-y min-h-[150px]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-2
          disabled:bg-surface-50 dark:disabled:bg-surface-900
          disabled:cursor-not-allowed disabled:text-surface-500
          ${
            error
              ? "border-danger focus:border-danger"
              : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 focus:border-sentinel-400"
          }
        `}
      />

      {error && (
        <p id={errorId} className="text-sm text-danger flex items-center gap-1">
          <ErrorIcon />
          {error}
        </p>
      )}

      <p className="text-xs text-surface-500 dark:text-surface-400">
        Please don't include personal information like job titles you're searching for,
        company names, or location details. This helps protect your privacy.
      </p>
    </div>
  );
});

function ErrorIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
