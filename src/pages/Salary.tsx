import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { HelpIcon } from "../components/HelpIcon";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { formatCurrency } from "../utils/formatUtils";
import { getPayFloorBenchmarkGuidance } from "../shared/payFloorBenchmarkGuidance";
import { BackIcon, ChartIcon, OfferReviewTextarea } from "./SalaryComponents";
import {
  OFFER_EVIDENCE_OPTIONS,
  SENIORITY_LEVELS,
  getCounterStarter,
  getDeclineStarter,
  getNegotiationInputMessage,
  getRepresentativeYearsForSeniority,
  getSalaryErrorAction,
  getSalarySampleQuality,
  getSalarySeniorityForYears,
  getSalaryStageLabel,
  hasUnresolvedTemplatePlaceholders,
  parseSalaryAmount,
  type OfferEvidenceStatus,
  type SalaryBenchmark,
  type SalarySeniority,
} from "./SalaryModel";

interface SalaryProps {
  onBack: () => void;
}

export default function Salary({ onBack }: SalaryProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState<SalarySeniority>("mid");
  const [yearsExp, setYearsExp] = useState<number>(5);
  const [salaryFloor, setSalaryFloor] = useState("");
  const [offerCompany, setOfferCompany] = useState("");
  const [offerEvidenceStatus, setOfferEvidenceStatus] = useState<OfferEvidenceStatus>("written");
  const [verbalOffer, setVerbalOffer] = useState("");
  const [currentOffer, setCurrentOffer] = useState("");
  const [targetMin, setTargetMin] = useState("");
  const [targetMax, setTargetMax] = useState("");
  const [decisionDeadline, setDecisionDeadline] = useState("");
  const [totalCompNotes, setTotalCompNotes] = useState("");
  const [commuteRelocationNotes, setCommuteRelocationNotes] = useState("");
  const [deadlinePressureNotes, setDeadlinePressureNotes] = useState("");
  const [benchmark, setBenchmark] = useState<SalaryBenchmark | null>(null);
  const [benchmarkChecked, setBenchmarkChecked] = useState(false);
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
    ? getPayFloorBenchmarkGuidance({
        salaryFloorAmount: activeSalaryFloor,
        p25Salary: benchmark.p25_salary,
        medianSalary: benchmark.median_salary,
        p75Salary: benchmark.p75_salary,
      })
    : null;
  const sampleQuality = benchmark ? getSalarySampleQuality(benchmark.sample_size) : null;
  const currentOfferAmount = parseSalaryAmount(currentOffer);
  const targetMinAmount = parseSalaryAmount(targetMin);
  const targetMaxAmount = parseSalaryAmount(targetMax);
  const negotiationInputMessage = getNegotiationInputMessage(
    offerEvidenceStatus,
    currentOfferAmount,
    targetMinAmount,
    targetMaxAmount,
  );
  const counterStarter = getCounterStarter({
    company: offerCompany,
    jobTitle: jobTitle.trim() || benchmark?.job_title || "",
    targetMinAmount,
    targetMaxAmount,
  });
  const declineStarter = getDeclineStarter({
    company: offerCompany,
    jobTitle: jobTitle.trim() || benchmark?.job_title || "",
  });
  const canGenerateScript =
    benchmark !== null &&
    offerEvidenceStatus === "written" &&
    currentOfferAmount !== null &&
    targetMinAmount !== null &&
    targetMaxAmount !== null &&
    negotiationInputMessage === null;

  const clearNegotiationScript = () => {
    setNegotiationScript(null);
  };

  const clearBenchmarkResult = () => {
    setBenchmark(null);
    setBenchmarkChecked(false);
    setNegotiationScript(null);
  };

  const handleGetBenchmark = useCallback(async () => {
    if (!jobTitle.trim() || !location.trim()) {
      setBenchmarkChecked(false);
      toast.error("Add pay details", "Add job title and location, then check pay again.");
      return;
    }

    try {
      setLoading(true);
      const result = await invoke<SalaryBenchmark | null>("get_salary_benchmark", {
        jobTitle,
        location,
        seniority,
        yearsExperience: yearsExp,
      });

      if (result) {
        setBenchmark(result);
        setBenchmarkChecked(true);
        setNegotiationScript(null);
        toast.success("Pay range found", "Salary evidence is ready");
      } else {
        setBenchmarkChecked(true);
        toast.info("No pay data yet", "Try a broader role title, role stage, or nearby location.");
        setBenchmark(null);
        setNegotiationScript(null);
      }
    } catch (err: unknown) {
      logError("Failed to get benchmark:", err);
      toast.error("Could not check pay range", getSalaryErrorAction(err));
    } finally {
      setLoading(false);
    }
  }, [jobTitle, location, seniority, toast, yearsExp]);

  const handleGenerateScript = useCallback(async () => {
    if (!benchmark) return;
    if (
      currentOfferAmount === null ||
      targetMinAmount === null ||
      targetMaxAmount === null ||
      negotiationInputMessage !== null
    ) {
      toast.error(
        "Add negotiation facts",
        negotiationInputMessage ?? "Add the written offer and your target range before drafting notes.",
      );
      return;
    }

    try {
      setScriptLoading(true);
      const script = await invoke<string>("generate_negotiation_script", {
        scenario: "initial_offer",
        params: {
          company: offerCompany.trim() || "the employer",
          current_offer: formatCurrency(currentOfferAmount),
          job_title: jobTitle.trim() || benchmark.job_title,
          location: location.trim() || benchmark.location,
          target_min: formatCurrency(targetMinAmount),
          target_max: formatCurrency(targetMaxAmount),
          years_experience: yearsExp.toString(),
        },
      });

      if (hasUnresolvedTemplatePlaceholders(script)) {
        setNegotiationScript(null);
        toast.error(
          "Could not draft notes",
          "The note template needs checked facts before it can be shown.",
        );
        return;
      }

      setNegotiationScript(script);
      toast.success("Notes drafted", "Negotiation notes are ready");
    } catch (err: unknown) {
      logError("Failed to generate script:", err);
      toast.error("Could not draft notes", getSalaryErrorAction(err));
    } finally {
      setScriptLoading(false);
    }
  }, [
    benchmark,
    currentOfferAmount,
    jobTitle,
    location,
    negotiationInputMessage,
    offerCompany,
    targetMaxAmount,
    targetMinAmount,
    toast,
    yearsExp,
  ]);


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
                onChange={(e) => {
                  setJobTitle(e.target.value);
                  clearBenchmarkResult();
                }}
                placeholder="e.g., Registered Nurse"
              />

              <Input
                label="Location"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  clearBenchmarkResult();
                }}
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
                onChange={(e) => {
                    const nextSeniority = e.target.value as SalarySeniority;
                    setSeniority(nextSeniority);
                    setYearsExp(getRepresentativeYearsForSeniority(nextSeniority));
                    clearBenchmarkResult();
                  }}
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
                  onChange={(e) => {
                    const nextYears = parseInt(e.target.value, 10);
                    setYearsExp(nextYears);
                    setSeniority(getSalarySeniorityForYears(nextYears));
                    clearBenchmarkResult();
                  }}
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
                {benchmarkChecked ? (
                  <div role="status" aria-live="polite">
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      No pay range found
                    </p>
                    <p className="mt-2 text-surface-500 dark:text-surface-400">
                      JobSentinel could not find salary data for this title, location, and role stage.
                    </p>
                    <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
                      Try a broader title, a nearby metro area, or a different role stage.
                    </p>
                  </div>
                ) : (
                  <p className="text-surface-500 dark:text-surface-400">
                    Enter role details to compare pay ranges and protect your floor
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-surface-800 dark:text-surface-200">
                      {benchmark.job_title}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {benchmark.location} • {getSalaryStageLabel(benchmark.seniority_level)}
                    </p>
                  </div>
                  {sampleQuality && (
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Badge variant="sentinel">{benchmark.sample_size} salary records</Badge>
                        <Badge variant={sampleQuality.variant}>{sampleQuality.label}</Badge>
                      </div>
                      <p className="max-w-sm text-sm text-surface-600 dark:text-surface-400 sm:text-right">
                        {sampleQuality.detail}
                      </p>
                    </div>
                  )}
                </div>

                {/* Salary Range Visualization */}
                <div className="bg-surface-50 dark:bg-surface-700 rounded-lg p-4">
                  <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-surface-500 dark:text-surface-400 sm:grid-cols-4">
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

                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
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
                      Higher-range reference point
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
                    <div className="mt-3 rounded-md bg-white/70 p-3 dark:bg-surface-900/30">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                        Past-pay question
                      </p>
                      <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                        If asked about current or past pay, redirect to the role range and
                        target pay you would accept. Avoid anchoring yourself to old
                        compensation.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Level and scope check
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-surface-600 dark:text-surface-400">
                    <li>Title, seniority, and responsibilities match the pay range.</li>
                    <li>Schedule, travel, expected hours, and location fit your life.</li>
                    <li>Promotion path, review timing, benefits, and support are clear.</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Negotiation note facts
                  </p>
                  <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                    Separate written offer facts from verbal numbers. JobSentinel drafts notes
                    only from the written amount you enter. It will not turn benchmark points
                    into an offer.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="offer-status" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                        Offer status
                      </label>
                      <select
                        id="offer-status"
                        value={offerEvidenceStatus}
                        onChange={(e) => {
                          setOfferEvidenceStatus(e.target.value as OfferEvidenceStatus);
                          clearNegotiationScript();
                        }}
                        className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-surface-900 focus:border-sentinel-500 focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-700 dark:text-surface-100"
                      >
                        {OFFER_EVIDENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Company (optional)"
                      value={offerCompany}
                      onChange={(e) => {
                        setOfferCompany(e.target.value);
                        clearNegotiationScript();
                      }}
                      placeholder="e.g., CareBridge Health"
                    />
                    <Input
                      label="Verbal or recruiter number (optional)"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={verbalOffer}
                      onChange={(e) => {
                        setVerbalOffer(e.target.value);
                        clearNegotiationScript();
                      }}
                      placeholder="e.g., 180000"
                      hint="Useful context, but do not treat it as final until it is written."
                    />
                    <Input
                      label="Written offer"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={currentOffer}
                      onChange={(e) => {
                        setCurrentOffer(e.target.value);
                        clearNegotiationScript();
                      }}
                      placeholder="e.g., 95000"
                      hint="Use the amount from the written offer. If you only have a verbal number, record it separately."
                    />
                    <Input
                      label="Target minimum"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={targetMin}
                      onChange={(e) => {
                        setTargetMin(e.target.value);
                        clearNegotiationScript();
                      }}
                      placeholder="e.g., 105000"
                    />
                    <Input
                      label="Target maximum"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={targetMax}
                      onChange={(e) => {
                        setTargetMax(e.target.value);
                        clearNegotiationScript();
                      }}
                      placeholder="e.g., 115000"
                    />
                  </div>
                  <p
                    className="mt-3 text-sm text-surface-600 dark:text-surface-400"
                    data-testid="negotiation-fact-guidance"
                  >
                    {negotiationInputMessage ??
                      "Review these facts before using drafted notes. JobSentinel never submits them for you."}
                  </p>
                  <p className="mt-2 text-sm text-surface-600 dark:text-surface-400">
                    Verbal numbers are useful context, but ask for written base pay, bonus,
                    equity, benefits, location, start date, and deadline before countering or
                    deciding.
                  </p>
                </div>

                <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Offer decision review
                  </p>
                  <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                    Use this to slow down the decision and catch costs that do not show up in
                    base pay.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Decision deadline (optional)"
                      type="date"
                      value={decisionDeadline}
                      onChange={(e) => {
                        setDecisionDeadline(e.target.value);
                        clearNegotiationScript();
                      }}
                    />
                    <OfferReviewTextarea
                      label="Total compensation notes (optional)"
                      value={totalCompNotes}
                      onChange={(value) => {
                        setTotalCompNotes(value);
                        clearNegotiationScript();
                      }}
                      placeholder="Base, bonus, equity, benefits, PTO, retirement, health costs"
                    />
                    <OfferReviewTextarea
                      label="Commute and relocation costs (optional)"
                      value={commuteRelocationNotes}
                      onChange={(value) => {
                        setCommuteRelocationNotes(value);
                        clearNegotiationScript();
                      }}
                      placeholder="Parking, transit, childcare, relocation, travel days, move costs"
                    />
                    <OfferReviewTextarea
                      label="Deadline pressure notes (optional)"
                      value={deadlinePressureNotes}
                      onChange={(value) => {
                        setDeadlinePressureNotes(value);
                        clearNegotiationScript();
                      }}
                      placeholder="Same-day deadline, limited time, pressure to accept now"
                    />
                  </div>
                  <ul className="mt-4 space-y-1 text-sm text-surface-600 dark:text-surface-400">
                    <li>Compare base, bonus, equity, benefits, PTO, retirement, and health costs.</li>
                    <li>Add parking, transit, childcare, relocation, travel days, and move costs.</li>
                    <li>Watch for a same-day or exploding deadline; ask for more time when needed.</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    Counter and decline starters
                  </p>
                  <p className="mt-1 text-sm text-surface-600 dark:text-surface-400">
                    These are local drafts. JobSentinel does not send them or decide for you.
                  </p>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                        Counter starter
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-900/40 dark:text-surface-300">
                        {counterStarter}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                        Decline starter
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-surface-50 p-3 text-sm text-surface-700 dark:bg-surface-900/40 dark:text-surface-300">
                        {declineStarter}
                      </pre>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateScript}
                  loading={scriptLoading}
                  variant="secondary"
                  className="w-full"
                  disabled={!canGenerateScript}
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
