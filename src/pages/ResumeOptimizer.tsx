import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Button,
  Card,
  CardHeader,
  Badge,
  LoadingSpinner,
  Modal,
  ModalFooter,
} from "../components";
import { useToast } from "../contexts";

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

interface ResumeOptimizerProps {
  onBack: () => void;
}

export default function ResumeOptimizer({ onBack }: ResumeOptimizerProps) {
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

  const toast = useToast();

  // Load power words on mount
  const loadPowerWords = useCallback(async () => {
    try {
      const words = await invoke<string[]>("get_ats_power_words");
      setPowerWords(words);
    } catch (err) {
      console.error("Failed to load power words:", err);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Analysis failed", message);
      console.error("Analysis error:", err);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Analysis failed", message);
      console.error("Format analysis error:", err);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Improvement failed", message);
      console.error("Bullet improvement error:", err);
    } finally {
      setImprovingBullet(false);
    }
  };

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
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
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none font-mono"
              />
            </Card>

            <Card>
              <CardHeader title="Resume Data (JSON)" />
              <textarea
                value={resumeJson}
                onChange={(e) => setResumeJson(e.target.value)}
                placeholder='{"contact_info": {...}, "summary": "...", "experience": [...], ...}'
                className="w-full h-96 px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:border-sentinel-500 focus:ring-1 focus:ring-sentinel-500 dark:focus:border-sentinel-400 dark:focus:ring-sentinel-400 resize-none font-mono"
              />
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
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
  const getScoreColor = (s: number): string => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-600 dark:text-surface-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getScoreColor(score)} transition-all duration-300`}
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
