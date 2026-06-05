import { Button } from "../components/Button";
import { Modal, ModalFooter } from "../components/Modal";
import type { Experience } from "./resumeBuilderData";

interface ResumeBuilderExperienceModalProps {
  experience: Experience | null;
  isOpen: boolean;
  onAdd: () => void;
  onChange: (experience: Experience) => void;
  onClose: () => void;
}

export function ResumeBuilderExperienceModal({
  experience,
  isOpen,
  onAdd,
  onChange,
  onClose,
}: ResumeBuilderExperienceModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Work Experience">
      {experience && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={experience.title}
                onChange={(e) =>
                  onChange({ ...experience, title: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Marketing Manager"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Company
              </label>
              <input
                type="text"
                value={experience.company}
                onChange={(e) =>
                  onChange({ ...experience, company: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Start Date
              </label>
              <input
                type="text"
                value={experience.start_date}
                onChange={(e) =>
                  onChange({
                    ...experience,
                    start_date: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Jan 2020"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                End Date
              </label>
              <input
                type="text"
                value={experience.end_date || ""}
                onChange={(e) =>
                  onChange({
                    ...experience,
                    end_date: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Present"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={experience.location || ""}
                onChange={(e) =>
                  onChange({
                    ...experience,
                    location: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500"
                placeholder="Chicago, IL"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Achievements (one per line)
              </label>
              <textarea
                value={experience.achievements.join("\n")}
                onChange={(e) =>
                  onChange({
                    ...experience,
                    achievements: e.target.value
                      .split("\n")
                      .filter((achievement) => achievement.trim()),
                  })
                }
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-none"
                placeholder="Improved renewal rate by 18%&#10;Built onboarding checklist for new customers&#10;Trained 12 teammates on support workflows"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onAdd} disabled={!experience.title || !experience.company}>
              Add Experience
            </Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}
