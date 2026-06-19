import { Badge } from "../components/Badge";
import { Card, CardHeader } from "../components/Card";
import {
  RESUME_ROLE_FAMILY_TAXONOMY,
  resumeRoleFamiliesForSummary,
} from "../shared/resumeRoleFamilyTaxonomy";

function formatSummaryList(items: string[]): string {
  if (items.length <= 2) {
    return items.join(" and ");
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function ResumeRoleFamilyCoverageCard() {
  const summary = formatSummaryList(resumeRoleFamiliesForSummary());

  return (
    <Card>
      <CardHeader title="Role Coverage" />
      <div className="space-y-3">
        <p className="text-sm text-surface-700 dark:text-surface-300">
          Resume help covers {summary}.
        </p>
        <p className="text-sm text-surface-600 dark:text-surface-400">
          JobSentinel uses these lanes to ask for proof before suggesting wording,
          so resume help works beyond technical jobs without inventing experience.
        </p>
        <div className="flex flex-wrap gap-2" aria-label="Supported resume role families">
          {RESUME_ROLE_FAMILY_TAXONOMY.map((family) => (
            <Badge key={family.id} variant="surface" size="sm">
              {family.label}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
