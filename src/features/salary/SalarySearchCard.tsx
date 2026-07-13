import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Input } from "../../ui/Input";
import {
  SENIORITY_LEVELS,
  type SalarySeniority,
} from "./model";

interface SalarySearchCardProps {
  jobTitle: string;
  location: string;
  salaryFloor: string;
  seniority: SalarySeniority;
  yearsExperience: number;
  loading: boolean;
  onJobTitleChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSalaryFloorChange: (value: string) => void;
  onSeniorityChange: (value: SalarySeniority) => void;
  onYearsExperienceChange: (value: number) => void;
  onCheck: () => void;
}

export function SalarySearchCard({
  jobTitle,
  location,
  salaryFloor,
  seniority,
  yearsExperience,
  loading,
  onJobTitleChange,
  onLocationChange,
  onSalaryFloorChange,
  onSeniorityChange,
  onYearsExperienceChange,
  onCheck,
}: SalarySearchCardProps) {
  return (
    <Card className="dark:bg-surface-800">
      <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
        Pay Check
      </h2>
      <div className="space-y-4">
        <Input
          label="Job Title"
          value={jobTitle}
          onChange={(event) => onJobTitleChange(event.target.value)}
          placeholder="e.g., Registered Nurse"
        />
        <Input
          label="Location"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="e.g., Chicago, IL"
        />
        <Input
          label="Salary floor"
          type="number"
          min="0"
          inputMode="numeric"
          value={salaryFloor}
          onChange={(event) => onSalaryFloorChange(event.target.value)}
          placeholder="e.g., 85000"
          hint="Optional. JobSentinel uses this as your walk-away number, not a judgment."
        />
        <div>
          <label
            htmlFor="seniority-level"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
          >
            Role Stage
          </label>
          <select
            id="seniority-level"
            value={seniority}
            onChange={(event) => onSeniorityChange(event.target.value as SalarySeniority)}
            className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus-visible:ring-2 focus-visible:ring-sentinel-500 focus:border-sentinel-500"
          >
            {SENIORITY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="years-exp"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2"
          >
            Years of Experience
          </label>
          <input
            id="years-exp"
            type="range"
            min="0"
            max="20"
            value={yearsExperience}
            onChange={(event) => onYearsExperienceChange(Number.parseInt(event.target.value, 10))}
            className="w-full accent-sentinel-500"
            aria-valuemin={0}
            aria-valuemax={20}
            aria-valuenow={yearsExperience}
            aria-valuetext={`${yearsExperience} years of experience`}
          />
          <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
            <span>0 years</span>
            <span className="font-medium text-surface-700 dark:text-surface-300">
              {yearsExperience} years
            </span>
            <span>20 years</span>
          </div>
        </div>
        <Button onClick={onCheck} loading={loading} className="w-full">
          Check Pay Range
        </Button>
      </div>
    </Card>
  );
}
