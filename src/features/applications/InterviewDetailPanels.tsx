import { useState } from "react";
import { Button } from "../../ui/Button";
import { CompanyResearchPanel } from "../../components/CompanyResearchPanel";
import { Modal } from "../../ui/Modal";
import { formatInterviewDate } from "../../utils/formatUtils";
import {
  INTERVIEW_TYPES,
  OUTCOME_COLORS,
  PREP_CHECKLIST,
  TYPE_COLORS,
  formatOutcomeLabel,
  type Interview,
  type PrepProgress,
} from "./InterviewSchedulerModel";
import {
  CalendarIcon,
  DownloadIcon,
  LocationIcon,
  SearchIcon,
  UserIcon,
} from "./InterviewSchedulerIcons";

interface InterviewDetailPanelsProps {
  completing: boolean;
  deleting: boolean;
  interview: Interview;
  onClose: () => void;
  onComplete: (interview: Interview, outcome: string, notes?: string) => void;
  onDelete: (interviewId: number) => void;
  onExportICal: (interview: Interview) => void;
  onPrepToggle: (itemId: string) => void;
  prepProgress: PrepProgress;
}

export function InterviewDetailPanels({
  completing,
  deleting,
  interview,
  onClose,
  onComplete,
  onDelete,
  onExportICal,
  onPrepToggle,
  prepProgress,
}: InterviewDetailPanelsProps) {
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [feedbackOutcome, setFeedbackOutcome] = useState("");
  const [researchCompany, setResearchCompany] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const handleOpenCompanyResearch = (company: string) => setResearchCompany(company);

  return (
    <>
      {/* Interview Detail Modal */}
      {interview && (
        <Modal
          isOpen
          onClose={onClose}
          title={interview.job_title}
          description={interview.company}
          size="md"
        >
          <div className="space-y-4">
              <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLORS[interview.interview_type] || TYPE_COLORS.other}`}>
                {INTERVIEW_TYPES.find((t) => t.value === interview.interview_type)?.label || interview.interview_type}
              </span>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-surface-400" />
                  <span>{formatInterviewDate(interview.scheduled_at)}</span>
                  <span className="text-surface-400">({interview.duration_minutes} min)</span>
                </div>
                {interview.location && (
                  <div className="flex items-center gap-2">
                    <LocationIcon />
                    <span>{interview.location}</span>
                  </div>
                )}
                {interview.interviewer_name && (
                  <div className="flex items-center gap-2">
                    <UserIcon />
                    <span>
                      {interview.interviewer_name}
                      {interview.interviewer_title && ` - ${interview.interviewer_title}`}
                    </span>
                  </div>
                )}
              </div>

              {interview.notes && (
                <div className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg text-sm">
                  <p className="font-medium text-surface-700 dark:text-surface-300 mb-1">Prep Notes</p>
                  <p className="text-surface-600 dark:text-surface-400">{interview.notes}</p>
                </div>
              )}

              {/* Interview Prep Checklist */}
              <div className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-surface-700 dark:text-surface-300 text-sm">Interview Prep</p>
                  <span className="text-xs text-surface-500">
                    {Object.values(prepProgress).filter(Boolean).length}/{PREP_CHECKLIST.length} done
                  </span>
                </div>
                <div className="space-y-1.5">
                  {PREP_CHECKLIST.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={prepProgress[item.id] || false}
                        onChange={() => onPrepToggle(item.id)}
                        className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus-visible:ring-sentinel-500"
                      />
                      <span className={`text-sm ${prepProgress[item.id] ? 'text-surface-400 line-through' : 'text-surface-600 dark:text-surface-400'}`}>
                        {item.label}
                      </span>
                      {item.id === "research" && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenCompanyResearch(interview.company);
                          }}
                          className="text-xs text-sentinel-600 dark:text-sentinel-400 hover:underline ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Research →
                        </button>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => onExportICal(interview)}
                  className="flex items-center gap-1"
                >
                  <DownloadIcon />
                  Add to Calendar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenCompanyResearch(interview.company)}
                  className="flex items-center gap-1"
                >
                  <SearchIcon />
                  Research
                </Button>
              </div>

              <div className="border-t border-surface-200 dark:border-surface-600 pt-4">
                {!showFeedbackForm ? (
                  <>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                      How did it go?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => { setFeedbackOutcome("passed"); setShowFeedbackForm(true); }}
                        className="flex-1"
                      >
                        Went well
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { setFeedbackOutcome("pending"); setShowFeedbackForm(true); }}
                        className="flex-1"
                      >
                        Not sure yet
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { setFeedbackOutcome("failed"); setShowFeedbackForm(true); }}
                        className="flex-1"
                      >
                        Not a fit
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        Interview outcome:
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${OUTCOME_COLORS[feedbackOutcome] || OUTCOME_COLORS.pending}`}>
                        {formatOutcomeLabel(feedbackOutcome)}
                      </span>
                    </div>
                    <div>
                      <label htmlFor="post-notes" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Notes after interview
                      </label>
                      <textarea
                        id="post-notes"
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        rows={4}
                        placeholder="How did it go? Topics discussed, questions asked, overall impression..."
                        maxLength={1000}
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => { setShowFeedbackForm(false); setFeedbackOutcome(''); setFeedbackNotes(''); }}
                        disabled={completing}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => onComplete(interview, feedbackOutcome, feedbackNotes)}
                        loading={completing}
                        loadingText="Saving..."
                        className="flex-1"
                      >
                        Save & Complete
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                {showDeleteConfirm ? (
                  <>
                    <span className="text-sm text-red-600 dark:text-red-400 self-center">
                      Delete this interview?
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => onDelete(interview.id)}
                      loading={deleting}
                      loadingText="Deleting..."
                    >
                      Confirm Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 dark:text-red-400"
                  >
                    Delete
                  </Button>
                )}
              </div>
          </div>
        </Modal>
      )}

      {/* Company Research Panel Modal */}
      {researchCompany && (
        <CompanyResearchPanel
          companyName={researchCompany}
          onClose={() => {
            setResearchCompany(null);
          }}
        />
      )}
    </>
  );
}
