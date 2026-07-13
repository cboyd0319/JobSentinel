import { lazy, Suspense } from "react";
import { Button } from "../../ui/Button";
import { AnalyticsSkeleton, ModalSkeleton } from "../../ui/LoadingFallbacks";
import { Modal, ModalFooter } from "../../ui/Modal";
import { getInterviewSchedulerApplications, STATUS_COLUMNS, type Application, type ApplicationsByStatus } from "./applicationsModel";
import type { RenderCompanyResearch } from "../../shared/companyResearch";

const AnalyticsPanel = lazy(() => import("./AnalyticsPanel").then((module) => ({ default: module.AnalyticsPanel })));
const InterviewScheduler = lazy(() => import("./InterviewScheduler").then((module) => ({ default: module.InterviewScheduler })));
const CoverLetterTemplates = lazy(() => import("./CoverLetterTemplates").then((module) => ({ default: module.CoverLetterTemplates })));

interface ApplicationsOverlaysProps {
  appNotesId: string;
  appStatusId: string;
  applications: ApplicationsByStatus | null;
  notes: string;
  onCloseAnalytics: () => void;
  onCloseApplication: () => void;
  onCloseInterviews: () => void;
  onCloseTemplates: () => void;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  onStatusChange: (status: string) => void;
  selectedApp: Application | null;
  showAnalytics: boolean;
  showInterviews: boolean;
  showTemplates: boolean;
  renderCompanyResearch?: RenderCompanyResearch;
}

export function ApplicationsOverlays({
  appNotesId,
  appStatusId,
  applications,
  notes,
  onCloseAnalytics,
  onCloseApplication,
  onCloseInterviews,
  onCloseTemplates,
  onNotesChange,
  onSaveNotes,
  onStatusChange,
  selectedApp,
  showAnalytics,
  showInterviews,
  showTemplates,
  renderCompanyResearch,
}: ApplicationsOverlaysProps) {
  return (
    <>
      {/* Application Detail Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={onCloseApplication}
        title={selectedApp?.job_title}
        size="lg"
      >
        {selectedApp && (
          <div data-testid="application-detail-dialog" className="min-w-0">
            <p className="mb-4 break-words text-surface-600 [overflow-wrap:anywhere] dark:text-surface-400">
              {selectedApp.company}
            </p>

            <div className="mb-4">
                <label htmlFor={appStatusId} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Status
                </label>
                <select
                  id={appStatusId}
                  value={selectedApp.status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus-visible:ring-2 focus-visible:ring-sentinel-500 focus:border-sentinel-500"
                >
                  {STATUS_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
            </div>

            <div className="mb-4">
                <label htmlFor={appNotesId} className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Add Notes
                </label>
                <textarea
                  id={appNotesId}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none break-words [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-sentinel-500 focus:border-sentinel-500"
                />
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 text-right">
                  {notes.length}/500 characters
                </p>
            </div>

            {selectedApp.notes && (
              <div className="mb-4 rounded-lg bg-surface-50 p-3 dark:bg-surface-700">
                <p className="whitespace-pre-wrap break-words text-sm text-surface-600 [overflow-wrap:anywhere] dark:text-surface-400">
                    Previous notes: {selectedApp.notes}
                </p>
              </div>
            )}

            <ModalFooter className="flex-col sm:flex-row">
              <Button variant="secondary" onClick={onCloseApplication} className="w-full sm:flex-1">
                Close
              </Button>
              <Button onClick={onSaveNotes} disabled={!notes.trim()} className="w-full sm:flex-1">
                Save Notes
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Application summary panel */}
      {showAnalytics && (
        <Suspense fallback={<AnalyticsSkeleton />}>
          <AnalyticsPanel onClose={() => onCloseAnalytics()} />
        </Suspense>
      )}

      {/* Interview Scheduler */}
      {showInterviews && applications && (
        <Suspense fallback={<ModalSkeleton />}>
          <InterviewScheduler
            onClose={() => onCloseInterviews()}
            applications={getInterviewSchedulerApplications(applications)}
            renderCompanyResearch={renderCompanyResearch}
          />
        </Suspense>
      )}

      {/* Cover Letter Templates */}
      {showTemplates && (
        <Modal
          isOpen
          onClose={() => onCloseTemplates()}
          title="Cover Letter Templates"
          size="wide"
        >
          <Suspense fallback={<ModalSkeleton />}>
            <CoverLetterTemplates />
          </Suspense>
        </Modal>
      )}
    </>
  );
}
