import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Modal, ModalFooter } from './Modal';
import { useToast } from '../contexts';
import { LoadingSpinner } from './LoadingSpinner';
import { logError } from '../utils/errorUtils';

type TemplateCategory = 'general' | 'tech' | 'creative' | 'finance' | 'healthcare' | 'sales' | 'custom' | 'thankyou' | 'followup' | 'withdrawal';

// Minimal Job interface for auto-fill feature
export interface JobForTemplate {
  title: string;
  company: string;
  location: string | null;
}

/**
 * Fill placeholders in a template with job data
 */
export function fillTemplatePlaceholders(
  template: string,
  job: JobForTemplate,
  userContext?: { name?: string }
): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return template
    .replace(/\{company\}/g, job.company)
    .replace(/\{position\}/g, job.title)
    .replace(/\{location\}/g, job.location || 'Remote')
    .replace(/\{hiring_manager\}/g, 'Hiring Manager')
    .replace(/\{your_name\}/g, userContext?.name || '[Your Name]')
    .replace(/\{date\}/g, today)
    // Leave skill placeholders for manual fill
    .replace(/\{skill1\}/g, '[Your Primary Skill]')
    .replace(/\{skill2\}/g, '[Your Secondary Skill]')
    .replace(/\{years_experience\}/g, '[X]');
}

interface CoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  tech: 'Tech & Engineering',
  creative: 'Creative & Design',
  finance: 'Finance & Accounting',
  healthcare: 'Healthcare',
  sales: 'Sales & Marketing',
  custom: 'Custom',
  thankyou: 'Thank You Notes',
  followup: 'Follow-Up Emails',
  withdrawal: 'Withdrawal',
};

const PLACEHOLDER_HINTS = [
  { placeholder: '{company}', description: 'Company name' },
  { placeholder: '{position}', description: 'Job title' },
  { placeholder: '{location}', description: 'Job location' },
  { placeholder: '{hiring_manager}', description: 'Hiring manager name (or "Hiring Manager")' },
  { placeholder: '{skill1}', description: 'Your primary skill' },
  { placeholder: '{skill2}', description: 'Your secondary skill' },
  { placeholder: '{years_experience}', description: 'Years of experience' },
  { placeholder: '{your_name}', description: 'Your full name' },
  { placeholder: '{date}', description: 'Today\'s date' },
];

interface TemplateEditorProps {
  template: CoverLetterTemplate | null;
  onSave: (template: Omit<CoverLetterTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  saving?: boolean;
}

function TemplateEditor({ template, onSave, onCancel, saving }: TemplateEditorProps) {
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
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Tech Company Application"
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
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 disabled:opacity-50"
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
          disabled={saving}
          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 resize-y font-mono text-sm disabled:opacity-50"
        />
      </div>

      <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
        <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
          Available placeholders (click to insert):
        </p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDER_HINTS.map(({ placeholder, description }) => (
            <button
              key={placeholder}
              onClick={() => setContent((c) => c + placeholder)}
              disabled={saving}
              className="text-xs px-2 py-1 bg-surface-200 dark:bg-surface-700 rounded hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors disabled:opacity-50"
              title={description}
            >
              {placeholder}
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

function TemplatePreview({ template, selectedJob, onEdit, onDelete, onCopy, onUseForJob }: TemplatePreviewProps) {
  // Calculate word count for preview
  const wordCount = template.content.trim() ? template.content.trim().split(/\s+/).length : 0;

  const handleUseForJob = () => {
    if (!selectedJob || !onUseForJob) return;
    const filledContent = fillTemplatePlaceholders(template.content, selectedJob);
    onUseForJob(filledContent);
  };

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800/50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
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
        <div className="flex gap-2">
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

interface CoverLetterTemplatesProps {
  /** Optional job to enable "Use for Job" auto-fill button */
  selectedJob?: JobForTemplate | null;
}

export const CoverLetterTemplates = memo(function CoverLetterTemplates({ selectedJob }: CoverLetterTemplatesProps = {}) {
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CoverLetterTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const toast = useToast();
  const isMountedRef = useRef(true);

  // Track mount state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load templates from backend
  const loadTemplates = useCallback(async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);
      // Seed default templates on first use
      try {
        await invoke<number>('seed_default_templates');
      } catch {
        // Ignore - templates may already exist
      }
      const result = await invoke<CoverLetterTemplate[]>('list_cover_letter_templates');
      if (isMountedRef.current) {
        setTemplates(result);
      }
    } catch (err) {
      logError('Failed to load templates:', err);
      const errorMsg = String(err);
      if (isMountedRef.current) {
        setError(errorMsg);
        toast.error('Failed to load templates', errorMsg);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [toast]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter templates by category
  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter((t) => t.category === categoryFilter);

  const handleSaveTemplate = async (data: Omit<CoverLetterTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isMountedRef.current) return;
    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing
        const updated = await invoke<CoverLetterTemplate | null>('update_cover_letter_template', {
          id: editingTemplate.id,
          name: data.name,
          content: data.content,
          category: data.category,
        });

        if (!isMountedRef.current) return;
        if (updated) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? updated : t))
          );
          toast.success('Template updated');
        } else {
          toast.error('Template not found');
        }
        setEditingTemplate(null);
      } else {
        // Create new
        const newTemplate = await invoke<CoverLetterTemplate>('create_cover_letter_template', {
          name: data.name,
          content: data.content,
          category: data.category,
        });
        if (!isMountedRef.current) return;
        setTemplates((prev) => [newTemplate, ...prev]);
        toast.success('Template created');
        setIsCreating(false);
      }
    } catch (error: unknown) {
      logError('Failed to save template:', error);
      if (isMountedRef.current) {
        toast.error('Failed to save template', String(error));
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const deleted = await invoke<boolean>('delete_cover_letter_template', { id });
      if (!isMountedRef.current) return;
      if (deleted) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success('Template deleted');
      } else {
        toast.error('Template not found');
      }
    } catch (error: unknown) {
      logError('Failed to delete template:', error);
      if (isMountedRef.current) {
        toast.error('Failed to delete template', String(error));
      }
    }
    if (isMountedRef.current) {
      setDeleteConfirm(null);
    }
  };

  const handleCopyTemplate = async (template: CoverLetterTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      toast.success('Copied to clipboard', 'Remember to replace the placeholders');
    } catch {
      toast.error('Failed to copy', 'Please try again');
    }
  };

  const handleUseForJob = async (filledContent: string) => {
    try {
      await navigator.clipboard.writeText(filledContent);
      toast.success(
        'Template filled and copied!',
        'Check for [bracketed] placeholders that need manual editing'
      );
    } catch {
      toast.error('Failed to copy', 'Please try again');
    }
  };

  const showEditor = isCreating || editingTemplate;

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
          <span className="ml-2 text-surface-600 dark:text-surface-400">Loading templates...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h4 className="font-medium text-surface-900 dark:text-white mb-2">
            Failed to Load Templates
          </h4>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
            {error}
          </p>
          <Button onClick={() => loadTemplates()}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-surface-900 dark:text-white">
              Cover Letter Templates
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Create reusable templates for your applications
            </p>
          </div>
          {!showEditor && (
            <Button size="sm" onClick={() => setIsCreating(true)}>
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Category filter */}
      {!showEditor && templates.length > 0 && (
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
              Filter:
            </span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-sentinel-600 text-white'
                  : 'bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600'
              }`}
            >
              All ({templates.length})
            </button>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => {
              const count = templates.filter((t) => t.category === value).length;
              if (count === 0) return null;
              return (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value as TemplateCategory)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    categoryFilter === value
                      ? 'bg-sentinel-600 text-white'
                      : 'bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 dark:hover:bg-surface-600'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-4">
        {showEditor ? (
          <TemplateEditor
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setIsCreating(false);
              setEditingTemplate(null);
            }}
            saving={saving}
          />
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <DocumentIcon className="w-6 h-6 text-surface-400" />
            </div>
            <p className="text-surface-600 dark:text-surface-400">
              No templates yet
            </p>
            <p className="text-sm text-surface-500 mt-1">
              Create your first cover letter template
            </p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-surface-600 dark:text-surface-400">
              No templates in this category
            </p>
            <button
              onClick={() => setCategoryFilter('all')}
              className="text-sm text-sentinel-600 dark:text-sentinel-400 hover:underline mt-2"
            >
              Show all templates
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTemplates.map((template) => (
              <TemplatePreview
                key={template.id}
                template={template}
                selectedJob={selectedJob}
                onEdit={() => setEditingTemplate(template)}
                onDelete={() => setDeleteConfirm(template.id)}
                onCopy={() => handleCopyTemplate(template)}
                onUseForJob={selectedJob ? handleUseForJob : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen
          onClose={() => setDeleteConfirm(null)}
          title="Delete Template"
        >
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            Are you sure you want to delete this template? This action cannot be undone.
          </p>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDeleteTemplate(deleteConfirm)}>
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </Card>
  );
});

function DocumentIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
