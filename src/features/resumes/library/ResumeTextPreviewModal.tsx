import { Badge } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { Modal, ModalFooter } from "../../../ui/Modal";
import type { ResumeData, ResumeTextPreview } from "./resumePageModel";
import {
  getEmptyReadablePreviewMessage,
  getReadablePreviewChecklist,
} from "./resumePageModel";

interface ResumeTextPreviewModalProps {
  isOpen: boolean;
  resume: ResumeData | null;
  textPreview: ResumeTextPreview | null;
  onClose: () => void;
  onCopyText: () => void;
}

export function ResumeTextPreviewModal({
  isOpen,
  resume,
  textPreview,
  onClose,
  onCopyText,
}: ResumeTextPreviewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Readable Resume Text"
      description="This preview stays local and shows the text JobSentinel can use for resume review."
      size="xl"
    >
      {textPreview && (
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {getReadablePreviewChecklist(textPreview).map((check) => (
            <div
              key={check.label}
              className="rounded-lg border border-surface-200 dark:border-surface-700 p-3"
            >
              <Badge variant={check.variant} size="sm">{check.label}</Badge>
              <p className="mt-2 text-xs leading-5 text-surface-600 dark:text-surface-400">
                {check.detail}
              </p>
            </div>
          ))}
        </div>
      )}
      {textPreview?.has_text ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-surface-600 dark:text-surface-400">
              {textPreview.is_truncated
                ? `Showing the first ${textPreview.text_preview.length.toLocaleString()} of ${textPreview.text_chars.toLocaleString()} characters.`
                : `${textPreview.text_chars.toLocaleString()} characters found.`}
            </p>
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-4 text-sm leading-6 text-surface-800 dark:text-surface-100">
            {textPreview.text_preview}
          </pre>
        </div>
      ) : (
        <p className="text-surface-600 dark:text-surface-400">
          {getEmptyReadablePreviewMessage(resume)}
        </p>
      )}
      <ModalFooter>
        {textPreview?.has_text && (
          <Button onClick={onCopyText}>
            Copy text
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
