import { memo } from "react";
import { CardHeader } from "../../index";

interface SummaryStepProps {
  summary: string;
  setSummary: (summary: string) => void;
}

const SummaryStep = memo(function SummaryStep({ summary, setSummary }: SummaryStepProps) {
  return (
    <div className="space-y-6">
      <CardHeader
        title="Professional Summary"
        subtitle="A brief overview of your professional background (2-3 sentences)"
      />
      <div>
        <label htmlFor="professional-summary" className="sr-only">Professional Summary</label>
        <textarea
          id="professional-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={6}
          aria-describedby="summary-hint"
          className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 resize-none"
          placeholder="Experienced software engineer with 5+ years building scalable web applications. Specialized in React, TypeScript, and cloud infrastructure. Proven track record of leading cross-functional teams and delivering high-impact projects."
        />
        <p id="summary-hint" className="text-xs text-surface-500 dark:text-surface-400 mt-2">
          {summary.length} characters (minimum 10)
        </p>
      </div>
    </div>
  );
});

export default SummaryStep;
