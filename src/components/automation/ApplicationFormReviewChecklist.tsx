import { APPLICATION_FORM_REVIEW_PROVENANCE_ITEMS } from "../../shared/applicationFormReviewTaxonomy";

export function ApplicationFormReviewChecklist() {
  return (
    <section
      role="group"
      aria-labelledby="application-form-review-checklist-heading"
      className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/60"
    >
      <h4
        id="application-form-review-checklist-heading"
        className="mb-2 font-medium text-surface-800 dark:text-surface-200"
      >
        Answer Review Checklist
      </h4>
      <p className="mb-3 text-sm text-surface-600 dark:text-surface-400">
        The application page is the source of truth. Use this quick check before
        submitting.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2" role="list">
        {APPLICATION_FORM_REVIEW_PROVENANCE_ITEMS.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-surface-200 bg-white px-3 py-2 dark:border-surface-700 dark:bg-surface-900/40"
          >
            <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
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
