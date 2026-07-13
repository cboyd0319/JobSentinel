import { useState } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal, ModalFooter } from '../../components/Modal';
import { fillTemplatePlaceholders, type JobForTemplate } from '../../utils/coverLetterUtils';
import {
  CATEGORY_LABELS,
  PLACEHOLDER_HINTS,
  type CoverLetterTemplate,
  type TemplateCategory,
} from './coverLetterTemplateModel';

interface TemplateEditorProps {
  template: CoverLetterTemplate | null;
  onSave: (template: Omit<CoverLetterTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function TemplateEditor({ template, onSave, onCancel, saving }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'general');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Track dirty state (has unsaved changes)
  const isDirty =
    name !== (template?.name || '') ||
    content !== (template?.content || '') ||
    category !== (template?.category || 'general');

  // Calculate word and character counts
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), content: content.trim(), category });
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Customer Support Application"
          autoComplete="off"
          disabled={saving}
        />
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            disabled={saving}
            aria-label="Template category"
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 disabled:opacity-50"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
            Template Content
          </label>
          <span className="text-xs text-surface-500 dark:text-surface-400">
            {wordCount} words · {charCount} characters
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your cover letter template here..."
          rows={12}
          maxLength={5000}
          disabled={saving}
          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-y font-mono text-sm disabled:opacity-50"
        />
      </div>

      <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
        <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
          Use a label to add an auto-fill blank:
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDER_HINTS.map(({ token, label, description }) => (
            <button
              key={token}
              onClick={() => setContent((c) => c + token)}
              disabled={saving}
              className="text-xs px-2 py-1 bg-surface-200 dark:bg-surface-700 rounded hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors disabled:opacity-50"
              aria-label={`Insert ${label}`}
              title={description}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}>
          {saving ? 'Saving...' : template ? 'Update' : 'Create'} Template
        </Button>
      </ModalFooter>

      {/* Discard Changes Confirmation */}
      {showDiscardConfirm && (
        <Modal
          isOpen
          onClose={() => setShowDiscardConfirm(false)}
          title="Discard changes?"
          size="sm"
        >
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            You have unsaved changes. Are you sure you want to discard them?
          </p>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowDiscardConfirm(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={onCancel}>
              Discard changes
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

interface TemplatePreviewProps {
  template: CoverLetterTemplate;
  selectedJob?: JobForTemplate | null;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onUseForJob?: (filledContent: string) => void;
}

export function TemplatePreview({ template, selectedJob, onEdit, onDelete, onCopy, onUseForJob }: TemplatePreviewProps) {
  // Calculate word count for preview
  const wordCount = template.content.trim() ? template.content.trim().split(/\s+/).length : 0;

  const handleUseForJob = () => {
    if (!selectedJob || !onUseForJob) return;
    const filledContent = fillTemplatePlaceholders(template.content, selectedJob);
    onUseForJob(filledContent);
  };

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
      <div className="flex flex-col gap-3 bg-surface-50 px-4 py-3 dark:bg-surface-800/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-surface-900 dark:text-white">
              {template.name}
            </h4>
            <span className="text-xs px-2 py-0.5 bg-sentinel-100 dark:bg-sentinel-900/30 text-sentinel-700 dark:text-sentinel-300 rounded">
              {CATEGORY_LABELS[template.category] || 'General'}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            {wordCount} words · Updated {new Date(template.updatedAt).toLocaleDateString('en-US')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {selectedJob && onUseForJob && (
            <Button size="sm" onClick={handleUseForJob} title={`Fill for ${selectedJob.company}`}>
              Use for Job
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onCopy}>
            Copy
          </Button>
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
      <div className="p-4 max-h-48 overflow-y-auto">
        <pre className="text-sm text-surface-600 dark:text-surface-400 whitespace-pre-wrap font-sans">
          {template.content}
        </pre>
      </div>
    </div>
  );
}
