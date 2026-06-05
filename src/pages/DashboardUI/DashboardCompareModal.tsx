import { memo } from "react";
import { Button } from "../../components/Button";
import { Modal, ModalFooter } from "../../components/Modal";
import { ScoreDisplay } from "../../components/ScoreDisplay";
import { formatJobSourceLabel } from "../../utils/sourceLabels";
import { formatDashboardPostedDate } from "../dashboardDateDisplay";
import { formatDashboardFitEstimate } from "../dashboardFitEstimate";
import { formatDashboardListedPay } from "../dashboardSalaryDisplay";
import type { Job } from "../DashboardTypes";

interface DashboardCompareModalProps {
  isOpen: boolean;
  comparedJobs: Job[];
  onClose: () => void;
}

export const DashboardCompareModal = memo(function DashboardCompareModal({
  isOpen,
  comparedJobs,
  onClose,
}: DashboardCompareModalProps) {
  const gridClass =
    comparedJobs.length === 2
      ? "grid gap-4 grid-cols-2"
      : "grid gap-4 grid-cols-3";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Jobs" size="xl">
      <div className="space-y-4">
        {comparedJobs.length > 0 && (
          <>
            <div className={gridClass}>
              {comparedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                >
                  <h4 className="font-semibold text-surface-800 dark:text-surface-200 truncate">
                    {job.title}
                  </h4>
                  <p className="text-sm text-surface-500 dark:text-surface-400 truncate">
                    {job.company}
                  </p>
                  <ScoreDisplay score={job.score} size="sm" showLabel={false} />
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                role="table"
                aria-label="Job comparison"
              >
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Attribute</th>
                    {comparedJobs.map((job) => (
                      <th key={job.id} scope="col">
                        {job.title} at {job.company}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
                  <CompareRow
                    label="Match Strength"
                    values={comparedJobs.map((job) =>
                      formatDashboardFitEstimate(job.score),
                    )}
                  />
                  <CompareRow
                    label="Location"
                    values={comparedJobs.map((job) =>
                      job.remote ? "Remote" : job.location || "N/A",
                    )}
                  />
                  <CompareRow
                    label="Listed Pay"
                    values={comparedJobs.map((job) =>
                      formatDashboardListedPay(job.salary_min, job.salary_max),
                    )}
                  />
                  <CompareRow
                    label="Source"
                    values={comparedJobs.map((job) => formatJobSourceLabel(job.source))}
                  />
                  <CompareRow
                    label="Remote"
                    values={comparedJobs.map((job) =>
                      job.remote ? "Yes" : job.remote === false ? "No" : "Unknown",
                    )}
                  />
                  <CompareRow
                    label="Posted"
                    values={comparedJobs.map((job) =>
                      formatDashboardPostedDate(job.created_at),
                    )}
                  />
                  <CompareRow
                    label="Bookmarked"
                    values={comparedJobs.map((job) =>
                      job.bookmarked ? "Yes" : "No",
                    )}
                  />
                </tbody>
              </table>
            </div>
            <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
              <h5 className="font-medium text-surface-800 dark:text-surface-200 mb-3">
                Descriptions
              </h5>
              <div className={gridClass}>
                {comparedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg text-xs text-surface-600 dark:text-surface-400 max-h-40 overflow-y-auto"
                  >
                    {job.description || "No description available"}
                  </div>
                ))}
              </div>
            </div>
            <ModalFooter>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </div>
    </Modal>
  );
});

const CompareRow = memo(function CompareRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <tr>
      <th
        scope="row"
        className="py-2 pr-4 font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap text-left"
      >
        {label}
      </th>
      {values.map((value, i) => (
        <td
          key={i}
          className="py-2 px-4 text-surface-600 dark:text-surface-400"
        >
          {value}
        </td>
      ))}
    </tr>
  );
});
