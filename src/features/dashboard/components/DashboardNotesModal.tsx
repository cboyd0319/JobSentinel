import { Button } from "../../../ui/Button";
import { Modal, ModalFooter } from "../../../ui/Modal";

interface DashboardNotesModalProps {
  isOpen: boolean;
  notesText: string;
  onChange: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function DashboardNotesModal({
  isOpen,
  notesText,
  onChange,
  onClose,
  onSave,
}: DashboardNotesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Notes">
      <div className="space-y-4">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          Add personal notes about this job. Notes are only visible to you.
        </p>
        <textarea
          value={notesText}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Interview prep, company research, questions to ask..."
          className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus-visible:ring-sentinel-400 resize-none"
          aria-label="Job notes"
          autoFocus
        />
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {notesText.trim() ? "Save Notes" : "Remove Notes"}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
