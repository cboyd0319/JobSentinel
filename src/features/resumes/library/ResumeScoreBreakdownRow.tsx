import { scoreFractionToPercent } from "../../../utils/scoreUtils";

interface ResumeScoreBreakdownRowProps {
  label: string;
  score: number;
  barClassName: string;
}

export function ResumeScoreBreakdownRow({
  label,
  score,
  barClassName,
}: ResumeScoreBreakdownRowProps) {
  const percentage = scoreFractionToPercent(score);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-surface-600 dark:text-surface-400 w-24">
        {label}
      </span>
      <div className="flex-1 h-4 bg-surface-200 dark:bg-surface-800 rounded overflow-hidden">
        <div className={`h-full ${barClassName}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-medium text-surface-700 dark:text-surface-300 w-12 text-right">
        {percentage}%
      </span>
    </div>
  );
}
