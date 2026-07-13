import { COVER_LETTER_REVIEW_ITEMS } from "../../shared/coverLetterReviewTaxonomy";

export function CoverLetterReviewChecklist() {
  return (
    <section
      className="mb-4 rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/60"
      aria-labelledby="cover-letter-review-heading"
    >
      <h4
        id="cover-letter-review-heading"
        className="mb-2 text-sm font-medium text-surface-800 dark:text-surface-100"
      >
        Cover Letter Review
      </h4>
      <ul className="grid gap-2 sm:grid-cols-3" role="list">
        {COVER_LETTER_REVIEW_ITEMS.map((item) => (
          <li key={item.id} className="min-w-0">
            <p className="text-xs font-semibold text-surface-700 dark:text-surface-200">
              {item.label}
            </p>
            <p className="mt-1 text-xs leading-5 text-surface-600 dark:text-surface-400">
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
