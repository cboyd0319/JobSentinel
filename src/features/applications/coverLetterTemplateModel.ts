export type TemplateCategory =
  | 'general'
  | 'tech'
  | 'creative'
  | 'finance'
  | 'healthcare'
  | 'sales'
  | 'custom'
  | 'thankyou'
  | 'followup'
  | 'withdrawal';

export interface CoverLetterTemplate {
  id: string;
  name: string;
  content: string;
  category: TemplateCategory;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  general: 'General',
  healthcare: 'Healthcare',
  finance: 'Finance & Accounting',
  sales: 'Sales & Marketing',
  creative: 'Creative & Design',
  tech: 'IT & Software',
  custom: 'Custom',
  thankyou: 'Thank You Notes',
  followup: 'Follow-Up Emails',
  withdrawal: 'Withdrawal',
};

export const PLACEHOLDER_HINTS = [
  {
    token: '{company}',
    label: 'Company',
    description: 'Adds the company name when you fill this for a job',
  },
  {
    token: '{position}',
    label: 'Job Title',
    description: 'Adds the job title when you fill this for a job',
  },
  {
    token: '{location}',
    label: 'Location',
    description: 'Adds the job location when available',
  },
  {
    token: '{hiring_manager}',
    label: 'Hiring Manager',
    description: 'Adds the hiring manager name, or a general greeting if unknown',
  },
  {
    token: '{skill1}',
    label: 'Main Skill',
    description: 'Adds a blank for your strongest relevant skill',
  },
  {
    token: '{skill2}',
    label: 'Second Skill',
    description: 'Adds a blank for another relevant skill',
  },
  {
    token: '{years_experience}',
    label: 'Years Experience',
    description: 'Adds a blank for your years of experience',
  },
  {
    token: '{your_name}',
    label: 'Your Name',
    description: 'Adds your name when available',
  },
  {
    token: '{date}',
    label: 'Date',
    description: 'Adds today\'s date',
  },
] as const;

export const CLIPBOARD_RECOVERY_MESSAGE =
  'Give JobSentinel clipboard permission, then copy again. The template text is still saved.';
