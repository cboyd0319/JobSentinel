import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { useToast } from "../../shared/toast/useToast";
import { getPayFloorBenchmarkGuidance } from "../../shared/payFloorBenchmarkGuidance";
import { logError } from "../../shared/errorReporting/logger";
import { formatCurrency } from "../../utils/formatUtils";
import { NegotiationNotesCard } from "./NegotiationNotesCard";
import { SalaryEvidenceCard } from "./SalaryEvidenceCard";
import { BackIcon } from "./SalaryPrimitives";
import { SalarySearchCard } from "./SalarySearchCard";
import {
  DEFAULT_OFFER_REVIEW,
  getCounterStarter,
  getDeclineStarter,
  getNegotiationInputMessage,
  getRepresentativeYearsForSeniority,
  getSalaryErrorAction,
  getSalarySampleQuality,
  getSalarySeniorityForYears,
  hasUnresolvedTemplatePlaceholders,
  parseSalaryAmount,
  type OfferReviewInput,
  type SalaryBenchmark,
  type SalarySeniority,
} from "./model";

interface SalaryPageProps {
  onBack: () => void;
}

export default function SalaryPage({ onBack }: SalaryPageProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState<SalarySeniority>("mid");
  const [yearsExperience, setYearsExperience] = useState(5);
  const [salaryFloor, setSalaryFloor] = useState("");
  const [offerReview, setOfferReview] = useState<OfferReviewInput>(DEFAULT_OFFER_REVIEW);
  const [benchmark, setBenchmark] = useState<SalaryBenchmark | null>(null);
  const [benchmarkChecked, setBenchmarkChecked] = useState(false);
  const [negotiationNotes, setNegotiationNotes] = useState<string | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
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
  const currentOfferAmount = parseSalaryAmount(offerReview.currentOffer);
  const targetMinAmount = parseSalaryAmount(offerReview.targetMin);
  const targetMaxAmount = parseSalaryAmount(offerReview.targetMax);
  const negotiationInputMessage = getNegotiationInputMessage(
    offerReview.evidenceStatus,
    currentOfferAmount,
    targetMinAmount,
    targetMaxAmount,
  );
  const reviewedJobTitle = jobTitle.trim() || benchmark?.job_title || "";
  const counterStarter = getCounterStarter({
    company: offerReview.company,
    jobTitle: reviewedJobTitle,
    targetMinAmount,
    targetMaxAmount,
  });
  const declineStarter = getDeclineStarter({
    company: offerReview.company,
    jobTitle: reviewedJobTitle,
  });
  const canGenerateNotes =
    benchmark !== null &&
    offerReview.evidenceStatus === "written" &&
    currentOfferAmount !== null &&
    targetMinAmount !== null &&
    targetMaxAmount !== null &&
    negotiationInputMessage === null;

  const clearBenchmarkResult = () => {
    setBenchmark(null);
    setBenchmarkChecked(false);
    setNegotiationNotes(null);
  };

  const updateOfferReview = <K extends keyof OfferReviewInput>(
    field: K,
    value: OfferReviewInput[K],
  ) => {
    setOfferReview((current) => ({ ...current, [field]: value }));
    setNegotiationNotes(null);
  };

  const handleGetBenchmark = useCallback(async () => {
    if (!jobTitle.trim() || !location.trim()) {
      setBenchmarkChecked(false);
      toast.error("Add pay details", "Add job title and location, then check pay again.");
      return;
    }

    try {
      setBenchmarkLoading(true);
      const result = await invoke<SalaryBenchmark | null>("get_salary_benchmark", {
        jobTitle,
        location,
        seniority,
        yearsExperience,
      });

      if (result) {
        setBenchmark(result);
        setBenchmarkChecked(true);
        setNegotiationNotes(null);
        toast.success("Pay range found", "Salary evidence is ready");
      } else {
        setBenchmark(null);
        setBenchmarkChecked(true);
        setNegotiationNotes(null);
        toast.info("No pay data yet", "Try a broader role title, role stage, or nearby location.");
      }
    } catch (error: unknown) {
      logError("Failed to get benchmark:", error);
      toast.error("Could not check pay range", getSalaryErrorAction(error));
    } finally {
      setBenchmarkLoading(false);
    }
  }, [jobTitle, location, seniority, toast, yearsExperience]);

  const handleGenerateNotes = useCallback(async () => {
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
      setNotesLoading(true);
      const notes = await invoke<string>("generate_negotiation_script", {
        scenario: "initial_offer",
        params: {
          company: offerReview.company.trim() || "the employer",
          current_offer: formatCurrency(currentOfferAmount),
          job_title: reviewedJobTitle,
          location: location.trim() || benchmark.location,
          target_min: formatCurrency(targetMinAmount),
          target_max: formatCurrency(targetMaxAmount),
          years_experience: yearsExperience.toString(),
        },
      });

      if (hasUnresolvedTemplatePlaceholders(notes)) {
        setNegotiationNotes(null);
        toast.error(
          "Could not draft notes",
          "The note template needs checked facts before it can be shown.",
        );
        return;
      }

      setNegotiationNotes(notes);
      toast.success("Notes drafted", "Negotiation notes are ready");
    } catch (error: unknown) {
      logError("Failed to generate script:", error);
      toast.error("Could not draft notes", getSalaryErrorAction(error));
    } finally {
      setNotesLoading(false);
    }
  }, [
    benchmark,
    currentOfferAmount,
    location,
    negotiationInputMessage,
    offerReview.company,
    reviewedJobTitle,
    targetMaxAmount,
    targetMinAmount,
    toast,
    yearsExperience,
  ]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
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
          <SalarySearchCard
            jobTitle={jobTitle}
            location={location}
            salaryFloor={salaryFloor}
            seniority={seniority}
            yearsExperience={yearsExperience}
            loading={benchmarkLoading}
            onJobTitleChange={(value) => {
              setJobTitle(value);
              clearBenchmarkResult();
            }}
            onLocationChange={(value) => {
              setLocation(value);
              clearBenchmarkResult();
            }}
            onSalaryFloorChange={setSalaryFloor}
            onSeniorityChange={(value) => {
              setSeniority(value);
              setYearsExperience(getRepresentativeYearsForSeniority(value));
              clearBenchmarkResult();
            }}
            onYearsExperienceChange={(value) => {
              setYearsExperience(value);
              setSeniority(getSalarySeniorityForYears(value));
              clearBenchmarkResult();
            }}
            onCheck={() => void handleGetBenchmark()}
          />
          <SalaryEvidenceCard
            benchmark={benchmark}
            benchmarkChecked={benchmarkChecked}
            floorGuidance={floorGuidance}
            sampleQuality={sampleQuality}
            review={offerReview}
            negotiationInputMessage={negotiationInputMessage}
            counterStarter={counterStarter}
            declineStarter={declineStarter}
            canGenerate={canGenerateNotes}
            generating={notesLoading}
            onReviewChange={updateOfferReview}
            onGenerate={() => void handleGenerateNotes()}
          />
          {negotiationNotes && <NegotiationNotesCard notes={negotiationNotes} />}
        </div>
      </main>
    </div>
  );
}
