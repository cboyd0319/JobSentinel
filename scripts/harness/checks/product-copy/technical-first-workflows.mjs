export function getTechnicalFirstWorkflowResult(path, text) {
  if (path === "src/features/dashboard/components/JobImportModal.tsx") {
    const importPatterns = [
      /Missing details:\s*\{?preview\.missing_fields\.join/i,
      /preview\.missing_fields\.join\(\s*["'`],\s*["'`]\s*\)/i,
    ];
    if (importPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/features/settings/SettingsPage.tsx" ||
    path === "src/features/settings/sources/SettingsConnectedJobSource.tsx" ||
    path === "src/features/settings/sources/SettingsJobSourcesSection.tsx"
  ) {
    const settingsPatterns = [
      /Review before anything is sent/i,
      />Endpoint</i,
      />Remote filter</i,
      />Result limit</i,
      /Not remote-only/i,
      /Get optional USAJobs access code/i,
      /USAJobs email,\s*keywords,\s*location/i,
      /label=["']Keywords["']/i,
      /posted-within choice/i,
      /\bresult limit\b/i,
      />\s*Posted within:/i,
      />\s*Max results:/i,
      /Optional USAJobs auto-check/i,
      /Automatic USAJobs checks contact USAJobs/i,
      /Source host/i,
      /(?:>\s*|["'`])Settings backup saved(?:\s*<|["'`])/,
      /Saved passwords and connection codes are left out for safety/i,
      /Config imported/i,
      /(?:>\s*|["'`])Basic Settings(?:\s*<|["'`])/,
      /(?:>\s*|["'`])More Settings(?:\s*<|["'`])/,
      /(?:>\s*|["'`])Advanced Settings(?:\s*<|["'`])/,
      /Greenhouse, Lever, and other popular job boards/i,
      /native OS notifications/i,
      /app is focused/i,
      /SMTP server/i,
      /SMTP port/i,
      /Connection Number/i,
      /Email provider details/i,
      /Provider address/i,
      /Provider number/i,
      /Use this only if your provider gives you manual email details/i,
      /Manual email setup/i,
      /automatic monitoring/i,
      /Auto-enable Slack if valid connection link entered/i,
      /Paste Slack connection link["'`]/i,
      /Advanced federal monitoring/i,
      /Request USAJobs access code/i,
      /\bautomatic checks\b/i,
      /automatic\s+USAJobs\s+checks/i,
      /Advanced chat alert/i,
      /\(Tech hubs\)/i,
      /HN Who's Hiring/i,
      /Hacker News Who's Hiring/i,
      /Turn Hacker News hiring post checks on or off/i,
      /\(Tech careers\)/i,
      /blocks automatic checks/i,
      /Optional USAJobs auto-check/i,
      /Automatic USAJobs checks contact USAJobs/i,
      /New scans use this warning behavior/i,
      /These job boards can be monitored when enabled/i,
      /Loading ghost config/i,
      /Server Settings\s*→\s*Integrations\s*→\s*create a channel connection\s*→\s*Copy link/i,
      /Channel\s*→\s*Connectors\s*→\s*create a channel connection\s*→\s*Copy link/i,
      /Browser Integration/i,
      /low-trust job postings/i,
      /Stale-posting warning after \(days\)/i,
      /Repeated-posting warning count/i,
      /Very short description limit \(characters\)/i,
      /Hide risky postings/i,
      /Resume-Based Scoring/i,
      /70%\s*resume match\s*\+\s*30%\s*search words/i,
      /<dt[^>]*>\s*Job-source link\s*<\/dt>/i,
      /Paste a job-source link from a service you trust/i,
      /uploaded resume/i,
      /Upload your resume/i,
      /uploaded,\s*scoring uses/i,
      /added,\s*scoring uses/i,
      /These logs can help diagnose it/i,
      /Turn this on to never miss a new posting/i,
      /Auto-scan job boards/i,
      /Company preference \(if configured\)/i,
      /["'`]Save failed["'`]/,
      /["'`]Test failed["'`]/,
      /saved connection detail\(s\) failed to save/i,
      /Share\s*\$\{savedFile\.fileName\}\s*only if you want help/i,
      /Recommended for you/i,
      /onClick=\{rec\.enable\}[\s\S]{0,220}>\s*Enable\s*<\/button>/i,
      /Message @BotFather to create a private alert bot/i,
      /already use Telegram for automatic alerts/i,
      /Telegram chat number/i,
      /Telegram destination number/i,
      /destination number Telegram shows/i,
      /@BotFather/i,
      /@userinfobot/i,
      /\/newbot/i,
      /Quick Setup \(2 minutes\)/i,
      />\s*Get USAJobs Access Code\s*</i,
      /USAJobs uses a free access code/i,
      /Looks up your approximate city from your internet\s+address\. Not saved unless added\./i,
      /Restart JobSentinel/i,
    ];

    if (settingsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    return false;
  }

  if (
    path === "crates/jobsentinel-core/src/core/automation/error.rs" ||
    path === "crates/jobsentinel-core/src/core/scrapers/error.rs"
  ) {
    const start = text.indexOf("pub fn user_message");
    const end = text.indexOf("/// Sanitize", start);
    const userMessageBody =
      start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);

    return /Failed to|Request timed out|CAPTCHA detected|Authentication required|Please check your credentials|An automation error occurred|manual intervention|required before submission|Resume issue|Form element .*not found|Page took too long to load \(/i.test(
      userMessageBody,
    );
  }

  if (path === "src/features/resumes/library/ResumeLibraryPage.tsx") {
    const resumePagePatterns = [
      /Programming Languages/i,
      /Cloud & DevOps/i,
      /Skills Extracted/i,
      /No skills extracted yet/i,
      /extract skills automatically/i,
      /Recent Match Results/i,
      /Score Breakdown/i,
      /Matched Skills/i,
      /["'`]Missing Skills/i,
      /You have all required skills!/i,
      /Gap Analysis/i,
      /skill\.confidence_score\s*\*\s*100/i,
      /Proficiency Distribution/i,
      /Proficiency level/i,
      /PROFICIENCY_LEVELS\s*=\s*\[[^\]]*Beginner[^\]]*Expert/i,
      /Failed to load resume/i,
      /No Resume Uploaded/i,
      /Resume uploaded/i,
      /Upload Resume/i,
      /Upload New/i,
      /Uploading\.\.\./i,
      /Uploaded:/i,
    ];

    if (resumePagePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/features/resumes/builder/ResumeBuilderPage.tsx" ||
    path === "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx" ||
    path === "src/features/resumes/builder/steps/ContactStep.tsx" ||
    path === "src/features/resumes/builder/steps/EducationStep.tsx" ||
    path === "src/features/resumes/builder/steps/ExperienceStep.tsx" ||
    path === "src/features/resumes/builder/steps/SkillsStep.tsx" ||
    path === "src/features/resumes/builder/steps/SummaryStep.tsx"
  ) {
    const resumeBuilderPatterns = [
      />\s*Proficiency\s*</i,
      /["'`]Proficiency["'`]/,
      /Select level/i,
      /PROFICIENCY_LEVELS\s*=\s*\[[^\]]*beginner[^\]]*expert/i,
      /charAt\(0\)\.toUpperCase\(\)\s*\+\s*level\.slice\(1\)/,
      /Failed to import skills/i,
      /Failed to generate preview/i,
      /Export failed/i,
      /Try restarting JobSentinel/i,
      /restarting JobSentinel/i,
      /Try restarting the app/i,
      /restarting the app/i,
      /more issues/i,
    ];

    if (resumeBuilderPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path.startsWith("src/features/salary/") && path.endsWith(".tsx")) {
    const salaryPagePatterns = [
      /Seniority Level/i,
      /Entry Level \(0-2 years\)/i,
      /Mid Level \(3-5 years\)/i,
      /Principal\/Executive/i,
      /25th\s*%/i,
      /75th\s*%/i,
      /75th percentile/i,
      /25th percentile/i,
      /Strong target from higher range/i,
      /under-anchoring/i,
    ];

    if (salaryPagePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "crates/jobsentinel-core/src/core/resume/matcher.rs" ||
    path === "crates/jobsentinel-core/src/core/resume/ats_analyzer.rs" ||
    path === "src/mocks/handlers.ts" ||
    path === "crates/jobsentinel-core/src/core/salary/analyzer.rs" ||
    path === "crates/jobsentinel-core/migrations/00000000000000_initial_schema.sql"
  ) {
    const advisoryGuidancePatterns = [
      /Apply immediately/i,
      /Study the missing skills/i,
      /Consider upskilling/i,
      /Excellent offer!\s*Accept/i,
      /I was hoping/i,
      /top choice/i,
      /make this an easy decision/i,
      /skin in the game/i,
      /\(add specific metrics\)/i,
      /impact:\s*["'`](?:High|Medium)["'`]/i,
      /impact:\s*(?:"High"|"Medium")\.to_string\(\)/i,
      /Start bullet with action verb/i,
    ];

    if (advisoryGuidancePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/features/resumes/matching/ResumeMatchPage.tsx" ||
    path === "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx" ||
    path === "src/features/resumes/matching/ResumeMatchResultsPanel.tsx" ||
    path === "src/features/resumes/matching/resumeMatchModel.ts"
  ) {
    const resumeMatchDetailPatterns = [
      /Improve Bullet Point/i,
      /Improved Version/i,
      /Could not improve bullet/i,
      /Tailor Resume for This Job/i,
      /Navigation not available/i,
      /Cannot navigate to Resume Builder/i,
      /Navigating to Resume Builder/i,
      /Job context has been saved/i,
      /Format Issues/i,
      />\s*\{issue\.severity\}\s*</i,
      /(^|[>\n])\s*Fix:\s*\{issue\.fix\}/i,
      /Impact:\s*\{suggestion\.impact\}/i,
      /Your resume data has been imported and analyzed/i,
      /ScoreItem\s+label=["'`]Completeness["'`]/,
      /choose or upload/i,
      /Choose or Upload Resume/i,
    ];

    if (resumeMatchDetailPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/features/resumes/builder/AtsLiveScorePanel.tsx") {
    const resumeReadabilityPatterns = [
      /analyzing\.\.\./i,
      />\s*Job Context\s*</i,
      /View Full Analysis/i,
      /Format Issues/i,
      />\s*\{issue\.severity\}\s*</i,
      /(^|[>\n])\s*Fix:\s*\{issue\.fix\}/i,
      /Impact:\s*\{suggestion\.impact\}/i,
      /Include technical, workplace, and role-specific skills/i,
      /Add words from the job post/i,
      /ScoreBar\s+label=["'`]Complete["'`]/,
      /ScoreCard\s+label=["'`]Completeness["'`]/,
      />\s*View Details\s*</i,
      /Full Resume Readability Review/i,
      /\{analysis\.missing_keywords\.length\}\s+missing/i,
      /\{analysis\.format_issues\.length\}\s+issues/i,
    ];

    if (resumeReadabilityPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }


  return undefined;
}
