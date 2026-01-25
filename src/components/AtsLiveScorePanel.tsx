/**
 * AtsLiveScorePanel - Real-time ATS score visualization for Resume Builder
 *
 * Shows live ATS scoring feedback as users build their resume, with detailed
 * breakdowns for keyword matching, format compliance, and completeness.
 *
 * @version 2.5.5
 */

import { memo, useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Badge, Modal, ModalFooter, Tooltip } from ".";
import { logError } from "../utils/errorUtils";
import { getScoreColor, getScoreBg, getScoreLabel } from "../utils/scoreUtils";

// Full ATS analysis result from backend
export interface AtsAnalysisResult {
  overall_score: number;
  keyword_score: number;
  format_score: number;
  completeness_score: number;
  keyword_matches: KeywordMatch[];
  missing_keywords: string[];
  format_issues: FormatIssue[];
  suggestions: AtsSuggestion[];
}

interface KeywordMatch {
  keyword: string;
  importance: "Required" | "Preferred" | "Industry";
  found_in: string;
  context: string;
}

interface FormatIssue {
  severity: "Critical" | "Warning" | "Info";
  issue: string;
  fix: string;
}

interface AtsSuggestion {
  category: "AddKeyword" | "RewordBullet" | "AddSection" | "RemoveItem";
  suggestion: string;
  impact: string;
}

// Resume data structure for analysis
interface ContactInfo {
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  website: string | null;
}

interface Experience {
  id: number;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  achievements: string[];
}

interface Education {
  id: number;
  degree: string;
  institution: string;
  location: string | null;
  graduation_date: string | null;
  gpa: string | null;
  honors: string[];
}

interface SkillEntry {
  name: string;
  category: string;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert" | null;
}

interface ResumeData {
  contact: ContactInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillEntry[];
}

interface AtsLiveScorePanelProps {
  resumeData: ResumeData | null;
  currentStep: number;
  debounceMs?: number;
  showFullAnalysis?: boolean;
}


// Step tips lookup (better performance than switch)
const STEP_TIPS: Record<number, string[]> = {
  1: [ // Contact
    "Include a professional email address",
    "Add LinkedIn profile for tech roles",
    "Use a location that matches job requirements",
  ],
  2: [ // Summary
    "Keep summary to 2-3 sentences",
    "Include your years of experience",
    "Mention your specialization or expertise",
  ],
  3: [ // Experience
    "Use action verbs to start bullet points",
    "Include quantifiable achievements",
    "Focus on impact, not just duties",
  ],
  4: [ // Education
    "Include degree, institution, and graduation date",
    "Add relevant coursework for junior roles",
    "List honors and achievements",
  ],
  5: [ // Skills
    "Match skills to job requirements",
    "Group skills by category",
    "Include both technical and soft skills",
  ],
};

// Quick tips based on current step
const getStepTips = (step: number, analysis: AtsAnalysisResult | null): string[] => {
  if (!analysis) {
    return STEP_TIPS[step] ?? [];
  }

  const tips: string[] = [];

  // Tips based on analysis
  if (analysis.format_score < 70) {
    tips.push("Fix format issues to improve ATS parsing");
  }
  if (analysis.completeness_score < 70) {
    tips.push("Add more details to improve completeness");
  }
  if (analysis.missing_keywords.length > 3) {
    tips.push(`Add missing keywords: ${analysis.missing_keywords.slice(0, 3).join(", ")}`);
  }
  if (analysis.format_issues.some(i => i.severity === "Critical")) {
    tips.push("Address critical format issues first");
  }

  return tips.slice(0, 3);
};

export const AtsLiveScorePanel = memo(function AtsLiveScorePanel({
  resumeData,
  currentStep,
  debounceMs = 1000,
  showFullAnalysis = true,
}: AtsLiveScorePanelProps) {
  const [analysis, setAnalysis] = useState<AtsAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [jobDescription, setJobDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Load job context from sessionStorage (set by ATS Optimizer)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("jobContext");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only use if less than 24 hours old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setJobDescription(parsed.description);
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  // Convert ResumeData to the format expected by backend
  const convertToAtsFormat = useCallback((data: ResumeData) => {
    return {
      contact_info: {
        name: data.contact.name,
        email: data.contact.email,
        phone: data.contact.phone || "",
        location: data.contact.location || "",
        linkedin: data.contact.linkedin,
        github: data.contact.github,
        website: data.contact.website,
      },
      summary: data.summary,
      experience: data.experience.map((exp) => ({
        title: exp.title,
        company: exp.company,
        location: exp.location || "",
        start_date: exp.start_date,
        end_date: exp.end_date || "Present",
        achievements: exp.achievements,
        current: !exp.end_date,
      })),
      education: data.education.map((edu) => ({
        degree: edu.degree,
        institution: edu.institution,
        location: edu.location || "",
        graduation_date: edu.graduation_date || "",
        gpa: edu.gpa ? parseFloat(edu.gpa) : null,
        honors: edu.honors,
      })),
      skills: data.skills.map((skill) => ({
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
      })),
      certifications: [],
      projects: [],
      custom_sections: {},
    };
  }, []);

  // Analyze resume with debouncing
  useEffect(() => {
    if (!resumeData) {
      setAnalysis(null);
      return;
    }

    // Check minimum data requirements
    if (!resumeData.contact.name || !resumeData.contact.email) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setAnalyzing(true);
        setError(null);

        const atsData = convertToAtsFormat(resumeData);

        let result: AtsAnalysisResult;
        if (jobDescription) {
          // Full analysis with job context
          result = await invoke<AtsAnalysisResult>("analyze_resume_for_job", {
            resume: atsData,
            jobDescription,
          });
        } else {
          // Format-only analysis
          result = await invoke<AtsAnalysisResult>("analyze_resume_format", {
            resume: atsData,
          });
        }

        setAnalysis(result);
      } catch (err) {
        logError("ATS analysis error:", err);
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setAnalyzing(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [resumeData, jobDescription, debounceMs, convertToAtsFormat, retryTrigger]);

  // Memoize tips
  const tips = useMemo(() => getStepTips(currentStep, analysis), [currentStep, analysis]);

  // Calculate ring progress
  const ringProgress = analysis ? 2 * Math.PI * 32 * (1 - analysis.overall_score / 100) : 2 * Math.PI * 32;

  return (
    <div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-sentinel-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ATS Score
            {analyzing && (
              <span className="text-xs text-surface-400 animate-pulse">analyzing...</span>
            )}
          </h3>
          {jobDescription && (
            <Tooltip content="Analyzing against saved job description" position="left">
              <Badge variant="sentinel" size="sm">Job Context</Badge>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Score Display */}
      <div className="p-4">
        {error ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="ghost" onClick={() => setError(null)}>
                Dismiss
              </Button>
              <Button size="sm" onClick={() => { setError(null); setRetryTrigger((n) => n + 1); }}>
                Retry
              </Button>
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Circular Score */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-surface-200 dark:text-surface-700"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={ringProgress}
                    className={getScoreBg(analysis.overall_score).replace("bg-", "text-")}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                    {Math.round(analysis.overall_score)}
                  </span>
                  <span className="text-[10px] text-surface-500 dark:text-surface-400">
                    {getScoreLabel(analysis.overall_score)}
                  </span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="flex-1 space-y-2">
                <ScoreBar label="Keywords" score={analysis.keyword_score} />
                <ScoreBar label="Format" score={analysis.format_score} />
                <ScoreBar label="Complete" score={analysis.completeness_score} />
              </div>
            </div>

            {/* Quick Stats */}
            {(analysis.keyword_matches.length > 0 || analysis.missing_keywords.length > 0 || analysis.format_issues.length > 0) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {analysis.keyword_matches.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                    {analysis.keyword_matches.length} keywords matched
                  </span>
                )}
                {analysis.missing_keywords.length > 0 && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                    {analysis.missing_keywords.length} missing
                  </span>
                )}
                {analysis.format_issues.length > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                    {analysis.format_issues.length} issues
                  </span>
                )}
              </div>
            )}

            {/* View Details Button */}
            {showFullAnalysis && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => setShowDetailModal(true)}
              >
                View Full Analysis
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Fill in your resume to see ATS score
            </p>
          </div>
        )}
      </div>

      {/* Tips Section */}
      {tips.length > 0 && (
        <div className="px-4 py-3 bg-surface-50 dark:bg-surface-900/50 border-t border-surface-200 dark:border-surface-700">
          <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-2">
            Quick Tips
          </p>
          <ul className="space-y-1">
            {tips.map((tip, idx) => (
              <li key={idx} className="text-xs text-surface-600 dark:text-surface-400 flex items-start gap-1.5">
                <span className="text-sentinel-500 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Full ATS Analysis"
        size="lg"
      >
        {analysis && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Score Overview */}
            <div className="grid grid-cols-4 gap-4">
              <ScoreCard label="Overall" score={analysis.overall_score} />
              <ScoreCard label="Keywords" score={analysis.keyword_score} />
              <ScoreCard label="Format" score={analysis.format_score} />
              <ScoreCard label="Completeness" score={analysis.completeness_score} />
            </div>

            {/* Keyword Matches */}
            {analysis.keyword_matches.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">
                  Keyword Matches ({analysis.keyword_matches.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.keyword_matches.map((match, idx) => (
                    <Tooltip key={idx} content={`Found in: ${match.found_in}`} position="top">
                      <Badge
                        variant={
                          match.importance === "Required"
                            ? "danger"
                            : match.importance === "Preferred"
                            ? "alert"
                            : "success"
                        }
                        size="sm"
                      >
                        {match.keyword}
                      </Badge>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Keywords */}
            {analysis.missing_keywords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">
                  Missing Keywords ({analysis.missing_keywords.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.missing_keywords.map((keyword, idx) => (
                    <Badge key={idx} variant="danger" size="sm">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-2">
                  Consider adding these keywords to improve your match score
                </p>
              </div>
            )}

            {/* Format Issues */}
            {analysis.format_issues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">
                  Format Issues ({analysis.format_issues.length})
                </h4>
                <div className="space-y-2">
                  {analysis.format_issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                    >
                      <div className="flex items-start gap-2">
                        <Badge
                          variant={
                            issue.severity === "Critical"
                              ? "danger"
                              : issue.severity === "Warning"
                              ? "alert"
                              : "sentinel"
                          }
                          size="sm"
                        >
                          {issue.severity}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm text-surface-800 dark:text-surface-200">{issue.issue}</p>
                          <p className="text-xs text-sentinel-600 dark:text-sentinel-400 mt-1">
                            Fix: {issue.fix}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">
                  Suggestions ({analysis.suggestions.length})
                </h4>
                <div className="space-y-2">
                  {analysis.suggestions.map((suggestion, idx) => (
                    <details
                      key={idx}
                      className="p-3 bg-surface-50 dark:bg-surface-700 rounded-lg border border-surface-200 dark:border-surface-600"
                    >
                      <summary className="cursor-pointer text-sm font-medium text-surface-800 dark:text-surface-200 flex items-center gap-2">
                        <Badge variant="sentinel" size="sm">{suggestion.category}</Badge>
                        {suggestion.suggestion}
                      </summary>
                      <p className="text-xs text-surface-600 dark:text-surface-400 mt-2 ml-6">
                        Impact: {suggestion.impact}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button onClick={() => setShowDetailModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
});

// Helper component for score bars
const ScoreBar = memo(function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-surface-600 dark:text-surface-400 w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getScoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-surface-700 dark:text-surface-300 w-8 text-right">
        {Math.round(score)}
      </span>
    </div>
  );
});

// Helper component for score cards in modal
const ScoreCard = memo(function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="text-center p-3 bg-surface-50 dark:bg-surface-700 rounded-lg">
      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
        {Math.round(score)}
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{label}</p>
    </div>
  );
});

export default AtsLiveScorePanel;
