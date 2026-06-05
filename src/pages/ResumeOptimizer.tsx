import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Modal, ModalFooter } from "../components/Modal";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { JobWordsOverviewCard } from "./ResumeOptimizerJobWordsOverview";
import {
  formatHardConstraintCategory,
  formatHardConstraintNextActionDetail,
  formatIssueSeverity,
  formatRequirementEvidenceSections,
  formatRequirementState,
  formatSuggestionCategory,
  getResumeAnalysisErrorAction,
  getResumeFitEvidenceStatus,
  getSelectedResumeReadableStatus,
  isResumeSummary,
  parseAtsResumeInput,
  type AtsAnalysisResult,
  type HardConstraintRisk,
  type IssueSeverity,
  type KeywordImportance,
  type MissingKeyword,
  type RequirementMatchState,
  type RequirementReview,
  type ResumeNextAction,
  type ResumeSummary,
} from "./resumeOptimizerModel";
import {
  getScoreBg,
  getScoreColor,
  getScoreLabel,
  getScoreProgressPercent,
} from "../utils/scoreUtils";
import { writeStorageValue } from "../utils/browserStorage";

type Page = "dashboard" | "applications" | "resume" | "resume-builder" | "ats-optimizer" | "salary" | "market" | "automation";

interface ResumeOptimizerProps {
  onBack: () => void;
  onNavigate?: (page: Page) => void;
}

async function getActiveResumeSummary(): Promise<ResumeSummary | null> {
  const selected = await invoke<unknown>("get_active_resume");
  return isResumeSummary(selected) ? selected : null;
}

export default function ResumeOptimizer({ onBack, onNavigate }: ResumeOptimizerProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeJson, setResumeJson] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AtsAnalysisResult | null>(null);
  const [actionWords, setActionWords] = useState<string[]>([]);
  const [showActionWords, setShowActionWords] = useState(false);
  const [bulletInput, setBulletInput] = useState("");
  const [improvedBullet, setImprovedBullet] = useState("");
  const [improvingBullet, setImprovingBullet] = useState(false);
  const [showBulletImprover, setShowBulletImprover] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showAdvancedResumeImport, setShowAdvancedResumeImport] = useState(false);
  const [activeResume, setActiveResume] = useState<ResumeSummary | null>(null);
  const [analysisInputSource, setAnalysisInputSource] = useState<"active" | "copied" | null>(null);

  const toast = useToast();
  const fitEvidenceStatus = analysisResult
    ? getResumeFitEvidenceStatus(analysisResult)
    : null;

  useEffect(() => {
    let cancelled = false;

    const loadActiveResume = async () => {
      try {
        const selected = await getActiveResumeSummary();
        if (cancelled || !selected) return;

        setActiveResume(selected);
      } catch (err: unknown) {
        if (!cancelled) {
          logError("Could not load active resume:", err);
        }
      }
    };

    void loadActiveResume();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChooseResume = async () => {
    try {
      const selected = await getActiveResumeSummary();
      if (selected) {
        setActiveResume(selected);
        setAnalysisResult(null);
        setAnalysisInputSource(null);
        setShowComparison(false);
        toast.success("Resume selected", `${selected.name} is ready for job match review.`);
        return;
      }
    } catch (err: unknown) {
      logError("Could not load active resume:", err);
    }

    if (onNavigate) {
      onNavigate("resume");
      return;
    }

    toast.info("Open Resume Match", "Use the Resumes page to choose or add a resume.");
  };

  // Load action words on mount
  const loadActionWords = useCallback(async () => {
    try {
      const words = await invoke<string[]>("get_ats_power_words");
      setActionWords(words);
    } catch (err: unknown) {
      logError("Failed to load action words:", err);
    }
  }, []);

  // Analyze resume
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error("Add job post", "Paste the job post, then review again.");
      return;
    }

    const useCopiedResume = showAdvancedResumeImport && resumeJson.trim().length > 0;

    if (!useCopiedResume && !activeResume) {
      toast.error(
        "Choose a resume first",
        "Choose or add a resume, or use Import from Resume App if you already have an export.",
      );
      return;
    }

    try {
      setAnalyzing(true);
      const result = useCopiedResume
        ? await (() => {
            const resume = parseAtsResumeInput(resumeJson);
            if (!resume) {
              throw new Error("invalid-copied-resume-details");
            }
            return invoke<AtsAnalysisResult>("analyze_resume_for_job", {
              resume,
              jobDescription,
            });
          })()
        : await invoke<AtsAnalysisResult>("analyze_active_resume_for_job", {
            jobDescription,
          });

      setAnalysisResult(result);
      setAnalysisInputSource(useCopiedResume ? "copied" : "active");
      setShowComparison(false);
      toast.success(
        "Review ready",
        "Use the details below as a guide before you apply.",
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "invalid-copied-resume-details") {
        toast.error(
          "Could not read copied resume details",
          "Choose or add a resume instead, or paste copied resume details from JobSentinel or another resume app.",
        );
      } else {
        toast.error("Review could not run", getResumeAnalysisErrorAction(err));
        logError("Analysis error:", err);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Analyze format only
  const handleAnalyzeFormat = async () => {
    if (!resumeJson.trim()) {
      toast.error(
        "Choose a resume first",
        "Choose or add a resume, or use Import from Resume App if you already have an export.",
      );
      return;
    }

    const resume = parseAtsResumeInput(resumeJson);
    if (!resume) {
      toast.error(
        "Could not read copied resume details",
        "Choose or add a resume instead, or paste copied resume details from JobSentinel or another resume app.",
      );
      return;
    }

    try {
      setAnalyzing(true);
      const result = await invoke<AtsAnalysisResult>("analyze_resume_format", {
        resume,
      });

      setAnalysisResult(result);
      toast.success("Format review complete", "Review the format details below.");
    } catch (err: unknown) {
      toast.error("Review could not run", getResumeAnalysisErrorAction(err));
      logError("Format analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Draft a reviewed alternative for a resume bullet.
  const handleImproveBullet = async () => {
    if (!bulletInput.trim()) {
      toast.error("Add a bullet point", "Paste or write one bullet, then draft again.");
      return;
    }

    try {
      setImprovingBullet(true);
      const improved = await invoke<string>("improve_bullet_point", {
        bullet: bulletInput,
        jobContext: jobDescription.trim() || null,
      });

      setImprovedBullet(improved);
      toast.success("Draft ready", "Review the suggested version below");
    } catch (err: unknown) {
      toast.error("Could not draft bullet", getResumeAnalysisErrorAction(err));
      logError("Bullet draft error:", err);
    } finally {
      setImprovingBullet(false);
    }
  };


  // Get severity badge variant
  const getSeverityVariant = (severity: IssueSeverity): "danger" | "alert" | "sentinel" => {
    if (severity === "Critical") return "danger";
    if (severity === "Warning") return "alert";
    return "sentinel";
  };

  // Get importance badge variant
  const getImportanceVariant = (importance: KeywordImportance): "danger" | "alert" | "success" => {
    if (importance === "Required") return "danger";
    if (importance === "Preferred") return "alert";
    return "success";
  };

  // Highlight job-post words in text.
  const highlightKeywords = (text: string, keywords: string[], type: "match" | "missing"): React.ReactElement => {
    if (!text || keywords.length === 0) {
      return <span>{text}</span>;
    }

    const colorClass = type === "match"
      ? "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
      : "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100";

    const parts: { text: string; isKeyword: boolean }[] = [];
    let currentIndex = 0;

    // Sort by length so longer phrases win before shorter overlapping words.
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);

    // Simple regex-based highlighting
    const regex = new RegExp(`\\b(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    const matches = Array.from(text.matchAll(regex));

    if (matches.length === 0) {
      return <span>{text}</span>;
    }

    matches.forEach((match) => {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > currentIndex) {
        parts.push({ text: text.slice(currentIndex, matchStart), isKeyword: false });
      }
      parts.push({ text: match[0], isKeyword: true });
      currentIndex = matchEnd;
    });

    if (currentIndex < text.length) {
      parts.push({ text: text.slice(currentIndex), isKeyword: false });
    }

    return (
      <>
        {parts.map((part, idx) =>
          part.isKeyword ? (
            <span key={idx} className={`${colorClass} px-1 rounded`}>
              {part.text}
            </span>
          ) : (
            <span key={idx}>{part.text}</span>
          )
        )}
      </>
    );
  };

  const highlightKeywordGroups = (
    text: string,
    matchedKeywords: string[],
    missingKeywords: string[],
  ): React.ReactElement => {
    const keywordTypes = new Map<string, "match" | "missing">();
    for (const keyword of matchedKeywords) {
      keywordTypes.set(keyword.toLowerCase(), "match");
    }
    for (const keyword of missingKeywords) {
      keywordTypes.set(keyword.toLowerCase(), "missing");
    }

    const sortedKeywords = [...keywordTypes.keys()].sort((a, b) => b.length - a.length);
    if (!text || sortedKeywords.length === 0) {
      return <span>{text}</span>;
    }

    const regex = new RegExp(`\\b(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    const parts: { text: string; type: "plain" | "match" | "missing" }[] = [];
    let currentIndex = 0;

    for (const match of Array.from(text.matchAll(regex))) {
      const matchStart = match.index!;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > currentIndex) {
        parts.push({ text: text.slice(currentIndex, matchStart), type: "plain" });
      }

      parts.push({
        text: match[0],
        type: keywordTypes.get(match[0].toLowerCase()) ?? "match",
      });
      currentIndex = matchEnd;
    }

    if (currentIndex < text.length) {
      parts.push({ text: text.slice(currentIndex), type: "plain" });
    }

    return (
      <>
        {parts.map((part, idx) => {
          if (part.type === "plain") return <span key={idx}>{part.text}</span>;
          const colorClass = part.type === "match"
            ? "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
            : "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100";
          return (
            <span key={idx} className={`${colorClass} px-1 rounded`}>
              {part.text}
            </span>
          );
        })}
      </>
    );
  };

  // Keep missing job-post words grouped so required items do not blur into nice-to-haves.
  const getMissingKeywordDetails = (): MissingKeyword[] => {
    if (!analysisResult) return [];

    if (
      analysisResult.missing_keyword_details &&
      analysisResult.missing_keyword_details.length > 0
    ) {
      return analysisResult.missing_keyword_details;
    }

    return analysisResult.missing_keywords.map((keyword) => ({
      keyword,
      importance: "Industry",
    }));
  };

  const getMissingKeywordGroups = () => {
    const missing = getMissingKeywordDetails();
    return {
      required: missing.filter((gap) => gap.importance === "Required"),
      preferred: missing.filter((gap) => gap.importance === "Preferred"),
      other: missing.filter((gap) => gap.importance === "Industry"),
    };
  };

  const getRequirementReviews = (): RequirementReview[] =>
    analysisResult?.requirement_reviews ?? [];

  const getHardConstraintRisks = (): HardConstraintRisk[] =>
    analysisResult?.hard_constraint_risks ?? [];

  const getRequirementStateVariant = (
    state: RequirementMatchState,
  ): "success" | "sentinel" | "alert" | "danger" | "surface" => {
    if (state === "Strong") return "success";
    if (state === "Direct") return "sentinel";
    if (state === "Partial" || state === "Implied") return "alert";
    if (state === "Missing") return "danger";
    return "surface";
  };

  const getResumeNextActions = (): ResumeNextAction[] => {
    if (!analysisResult) return [];

    const actions: ResumeNextAction[] = [];
    const thinJobPostIssue = analysisResult.format_issues.find((issue) => {
      const issueText = issue.issue.toLowerCase();
      const fixText = issue.fix.toLowerCase();
      return (
        issueText.includes("not enough job-post detail") ||
        fixText.includes("paste a fuller job post")
      );
    });
    const hardRisks = getHardConstraintRisks();
    const reviews = getRequirementReviews();

    for (const risk of hardRisks.slice(0, 2)) {
      actions.push({
        title: `Check ${risk.requirement} before tailoring`,
        detail: formatHardConstraintNextActionDetail(risk.category),
        variant: "danger",
        label: "Check first",
      });
    }

    const missingRequired = reviews.filter(
      (review) =>
        review.importance === "Required" &&
        review.match_state === "Missing" &&
        !review.hard_constraint,
    );
    for (const review of missingRequired.slice(0, 2)) {
      actions.push({
        title: `Review required evidence for ${review.keyword}`,
        detail: "Only add it if it is true and you can explain it from real work, training, or credentials.",
        variant: "alert",
        label: "Review",
      });
    }

    const partialRequired = reviews.filter(
      (review) =>
        review.importance === "Required" &&
        (review.match_state === "Partial" || review.match_state === "Implied"),
    );
    for (const review of partialRequired.slice(0, 2)) {
      actions.push({
        title: `Add supporting evidence for ${review.keyword} only if true`,
        detail: "A skills list is weaker than a role, project, credential, or outcome that shows how you used it.",
        variant: "alert",
        label: "Needs support",
      });
    }

    const visibleRequired = reviews.find(
      (review) =>
        review.importance === "Required" &&
        (review.match_state === "Direct" || review.match_state === "Strong"),
    );
    if (visibleRequired) {
      actions.push({
        title: `Keep ${visibleRequired.keyword} visible`,
        detail: "This is useful evidence. Keep it easy to find near the role, project, or credential where it is true.",
        variant: "success",
        label: "Useful evidence",
      });
    }

    if (actions.length === 0 && analysisResult.keyword_matches.length > 0) {
      actions.push({
        title: "Tailor carefully from real evidence",
        detail: "Use the matching words below to decide what deserves a clearer bullet or stronger placement.",
        variant: "sentinel",
        label: "Next step",
      });
    }

    if (actions.length === 0 && thinJobPostIssue) {
      actions.push({
        title: "Paste fuller job post",
        detail: thinJobPostIssue.fix,
        variant: "alert",
        label: "Add detail",
      });
    }

    if (actions.length === 0 && analysisResult.format_issues.length > 0) {
      actions.push({
        title: "Fix readability details first",
        detail: "A clear resume is easier for people and application systems to read before any job-specific edits.",
        variant: "alert",
        label: "Fix first",
      });
    }

    return actions.slice(0, 5);
  };

  // Send the saved job post to Resume Builder.
  const handleReviewInResumeBuilder = () => {
    if (!onNavigate) {
      toast.error(
        "Could not open Resume Builder",
        "Open Resume Builder from the sidebar, then paste this job post."
      );
      return;
    }

    const saved = writeStorageValue("session", "jobContext", JSON.stringify({
      description: jobDescription,
      timestamp: Date.now(),
    }));
    if (!saved) {
      toast.error(
        "Could not open Resume Builder with this job",
        "Copy the job post and paste it in Resume Builder instead."
      );
      return;
    }

    onNavigate("resume-builder");
    toast.success("Opening Resume Builder", "This job post is ready there.");
  };

  const canShowComparison =
    analysisInputSource === "copied" && Boolean(jobDescription.trim()) && Boolean(resumeJson.trim());

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 shadow-soft">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5 text-surface-600 dark:text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="font-display text-display-lg text-surface-900 dark:text-white">
                Resume Match Helper
              </h1>
              <p className="text-surface-500 dark:text-surface-400 mt-1">
                Check how your resume lines up with a job post before you apply
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            <Card>
              <CardHeader title="Job Post" />
              <label htmlFor="job-description-input" className="sr-only">Job Post</label>
              <textarea
                id="job-description-input"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job post here..."
                className="w-full h-64 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus-visible:ring-sentinel-400 resize-none font-mono"
              />
            </Card>

            <Card>
              <CardHeader title="Resume" />
              <div className="space-y-4">
                <p className="text-sm text-surface-600 dark:text-surface-300">
                  Choose a saved resume or add one. That is the easiest way
                  to compare your resume with a job post.
                </p>
                {activeResume && (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-surface-700 dark:text-surface-200">
                    <p>
                      <span className="font-medium">Selected resume:</span> {activeResume.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {activeResume.format_label && (
                        <Badge variant="surface" size="sm">
                          {activeResume.format_label}
                        </Badge>
                      )}
                      <span className="text-xs text-surface-600 dark:text-surface-300">
                        {getSelectedResumeReadableStatus(activeResume)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleChooseResume}
                    className="flex-1"
                  >
                    Choose or Add Resume
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    aria-expanded={showAdvancedResumeImport}
                    aria-controls="resume-app-import-panel"
                    onClick={() => setShowAdvancedResumeImport((current) => !current)}
                  >
                    Import from Resume App
                  </Button>
                </div>

                {showAdvancedResumeImport && (
                  <div id="resume-app-import-panel" className="pt-4 border-t border-surface-200 dark:border-surface-700">
                    <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3">
                      Import from Resume App
                    </h2>
                    <label htmlFor="resume-json-input" className="sr-only">Copied resume details</label>
                    <textarea
                      id="resume-json-input"
                      value={resumeJson}
                      onChange={(e) => setResumeJson(e.target.value)}
                      placeholder="Paste copied resume details here"
                      aria-describedby="resume-json-hint"
                      className="w-full h-96 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus-visible:ring-sentinel-400 resize-none font-mono"
                    />
                    <p id="resume-json-hint" className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                      Use this only if a resume app gave you details to copy. Most
                      users should choose or add a resume.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleAnalyze} loading={analyzing} className="flex-1">
                Review Match
              </Button>
              {showAdvancedResumeImport && (
                <Button onClick={handleAnalyzeFormat} loading={analyzing} variant="secondary" className="flex-1">
                  Review Format Only
                </Button>
              )}
            </div>

            {showAdvancedResumeImport && (
              <div className="flex gap-3">
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Copied resume details are used only for this local review.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  loadActionWords();
                  setShowActionWords(true);
                }}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                View Action Words
              </Button>
              <Button
                onClick={() => setShowBulletImprover(true)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                Draft Alternative Bullet
              </Button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {analyzing ? (
              <Card className="flex items-center justify-center py-32">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-surface-600 dark:text-surface-400">Reviewing resume...</p>
                </div>
              </Card>
            ) : analysisResult ? (
              <>
                {/* Action Buttons */}
                <div className="flex gap-3">
                  {canShowComparison && (
                    <Button
                      onClick={() => setShowComparison(!showComparison)}
                      variant={showComparison ? "primary" : "secondary"}
                      className="flex-1"
                    >
                      {showComparison ? "Hide Comparison" : "Show Comparison"}
                    </Button>
                  )}
                  {onNavigate && (
                    <Button
                      onClick={handleReviewInResumeBuilder}
                      variant="success"
                      className="flex-1"
                    >
                      Review in Resume Builder
                    </Button>
                  )}
                </div>

                {/* Side-by-Side Comparison View */}
                {showComparison && canShowComparison && (
                  <Card>
                    <CardHeader title="Resume-Job Comparison" />
                    <div className="grid grid-cols-2 gap-4">
                      {/* Job Requirements */}
                      <div className="border-r border-surface-200 dark:border-surface-700 pr-4">
                        <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-sentinel-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Job Requirements
                        </h3>
                        <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 max-h-96 overflow-y-auto text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap font-mono">
                          {highlightKeywordGroups(
                            jobDescription,
                            analysisResult.keyword_matches.map(k => k.keyword),
                            getMissingKeywordDetails().map(k => k.keyword)
                          )}
                        </div>
                      </div>

                      {/* Resume Content */}
                      <div className="pl-4">
                        <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Your Resume
                        </h3>
                        <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 max-h-96 overflow-y-auto text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap font-mono">
                          {highlightKeywords(
                            resumeJson,
                            analysisResult.keyword_matches.map(k => k.keyword),
                            "match"
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start gap-2 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm">
                        <p className="text-sentinel-800 dark:text-sentinel-300">
                          <span className="bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100 px-1 rounded mr-1">Green</span>
                          = Words found in both
                          <span className="ml-4 bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 px-1 rounded mr-1">Red</span>
                          = Words to review
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                <JobWordsOverviewCard
                  keywordMatches={analysisResult.keyword_matches}
                  formatEvidenceSections={formatRequirementEvidenceSections}
                />

                {/* Fit overview */}
                <Card>
                  <CardHeader title="Resume Fit" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(analysisResult.overall_score)}`}>
                        {getScoreLabel(analysisResult.overall_score)}
                      </div>
                      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Overall fit</p>
                    </div>
                    <div className="space-y-3">
                      <ScoreItem label="Job words" score={analysisResult.keyword_score} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">
                    Local evidence review, not a hiring prediction or a promise about employer systems.
                  </p>
                  {fitEvidenceStatus && (
                    <div className="mt-4 rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm dark:border-surface-700 dark:bg-surface-800/70">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-medium text-surface-800 dark:text-surface-100">
                          Evidence status
                        </span>
                        <Badge variant={fitEvidenceStatus.variant} size="sm">
                          {fitEvidenceStatus.label}
                        </Badge>
                      </div>
                      <p className="text-surface-600 dark:text-surface-300">
                        {fitEvidenceStatus.detail}
                      </p>
                    </div>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Resume Quality" />
                  <div className="space-y-3">
                    <ScoreItem label="Readable format" score={analysisResult.format_score} />
                    <ScoreItem label="Details included" score={analysisResult.completeness_score} />
                  </div>
                </Card>

                {getResumeNextActions().length > 0 && (
                  <Card>
                    <CardHeader title="What To Do Next" />
                    <div className="space-y-3">
                      {getResumeNextActions().map((action, idx) => (
                        <div
                          key={`${action.title}-${idx}`}
                          className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                        >
                          <div className="flex flex-wrap items-start gap-2 mb-2">
                            <Badge variant={action.variant} size="sm">
                              {action.label}
                            </Badge>
                            <p className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-48">
                              {action.title}
                            </p>
                          </div>
                          <p className="text-sm text-surface-700 dark:text-surface-300">
                            {action.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {getHardConstraintRisks().length > 0 && (
                  <Card>
                    <CardHeader title={`Hard Requirements To Check (${getHardConstraintRisks().length})`} />
                    <div className="space-y-3">
                      {getHardConstraintRisks().map((risk, idx) => (
                        <div
                          key={`${risk.requirement}-${idx}`}
                          className="p-3 bg-danger/5 dark:bg-danger/10 rounded-lg border border-danger/20"
                        >
                          <div className="flex flex-wrap items-start gap-2 mb-2">
                            <Badge variant="danger" size="sm">Check first</Badge>
                            <Badge variant="surface" size="sm">
                              {formatHardConstraintCategory(risk.category)}
                            </Badge>
                            <p className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-48">
                              {risk.requirement}
                            </p>
                          </div>
                          <p className="text-sm text-surface-700 dark:text-surface-300">
                            {risk.action}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                            Fit label is limited until this is confirmed.
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {getRequirementReviews().length > 0 && (
                  <Card>
                    <CardHeader title={`Requirement Review (${getRequirementReviews().length})`} />
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getRequirementReviews().map((review, idx) => (
                        <div
                          key={`${review.keyword}-${idx}`}
                          className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                        >
                          <div className="flex flex-wrap items-start gap-2">
                            <Badge variant={getRequirementStateVariant(review.match_state)} size="sm">
                              {formatRequirementState(review.match_state)}
                            </Badge>
                            <Badge variant={getImportanceVariant(review.importance)} size="sm">
                              {review.importance}
                            </Badge>
                            {review.hard_constraint && (
                              <Badge variant="danger" size="sm">Hard requirement</Badge>
                            )}
                            <p className="font-medium text-surface-900 dark:text-surface-100 flex-1 min-w-48">
                              {review.keyword}
                            </p>
                          </div>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                            {review.evidence_sections.length > 0
                              ? `Found in: ${formatRequirementEvidenceSections(review.evidence_sections)}`
                              : "No clear resume evidence found"}
                          </p>
                          <p className="text-sm text-surface-700 dark:text-surface-300 mt-2">
                            {review.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Words found */}
                {analysisResult.keyword_matches.length > 0 && (
                  <Card>
                    <CardHeader title={`Words Found (${analysisResult.keyword_matches.length})`} />
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {analysisResult.keyword_matches.map((match, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-surface-800 dark:text-surface-200 truncate">
                                {match.keyword}
                              </p>
                              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                                Found in: {formatRequirementEvidenceSections(match.found_in)}
                              </p>
                            </div>
                            <Badge variant={getImportanceVariant(match.importance)} size="sm">
                              {match.importance}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Words to review */}
                {getMissingKeywordDetails().length > 0 && (
                  <Card>
                    <CardHeader title={`Words To Review (${getMissingKeywordDetails().length})`} />
                    {(() => {
                      const { required, preferred, other } = getMissingKeywordGroups();
                      return (
                        <div className="space-y-4">
                          {required.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-danger mb-2">
                                Required to Review
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {required.map((gap, idx) => (
                                  <Badge key={idx} variant="danger">
                                    {gap.keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {preferred.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-alert-700 dark:text-alert-400 mb-2">
                                Preferred to Review
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {preferred.map((gap, idx) => (
                                  <Badge key={idx} variant="alert">
                                    {gap.keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {other.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-2">
                                Nice-to-Have or Other to Review
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {other.map((gap, idx) => (
                                  <Badge key={idx} variant="surface">
                                    {gap.keyword}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                            <p>Start with required job-post language. Preferred words can help later.</p>
                            <p>Only use these words when they honestly fit your experience and improve clarity.</p>
                            <p>Do not force words you cannot support with real work, training, or credentials.</p>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>
                )}

                {/* Details to check */}
                {analysisResult.format_issues.length > 0 && (
                  <Card>
                    <CardHeader title={`Details to Check (${analysisResult.format_issues.length})`} />
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {analysisResult.format_issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Badge variant={getSeverityVariant(issue.severity)} size="sm">
                              {formatIssueSeverity(issue.severity)}
                            </Badge>
                            <p className="font-medium text-surface-800 dark:text-surface-200 flex-1">
                              {issue.issue}
                            </p>
                          </div>
                          <p className="text-sm text-surface-600 dark:text-surface-400 bg-sentinel-50 dark:bg-sentinel-900/20 px-2 py-1 rounded">
                            Possible edit to review: {issue.fix}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Suggestions */}
                {analysisResult.suggestions.length > 0 && (
                  <Card>
                    <CardHeader title={`Suggestions (${analysisResult.suggestions.length})`} />
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {analysisResult.suggestions.map((suggestion, idx) => (
                        <details
                          key={idx}
                          className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                        >
                          <summary className="cursor-pointer font-medium text-surface-800 dark:text-surface-200 flex items-center gap-2">
                            <Badge variant="sentinel" size="sm">
                              {formatSuggestionCategory(suggestion.category)}
                            </Badge>
                            <span className="flex-1">{suggestion.suggestion}</span>
                          </summary>
                          <p className="text-sm text-surface-600 dark:text-surface-400 mt-2 pl-2">
                            Why it helps: {suggestion.impact}
                          </p>
                        </details>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="text-center py-32">
                <div className="w-16 h-16 bg-sentinel-50 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-sentinel-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-display text-display-md text-surface-900 dark:text-white mb-2">
                  No review yet
                </h3>
                <p className="text-surface-500 dark:text-surface-400">
                  Choose or add a resume, paste a job post, then review the match
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Action Words Modal */}
      <Modal
        isOpen={showActionWords}
        onClose={() => setShowActionWords(false)}
        title="Action Words for Clarity"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            These action verbs can make bullet points easier to scan. Use only words that honestly fit your experience.
          </p>
          {actionWords.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-2">
              {actionWords.map((word, idx) => (
                <Badge key={idx} variant="sentinel" size="sm">
                  {word}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <LoadingSpinner />
            </div>
          )}
          <ModalFooter>
            <Button onClick={() => setShowActionWords(false)}>Close</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Bullet Point Improver Modal */}
      <Modal
        isOpen={showBulletImprover}
        onClose={() => {
          setShowBulletImprover(false);
          setBulletInput("");
          setImprovedBullet("");
        }}
        title="Draft Alternative Bullet"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Enter a resume bullet point and we'll draft clearer, job-aligned language for you to review.
          </p>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Current Bullet Point
            </label>
            <textarea
              value={bulletInput}
              onChange={(e) => setBulletInput(e.target.value)}
              placeholder="e.g., Helped reduce missed appointments by 20%"
              className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus-visible:ring-1 focus-visible:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus-visible:ring-sentinel-400 resize-none"
              autoFocus
            />
          </div>

          {improvedBullet && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                Suggested Version:
              </p>
              <p className="text-sm text-green-700 dark:text-green-400">
                {improvedBullet}
              </p>
            </div>
          )}

          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowBulletImprover(false);
                setBulletInput("");
                setImprovedBullet("");
              }}
            >
              Close
            </Button>
            <Button onClick={handleImproveBullet} loading={improvingBullet}>
              Draft
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

// Helper component for fit evidence items.
function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-600 dark:text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(score)} transition-all duration-300`}
            style={{ width: `${getScoreProgressPercent(score)}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300 w-28 text-right">
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}
