import { useEffect, useState, useCallback, memo } from "react";
import { cachedInvoke, invalidateCacheByCommand, safeInvoke, safeInvokeWithToast } from "../utils/api";
import { Button } from "./Button";
import { CompanyResearchPanel } from "./CompanyResearchPanel";
import {
  InterviewScheduleFormModal,
  type InterviewScheduleFormData,
} from "./InterviewScheduleFormModal";
import { Modal } from "./Modal";
import { useToast } from "../contexts";
import { formatInterviewDate } from "../utils/formatUtils";
import { MIN_INTERVIEW_DURATION, MAX_INTERVIEW_DURATION } from "../utils/constants";
import { getSafeErrorToastCopy } from "../utils/safeErrorCopy";
import { downloadInterviewICalFile } from "./InterviewCalendarExport";
import {
  InterviewSchedulerTabs,
  InterviewScheduleList,
} from "./InterviewSchedulerLists";
import {
  INTERVIEW_TYPES,
  OUTCOME_COLORS,
  PREP_CHECKLIST,
  TYPE_COLORS,
  formatInterviewTypeLabel,
  formatOutcomeLabel,
  type FollowUpReminder,
  type Interview,
  type InterviewSchedulerProps,
  type InterviewTab,
  type PrepChecklistItem,
  type PrepProgress,
} from "./InterviewSchedulerModel";
import {
  CalendarIcon,
  DownloadIcon,
  LocationIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
} from "./InterviewSchedulerIcons";

export const InterviewScheduler = memo(function InterviewScheduler({ onClose, applications = [] }: InterviewSchedulerProps) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [pastInterviews, setPastInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [activeTab, setActiveTab] = useState<InterviewTab>('upcoming');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackOutcome, setFeedbackOutcome] = useState<string>('');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [prepProgress, setPrepProgress] = useState<PrepProgress>({});
  const [followUpReminders, setFollowUpReminders] = useState<Record<number, FollowUpReminder>>({});
  const [showCompanyResearch, setShowCompanyResearch] = useState(false);
  const [researchCompany, setResearchCompany] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const toast = useToast();

  // Load follow-up reminders from backend
  const loadFollowUpReminders = useCallback(async () => {
    try {
      // Load reminders for all past interviews
      const reminders: Record<number, FollowUpReminder> = {};
      for (const interview of pastInterviews) {
        const result = await safeInvoke<{ thankYouSent: boolean; sentAt: string | null } | null>(
          'get_interview_followup',
          { interviewId: interview.id },
          { logContext: "Load interview follow-up", silent: true }
        );
        if (result) {
          reminders[interview.id] = {
            interviewId: interview.id,
            thankYouSent: result.thankYouSent,
            sentAt: result.sentAt,
          };
        }
      }
      setFollowUpReminders(reminders);
    } catch {
      // Silent failure - non-critical on load
    }
  }, [pastInterviews]);

  // Load follow-up reminders when past interviews change
  useEffect(() => {
    if (pastInterviews.length > 0) {
      loadFollowUpReminders();
    }
  }, [pastInterviews, loadFollowUpReminders]);

  // Load prep progress when interview is selected
  useEffect(() => {
    const loadPrepProgress = async () => {
      if (!selectedInterview) return;
      try {
        const items = await safeInvoke<PrepChecklistItem[]>(
          'get_interview_prep_checklist',
          { interviewId: selectedInterview.id },
          { logContext: "Load interview prep checklist", silent: true }
        );
        const progress: PrepProgress = {};
        for (const item of items) {
          progress[item.itemId] = item.completed;
        }
        setPrepProgress(progress);
      } catch {
        setPrepProgress({});
      }
    };
    loadPrepProgress();
  }, [selectedInterview]);

  const handlePrepToggle = async (itemId: string) => {
    if (!selectedInterview) return;
    const newCompleted = !prepProgress[itemId];
    // Optimistic update
    setPrepProgress(prev => ({ ...prev, [itemId]: newCompleted }));
    try {
      await safeInvokeWithToast('save_interview_prep_item', {
        interviewId: selectedInterview.id,
        itemId,
        completed: newCompleted,
      }, toast, {
        logContext: "Save interview prep item"
      });
    } catch {
      // Revert on error
      setPrepProgress(prev => ({ ...prev, [itemId]: !newCompleted }));
    }
  };

  const handleFollowUpToggle = async (interviewId: number) => {
    const current = followUpReminders[interviewId];
    const newValue = !(current?.thankYouSent);
    // Optimistic update
    setFollowUpReminders(prev => ({
      ...prev,
      [interviewId]: {
        interviewId,
        thankYouSent: newValue,
        sentAt: newValue ? new Date().toISOString() : null,
      },
    }));
    try {
      await safeInvokeWithToast('save_interview_followup', {
        interviewId,
        thankYouSent: newValue,
      }, toast, {
        logContext: "Save interview follow-up"
      });
      if (newValue) {
        toast.success("Follow-up marked", "Thank you note sent!");
      }
    } catch {
      // Revert on error
      setFollowUpReminders(prev => ({
        ...prev,
        [interviewId]: current || { interviewId, thankYouSent: false, sentAt: null },
      }));
    }
  };

  const handleOpenCompanyResearch = (company: string) => {
    setResearchCompany(company);
    setShowCompanyResearch(true);
  };

  // Form state
  const [formData, setFormData] = useState<InterviewScheduleFormData>({
    application_id: 0,
    interview_type: "phone",
    scheduled_at: "",
    duration_minutes: 60,
    location: "",
    interviewer_name: "",
    interviewer_title: "",
    notes: "",
  });

  const fetchInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const [upcomingData, pastData] = await Promise.all([
        cachedInvoke<Interview[]>("get_upcoming_interviews", undefined, 30_000),
        cachedInvoke<Interview[]>("get_past_interviews", undefined, 30_000).catch(() => [] as Interview[]),
      ]);
      setInterviews(upcomingData);
      setPastInterviews(pastData);
    } catch (err: unknown) {
      const safeError = getSafeErrorToastCopy(err, {
        fallbackTitle: "Could not load interviews",
      });
      toast.error(safeError.title, safeError.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  // Keyboard shortcuts: Tab to switch tabs, R to refresh, Cmd+N to add new
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key to switch between upcoming/past
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Only switch tabs if not focused on an input/button
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
          e.preventDefault();
          setActiveTab(prev => prev === 'upcoming' ? 'past' : 'upcoming');
        }
      }
      // R to refresh
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          fetchInterviews();
        }
      }
      // Cmd+N to schedule new interview
      if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowAddForm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchInterviews]);

  const handleScheduleInterview = async () => {
    if (!formData.application_id || !formData.scheduled_at) {
      toast.error("Choose interview details", "Choose an application and time before scheduling.");
      return;
    }

    // Validate date is not in the past
    const scheduledDate = new Date(formData.scheduled_at);
    const now = new Date();
    if (scheduledDate < now) {
      toast.error("Choose a future time", "Pick a time that has not passed.");
      return;
    }

    // Validate duration is reasonable
    if (formData.duration_minutes < MIN_INTERVIEW_DURATION || formData.duration_minutes > MAX_INTERVIEW_DURATION) {
      toast.error("Choose a valid length", `Pick between ${MIN_INTERVIEW_DURATION} minutes and ${MAX_INTERVIEW_DURATION / 60} hours.`);
      return;
    }

    try {
      setScheduling(true);
      await safeInvokeWithToast("schedule_interview", {
        applicationId: formData.application_id,
        interviewType: formData.interview_type,
        scheduledAt: formData.scheduled_at,
        durationMinutes: formData.duration_minutes,
        location: formData.location || null,
        interviewerName: formData.interviewer_name || null,
        interviewerTitle: formData.interviewer_title || null,
        notes: formData.notes || null,
      }, toast, {
        logContext: "Schedule interview"
      });
      invalidateCacheByCommand("get_upcoming_interviews");
      toast.success("Interview scheduled", "Your interview has been added to the calendar");
      setShowAddForm(false);
      setFormData({
        application_id: 0,
        interview_type: "phone",
        scheduled_at: "",
        duration_minutes: 60,
        location: "",
        interviewer_name: "",
        interviewer_title: "",
        notes: "",
      });
      fetchInterviews();
    } catch {
      // Error already logged and shown to user
    } finally {
      setScheduling(false);
    }
  };

  const handleCompleteInterview = async (interview: Interview, outcome: string, postNotes?: string) => {
    try {
      setCompleting(true);
      await safeInvokeWithToast("complete_interview", {
        interviewId: interview.id,
        outcome,
        notes: postNotes || null,
      }, toast, {
        logContext: "Complete interview"
      });
      invalidateCacheByCommand("get_upcoming_interviews");
      invalidateCacheByCommand("get_past_interviews");
      toast.success("Interview completed", formatOutcomeLabel(outcome));
      setSelectedInterview(null);
      setShowFeedbackForm(false);
      setFeedbackOutcome('');
      setFeedbackNotes('');
      fetchInterviews();
    } catch {
      // Error already logged and shown to user
    } finally {
      setCompleting(false);
    }
  };

  const handleExportICal = (interview: Interview) => {
    downloadInterviewICalFile(
      interview,
      formatInterviewTypeLabel(interview.interview_type),
    );
    toast.success("Calendar downloaded", "Add to your calendar app");
  };

  const handleDeleteInterview = async (interviewId: number) => {
    try {
      setDeleting(true);
      await safeInvokeWithToast("delete_interview", { interviewId }, toast, {
        logContext: "Delete interview"
      });
      invalidateCacheByCommand("get_upcoming_interviews");
      toast.success("Interview deleted", "The interview has been removed");
      setShowDeleteConfirm(false);
      setSelectedInterview(null);
      fetchInterviews();
    } catch {
      // Error already logged and shown to user
    } finally {
      setDeleting(false);
    }
  };


  if (loading) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Interview Schedule"
        description="Loading interviews"
        size="wide"
        closeButtonLabel="Close interview scheduler"
      >
        <div className="space-y-4" role="status" aria-label="Loading interviews">
          <div className="h-8 w-48 rounded bg-surface-200 motion-safe:animate-pulse dark:bg-surface-700" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded bg-surface-200 motion-safe:animate-pulse dark:bg-surface-700" />
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title="Interview Schedule"
        size="wide"
        closeButtonLabel="Close interview scheduler"
      >
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              <PlusIcon />
              Schedule
            </Button>
          </div>

          <InterviewSchedulerTabs
            activeTab={activeTab}
            upcomingCount={interviews.length}
            pastCount={pastInterviews.length}
            onTabChange={setActiveTab}
          />

          <InterviewScheduleList
            activeTab={activeTab}
            interviews={interviews}
            pastInterviews={pastInterviews}
            followUpReminders={followUpReminders}
            onSelectInterview={setSelectedInterview}
            onExportICal={handleExportICal}
            onFollowUpToggle={handleFollowUpToggle}
          />
        </div>
      </Modal>

      {showAddForm && (
        <InterviewScheduleFormModal
          applications={applications}
          dateError={dateError}
          formData={formData}
          interviewTypes={INTERVIEW_TYPES}
          scheduling={scheduling}
          onClose={() => setShowAddForm(false)}
          onDateErrorChange={setDateError}
          onFormDataChange={setFormData}
          onSchedule={handleScheduleInterview}
        />
      )}

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <Modal
          isOpen
          onClose={() => setSelectedInterview(null)}
          title={selectedInterview.job_title}
          description={selectedInterview.company}
          size="md"
        >
          <div className="space-y-4">
              <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLORS[selectedInterview.interview_type] || TYPE_COLORS.other}`}>
                {INTERVIEW_TYPES.find((t) => t.value === selectedInterview.interview_type)?.label || selectedInterview.interview_type}
              </span>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-surface-400" />
                  <span>{formatInterviewDate(selectedInterview.scheduled_at)}</span>
                  <span className="text-surface-400">({selectedInterview.duration_minutes} min)</span>
                </div>
                {selectedInterview.location && (
                  <div className="flex items-center gap-2">
                    <LocationIcon />
                    <span>{selectedInterview.location}</span>
                  </div>
                )}
                {selectedInterview.interviewer_name && (
                  <div className="flex items-center gap-2">
                    <UserIcon />
                    <span>
                      {selectedInterview.interviewer_name}
                      {selectedInterview.interviewer_title && ` - ${selectedInterview.interviewer_title}`}
                    </span>
                  </div>
                )}
              </div>

              {selectedInterview.notes && (
                <div className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg text-sm">
                  <p className="font-medium text-surface-700 dark:text-surface-300 mb-1">Prep Notes</p>
                  <p className="text-surface-600 dark:text-surface-400">{selectedInterview.notes}</p>
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
                        onChange={() => handlePrepToggle(item.id)}
                        className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus-visible:ring-sentinel-500"
                      />
                      <span className={`text-sm ${prepProgress[item.id] ? 'text-surface-400 line-through' : 'text-surface-600 dark:text-surface-400'}`}>
                        {item.label}
                      </span>
                      {item.id === "research" && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenCompanyResearch(selectedInterview.company);
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
                  onClick={() => handleExportICal(selectedInterview)}
                  className="flex items-center gap-1"
                >
                  <DownloadIcon />
                  Add to Calendar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenCompanyResearch(selectedInterview.company)}
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
                        onClick={() => handleCompleteInterview(selectedInterview, feedbackOutcome, feedbackNotes)}
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
                      onClick={() => handleDeleteInterview(selectedInterview.id)}
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
      {showCompanyResearch && researchCompany && (
        <CompanyResearchPanel
          companyName={researchCompany}
          onClose={() => {
            setShowCompanyResearch(false);
            setResearchCompany('');
          }}
        />
      )}
    </>
  );
});
