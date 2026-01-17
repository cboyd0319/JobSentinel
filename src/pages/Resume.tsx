import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button, Card, Badge, LoadingSpinner, ScoreDisplay } from "../components";
import { useToast } from "../contexts";
import { logError, getErrorMessage } from "../utils/errorUtils";

interface ResumeData {
  id: number;
  name: string;
  file_path: string;
  is_active: boolean;
  parsed_at: string;
  raw_text: string;
}

interface UserSkill {
  name: string;
  proficiency: string;
  years_experience: number | null;
}

interface MatchResult {
  id: number;
  resume_id: number;
  job_hash: string;
  job_title: string;
  company: string;
  overall_match_score: number;
  skills_match_score: number | null;
  matching_skills: string[];
  missing_skills: string[];
  gap_analysis: string | null;
  created_at: string;
}

interface ResumeProps {
  onBack: () => void;
}

export default function Resume({ onBack }: ResumeProps) {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resumeData = await invoke<ResumeData | null>("get_active_resume");
      setResume(resumeData);

      if (resumeData) {
        // Fetch skills and recent matches in parallel
        const [skillsData, matchesData] = await Promise.all([
          invoke<UserSkill[]>("get_user_skills", { resumeId: resumeData.id }),
          invoke<MatchResult[]>("get_recent_matches", { resumeId: resumeData.id, limit: 10 }),
        ]);
        setSkills(skillsData);
        setRecentMatches(matchesData);
      }
    } catch (err) {
      logError("Failed to fetch resume data:", err);
      toast.error("Failed to load resume", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadResume = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (!selected) return;

      setUploading(true);
      // The dialog returns a string path when multiple is false
      const filePath = selected as string;
      const fileName = filePath.split("/").pop() || "Resume";

      await invoke("upload_resume", { name: fileName, filePath });
      toast.success("Resume uploaded", "Your resume has been parsed and analyzed");
      fetchData();
    } catch (err) {
      logError("Failed to upload resume:", err);
      toast.error("Upload failed", getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const getProficiencyColor = (proficiency: string) => {
    switch (proficiency.toLowerCase()) {
      case "expert":
        return "sentinel";
      case "advanced":
        return "alert";
      case "intermediate":
        return "surface";
      default:
        return "surface";
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading resume..." />;
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      {/* Header */}
      <header className="bg-white dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                  Resume Matcher
                </h1>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  AI-powered resume analysis and job matching
                </p>
              </div>
            </div>
            <Button onClick={handleUploadResume} loading={uploading}>
              {resume ? "Update Resume" : "Upload Resume"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {!resume ? (
          /* No Resume State */
          <Card className="text-center py-12 dark:bg-surface-800">
            <div className="w-16 h-16 bg-surface-100 dark:bg-surface-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <DocumentIcon className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="font-display text-display-md text-surface-700 dark:text-surface-300 mb-2">
              No Resume Uploaded
            </h3>
            <p className="text-surface-500 dark:text-surface-400 mb-6 max-w-md mx-auto">
              Upload your resume to enable AI-powered job matching. We'll extract your skills
              and match them against job requirements.
            </p>
            <Button onClick={handleUploadResume} loading={uploading}>
              Upload Resume (PDF)
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resume Info */}
            <Card className="lg:col-span-1 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Active Resume
              </h2>
              <div className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-700 rounded-lg mb-4">
                <div className="w-12 h-12 bg-sentinel-100 dark:bg-sentinel-900/30 rounded-lg flex items-center justify-center">
                  <DocumentIcon className="w-6 h-6 text-sentinel-600 dark:text-sentinel-400" />
                </div>
                <div>
                  <p className="font-medium text-surface-800 dark:text-surface-200">{resume.name}</p>
                  <p className="text-sm text-surface-500 dark:text-surface-400">
                    Parsed: {new Date(resume.parsed_at).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Skills Extracted ({skills.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skills.slice(0, 15).map((skill) => (
                    <Badge key={skill.name} variant={getProficiencyColor(skill.proficiency)}>
                      {skill.name}
                      {skill.years_experience && ` (${skill.years_experience}y)`}
                    </Badge>
                  ))}
                  {skills.length > 15 && (
                    <Badge variant="surface">+{skills.length - 15} more</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Skills Breakdown */}
            <Card className="lg:col-span-2 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Skills Analysis
              </h2>

              {skills.length === 0 ? (
                <p className="text-surface-500 dark:text-surface-400">
                  No skills extracted yet. Try re-uploading your resume.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Group by proficiency */}
                  {["Expert", "Advanced", "Intermediate", "Beginner"].map((level) => {
                    const levelSkills = skills.filter(
                      (s) => s.proficiency.toLowerCase() === level.toLowerCase()
                    );
                    if (levelSkills.length === 0) return null;

                    return (
                      <div key={level}>
                        <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                          {level} ({levelSkills.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {levelSkills.map((skill) => (
                            <div
                              key={skill.name}
                              className="px-3 py-1.5 bg-surface-100 dark:bg-surface-700 rounded-lg text-sm"
                            >
                              <span className="text-surface-800 dark:text-surface-200">
                                {skill.name}
                              </span>
                              {skill.years_experience && (
                                <span className="text-surface-500 dark:text-surface-400 ml-1">
                                  {skill.years_experience} years
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Recent Matches */}
            <Card className="lg:col-span-3 dark:bg-surface-800">
              <h2 className="font-display text-display-sm text-surface-900 dark:text-white mb-4">
                Recent Match Results
              </h2>

              {recentMatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-surface-500 dark:text-surface-400 mb-2">
                    No job matches yet
                  </p>
                  <p className="text-sm text-surface-400 dark:text-surface-500">
                    Match results will appear here when you view job details from the dashboard
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentMatches.map((match) => (
                    <div
                      key={match.job_hash}
                      className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg hover:border-surface-300 dark:hover:border-surface-600 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-surface-800 dark:text-surface-200">
                            {match.job_title}
                          </h3>
                          <p className="text-sm text-surface-500 dark:text-surface-400">
                            {match.company}
                          </p>
                        </div>
                        <ScoreDisplay score={match.overall_match_score} size="sm" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Matched Skills - Green */}
                        <div>
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                            <CheckIcon className="w-3.5 h-3.5" />
                            Matched Skills ({match.matching_skills.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.matching_skills.length > 0 ? (
                              match.matching_skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800"
                                >
                                  <CheckIcon className="w-3 h-3" />
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-surface-400 dark:text-surface-500 italic">
                                No matching skills found
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Missing Skills - Red */}
                        <div>
                          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                            <XIcon className="w-3.5 h-3.5" />
                            Missing Skills ({match.missing_skills.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {match.missing_skills.length > 0 ? (
                              match.missing_skills.map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-800"
                                >
                                  <XIcon className="w-3 h-3" />
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                You have all required skills!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Gap Analysis */}
                      {match.gap_analysis && (
                        <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                          <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                            Gap Analysis
                          </p>
                          <p className="text-sm text-surface-500 dark:text-surface-400">
                            {match.gap_analysis}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
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

function DocumentIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
