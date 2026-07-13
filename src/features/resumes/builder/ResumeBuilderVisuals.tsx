import type { ReactElement } from "react";
import type { TemplateId } from "./resumeBuilderData";

export function TemplateThumbnail({ templateId }: { templateId: TemplateId }) {
  const thumbnails: Record<TemplateId, ReactElement> = {
    Classic: (
      <div className="w-full h-full bg-white dark:bg-surface-800 p-2 text-[4px] leading-tight">
        <div className="text-center mb-1">
          <div className="font-bold">JOHN DOE</div>
          <div className="text-surface-500">Marketing Manager</div>
        </div>
        <div className="space-y-1">
          <div className="border-t border-surface-300 dark:border-surface-600 pt-1">
            <div className="font-semibold">EXPERIENCE</div>
            <div className="text-surface-600 dark:text-surface-400">Content Lead - 2020-2024</div>
          </div>
          <div className="border-t border-surface-300 dark:border-surface-600 pt-1">
            <div className="font-semibold">EDUCATION</div>
            <div className="text-surface-600 dark:text-surface-400">B.A. Communications</div>
          </div>
        </div>
      </div>
    ),
    Modern: (
      <div className="w-full h-full bg-gradient-to-br from-sentinel-50 to-white dark:from-surface-800 dark:to-surface-900 p-2 text-[4px] leading-tight">
        <div className="bg-sentinel-600 text-white p-1 mb-1">
          <div className="font-bold">JOHN DOE</div>
          <div>Operations Manager</div>
        </div>
        <div className="space-y-1 px-1">
          <div>
            <div className="font-semibold text-sentinel-600">Experience</div>
            <div className="text-surface-600 dark:text-surface-400">Program Manager</div>
          </div>
          <div>
            <div className="font-semibold text-sentinel-600">Education</div>
            <div className="text-surface-600 dark:text-surface-400">Business Administration</div>
          </div>
        </div>
      </div>
    ),
    Technical: (
      <div className="w-full h-full bg-white dark:bg-surface-800 p-2 text-[4px] leading-tight">
        <div className="border-b-2 border-success pb-1 mb-1">
          <div className="font-bold">JOHN DOE</div>
          <div className="text-success">Community Program Lead</div>
        </div>
        <div className="space-y-1">
          <div className="border-l-2 border-surface-300 dark:border-surface-600 pl-1">
            <div className="font-semibold text-success">SKILLS</div>
            <div className="text-surface-600 dark:text-surface-400">Scheduling - Outreach</div>
          </div>
          <div className="border-l-2 border-surface-300 dark:border-surface-600 pl-1">
            <div className="font-semibold text-success">EXPERIENCE</div>
            <div className="text-surface-600 dark:text-surface-400">Program Coordinator</div>
          </div>
        </div>
      </div>
    ),
    Executive: (
      <div className="w-full h-full bg-white dark:bg-surface-800 p-2 text-[4px] leading-tight">
        <div className="border-b-2 border-surface-800 dark:border-surface-200 pb-1 mb-1">
          <div className="font-bold text-lg">JOHN DOE</div>
          <div className="text-surface-600 dark:text-surface-400 italic">
            Chief Operations Officer
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <div className="font-semibold uppercase tracking-wider">Experience</div>
            <div className="text-surface-600 dark:text-surface-400">COO - 2020-2024</div>
          </div>
          <div>
            <div className="font-semibold uppercase tracking-wider">Education</div>
            <div className="text-surface-600 dark:text-surface-400">MBA, Stanford</div>
          </div>
        </div>
      </div>
    ),
    Military: (
      <div className="w-full h-full bg-surface-50 dark:bg-surface-900 p-2 text-[4px] leading-tight">
        <div className="border-4 border-surface-800 dark:border-surface-200 p-1 mb-1">
          <div className="text-center font-bold">DOE, JOHN A.</div>
          <div className="text-center text-surface-600 dark:text-surface-400">
            LOGISTICS MANAGER
          </div>
        </div>
        <div className="space-y-1">
          <div className="border border-surface-300 dark:border-surface-600 p-1">
            <div className="font-semibold">PROFESSIONAL EXPERIENCE</div>
            <div className="text-surface-600 dark:text-surface-400">
              Logistics Manager
            </div>
          </div>
          <div className="border border-surface-300 dark:border-surface-600 p-1">
            <div className="font-semibold">EDUCATION & TRAINING</div>
            <div className="text-surface-600 dark:text-surface-400">Operations Leadership</div>
          </div>
        </div>
      </div>
    ),
  };

  return thumbnails[templateId] || null;
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function PdfIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h2v2H9v-2zm0 0V9l4 4m-4 0h4"
      />
    </svg>
  );
}

export function DocxIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function JsonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 13l-1.5 1.5L10 16m4-3l1.5 1.5L14 16"
      />
    </svg>
  );
}
