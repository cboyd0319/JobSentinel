import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Input, Card, Badge, HelpIcon, Modal, ModalFooter } from "..";
import { useToast } from "../../contexts";
import { logError } from "../../utils/errorUtils";

// Types matching the Rust backend
interface ScreeningAnswer {
  id: number;
  questionPattern: string;
  answer: string;
  answerType: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ScreeningAnswersFormProps {
  onSaved?: () => void;
}

// Common screening questions with patterns
const COMMON_PATTERNS = [
  { pattern: "years.*experience", label: "Years of experience", type: "text" },
  { pattern: "salary|compensation|expected.*pay", label: "Salary expectation", type: "text" },
  { pattern: "notice.*period|start.*date|available.*start", label: "Start date / Notice period", type: "text" },
  { pattern: "willing.*relocate", label: "Willingness to relocate", type: "yes_no" },
  { pattern: "remote|work.*from.*home|hybrid", label: "Remote work preference", type: "text" },
  { pattern: "security.*clearance", label: "Security clearance", type: "yes_no" },
  { pattern: "degree|education|university", label: "Education level", type: "text" },
  { pattern: "cover.*letter|why.*company|why.*role", label: "Cover letter / Why this role", type: "textarea" },
];

export function ScreeningAnswersForm({ onSaved }: ScreeningAnswersFormProps) {
  const [answers, setAnswers] = useState<ScreeningAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  // Add/Edit form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [questionPattern, setQuestionPattern] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerType, setAnswerType] = useState("text");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAnswers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<ScreeningAnswer[]>("get_screening_answers");
      setAnswers(data);
    } catch (error) {
      logError("Failed to load screening answers:", error);
      toast.error("Failed to load answers", "Please try again");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAnswers();
  }, [loadAnswers]);

  const resetForm = () => {
    setEditingId(null);
    setQuestionPattern("");
    setAnswer("");
    setAnswerType("text");
    setNotes("");
  };

  const handleSave = async () => {
    if (!questionPattern.trim()) {
      toast.error("Pattern required", "Enter a question pattern to match");
      return;
    }
    if (!answer.trim()) {
      toast.error("Answer required", "Enter your default answer");
      return;
    }

    // Validate regex pattern
    try {
      new RegExp(questionPattern.trim(), "i");
    } catch {
      toast.error("Invalid pattern", "The regex pattern is invalid. Check for unmatched brackets or special characters.");
      return;
    }

    try {
      setSaving(true);
      await invoke("upsert_screening_answer", {
        questionPattern: questionPattern.trim(),
        answer: answer.trim(),
        answerType,
        notes: notes.trim() || null,
      });

      toast.success("Answer saved", "Your screening answer has been saved");
      setShowAddModal(false);
      resetForm();
      await loadAnswers();
      onSaved?.();
    } catch (error) {
      logError("Failed to save screening answer:", error);
      toast.error("Failed to save", "Please try again");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: ScreeningAnswer) => {
    setEditingId(a.id);
    setQuestionPattern(a.questionPattern);
    setAnswer(a.answer);
    setAnswerType(a.answerType || "text");
    setNotes(a.notes || "");
    setShowAddModal(true);
  };

  const handleAddCommon = (pattern: { pattern: string; label: string; type: string }) => {
    setQuestionPattern(pattern.pattern);
    setAnswerType(pattern.type);
    setNotes(`Auto-answer for "${pattern.label}" questions`);
    setShowAddModal(true);
  };

  const getAnswerTypeBadge = (type: string | null) => {
    switch (type) {
      case "yes_no":
        return <Badge variant="success">Yes/No</Badge>;
      case "textarea":
        return <Badge variant="alert">Long text</Badge>;
      case "select":
        return <Badge variant="sentinel">Dropdown</Badge>;
      default:
        return <Badge variant="surface">Text</Badge>;
    }
  };

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
              <HelpIcon text="Configure automatic answers for common screening questions. Patterns use regex matching." />
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Save answers to common questions for faster applications
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
              (p) => !answers.some((a) => a.questionPattern === p.pattern)
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
              Add common answers to auto-fill screening questions like "Years of experience" or "Salary expectations" during Quick Apply.
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
                className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-sentinel-300 dark:hover:border-sentinel-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded text-surface-800 dark:text-surface-200 font-mono">
                        {a.questionPattern}
                      </code>
                      {getAnswerTypeBadge(a.answerType)}
                    </div>
                    <p className="text-surface-700 dark:text-surface-300 truncate">
                      {a.answer}
                    </p>
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
            label="Question Pattern (regex)"
            value={questionPattern}
            onChange={(e) => setQuestionPattern(e.target.value)}
            placeholder="e.g., years.*experience"
            hint="Use regex patterns to match question text. Case-insensitive."
          />
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Answer Type
            </label>
            <select
              value={answerType}
              onChange={(e) => setAnswerType(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-800 dark:text-white"
            >
              <option value="text">Text input</option>
              <option value="yes_no">Yes/No</option>
              <option value="textarea">Long text / Paragraph</option>
              <option value="select">Dropdown selection</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Your Answer
            </label>
            {answerType === "textarea" ? (
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your default answer..."
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-surface-800 dark:text-white placeholder:text-surface-400 resize-none"
              />
            ) : (
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={answerType === "yes_no" ? "Yes or No" : "Enter your default answer..."}
              />
            )}
          </div>
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes about when to use this answer..."
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
          <Button onClick={handleSave} loading={saving}>
            {editingId ? "Update" : "Save"} Answer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

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
