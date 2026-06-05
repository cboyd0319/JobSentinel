import { Button } from "../components/Button";
import { Modal, ModalFooter } from "../components/Modal";
import type { Education } from "./resumeBuilderData";

interface ResumeBuilderEducationModalProps {
  education: Education | null;
  isOpen: boolean;
  onAdd: () => void;
  onChange: (education: Education) => void;
  onClose: () => void;
}

export function ResumeBuilderEducationModal({
  education,
  isOpen,
  onAdd,
  onChange,
  onClose,
}: ResumeBuilderEducationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Education">
      {education && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Degree
              </label>
              <input
                type="text"
                value={education.degree}
                onChange={(e) =>
                  onChange({ ...education, degree: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="B.A. Business Administration"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Institution
              </label>
              <input
                type="text"
                value={education.institution}
                onChange={(e) =>
                  onChange({ ...education, institution: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Stanford University"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Graduation Date
              </label>
              <input
                type="text"
                value={education.graduation_date || ""}
                onChange={(e) =>
                  onChange({
                    ...education,
                    graduation_date: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="May 2020"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                GPA
              </label>
              <input
                type="text"
                value={education.gpa || ""}
                onChange={(e) =>
                  onChange({
                    ...education,
                    gpa: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="3.8"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={education.location || ""}
                onChange={(e) =>
                  onChange({
                    ...education,
                    location: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Stanford, CA"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Honors & Awards (one per line)
              </label>
              <textarea
                value={education.honors.join("\n")}
                onChange={(e) =>
                  onChange({
                    ...education,
                    honors: e.target.value
                      .split("\n")
                      .filter((honor) => honor.trim()),
                  })
                }
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-none"
                placeholder="Dean's List&#10;Summa Cum Laude"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onAdd} disabled={!education.degree || !education.institution}>
              Add Education
            </Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}
