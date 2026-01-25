import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { HelpIcon } from "../components/HelpIcon";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";
import { formatCurrency } from "../utils/formatUtils";

interface SalaryBenchmark {
  role: string;
  location: string;
  seniority: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_size: number;
}

interface SalaryProps {
  onBack: () => void;
}

const SENIORITY_LEVELS = [
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (3-5 years)" },
  { value: "senior", label: "Senior (6-10 years)" },
  { value: "staff", label: "Staff/Principal (10+ years)" },
  { value: "executive", label: "Executive/Director" },
];

export default function Salary({ onBack }: SalaryProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("mid");
  const [yearsExp, setYearsExp] = useState<number>(5);
  const [benchmark, setBenchmark] = useState<SalaryBenchmark | null>(null);
  const [negotiationScript, setNegotiationScript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const toast = useToast();

  const handleGetBenchmark = useCallback(async () => {
    if (!jobTitle.trim() || !location.trim()) {
      toast.error("Missing fields", "Please enter job title and location");
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
        toast.success("Benchmark found", "Salary data retrieved successfully");
      } else {
        toast.info("No data", "No salary data found for this combination");
        setBenchmark(null);
      }
    } catch (err: unknown) {
      logError("Failed to get benchmark:", err);
      toast.error("Benchmark failed", getErrorMessage(err));
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
          target_salary: benchmark.p75.toString(),
          current_offer: benchmark.p50.toString(),
        },
      });

      setNegotiationScript(script);
      toast.success("Script generated", "Negotiation talking points ready");
    } catch (err: unknown) {
      logError("Failed to generate script:", err);
      toast.error("Script generation failed", getErrorMessage(err));
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
                Salary AI
              </h1>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Data-driven compensation insights and negotiation help
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
              Salary Lookup
            </h2>

            <div className="space-y-4">
              <Input
                label="Job Title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
              />

              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />

              <div>
                <label htmlFor="seniority-level" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Seniority Level
                </label>
                <select
                  id="seniority-level"
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 focus:ring-2 focus:ring-sentinel-500 focus:border-sentinel-500"
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
                Get Salary Data
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card className="dark:bg-surface-800">
            <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
              Salary Benchmark
            </h2>

            {!benchmark ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartIcon className="w-8 h-8 text-surface-400" />
                </div>
                <p className="text-surface-500 dark:text-surface-400">
                  Enter job details to see salary benchmarks
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      {benchmark.role}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {benchmark.location} • {benchmark.seniority}
                    </p>
                  </div>
                  <Badge variant="sentinel">{benchmark.sample_size} data points</Badge>
                </div>

                {/* Salary Range Visualization */}
                <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
                  <div className="flex items-center justify-between text-sm text-surface-500 dark:text-surface-400 mb-2">
                    <span>25th %</span>
                    <span>Median</span>
                    <span>75th %</span>
                    <span className="flex items-center gap-1">
                      90th %
                      <HelpIcon text="Percentiles show salary distribution. Median (50th) = half earn more, half less. 75th = top 25% of earners. Aim for 75th+ with your experience." />
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
                      {formatCurrency(benchmark.p25)}
                    </span>
                    <span className="text-sm font-medium text-sentinel-600 dark:text-sentinel-400">
                      {formatCurrency(benchmark.p50)}
                    </span>
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                      {formatCurrency(benchmark.p75)}
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(benchmark.p90)}
                    </span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg">
                    <p className="text-xs text-sentinel-600 dark:text-sentinel-400 mb-1">
                      Target (75th percentile)
                    </p>
                    <p className="font-display text-display-md text-sentinel-700 dark:text-sentinel-300">
                      {formatCurrency(benchmark.p75)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                      Stretch (90th percentile)
                    </p>
                    <p className="font-display text-display-md text-green-700 dark:text-green-300">
                      {formatCurrency(benchmark.p90)}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateScript}
                  loading={scriptLoading}
                  variant="secondary"
                  className="w-full"
                >
                  Generate Negotiation Script
                </Button>
              </div>
            )}
          </Card>

          {/* Negotiation Script */}
          {negotiationScript && (
            <Card className="lg:col-span-2 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Negotiation Talking Points
              </h2>

              <div className="p-4 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-surface-700 dark:text-surface-300 font-mono">
                  {negotiationScript}
                </pre>
              </div>

              <p className="mt-4 text-sm text-surface-500 dark:text-surface-400">
                These talking points are based on market data. Always adapt them to your specific
                situation and the company's context.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
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
