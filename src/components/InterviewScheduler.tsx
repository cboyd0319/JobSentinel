import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cachedInvoke, invalidateCacheByCommand } from "../utils/api";
import { Card, Button, Badge, CompanyResearchPanel } from "./index";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";
import { MIN_INTERVIEW_DURATION, MAX_INTERVIEW_DURATION } from "../utils/constants";

interface Interview {
  id: number;
  application_id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  interviewer_name: string | null;
  interviewer_title: string | null;
  notes: string | null;
  completed: boolean;
  outcome: string | null;
  post_interview_notes: string | null;
  job_title: string;
  company: string;
}

type InterviewTab = 'upcoming' | 'past';

interface Application {
  id: number;
  job_title: string;
  company: string;
}

interface InterviewSchedulerProps {
  onClose: () => void;
  applications?: Application[];
}

const INTERVIEW_TYPES = [
  { value: "phone", label: "Phone Screen" },
  { value: "screening", label: "Screening Call" },
  { value: "technical", label: "Technical Interview" },
  { value: "behavioral", label: "Behavioral Interview" },
  { value: "onsite", label: "Onsite Interview" },
  { value: "final", label: "Final Round" },
  { value: "other", label: "Other" },
];

const TYPE_COLORS: Record<string, string> = {
  phone: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  screening: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  technical: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  behavioral: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  onsite: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  final: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  other: "bg-surface-100 text-surface-800 dark:bg-surface-700 dark:text-surface-300",
};

const OUTCOME_COLORS: Record<string, string> = {
  passed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// Interview prep checklist items
const PREP_CHECKLIST = [
  { id: "research", label: "Research company background", icon: "search" },
  { id: "review_jd", label: "Review job description", icon: "doc" },
  { id: "prepare_questions", label: "Prepare questions to ask", icon: "question" },
  { id: "star_stories", label: "Prepare STAR stories", icon: "star" },
  { id: "tech_review", label: "Review relevant tech/skills", icon: "code" },
];

// Types for backend API responses
interface FollowUpReminder {
  interviewId: number;
  thankYouSent: boolean;
  sentAt: string | null;
}

interface PrepChecklistItem {
  itemId: string;
  completed: boolean;
  completedAt: string | null;
}

interface PrepProgress {
  [itemId: string]: boolean;
}

// Generate iCal (.ics) file content for an interview
function generateICalEvent(interview: Interview): string {
  const start = new Date(interview.scheduled_at);
  const end = new Date(start.getTime() + interview.duration_minutes * 60 * 1000);

  const formatICalDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeICalText = (text: string): string => {
    return text.replace(/[\\;,\n]/g, (match) => {
      if (match === '\n') return '\\n';
      return '\\' + match;
    });
  };

  const uid = `interview-${interview.id}@jobsentinel`;
  const summary = escapeICalText(`${interview.interview_type} Interview - ${interview.company}`);
  const description = escapeICalText(
    `Position: ${interview.job_title}\n` +
    `Company: ${interview.company}\n` +
    `Type: ${INTERVIEW_TYPES.find(t => t.value === interview.interview_type)?.label || interview.interview_type}\n` +
    (interview.interviewer_name ? `Interviewer: ${interview.interviewer_name}${interview.interviewer_title ? ` (${interview.interviewer_title})` : ''}\n` : '') +
    (interview.notes ? `\nNotes: ${interview.notes}` : '')
  );
  const location = interview.location ? escapeICalText(interview.location) : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JobSentinel//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(start)}`,
    `DTEND:${formatICalDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function downloadICalFile(interview: Interview): void {
  const icsContent = generateICalEvent(interview);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `interview-${interview.company.toLowerCase().replace(/\s+/g, '-')}-${new Date(interview.scheduled_at).toISOString().split('T')[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function InterviewScheduler({ onClose, applications = [] }: InterviewSchedulerProps) {
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
  const toast = useToast();

  // Load follow-up reminders from backend
  const loadFollowUpReminders = useCallback(async () => {
    try {
      // Load reminders for all past interviews
      const reminders: Record<number, FollowUpReminder> = {};
      for (const interview of pastInterviews) {
        const result = await invoke<{ thank_you_sent: boolean; sent_at: string | null } | null>(
          'get_interview_followup',
          { interviewId: interview.id }
        );
        if (result) {
          reminders[interview.id] = {
            interviewId: interview.id,
            thankYouSent: result.thank_you_sent,
            sentAt: result.sent_at,
          };
        }
      }
      setFollowUpReminders(reminders);
    } catch (err) {
      logError("Failed to load follow-up reminders:", err);
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
        const items = await invoke<PrepChecklistItem[]>(
          'get_interview_prep_checklist',
          { interviewId: selectedInterview.id }
        );
        const progress: PrepProgress = {};
        for (const item of items) {
          progress[item.itemId] = item.completed;
        }
        setPrepProgress(progress);
      } catch (err) {
        logError("Failed to load prep progress:", err);
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
      await invoke('save_interview_prep_item', {
        interviewId: selectedInterview.id,
        itemId,
        completed: newCompleted,
      });
    } catch (err) {
      // Revert on error
      logError("Failed to save prep item:", err);
      setPrepProgress(prev => ({ ...prev, [itemId]: !newCompleted }));
      toast.error("Failed to save", getErrorMessage(err));
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
      await invoke('save_interview_followup', {
        interviewId,
        thankYouSent: newValue,
      });
      if (newValue) {
        toast.success("Follow-up marked", "Thank you note sent!");
      }
    } catch (err) {
      // Revert on error
      logError("Failed to save follow-up:", err);
      setFollowUpReminders(prev => ({
        ...prev,
        [interviewId]: current || { interviewId, thankYouSent: false, sentAt: null },
      }));
      toast.error("Failed to save", getErrorMessage(err));
    }
  };

  const handleOpenCompanyResearch = (company: string) => {
    setResearchCompany(company);
    setShowCompanyResearch(true);
  };

  // Form state
  const [formData, setFormData] = useState({
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
    } catch (err) {
      logError("Failed to fetch interviews:", err);
      toast.error("Failed to load interviews", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const handleScheduleInterview = async () => {
    if (!formData.application_id || !formData.scheduled_at) {
      toast.error("Missing required fields", "Please select an application and date/time");
      return;
    }

    // Validate date is not in the past
    const scheduledDate = new Date(formData.scheduled_at);
    const now = new Date();
    if (scheduledDate < now) {
      toast.error("Invalid date", "Interview cannot be scheduled in the past");
      return;
    }

    // Validate duration is reasonable
    if (formData.duration_minutes < MIN_INTERVIEW_DURATION || formData.duration_minutes > MAX_INTERVIEW_DURATION) {
      toast.error("Invalid duration", `Duration must be between ${MIN_INTERVIEW_DURATION} minutes and ${MAX_INTERVIEW_DURATION / 60} hours`);
      return;
    }

    try {
      await invoke("schedule_interview", {
        applicationId: formData.application_id,
        interviewType: formData.interview_type,
        scheduledAt: formData.scheduled_at,
        durationMinutes: formData.duration_minutes,
        location: formData.location || null,
        interviewerName: formData.interviewer_name || null,
        interviewerTitle: formData.interviewer_title || null,
        notes: formData.notes || null,
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
    } catch (err) {
      logError("Failed to schedule interview:", err);
      toast.error("Failed to schedule", getErrorMessage(err));
    }
  };

  const handleCompleteInterview = async (interview: Interview, outcome: string, postNotes?: string) => {
    try {
      await invoke("complete_interview", {
        interviewId: interview.id,
        outcome,
        notes: postNotes || null,
      });
      invalidateCacheByCommand("get_upcoming_interviews");
      invalidateCacheByCommand("get_past_interviews");
      toast.success("Interview completed", `Marked as ${outcome}`);
      setSelectedInterview(null);
      setShowFeedbackForm(false);
      setFeedbackOutcome('');
      setFeedbackNotes('');
      fetchInterviews();
    } catch (err) {
      logError("Failed to complete interview:", err);
      toast.error("Failed to update", getErrorMessage(err));
    }
  };

  const handleExportICal = (interview: Interview) => {
    downloadICalFile(interview);
    toast.success("Calendar downloaded", "Add to your calendar app");
  };

  const handleDeleteInterview = async (interviewId: number) => {
    try {
      await invoke("delete_interview", { interviewId });
      invalidateCacheByCommand("get_upcoming_interviews");
      toast.success("Interview deleted", "The interview has been removed");
      fetchInterviews();
    } catch (err) {
      logError("Failed to delete interview:", err);
      toast.error("Failed to delete", getErrorMessage(err));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return "Past";
    if (diffHours < 1) return "< 1 hour";
    if (diffHours < 24) return `${diffHours} hours`;
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="dialog"
        aria-modal="true"
        aria-label="Loading interviews"
      >
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
          <div className="p-6 space-y-4">
            <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="interviews-title"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-surface-800">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              id="interviews-title"
              className="font-display text-display-md text-surface-900 dark:text-white"
            >
              Interview Schedule
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={() => setShowAddForm(true)}>
                <PlusIcon />
                Schedule
              </Button>
              <button
                onClick={onClose}
                className="p-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-700 rounded-lg">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Upcoming ({interviews.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'past'
                  ? 'bg-white dark:bg-surface-600 text-surface-900 dark:text-white shadow-sm'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white'
              }`}
            >
              Past ({pastInterviews.length})
            </button>
          </div>

          {/* Upcoming Interviews */}
          {activeTab === 'upcoming' && (
            interviews.length === 0 ? (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming interviews scheduled</p>
                <p className="text-sm mt-1">Click "Schedule" to add your first interview</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600 hover:border-sentinel-300 dark:hover:border-sentinel-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedInterview(interview)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedInterview(interview)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLORS[interview.interview_type] || TYPE_COLORS.other}`}>
                            {INTERVIEW_TYPES.find((t) => t.value === interview.interview_type)?.label || interview.interview_type}
                          </span>
                          <Badge variant="surface">{getRelativeTime(interview.scheduled_at)}</Badge>
                        </div>
                        <h3 className="font-medium text-surface-900 dark:text-white truncate">
                          {interview.job_title}
                        </h3>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          {interview.company}
                        </p>
                      </div>
                      <div className="text-right text-sm flex flex-col items-end gap-1">
                        <p className="font-medium text-surface-900 dark:text-white">
                          {formatDate(interview.scheduled_at)}
                        </p>
                        <p className="text-surface-500 dark:text-surface-400">
                          {interview.duration_minutes} min
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportICal(interview); }}
                          className="text-xs text-sentinel-600 dark:text-sentinel-400 hover:underline flex items-center gap-1"
                          title="Download calendar file"
                        >
                          <DownloadIcon />
                          iCal
                        </button>
                      </div>
                    </div>
                    {(interview.location || interview.interviewer_name) && (
                      <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600 flex items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
                        {interview.location && (
                          <span className="flex items-center gap-1">
                            <LocationIcon />
                            {interview.location}
                          </span>
                        )}
                        {interview.interviewer_name && (
                          <span className="flex items-center gap-1">
                            <UserIcon />
                            {interview.interviewer_name}
                            {interview.interviewer_title && ` (${interview.interviewer_title})`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* Past Interviews */}
          {activeTab === 'past' && (
            pastInterviews.length === 0 ? (
              <div className="text-center py-8 text-surface-500 dark:text-surface-400">
                <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No past interviews yet</p>
                <p className="text-sm mt-1">Completed interviews will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLORS[interview.interview_type] || TYPE_COLORS.other}`}>
                            {INTERVIEW_TYPES.find((t) => t.value === interview.interview_type)?.label || interview.interview_type}
                          </span>
                          {interview.outcome && (
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${OUTCOME_COLORS[interview.outcome] || OUTCOME_COLORS.pending}`}>
                              {interview.outcome.charAt(0).toUpperCase() + interview.outcome.slice(1)}
                            </span>
                          )}
                        </div>
                        <h3 className="font-medium text-surface-900 dark:text-white truncate">
                          {interview.job_title}
                        </h3>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          {interview.company}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium text-surface-900 dark:text-white">
                          {formatDate(interview.scheduled_at)}
                        </p>
                        <p className="text-surface-500 dark:text-surface-400">
                          {interview.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    {(interview.interviewer_name || interview.post_interview_notes) && (
                      <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600 space-y-2">
                        {interview.interviewer_name && (
                          <span className="flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400">
                            <UserIcon />
                            {interview.interviewer_name}
                            {interview.interviewer_title && ` - ${interview.interviewer_title}`}
                          </span>
                        )}
                        {interview.post_interview_notes && (
                          <div className="text-sm">
                            <p className="font-medium text-surface-700 dark:text-surface-300 mb-0.5">Post-interview notes:</p>
                            <p className="text-surface-600 dark:text-surface-400">{interview.post_interview_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Follow-up Reminder */}
                    <div className="mt-2 pt-2 border-t border-surface-200 dark:border-surface-600">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={followUpReminders[interview.id]?.thankYouSent || false}
                          onChange={() => handleFollowUpToggle(interview.id)}
                          className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus:ring-sentinel-500"
                        />
                        <span className={`text-sm ${followUpReminders[interview.id]?.thankYouSent ? 'text-green-600 dark:text-green-400' : 'text-surface-600 dark:text-surface-400'}`}>
                          {followUpReminders[interview.id]?.thankYouSent ? (
                            <>✓ Thank you note sent</>
                          ) : (
                            <>Send thank you note</>
                          )}
                        </span>
                        {followUpReminders[interview.id]?.sentAt && (
                          <span className="text-xs text-surface-400 ml-auto">
                            {new Date(followUpReminders[interview.id].sentAt!).toLocaleDateString()}
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>

      {/* Add Interview Form Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowAddForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md dark:bg-surface-800">
            <div className="p-6 space-y-4">
              <h3 className="font-display text-display-sm text-surface-900 dark:text-white">
                Schedule Interview
              </h3>

              <div>
                <label htmlFor="app-select" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Application *
                </label>
                <select
                  id="app-select"
                  value={formData.application_id}
                  onChange={(e) => setFormData({ ...formData, application_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                >
                  <option value={0}>Select application...</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.job_title} at {app.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="interview-type" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Interview Type
                </label>
                <select
                  id="interview-type"
                  value={formData.interview_type}
                  onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                >
                  {INTERVIEW_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="scheduled-at" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="scheduled-at"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Duration (minutes)
                </label>
                <select
                  id="duration"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Zoom, Google Meet, or address"
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="interviewer-name" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Interviewer Name
                  </label>
                  <input
                    type="text"
                    id="interviewer-name"
                    value={formData.interviewer_name}
                    onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                  />
                </div>
                <div>
                  <label htmlFor="interviewer-title" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Their Title
                  </label>
                  <input
                    type="text"
                    id="interviewer-title"
                    value={formData.interviewer_title}
                    onChange={(e) => setFormData({ ...formData, interviewer_title: e.target.value })}
                    className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Preparation notes, topics to cover..."
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowAddForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleScheduleInterview} className="flex-1">
                  Schedule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Interview Detail Modal */}
      {selectedInterview && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedInterview(null)}
          onKeyDown={(e) => e.key === "Escape" && setSelectedInterview(null)}
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md dark:bg-surface-800">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLORS[selectedInterview.interview_type] || TYPE_COLORS.other}`}>
                  {INTERVIEW_TYPES.find((t) => t.value === selectedInterview.interview_type)?.label || selectedInterview.interview_type}
                </span>
                <button
                  onClick={() => setSelectedInterview(null)}
                  className="p-1 text-surface-400 hover:text-surface-600"
                >
                  <CloseIcon />
                </button>
              </div>

              <div>
                <h3 className="font-display text-display-sm text-surface-900 dark:text-white">
                  {selectedInterview.job_title}
                </h3>
                <p className="text-surface-500 dark:text-surface-400">
                  {selectedInterview.company}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-surface-400" />
                  <span>{formatDate(selectedInterview.scheduled_at)}</span>
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
                        className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus:ring-sentinel-500"
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
                      Mark as Complete
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => { setFeedbackOutcome("passed"); setShowFeedbackForm(true); }}
                        className="flex-1"
                      >
                        ✓ Passed
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { setFeedbackOutcome("pending"); setShowFeedbackForm(true); }}
                        className="flex-1"
                      >
                        ⏳ Pending
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => { setFeedbackOutcome("failed"); setShowFeedbackForm(true); }}
                        className="flex-1"
                      >
                        ✗ Failed
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                        Interview Outcome:
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${OUTCOME_COLORS[feedbackOutcome] || OUTCOME_COLORS.pending}`}>
                        {feedbackOutcome.charAt(0).toUpperCase() + feedbackOutcome.slice(1)}
                      </span>
                    </div>
                    <div>
                      <label htmlFor="post-notes" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                        Post-Interview Notes
                      </label>
                      <textarea
                        id="post-notes"
                        value={feedbackNotes}
                        onChange={(e) => setFeedbackNotes(e.target.value)}
                        rows={4}
                        placeholder="How did it go? Topics discussed, questions asked, overall impression..."
                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => { setShowFeedbackForm(false); setFeedbackOutcome(''); setFeedbackNotes(''); }}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleCompleteInterview(selectedInterview, feedbackOutcome, feedbackNotes)}
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
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleDeleteInterview(selectedInterview.id);
                        setSelectedInterview(null);
                        setShowDeleteConfirm(false);
                      }}
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
          </Card>
        </div>
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
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function HistoryIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
