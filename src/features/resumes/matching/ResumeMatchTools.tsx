import { Badge } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { LoadingSpinner } from "../../../ui/LoadingSpinner";
import { Modal, ModalFooter } from "../../../ui/Modal";
import { RESUME_BULLET_FRAMEWORKS } from "../shared/resumeWritingTaxonomy";

interface ResumeMatchToolsProps {
  actionWords: string[];
  bulletInput: string;
  improvedBullet: string;
  improvingBullet: boolean;
  showActionWords: boolean;
  showBulletImprover: boolean;
  onBulletInputChange: (value: string) => void;
  onCloseActionWords: () => void;
  onCloseBullet: () => void;
  onDraftBullet: () => void;
}

export function ResumeMatchTools({
  actionWords,
  bulletInput,
  improvedBullet,
  improvingBullet,
  showActionWords,
  showBulletImprover,
  onBulletInputChange,
  onCloseActionWords,
  onCloseBullet,
  onDraftBullet,
}: ResumeMatchToolsProps) {
  return (
    <>
      {/* Action Words Modal */}
            <Modal
              isOpen={showActionWords}
              onClose={() => onCloseActionWords()}
              title="Action Words for Clarity"
            >
              <div className="space-y-4">
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  These action verbs can make bullet points easier to scan. Use only words that honestly fit your experience.
                </p>
                {actionWords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-2">
                    {actionWords.map((word, idx) => (
                      <Badge key={idx} variant="sentinel" size="sm">
                        {word}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <LoadingSpinner />
                  </div>
                )}
                <ModalFooter>
                  <Button onClick={() => onCloseActionWords()}>Close</Button>
                </ModalFooter>
              </div>
            </Modal>

            <Modal
              isOpen={showBulletImprover}
              onClose={onCloseBullet}
              title="Draft Alternative Bullet"
            >
              <div className="space-y-4">
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  Enter a resume bullet point and we'll draft clearer, job-aligned language for you to review.
                </p>
                <div className="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800/60">
                  <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
                    Use one simple structure
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {RESUME_BULLET_FRAMEWORKS.map((framework) => (
                      <div
                        key={framework.id}
                        className="rounded-md border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-900"
                      >
                        <p className="text-xs font-semibold text-surface-800 dark:text-surface-100">
                          {framework.label}
                        </p>
                        <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">
                          {framework.whenToUse}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {framework.promptQuestions.slice(0, 3).map((question) => (
                            <li
                              key={question}
                              className="text-xs text-surface-500 dark:text-surface-400"
                            >
                              - {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-surface-600 dark:text-surface-300">
                    Only use details that are true and supported by evidence you can explain.
                  </p>
                </div>
                <div>
                  <label htmlFor="resume-bullet-input" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                    Current Bullet Point
                  </label>
                  <textarea
                    id="resume-bullet-input"
                    value={bulletInput}
                    onChange={(event) => onBulletInputChange(event.target.value)}
                    placeholder="e.g., Helped reduce missed appointments by 20%"
                    className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus-visible:ring-sentinel-400 resize-none"
                    autoFocus
                  />
                </div>

                {improvedBullet && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                      Suggested Version:
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {improvedBullet}
                    </p>
                  </div>
                )}

                <ModalFooter>
                  <Button
                    variant="secondary"
                    onClick={onCloseBullet}
                  >
                    Close
                  </Button>
                  <Button onClick={onDraftBullet} loading={improvingBullet}>
                    Draft
                  </Button>
                </ModalFooter>
              </div>
            </Modal>
    </>
  );
}
