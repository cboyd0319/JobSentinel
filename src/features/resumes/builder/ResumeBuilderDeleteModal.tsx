import { Button } from "../../../ui/Button";
import { Modal, ModalFooter } from "../../../ui/Modal";

export interface ResumeBuilderDeleteTarget {
  type: "experience" | "education" | "skill";
  id: number;
  name: string;
}

interface ResumeBuilderDeleteModalProps {
  target: ResumeBuilderDeleteTarget | null;
  onClose: () => void;
  onConfirm: (target: ResumeBuilderDeleteTarget) => void;
}

export function ResumeBuilderDeleteModal({
  target,
  onClose,
  onConfirm,
}: ResumeBuilderDeleteModalProps) {
  const targetLabel = target?.type === "experience"
    ? "Experience"
    : target?.type === "education"
      ? "Education"
      : "Skill";

  return (
    <Modal isOpen={Boolean(target)} onClose={onClose} title={`Delete ${targetLabel}?`}>
      <p className="text-surface-600 dark:text-surface-400 mb-4">
        Are you sure you want to delete{" "}
        <span className="font-medium text-surface-800 dark:text-surface-200">
          {target?.name}
        </span>
        ? This action cannot be undone.
      </p>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (target) onConfirm(target);
          }}
        >
          Delete
        </Button>
      </ModalFooter>
    </Modal>
  );
}
