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
  job_hash: string;
  job_title: string;
  company: string;
  confidence_score: number;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
}

interface ResumeProps {
  onBack: () => void;
}

export default function Resume({ onBack }: ResumeProps) {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [recentMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resumeData = await invoke<ResumeData | null>("get_active_resume");
      setResume(resumeData);

      if (resumeData) {
        const skillsData = await invoke<UserSkill[]>("get_user_skills", { resumeId: resumeData.id });
        setSkills(skillsData);
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
                      className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg"
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
                        <ScoreDisplay score={match.confidence_score} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                            Matched Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.matched_skills.map((skill) => (
                              <Badge key={skill} variant="sentinel">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
                            Missing Skills
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {match.missing_skills.map((skill) => (
                              <Badge key={skill} variant="surface">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
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
