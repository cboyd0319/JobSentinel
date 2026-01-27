import { memo } from "react";
import { FeedbackCategory } from "../../services/feedbackService";

interface CategorySelectorProps {
  selected: FeedbackCategory | null;
  onSelect: (category: FeedbackCategory) => void;
}

export const CategorySelector = memo(function CategorySelector({
  selected,
  onSelect,
}: CategorySelectorProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
        What type of feedback would you like to share?
      </p>

      <div className="grid grid-cols-1 gap-3">
        <CategoryButton
          category="bug"
          selected={selected === "bug"}
          onSelect={onSelect}
          icon={<BugIcon />}
          title="Bug Report"
          description="Something isn't working right"
        />

        <CategoryButton
          category="feature"
          selected={selected === "feature"}
          onSelect={onSelect}
          icon={<IdeaIcon />}
          title="Feature Request"
          description="Suggest an improvement or new feature"
        />

        <CategoryButton
          category="question"
          selected={selected === "question"}
          onSelect={onSelect}
          icon={<QuestionIcon />}
          title="Question or Comment"
          description="Ask a question or share feedback"
        />
      </div>
    </div>
  );
});

interface CategoryButtonProps {
  category: FeedbackCategory;
  selected: boolean;
  onSelect: (category: FeedbackCategory) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function CategoryButton({
  category,
  selected,
  onSelect,
  icon,
  title,
  description,
}: CategoryButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(category)}
      className={`
        w-full p-4 rounded-lg border-2 text-left
        transition-all duration-200
        flex items-start gap-4
        hover:shadow-md hover:-translate-y-0.5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 focus-visible:ring-offset-2
        ${
          selected
            ? "border-sentinel-500 bg-sentinel-50 dark:bg-sentinel-900/20"
            : "border-surface-200 dark:border-surface-700 hover:border-sentinel-300 dark:hover:border-sentinel-700"
        }
      `}
      aria-pressed={selected}
    >
      <div
        className={`
          flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
          ${
            selected
              ? "bg-sentinel-500 text-white"
              : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
          }
        `}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className={`
            font-semibold text-base mb-1
            ${
              selected
                ? "text-sentinel-700 dark:text-sentinel-300"
                : "text-surface-800 dark:text-surface-200"
            }
          `}
        >
          {title}
        </h3>
        <p className="text-sm text-surface-600 dark:text-surface-400">
          {description}
        </p>
      </div>

      {selected && (
        <div className="flex-shrink-0">
          <CheckIcon className="w-6 h-6 text-sentinel-500" />
        </div>
      )}
    </button>
  );
}

function BugIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function IdeaIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
