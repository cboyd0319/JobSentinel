import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { HelpIcon } from "../components/HelpIcon";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { getUserFriendlyError } from "../utils/errorMessages";
import { formatCurrency } from "../utils/formatUtils";

interface SalaryBenchmark {
  job_title: string;
  location: string;
  seniority_level: string;
  min_salary: number;
  p25_salary: number;
  median_salary: number;
  p75_salary: number;
  max_salary: number;
  average_salary: number;
  sample_size: number;
  last_updated: string;
}

interface SalaryProps {
  onBack: () => void;
}

type SalarySeniority = "entry" | "mid" | "senior" | "staff" | "principal";

const SENIORITY_LEVELS: readonly { value: SalarySeniority; label: string }[] = [
  { value: "entry", label: "Starting out (0-2 years)" },
  { value: "mid", label: "Growing experience (3-5 years)" },
  { value: "senior", label: "Experienced (6-10 years)" },
  { value: "staff", label: "Lead or specialist (11-15 years)" },
  { value: "principal", label: "Executive or top-level specialist (16+ years)" },
];

function getSalaryStageLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "entry") return "Starting out";
  if (normalized === "mid") return "Growing experience";
  if (normalized === "senior") return "Experienced";
  if (normalized === "staff") return "Lead or specialist";
  if (normalized === "principal" || normalized === "executive") {
    return "Executive or top-level specialist";
  }
  return value;
}

function getSalaryErrorAction(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action ?? friendly.message;
}

export default function Salary({ onBack }: SalaryProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState<SalarySeniority>("mid");
  const [yearsExp, setYearsExp] = useState<number>(5);
  const [salaryFloor, setSalaryFloor] = useState("");
  const [benchmark, setBenchmark] = useState<SalaryBenchmark | null>(null);
  const [negotiationScript, setNegotiationScript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const toast = useToast();
  const salaryFloorAmount = Number.parseInt(salaryFloor, 10);
  const activeSalaryFloor =
    salaryFloor.trim() !== "" && Number.isFinite(salaryFloorAmount) && salaryFloorAmount > 0
      ? salaryFloorAmount
      : null;
  const floorGuidance = benchmark
    ? getSalaryFloorGuidance(benchmark, activeSalaryFloor)
    : null;

  const handleGetBenchmark = useCallback(async () => {
    if (!jobTitle.trim() || !location.trim()) {
      toast.error("Add pay details", "Please enter a job title and location");
      return;
    }

    try {
      setLoading(true);
      const result = await invoke<SalaryBenchmark | null>("get_salary_benchmark", {
        jobTitle,
        location,
        seniority,
      });

      if (result) {
        setBenchmark(result);
        toast.success("Pay range found", "Salary evidence is ready");
      } else {
        toast.info("No data", "No salary data found for this combination");
        setBenchmark(null);
      }
    } catch (err: unknown) {
      logError("Failed to get benchmark:", err);
      toast.error("Could not check pay range", getSalaryErrorAction(err));
    } finally {
      setLoading(false);
    }
  }, [jobTitle, location, seniority, toast]);

  const handleGenerateScript = useCallback(async () => {
    if (!benchmark) return;

    try {
      setScriptLoading(true);
      const script = await invoke<string>("generate_negotiation_script", {
        scenario: "initial_offer",
        params: {
          job_title: jobTitle,
          location: location,
          target_salary: benchmark.p75_salary.toString(),
          current_offer: benchmark.median_salary.toString(),
        },
      });

      setNegotiationScript(script);
      toast.success("Notes drafted", "Negotiation notes are ready");
    } catch (err: unknown) {
      logError("Failed to generate script:", err);
      toast.error("Could not draft notes", getSalaryErrorAction(err));
    } finally {
      setScriptLoading(false);
    }
  }, [benchmark, jobTitle, location, toast]);


  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
              aria-label="Go back"
            >
              <BackIcon />
            </button>
            <div>
              <h1 className="font-display text-display-md text-surface-900 dark:text-white">
                Pay Protection
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Compare role pay against your floor, range evidence, and negotiation notes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Form */}
          <Card className="dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Pay Check
            </h2>

            <div className="space-y-4">
              <Input
                label="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Registered Nurse"
              />

              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Chicago, IL"
              />

              <Input
                label="Salary floor"
                type="number"
                min="0"
                inputMode="numeric"
                value={salaryFloor}
                onChange={(e) => setSalaryFloor(e.target.value)}
                placeholder="e.g., 85000"
                hint="Optional. JobSentinel uses this as your walk-away number, not a judgment."
              />

              <div>
                <label htmlFor="seniority-level" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Role Stage
                </label>
                <select
                  id="seniority-level"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value as SalarySeniority)}
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
                <label htmlFor="years-exp" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Years of Experience
                </label>
                <input
                  id="years-exp"
                  type="range"
                  min="0"
                  max="20"
                  value={yearsExp}
                  onChange={(e) => setYearsExp(parseInt(e.target.value))}
                  className="w-full accent-sentinel-500"
                  aria-valuemin={0}
                  aria-valuemax={20}
                  aria-valuenow={yearsExp}
                  aria-valuetext={`${yearsExp} years of experience`}
                />
                <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
                  <span>0 years</span>
                  <span className="font-medium text-surface-700 dark:text-surface-300">
                    {yearsExp} years
                  </span>
                  <span>20 years</span>
                </div>
              </div>

              <Button onClick={handleGetBenchmark} loading={loading} className="w-full">
                Check Pay Range
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card className="dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Pay Range Evidence
            </h2>

            {!benchmark ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartIcon className="w-8 h-8 text-surface-400" />
                </div>
                <p className="text-surface-500 dark:text-surface-400">
                  Enter role details to compare pay ranges and protect your floor
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      {benchmark.job_title}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {benchmark.location} • {getSalaryStageLabel(benchmark.seniority_level)}
                    </p>
                  </div>
                  <Badge variant="sentinel">{benchmark.sample_size} salary records</Badge>
                </div>

                {/* Salary Range Visualization */}
                <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm text-surface-500 dark:text-surface-400 mb-2">
                    <span>Lower range</span>
                    <span>Middle</span>
                    <span>Higher range</span>
                    <span className="flex items-center gap-1">
                      Highest seen
                      <HelpIcon text="Lower range means about one quarter of records are below it. Middle means half are above and half are below. Higher range means about one quarter are above it. Highest seen is the top record in this sample." />
                    </span>
                  </div>

                  <div className="relative h-8 bg-surface-200 dark:bg-surface-600 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 via-sentinel-500 to-green-500"
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      {formatCurrency(benchmark.p25_salary)}
                    </span>
                    <span className="text-sm font-medium text-sentinel-600 dark:text-sentinel-400">
                      {formatCurrency(benchmark.median_salary)}
                    </span>
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      {formatCurrency(benchmark.p75_salary)}
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(benchmark.max_salary)}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg">
                    <p className="text-xs text-sentinel-600 dark:text-sentinel-400 mb-1">
                      Strong target from higher range
                    </p>
                    <p className="font-display text-display-md text-sentinel-700 dark:text-sentinel-300">
                      {formatCurrency(benchmark.p75_salary)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                      High sample point
                    </p>
                    <p className="font-display text-display-md text-green-700 dark:text-green-300">
                      {formatCurrency(benchmark.max_salary)}
                    </p>
                  </div>
                </div>

                {floorGuidance && (
                  <div
                    className={`p-4 rounded-lg border ${
                      floorGuidance.tone === "caution"
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : "bg-sentinel-50 dark:bg-sentinel-900/20 border-sentinel-100 dark:border-sentinel-800"
                    }`}
                  >
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                      Lowest-pay check
                    </p>
                    <p className="mt-1 text-sm text-surface-700 dark:text-surface-300">
                      {floorGuidance.message}
                    </p>
                    <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                      If a recruiter asks for salary history, you can redirect to the role range
                      and your target.
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleGenerateScript}
                  loading={scriptLoading}
                  variant="secondary"
                  className="w-full"
                >
                  Draft Negotiation Notes
                </Button>
              </div>
            )}
          </Card>

          {/* Negotiation Script */}
          {negotiationScript && (
            <Card className="lg:col-span-2 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Negotiation Notes
              </h2>

              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300 font-mono">
                  {negotiationScript}
                </pre>
              </div>

              <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">
                Use these notes as a starting point. Do not add facts, offers, or legal claims
                unless they are true and current.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function getSalaryFloorGuidance(
  benchmark: SalaryBenchmark,
  salaryFloorAmount: number | null,
): { message: string; tone: "neutral" | "caution" } {
  if (salaryFloorAmount === null) {
    return {
      message: "Add a salary floor to see below-floor and under-anchoring warnings.",
      tone: "neutral",
    };
  }

  if (salaryFloorAmount > benchmark.p75_salary) {
    return {
      message:
        "Your floor is above the higher-pay part of this sample. Verify level, scope, location, and range quality before lowering it.",
      tone: "caution",
    };
  }

  if (salaryFloorAmount > benchmark.median_salary) {
    return {
      message:
        "Your floor is above the middle of this sample. Use role scope and written range evidence before compromising.",
      tone: "neutral",
    };
  }

  if (salaryFloorAmount < benchmark.p25_salary) {
    return {
      message:
        "Your floor is below the lower-pay part of this sample. Check whether the role is under-leveled or whether your floor should move up.",
      tone: "caution",
    };
  }

  return {
    message:
      "Your floor is within the middle of this sample range. Compare benefits, schedule, level, and promotion path before deciding.",
    tone: "neutral",
  };
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
