import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { Badge } from "../components/Badge";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Modal, ModalFooter } from "../components/Modal";
import { useToast } from "../contexts";
import { logError } from "../utils/errorUtils";
import { getScoreColor, getScoreBg } from "../utils/scoreUtils";

// TypeScript Types
interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string | null;
  github: string | null;
  website: string | null;
}

interface Experience {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  achievements: string[];
  current: boolean;
}

interface Education {
  degree: string;
  institution: string;
  location: string;
  graduation_date: string;
  gpa: number | null;
  honors: string[];
}

interface Skill {
  name: string;
  category: string;
  proficiency: string | null;
}

interface AtsResumeData {
  contact_info: ContactInfo;
  summary: string;
  experience: Experience[];
  skills: Skill[];
  education: Education[];
  certifications: string[];
  projects: string[];
  custom_sections: Record<string, string[]>;
}

type KeywordImportance = "Required" | "Preferred" | "Industry";
type IssueSeverity = "Critical" | "Warning" | "Info";
type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "RemoveItem";

interface KeywordMatch {
  keyword: string;
  importance: KeywordImportance;
  found_in: string;
  context: string;
}

interface FormatIssue {
  severity: IssueSeverity;
  issue: string;
  fix: string;
}

interface AtsSuggestion {
  category: SuggestionCategory;
  suggestion: string;
  impact: string;
}

interface AtsAnalysisResult {
  overall_score: number;
  keyword_score: number;
  format_score: number;
  completeness_score: number;
  keyword_matches: KeywordMatch[];
  missing_keywords: string[];
  format_issues: FormatIssue[];
  suggestions: AtsSuggestion[];
}

type Page = "dashboard" | "applications" | "resume" | "resume-builder" | "ats-optimizer" | "salary" | "market" | "automation";

interface ResumeOptimizerProps {
  onBack: () => void;
  onNavigate?: (page: Page) => void;
}

export default function ResumeOptimizer({ onBack, onNavigate }: ResumeOptimizerProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeJson, setResumeJson] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AtsAnalysisResult | null>(null);
  const [powerWords, setPowerWords] = useState<string[]>([]);
  const [showPowerWords, setShowPowerWords] = useState(false);
  const [bulletInput, setBulletInput] = useState("");
  const [improvedBullet, setImprovedBullet] = useState("");
  const [improvingBullet, setImprovingBullet] = useState(false);
  const [showBulletImprover, setShowBulletImprover] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const toast = useToast();

  // Load power words on mount
  const loadPowerWords = useCallback(async () => {
    try {
      const words = await invoke<string[]>("get_ats_power_words");
      setPowerWords(words);
    } catch (err: unknown) {
      logError("Failed to load power words:", err);
    }
  }, []);

  // Analyze resume
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error("Missing input", "Please enter a job description");
      return;
    }

    if (!resumeJson.trim()) {
      toast.error("Missing input", "Please enter your resume data");
      return;
    }

    try {
      setAnalyzing(true);
      const resume: AtsResumeData = JSON.parse(resumeJson);

      const result = await invoke<AtsAnalysisResult>("analyze_resume_for_job", {
        resume,
        jobDescription,
      });

      setAnalysisResult(result);
      toast.success("Analysis complete", `Overall score: ${Math.round(result.overall_score)}%`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Analysis failed", message);
      logError("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Analyze format only
  const handleAnalyzeFormat = async () => {
    if (!resumeJson.trim()) {
      toast.error("Missing input", "Please enter your resume data");
      return;
    }

    try {
      setAnalyzing(true);
      const resume: AtsResumeData = JSON.parse(resumeJson);

      const result = await invoke<AtsAnalysisResult>("analyze_resume_format", {
        resume,
      });

      setAnalysisResult(result);
      toast.success("Format analysis complete", `Format score: ${Math.round(result.format_score)}%`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Analysis failed", message);
      logError("Format analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Improve bullet point
  const handleImproveBullet = async () => {
    if (!bulletInput.trim()) {
      toast.error("Missing input", "Please enter a bullet point to improve");
      return;
    }

    try {
      setImprovingBullet(true);
      const improved = await invoke<string>("improve_bullet_point", {
        bullet: bulletInput,
        jobContext: jobDescription.trim() || null,
      });

      setImprovedBullet(improved);
      toast.success("Bullet improved", "See the improved version below");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Improvement failed", message);
      logError("Bullet improvement error:", err);
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

  // Highlight keywords in text
  const highlightKeywords = (text: string, keywords: string[], type: "match" | "missing"): React.ReactElement => {
    if (!text || keywords.length === 0) {
      return <span>{text}</span>;
    }

    const colorClass = type === "match"
      ? "bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100"
      : "bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100";

    const parts: { text: string; isKeyword: boolean }[] = [];
    let currentIndex = 0;

    // Sort keywords by length (descending) to match longer phrases first
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

  // Get keyword density groups
  const getKeywordDensity = () => {
    if (!analysisResult) return { required: [], preferred: [], industry: [] };

    const required = analysisResult.keyword_matches.filter(k => k.importance === "Required");
    const preferred = analysisResult.keyword_matches.filter(k => k.importance === "Preferred");
    const industry = analysisResult.keyword_matches.filter(k => k.importance === "Industry");

    return { required, preferred, industry };
  };

  // Get opacity based on keyword frequency
  const getKeywordOpacity = (keyword: string): string => {
    if (!analysisResult) return "opacity-100";

    const count = analysisResult.keyword_matches.filter(k =>
      k.keyword.toLowerCase() === keyword.toLowerCase()
    ).length;

    if (count >= 5) return "opacity-100";
    if (count >= 3) return "opacity-75";
    if (count >= 2) return "opacity-60";
    return "opacity-40";
  };

  // Navigate to resume builder with job context
  const handleTailorResume = () => {
    if (!onNavigate) {
      toast.error("Navigation not available", "Cannot navigate to Resume Builder");
      return;
    }

    // Store job description in sessionStorage for resume builder
    sessionStorage.setItem("jobContext", JSON.stringify({
      description: jobDescription,
      timestamp: Date.now(),
    }));

    onNavigate("resume-builder");
    toast.success("Navigating to Resume Builder", "Job context has been saved");
  };

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
                ATS Resume Optimizer
              </h1>
              <p className="text-surface-500 dark:text-surface-400 mt-1">
                Optimize your resume for Applicant Tracking Systems
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
              <CardHeader title="Job Description" />
              <label htmlFor="job-description-input" className="sr-only">Job Description</label>
              <textarea
                id="job-description-input"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none font-mono"
              />
            </Card>

            <Card>
              <CardHeader title="Resume Data (JSON)" />
              <label htmlFor="resume-json-input" className="sr-only">Resume Data in JSON format</label>
              <textarea
                id="resume-json-input"
                value={resumeJson}
                onChange={(e) => setResumeJson(e.target.value)}
                placeholder='{"contact_info": {...}, "summary": "...", "experience": [...], ...}'
                aria-describedby="resume-json-hint"
                className="w-full h-96 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none font-mono"
              />
              <p id="resume-json-hint" className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                Paste your resume as JSON following the AtsResumeData schema
              </p>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleAnalyze} loading={analyzing} className="flex-1">
                Analyze with Job
              </Button>
              <Button onClick={handleAnalyzeFormat} loading={analyzing} variant="secondary" className="flex-1">
                Format Only
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  loadPowerWords();
                  setShowPowerWords(true);
                }}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                View Power Words
              </Button>
              <Button
                onClick={() => setShowBulletImprover(true)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                Improve Bullet Point
              </Button>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {analyzing ? (
              <Card className="flex items-center justify-center py-32">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="mt-4 text-surface-600 dark:text-surface-400">Analyzing resume...</p>
                </div>
              </Card>
            ) : analysisResult ? (
              <>
                {/* Action Buttons */}
                <div className="flex gap-3">
                  {jobDescription.trim() && (
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
                      onClick={handleTailorResume}
                      variant="success"
                      className="flex-1"
                    >
                      Tailor Resume for This Job
                    </Button>
                  )}
                </div>

                {/* Side-by-Side Comparison View */}
                {showComparison && jobDescription.trim() && (
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
                          {highlightKeywords(
                            jobDescription,
                            analysisResult.keyword_matches.map(k => k.keyword),
                            "match"
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
                            [
                              ...analysisResult.keyword_matches.map(k => k.keyword),
                              ...analysisResult.missing_keywords
                            ],
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
                          = Matched keywords
                          <span className="ml-4 bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 px-1 rounded mr-1">Red</span>
                          = Missing keywords
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Keyword Density Heatmap */}
                <Card>
                  <CardHeader title="Keyword Density Heatmap" />
                  {(() => {
                    const { required, preferred, industry } = getKeywordDensity();
                    return (
                      <div className="space-y-4">
                        {/* Required Keywords */}
                        {required.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                              <Badge variant="danger" size="sm">Required</Badge>
                              <span className="text-surface-500 dark:text-surface-400 font-normal">
                                ({required.length} keywords)
                              </span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {required.map((match, idx) => (
                                <div key={idx} className={`group relative ${getKeywordOpacity(match.keyword)}`}>
                                  <Badge
                                    variant="danger"
                                  >
                                    {match.keyword}
                                  </Badge>
                                  <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded whitespace-nowrap z-10">
                                    Found in: {match.found_in}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Preferred Keywords */}
                        {preferred.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                              <Badge variant="alert" size="sm">Preferred</Badge>
                              <span className="text-surface-500 dark:text-surface-400 font-normal">
                                ({preferred.length} keywords)
                              </span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {preferred.map((match, idx) => (
                                <div key={idx} className={`group relative ${getKeywordOpacity(match.keyword)}`}>
                                  <Badge
                                    variant="alert"
                                  >
                                    {match.keyword}
                                  </Badge>
                                  <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded whitespace-nowrap z-10">
                                    Found in: {match.found_in}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Industry Keywords */}
                        {industry.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                              <Badge variant="success" size="sm">Industry</Badge>
                              <span className="text-surface-500 dark:text-surface-400 font-normal">
                                ({industry.length} keywords)
                              </span>
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {industry.map((match, idx) => (
                                <div key={idx} className={`group relative ${getKeywordOpacity(match.keyword)}`}>
                                  <Badge
                                    variant="success"
                                  >
                                    {match.keyword}
                                  </Badge>
                                  <div className="absolute hidden group-hover:block bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded whitespace-nowrap z-10">
                                    Found in: {match.found_in}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-start gap-2 p-3 bg-sentinel-50 dark:bg-sentinel-900/20 rounded-lg text-sm">
                          <svg className="w-5 h-5 text-sentinel-600 dark:text-sentinel-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sentinel-800 dark:text-sentinel-300">
                            Opacity indicates keyword frequency. Darker badges appear more often in your resume. Hover over badges to see where keywords were found.
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </Card>

                {/* Score Overview */}
                <Card>
                  <CardHeader title="ATS Score" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className={`text-5xl font-bold ${getScoreColor(analysisResult.overall_score)}`}>
                        {Math.round(analysisResult.overall_score)}
                      </div>
                      <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Overall Score</p>
                    </div>
                    <div className="space-y-3">
                      <ScoreItem label="Keywords" score={analysisResult.keyword_score} />
                      <ScoreItem label="Format" score={analysisResult.format_score} />
                      <ScoreItem label="Completeness" score={analysisResult.completeness_score} />
                    </div>
                  </div>
                </Card>

                {/* Keyword Matches */}
                {analysisResult.keyword_matches.length > 0 && (
                  <Card>
                    <CardHeader title={`Keyword Matches (${analysisResult.keyword_matches.length})`} />
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
                                Found in: {match.found_in}
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

                {/* Missing Keywords */}
                {analysisResult.missing_keywords.length > 0 && (
                  <Card>
                    <CardHeader title={`Missing Keywords (${analysisResult.missing_keywords.length})`} />
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.missing_keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="danger">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-3">
                      Consider adding these keywords to improve your match score
                    </p>
                  </Card>
                )}

                {/* Format Issues */}
                {analysisResult.format_issues.length > 0 && (
                  <Card>
                    <CardHeader title={`Format Issues (${analysisResult.format_issues.length})`} />
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {analysisResult.format_issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Badge variant={getSeverityVariant(issue.severity)} size="sm">
                              {issue.severity}
                            </Badge>
                            <p className="font-medium text-surface-800 dark:text-surface-200 flex-1">
                              {issue.issue}
                            </p>
                          </div>
                          <p className="text-sm text-surface-600 dark:text-surface-400 bg-sentinel-50 dark:bg-sentinel-900/20 px-2 py-1 rounded">
                            Fix: {issue.fix}
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
                              {suggestion.category}
                            </Badge>
                            <span className="flex-1">{suggestion.suggestion}</span>
                          </summary>
                          <p className="text-sm text-surface-600 dark:text-surface-400 mt-2 pl-2">
                            Impact: {suggestion.impact}
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
                  No analysis yet
                </h3>
                <p className="text-surface-500 dark:text-surface-400">
                  Enter your job description and resume data, then click Analyze
                </p>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Power Words Modal */}
      <Modal
        isOpen={showPowerWords}
        onClose={() => setShowPowerWords(false)}
        title="ATS Power Words"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            These action verbs and keywords are commonly recognized by ATS systems. Use them in your resume to improve parsing.
          </p>
          {powerWords.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto p-2">
              {powerWords.map((word, idx) => (
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
            <Button onClick={() => setShowPowerWords(false)}>Close</Button>
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
        title="Improve Bullet Point"
      >
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Enter a resume bullet point and we'll improve it using ATS-friendly language and power words.
          </p>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Current Bullet Point
            </label>
            <textarea
              value={bulletInput}
              onChange={(e) => setBulletInput(e.target.value)}
              placeholder="e.g., Worked on improving database performance"
              className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none"
              autoFocus
            />
          </div>

          {improvedBullet && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                Improved Version:
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
            <Button onClick={handleImproveBullet} loading={improvingBullet} disabled={!bulletInput.trim()}>
              Improve
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

// Helper component for score items
function ScoreItem({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-600 dark:text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreBg(score)} transition-all duration-300`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300 w-10 text-right">
          {Math.round(score)}%
        </span>
      </div>
    </div>
  );
}
