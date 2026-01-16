import { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Modal, ModalFooter } from './Modal';
import { useToast } from '../contexts';

interface CoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'jobsentinel_cover_letter_templates';

const DEFAULT_TEMPLATES: CoverLetterTemplate[] = [
  {
    id: 'default-1',
    name: 'General Application',
    content: `Dear Hiring Manager,

I am writing to express my interest in the {position} position at {company}. With my background in {skill1} and {skill2}, I believe I would be a strong addition to your team.

[Customize this paragraph with specific qualifications]

I am excited about the opportunity to contribute to {company}'s mission and would welcome the chance to discuss how my skills align with your needs.

Thank you for considering my application.

Best regards,
{your_name}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const PLACEHOLDER_HINTS = [
  { placeholder: '{company}', description: 'Company name' },
  { placeholder: '{position}', description: 'Job title' },
  { placeholder: '{skill1}', description: 'Your primary skill' },
  { placeholder: '{skill2}', description: 'Your secondary skill' },
  { placeholder: '{your_name}', description: 'Your full name' },
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

function saveTemplates(templates: CoverLetterTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn('Failed to save templates:', e);
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

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), content: content.trim() });
  };

  return (
    <div className="space-y-4">
      <Input
        label="Template Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Tech Company Application"
      />

      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Template Content
        </label>
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
          Available placeholders:
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
  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-surface-50 dark:bg-surface-800/50 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-surface-900 dark:text-white">
            {template.name}
          </h4>
          <p className="text-xs text-surface-500 mt-0.5">
            Updated {new Date(template.updatedAt).toLocaleDateString('en-US')}
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
  const [templates, setTemplates] = useState<CoverLetterTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<CoverLetterTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

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
      saveTemplates(updated);
      toast.success('Template updated');
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
      saveTemplates(updated);
      toast.success('Template created');
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    setDeleteConfirm(null);
    toast.success('Template deleted');
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
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
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
