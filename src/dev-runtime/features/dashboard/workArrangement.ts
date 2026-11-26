/** Derives browser-development work arrangements from the canonical indicator taxonomy. */

import workArrangementTaxonomy from "../../../../resources/taxonomies/work-arrangements.json";
import type { MockJob } from "../../mocks/handlers/types";
import type { WorkArrangement } from "../../../features/dashboard/types";

export type MockWorkArrangement = WorkArrangement;

const indicatorOrder: readonly Exclude<MockWorkArrangement, "unspecified">[] = [
  "hybrid",
  "remote",
  "onsite",
];

export function deriveMockWorkArrangement(job: MockJob): MockWorkArrangement {
  if (job.remote === true) return "remote";
  const text = [job.title, job.location, job.description]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return indicatorOrder.find((arrangement) =>
    workArrangementTaxonomy.workArrangementIndicators[arrangement]
      .some((indicator) => text.includes(indicator)),
  ) ?? "unspecified";
}
