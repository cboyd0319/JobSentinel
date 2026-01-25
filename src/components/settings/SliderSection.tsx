interface SliderSectionProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  helpText?: string;
  valueFormatter?: (value: number) => string;
  testId?: string;
}

export function SliderSection({
  label,
  value,
  onChange,
  min,
  max,
  step,
  helpText,
  valueFormatter = (v) => v.toFixed(2),
  testId,
}: SliderSectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
        {label}: {valueFormatter(value)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer dark:bg-surface-700"
        data-testid={testId}
      />
      {helpText && (
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
}
