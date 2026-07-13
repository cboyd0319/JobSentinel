import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";

export interface InterviewScheduleApplication {
  id: number;
  job_title: string;
  company: string;
}

export interface InterviewScheduleFormData {
  application_id: number;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  interviewer_name: string;
  interviewer_title: string;
  notes: string;
}

interface InterviewTypeOption {
  value: string;
  label: string;
}

interface InterviewScheduleFormModalProps {
  applications: InterviewScheduleApplication[];
  dateError: string | null;
  formData: InterviewScheduleFormData;
  interviewTypes: InterviewTypeOption[];
  scheduling: boolean;
  onClose: () => void;
  onDateErrorChange: (error: string | null) => void;
  onFormDataChange: (formData: InterviewScheduleFormData) => void;
  onSchedule: () => void;
}

export function InterviewScheduleFormModal({
  applications,
  dateError,
  formData,
  interviewTypes,
  scheduling,
  onClose,
  onDateErrorChange,
  onFormDataChange,
  onSchedule,
}: InterviewScheduleFormModalProps) {
  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSchedule();
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Schedule Interview"
      size="md"
      closeButtonLabel="Close interview form"
    >
      <div className="space-y-4" onKeyDown={handleFormKeyDown}>
          <div>
            <label htmlFor="app-select" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Application (required)
            </label>
            <select
              id="app-select"
              value={formData.application_id}
              onChange={(e) => onFormDataChange({ ...formData, application_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
            >
              <option value={0}>Choose an application...</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.job_title} at {app.company}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="interview-type" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Interview style
            </label>
            <select
              id="interview-type"
              value={formData.interview_type}
              onChange={(e) => onFormDataChange({ ...formData, interview_type: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
            >
              {interviewTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="scheduled-at" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Date and time (required)
            </label>
            <input
              type="datetime-local"
              id="scheduled-at"
              value={formData.scheduled_at}
              onChange={(e) => {
                onFormDataChange({ ...formData, scheduled_at: e.target.value });
                if (dateError) onDateErrorChange(null);
              }}
              onBlur={(e) => {
                if (e.target.value) {
                  const scheduledDate = new Date(e.target.value);
                  if (scheduledDate < new Date()) {
                    onDateErrorChange("Pick a time that has not passed.");
                  }
                }
              }}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 ${
                dateError
                  ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                  : 'border-surface-300 dark:border-surface-600'
              }`}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? "scheduled-at-error" : undefined}
            />
            {dateError && (
              <p id="scheduled-at-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {dateError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Duration (minutes)
            </label>
            <select
              id="duration"
              value={formData.duration_minutes}
              onChange={(e) => onFormDataChange({ ...formData, duration_minutes: Number(e.target.value) })}
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
              Location or meeting link
            </label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => onFormDataChange({ ...formData, location: e.target.value })}
              placeholder="Zoom, Google Meet, or address"
              autoComplete="off"
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="interviewer-name" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Interviewer Name
              </label>
              <input
                type="text"
                id="interviewer-name"
                value={formData.interviewer_name}
                onChange={(e) => onFormDataChange({ ...formData, interviewer_name: e.target.value })}
                autoComplete="name"
                className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100"
              />
            </div>
            <div>
              <label htmlFor="interviewer-title" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                Their role
              </label>
              <input
                type="text"
                id="interviewer-title"
                value={formData.interviewer_title}
                onChange={(e) => onFormDataChange({ ...formData, interviewer_title: e.target.value })}
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
              onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Preparation notes, topics to cover..."
              maxLength={1000}
              className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={scheduling} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={onSchedule} loading={scheduling} loadingText="Scheduling..." className="flex-1">
              Schedule
            </Button>
          </div>
      </div>
    </Modal>
  );
}
