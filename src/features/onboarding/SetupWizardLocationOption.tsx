import type { KeyboardEvent, ReactNode } from "react";
import { CheckIcon } from "./SetupWizardIcons";

interface LocationOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
}

export function LocationOption({ label, description, checked, onChange, icon }: LocationOptionProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      className={`
        flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all duration-150
        ${checked
          ? "border-sentinel-500 bg-sentinel-50"
          : "border-surface-200 hover:border-surface-300"
        }
      `}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="checkbox"
      aria-checked={checked}
      aria-label={`${label}: ${description}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center
        ${checked ? "bg-sentinel-500 text-white" : "bg-surface-100 text-surface-500"}
      `}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${checked ? "text-sentinel-700" : "text-surface-700"}`}>
          {label}
        </p>
        <p className="text-sm text-surface-500">{description}</p>
      </div>
      <div className={`
        w-6 h-6 rounded-full border-2 flex items-center justify-center
        ${checked ? "border-sentinel-500 bg-sentinel-500" : "border-surface-300"}
      `}>
        {checked && <CheckIcon className="w-4 h-4 text-white" />}
      </div>
    </label>
  );
}
