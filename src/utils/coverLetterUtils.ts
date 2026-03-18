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
