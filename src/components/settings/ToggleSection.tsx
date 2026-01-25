import { ReactNode } from "react";

interface ToggleSectionProps {
  icon?: ReactNode;
  label: string;
  helpText?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  testId?: string;
}

export function ToggleSection({
  icon,
  label,
  helpText,
  checked,
  onChange,
  children,
  testId,
}: ToggleSectionProps) {
  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <span className="font-medium text-surface-800 dark:text-surface-200">
              {label}
            </span>
            {helpText && (
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                {helpText}
              </p>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
            data-testid={testId}
          />
          <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
        </label>
      </div>

      {checked && children && (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}
