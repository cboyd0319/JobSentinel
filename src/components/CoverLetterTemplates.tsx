import { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Modal, ModalFooter } from './Modal';
import { useToast } from '../contexts';

type TemplateCategory = 'general' | 'tech' | 'creative' | 'finance' | 'healthcare' | 'sales' | 'custom';

interface CoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'jobsentinel_cover_letter_templates';

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  tech: 'Tech & Engineering',
  creative: 'Creative & Design',
  finance: 'Finance & Accounting',
  healthcare: 'Healthcare',
  sales: 'Sales & Marketing',
  custom: 'Custom',
};

const DEFAULT_TEMPLATES: CoverLetterTemplate[] = [
  {
    id: 'default-1',
    name: 'General Application',
    category: 'general',
    content: `Dear {hiring_manager},

I am writing to express my interest in the {position} position at {company}. With my {years_experience} years of experience in {skill1} and {skill2}, I believe I would be a strong addition to your team.

[Customize this paragraph with specific qualifications]

I am excited about the opportunity to contribute to {company}'s mission at their {location} office and would welcome the chance to discuss how my skills align with your needs.

Thank you for considering my application.

Best regards,
{your_name}

Date: {date}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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

function loadTemplates(): CoverLetterTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load templates:', e);
  }
  return DEFAULT_TEMPLATES;
}

function saveTemplates(templates: CoverLetterTemplate[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch (e) {
    console.warn('Failed to save templates:', e);
    return false;
  }
}

interface TemplateEditorProps {
  template: CoverLetterTemplate | null;
  onSave: (template: Omit<CoverLetterTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'general');

  // Calculate word and character counts
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), content: content.trim(), category });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Template Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Tech Company Application"
        />
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500"
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
          className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 resize-y font-mono text-sm"
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
              className="text-xs px-2 py-1 bg-surface-200 dark:bg-surface-700 rounded hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors"
              title={description}
            >
              {placeholder}
            </button>
          ))}
        </div>
      </div>

      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || !content.trim()}>
          {template ? 'Update' : 'Create'} Template
        </Button>
      </ModalFooter>
    </div>
  );
}

interface TemplatePreviewProps {
  template: CoverLetterTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function TemplatePreview({ template, onEdit, onDelete, onCopy }: TemplatePreviewProps) {
  // Calculate word count for preview
  const wordCount = template.content.trim() ? template.content.trim().split(/\s+/).length : 0;

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

export function CoverLetterTemplates() {
  // Use lazy initialization to avoid setState in effect
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>(() => loadTemplates());
  const [editingTemplate, setEditingTemplate] = useState<CoverLetterTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const toast = useToast();

  // Filter templates by category
  const filteredTemplates = categoryFilter === 'all'
    ? templates
    : templates.filter((t) => t.category === categoryFilter);

  const handleSaveTemplate = (data: Omit<CoverLetterTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();

    if (editingTemplate) {
      // Update existing
      const updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, ...data, updatedAt: now }
          : t
      );
      setTemplates(updated);
      if (saveTemplates(updated)) {
        toast.success('Template updated');
      } else {
        toast.error('Failed to save', 'Changes may be lost when you close the app');
      }
      setEditingTemplate(null);
    } else {
      // Create new
      const newTemplate: CoverLetterTemplate = {
        id: `template_${Date.now()}`,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      if (saveTemplates(updated)) {
        toast.success('Template created');
      } else {
        toast.error('Failed to save', 'Changes may be lost when you close the app');
      }
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    if (saveTemplates(updated)) {
      toast.success('Template deleted');
    } else {
      toast.error('Failed to save', 'Changes may be lost when you close the app');
    }
    setDeleteConfirm(null);
  };

  const handleCopyTemplate = async (template: CoverLetterTemplate) => {
    try {
      await navigator.clipboard.writeText(template.content);
      toast.success('Copied to clipboard', 'Remember to replace the placeholders');
    } catch {
      toast.error('Failed to copy', 'Please try again');
    }
  };

  const showEditor = isCreating || editingTemplate;

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
                onEdit={() => setEditingTemplate(template)}
                onDelete={() => setDeleteConfirm(template.id)}
                onCopy={() => handleCopyTemplate(template)}
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
}

function DocumentIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
