import { memo, useState, useEffect, useCallback, type ReactElement } from "react";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Card } from "../Card";
import { HelpIcon } from "../HelpIcon";
import { Input } from "../Input";
import { Modal, ModalFooter } from "../Modal";
import { useToast } from "../../contexts";
import { safeInvoke, safeInvokeWithToast } from "../../utils/api";
import { validateRequired, validateRequiredQuestionWording } from "../../utils/formValidation";
import { getSafeErrorToastCopy } from "../../utils/safeErrorCopy";
import { getHardScreeningAnswerGuidance } from "./screeningReviewGuidance";

// Lookup object for answer type badges (better performance than switch)
const ANSWER_TYPE_BADGES: Record<string, ReactElement> = {
  yes_no: <Badge variant="success">Yes/No</Badge>,
  textarea: <Badge variant="alert">Long text</Badge>,
  select: <Badge variant="sentinel">Menu choice</Badge>,
  text: <Badge variant="surface">Text</Badge>,
};

const DEFAULT_BADGE = ANSWER_TYPE_BADGES.text;

const getAnswerTypeBadge = (type: string | null) =>
  ANSWER_TYPE_BADGES[type ?? "text"] ?? DEFAULT_BADGE;

// Types matching the Rust backend
interface ScreeningAnswer {
  id: number;
  questionPattern: string;
  answer: string;
  answerType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Learning fields (added v2.6.4)
  timesUsed?: number;
  timesModified?: number;
  confidenceScore?: number;
  lastUsedAt?: string | null;
}

interface ScreeningAnswersFormProps {
  onSaved?: () => void;
}

// Common screening questions with plain matching text.
const COMMON_PATTERNS = [
  { pattern: "years of experience", label: "Years of experience", type: "text" },
  { pattern: "salary", label: "Salary expectation", type: "text" },
  { pattern: "start date", label: "Start date / Notice period", type: "text" },
  { pattern: "relocate", label: "Willingness to relocate", type: "yes_no" },
  { pattern: "travel", label: "Travel availability", type: "text" },
  { pattern: "reliable transportation", label: "Reliable transportation", type: "yes_no" },
  { pattern: "work authorization", label: "Work authorization", type: "yes_no" },
  { pattern: "US citizen", label: "Citizenship", type: "yes_no" },
  { pattern: "availability", label: "Schedule availability", type: "text" },
  { pattern: "overtime", label: "Overtime availability", type: "yes_no" },
  { pattern: "holiday", label: "Holiday availability", type: "yes_no" },
  { pattern: "managed a team", label: "Management experience", type: "text" },
  { pattern: "sponsorship", label: "Visa sponsorship", type: "yes_no" },
  { pattern: "remote", label: "Remote work preference", type: "text" },
  { pattern: "driver's license", label: "Driver's license", type: "yes_no" },
  { pattern: "security clearance", label: "Security clearance", type: "yes_no" },
  { pattern: "certification", label: "Certification or license", type: "text" },
  { pattern: "background check", label: "Background check", type: "text" },
  { pattern: "drug screen", label: "Drug screen", type: "text" },
  { pattern: "bilingual", label: "Language fluency", type: "text" },
  { pattern: "physical requirements", label: "Physical requirements", type: "text" },
  { pattern: "18 years of age", label: "Age requirement", type: "yes_no" },
  { pattern: "education", label: "Education level", type: "text" },
  { pattern: "cover letter", label: "Cover letter / Why this role", type: "textarea" },
];

const LEGACY_SCREENING_PATTERNS = [
  {
    pattern: "(?i)authorized.*work.*(united states|us|usa)",
    label: "Work authorization",
    editablePattern: "work authorization",
  },
  {
    pattern: "(?i)require.*sponsor.*work",
    label: "Visa sponsorship",
    editablePattern: "sponsorship",
  },
  {
    pattern: "(?i)require.*sponsor.*(now|future)",
    label: "Future sponsorship",
    editablePattern: "sponsorship now or in the future",
  },
  {
    pattern: "(?i)18.*years.*age",
    label: "Age requirement",
    editablePattern: "18 years of age",
  },
  {
    pattern: "(?i)drug.*test",
    label: "Drug screen",
    editablePattern: "drug screen",
  },
  {
    pattern: "(?i)background.*check",
    label: "Background check",
    editablePattern: "background check",
  },
  {
    pattern: "(?i)security.*clearance",
    label: "Security clearance",
    editablePattern: "security clearance",
  },
  {
    pattern: "(?i)willing.*relocate",
    label: "Willingness to relocate",
    editablePattern: "relocate",
  },
  {
    pattern: "(?i)notice.*period",
    label: "Start date / Notice period",
    editablePattern: "notice period",
  },
  {
    pattern: "(?i)salary.*expectation",
    label: "Salary expectation",
    editablePattern: "salary",
  },
];

const PLAIN_SCREENING_PATTERN_ALIASES = [
  {
    patterns: [
      "work authorized",
      "authorized to work",
      "legally authorized to work",
      "eligible to work",
      "employment authorization",
    ],
    label: "Work authorization",
    editablePattern: "work authorization",
  },
  {
    patterns: ["visa sponsorship", "need sponsorship", "require sponsorship"],
    label: "Visa sponsorship",
    editablePattern: "sponsorship",
  },
  {
    patterns: ["notice period"],
    label: "Start date / Notice period",
    editablePattern: "notice period",
  },
];

function normalizePatternKey(pattern: string) {
  return pattern.trim().toLowerCase();
}

function getPlainPatternAlias(pattern: string) {
  const normalizedPattern = normalizePatternKey(pattern);
  return PLAIN_SCREENING_PATTERN_ALIASES.find((item) =>
    item.patterns.some((alias) => alias.toLowerCase() === normalizedPattern)
  );
}

function looksLikeMatcherPattern(pattern: string) {
  return /(\(\?[a-z-]*\)|\\[dDsSwWbB]|\.\*|\.\+|\[[^\]]+\]|\([^)]*\|[^)]*\)|[|^$]|\{\d+(,\d*)?\})/.test(pattern);
}

// Format relative time (e.g., "2 days ago", "1 week ago")
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getQuestionMatchLabel(pattern: string) {
  const normalizedPattern = normalizePatternKey(pattern);
  const common = COMMON_PATTERNS.find(
    (item) => item.pattern.toLowerCase() === normalizedPattern,
  );
  if (common) return common.label;

  const legacy = LEGACY_SCREENING_PATTERNS.find(
    (item) => item.pattern.toLowerCase() === normalizedPattern,
  );
  if (legacy) return legacy.label;

  const plainAlias = getPlainPatternAlias(pattern);
  if (plainAlias) return plainAlias.label;
  return looksLikeMatcherPattern(pattern) ? "Custom screening question" : pattern.trim();
}

function getEditableQuestionPattern(pattern: string) {
  const normalizedPattern = normalizePatternKey(pattern);
  const legacy = LEGACY_SCREENING_PATTERNS.find(
    (item) => item.pattern.toLowerCase() === normalizedPattern,
  );
  if (legacy) return legacy.editablePattern;

  const plainAlias = getPlainPatternAlias(pattern);
  return plainAlias?.editablePattern ?? pattern.trim();
}

function getPersistedQuestionPattern(currentPattern: string, originalPattern: string | null) {
  const trimmedPattern = currentPattern.trim();
  if (!originalPattern) return trimmedPattern;

  return normalizePatternKey(trimmedPattern) === normalizePatternKey(getEditableQuestionPattern(originalPattern))
    ? originalPattern
    : trimmedPattern;
}

function answerMatchesCommonPattern(answerPattern: string, commonPattern: (typeof COMMON_PATTERNS)[number]) {
  const normalizedAnswerPattern = normalizePatternKey(answerPattern);
  return (
    normalizedAnswerPattern === commonPattern.pattern.toLowerCase() ||
    getQuestionMatchLabel(answerPattern).toLowerCase() === commonPattern.label.toLowerCase()
  );
}

function getConfidenceLabel(score?: number) {
  if (score === undefined || score <= 0) return null;
  if (score >= 0.8) return "Usually matches";
  if (score >= 0.5) return "Review before using";
  return "Needs review";
}

function getModifiedUseLabel(timesModified?: number, timesUsed?: number) {
  if (!timesModified || !timesUsed) return null;
  const ratio = timesModified / timesUsed;
  if (ratio >= 0.5) return "Often edited";
  return "Sometimes edited";
}

export const ScreeningAnswersForm = memo(function ScreeningAnswersForm({ onSaved }: ScreeningAnswersFormProps) {
  const [answers, setAnswers] = useState<ScreeningAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  // Add/Edit form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingOriginalQuestionPattern, setEditingOriginalQuestionPattern] = useState<string | null>(null);
  const [questionPattern, setQuestionPattern] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerType, setAnswerType] = useState("text");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Validation errors
  const [formErrors, setFormErrors] = useState<{
    pattern?: string;
    answer?: string;
  }>({});

  const loadAnswers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await safeInvoke<ScreeningAnswer[]>("get_screening_answers", {}, {
        logContext: "Load screening answers"
      });
      setAnswers(data || []);
    } catch (error: unknown) {
      const safeError = getSafeErrorToastCopy(error, {
        fallbackTitle: "Could not load saved answers",
        fallbackMessage: "Try again. If it keeps happening, copy a safe support report.",
        includeAction: false,
      });
      toast.error(safeError.title, safeError.message);
      setAnswers([]); // Ensure answers is always an array even on error
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnswers();
  }, [loadAnswers]);

  const resetForm = () => {
    setEditingId(null);
    setEditingOriginalQuestionPattern(null);
    setQuestionPattern("");
    setAnswer("");
    setAnswerType("text");
    setNotes("");
    setFormErrors({});
  };

  const handleSave = async () => {
    // Validate all fields
    const patternError = validateRequiredQuestionWording(questionPattern);
    const answerError = validateRequired(answer, "Answer");

    setFormErrors({
      pattern: patternError,
      answer: answerError,
    });

    if (patternError || answerError) {
      toast.error("Check highlighted fields", "Add the missing details, then save again.");
      return;
    }

    try {
      setSaving(true);
      await safeInvokeWithToast("upsert_screening_answer", {
        questionPattern: getPersistedQuestionPattern(questionPattern, editingOriginalQuestionPattern),
        answer: answer.trim(),
        answerType,
        notes: notes.trim() || null,
      }, toast, {
        logContext: "Upsert screening answer"
      });

      toast.success("Answer saved", "Your screening answer has been saved");
      setShowAddModal(false);
      resetForm();
      await loadAnswers();
      onSaved?.();
    } catch {
      // Error already logged and shown to user
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: ScreeningAnswer) => {
    setEditingId(a.id);
    setEditingOriginalQuestionPattern(a.questionPattern);
    setQuestionPattern(getEditableQuestionPattern(a.questionPattern));
    setAnswer(a.answer);
    setAnswerType(a.answerType || "text");
    setNotes(a.notes || "");
    setShowAddModal(true);
  };

  const handleAddCommon = (pattern: { pattern: string; label: string; type: string }) => {
    setEditingOriginalQuestionPattern(null);
    setQuestionPattern(pattern.pattern);
    setAnswerType(pattern.type);
    setNotes(`Saved answer for "${pattern.label}" questions`);
    setShowAddModal(true);
  };

  const hardScreeningAnswerGuidance = getHardScreeningAnswerGuidance(questionPattern);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8" role="status" aria-busy="true" aria-label="Loading screening answers">
          <div className="animate-spin w-6 h-6 border-2 border-sentinel-500 border-t-transparent rounded-full" aria-hidden="true" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1 flex items-center gap-2">
              Screening Question Answers
              <HelpIcon text="Save reusable answers for common screening questions. JobSentinel matches your saved text to question wording." />
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Save answers to common questions so each application is easier to review
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Answer
          </Button>
        </div>

        {/* Quick Add Common Patterns */}
        <section className="mb-6">
          <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Quick add common questions:
          </h4>
          <div className="flex flex-wrap gap-2">
            {COMMON_PATTERNS.filter(
              (p) => !answers?.some((a) => answerMatchesCommonPattern(a.questionPattern, p))
            ).map((pattern) => (
              <button
                key={pattern.pattern}
                onClick={() => handleAddCommon(pattern)}
                className="px-3 py-1.5 text-sm bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-full hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors"
              >
                + {pattern.label}
              </button>
            ))}
          </div>
        </section>

        {/* Saved Answers List */}
        {answers.length === 0 ? (
          <div className="text-center py-12 px-6 bg-surface-50 dark:bg-surface-800/50 rounded-lg border-2 border-dashed border-surface-200 dark:border-surface-700">
            <QuestionIcon className="w-16 h-16 mx-auto mb-4 text-surface-300 dark:text-surface-600" />
            <h4 className="text-lg font-medium text-surface-700 dark:text-surface-300 mb-2">
              No screening answers yet
            </h4>
            <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
              Add common answers to prepare screening questions like "Years of experience" or "Salary expectations" during Application Assist.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Your First Answer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {answers.map((a) => (
              <div
                key={a.id}
                role="article"
                aria-label={`Screening answer ${getQuestionMatchLabel(a.questionPattern)}`}
                className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-sentinel-300 dark:hover:border-sentinel-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded text-surface-800 dark:text-surface-200 break-words">
                        Looks for: {getQuestionMatchLabel(a.questionPattern)}
                      </span>
                      {getAnswerTypeBadge(a.answerType)}
                      {getConfidenceLabel(a.confidenceScore) && (
                        <Badge variant={
                          (a.confidenceScore ?? 0) >= 0.8 ? "success" :
                          (a.confidenceScore ?? 0) >= 0.5 ? "sentinel" : "surface"
                        } className="text-xs">
                          {getConfidenceLabel(a.confidenceScore)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {a.answer}
                    </p>
                    {/* Usage statistics */}
                    {a.timesUsed !== undefined && a.timesUsed > 0 && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-surface-500 dark:text-surface-400">
                        <span>Used {a.timesUsed}×</span>
                        {getModifiedUseLabel(a.timesModified, a.timesUsed) && (
                          <span className="text-warning">
                            {getModifiedUseLabel(a.timesModified, a.timesUsed)}
                          </span>
                        )}
                        {a.lastUsedAt && (
                          <span>Last used: {formatRelativeTime(a.lastUsedAt)}</span>
                        )}
                      </div>
                    )}
                    {a.notes && (
                      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                        {a.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEdit(a)}
                    className="p-2 text-surface-400 hover:text-sentinel-500 transition-colors"
                    aria-label="Edit answer"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={editingId ? "Edit Screening Answer" : "Add Screening Answer"}
      >
        <div className="space-y-4">
          <Input
            label="Question wording to look for *"
            value={questionPattern}
            onChange={(e) => {
              setQuestionPattern(e.target.value);
              if (formErrors.pattern) {
                setFormErrors((prev) => ({ ...prev, pattern: validateRequiredQuestionWording(e.target.value) }));
              }
            }}
            onBlur={() => setFormErrors((prev) => ({ ...prev, pattern: validateRequiredQuestionWording(questionPattern) }))}
            placeholder="e.g., salary expectation"
            hint="Use a few words from questions you see often. Matching ignores capitalization, and symbols count as normal text."
            error={formErrors.pattern}
            maxLength={200}
            required
          />
          {hardScreeningAnswerGuidance && (
            <div
              className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-200"
              role="note"
              data-testid="hard-screening-answer-guidance"
            >
              {hardScreeningAnswerGuidance}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Answer Type
            </label>
            <select
              value={answerType}
              onChange={(e) => setAnswerType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-800 dark:text-white focus:outline-none focus:border-sentinel-400 focus-visible:ring-2 focus-visible:ring-sentinel-100 dark:focus-visible:ring-sentinel-900"
              aria-label="Answer type"
            >
              <option value="text">Text input</option>
              <option value="yes_no">Yes/No</option>
              <option value="textarea">Long text / Paragraph</option>
              <option value="select">Menu choice</option>
            </select>
          </div>
          <div>
            <label htmlFor="answer-input" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Your Answer *
            </label>
            {answerType === "textarea" ? (
              <>
                <textarea
                  id="answer-input"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    if (formErrors.answer) {
                      setFormErrors((prev) => ({ ...prev, answer: validateRequired(e.target.value, "Answer") }));
                    }
                  }}
                  onBlur={() => setFormErrors((prev) => ({ ...prev, answer: validateRequired(answer, "Answer") }))}
                  placeholder="Enter your default answer..."
                  rows={4}
                  maxLength={2000}
                  required
                  aria-invalid={Boolean(formErrors.answer)}
                  aria-describedby={formErrors.answer ? "answer-error" : undefined}
                  className={`w-full px-4 py-3 bg-white dark:bg-surface-800 border rounded-lg text-surface-800 dark:text-white placeholder:text-surface-400 resize-none focus:outline-none focus:border-sentinel-400 focus-visible:ring-2 focus-visible:ring-sentinel-100 dark:focus-visible:ring-sentinel-900 ${
                    formErrors.answer ? "border-danger focus:border-danger focus:ring-danger/20" : "border-surface-200 dark:border-surface-700"
                  }`}
                />
                {formErrors.answer && (
                  <p id="answer-error" className="mt-1.5 text-sm text-danger flex items-center gap-1">
                    <ErrorIcon />
                    {formErrors.answer}
                  </p>
                )}
              </>
            ) : (
              <Input
                id="answer-input"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  if (formErrors.answer) {
                    setFormErrors((prev) => ({ ...prev, answer: validateRequired(e.target.value, "Answer") }));
                  }
                }}
                onBlur={() => setFormErrors((prev) => ({ ...prev, answer: validateRequired(answer, "Answer") }))}
                placeholder={answerType === "yes_no" ? "Yes or No" : "Enter your default answer..."}
                error={formErrors.answer}
                maxLength={500}
                required
              />
            )}
          </div>
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes about when to use this answer..."
            maxLength={500}
          />
        </div>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} loadingText={editingId ? "Updating..." : "Saving..."}>
            {editingId ? "Update" : "Save"} Answer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
});

// Icons
function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function QuestionIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
