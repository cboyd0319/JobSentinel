export function getTechnicalFirstUiResult(path, text) {
  if (path === "src/pages/SetupWizard.tsx") {
    const setupWizardPatterns = [
      /Slack connection link/i,
      /hooks\.slack\.com\/services/i,
    ];

    if (setupWizardPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/notifications.md") {
    if (/private connection link/i.test(text)) {
      return true;
    }
  }

  if (path === "src/utils/sourceLabels.ts") {
    return /Who's Hiring thread|HN Who's Hiring|Hacker News/i.test(text);
  }

  if (path === "src/components/automation/ApplicationPreview.tsx") {
    return [
      /CAPTCHA verification \(if present\)/i,
      /No profile configured/i,
      /Resume upload \(select your file\)/i,
      /set up your application profile first/i,
    ].some((pattern) => pattern.test(text));
  }

  if (path === "src/components/CoverLetterTemplates.tsx") {
    return [
      /\bsetError\(errorMsg\)/,
      /toast\.error\(\s*["'`]Failed to save template/i,
      /Failed to Load Templates/i,
      /Failed to copy/i,
      /Copied to clipboard/i,
      /Template filled and copied/i,
      /Check any bracketed blanks/i,
      /Please try again/i,
    ].some((pattern) => pattern.test(text));
  }

  if (path === "src/components/automation/ProfileForm.tsx") {
    return /Require manual approval|Failed to load profile|Failed to select file|Please fix the errors|Failed to save|Please try again|Taking longer than expected|Select your resume file \(PDF or DOCX\) for application review|Daily application review limit|Daily review limit:|<option value="50">50<\/option>/i.test(text);
  }

  if (path === "src/components/automation/ScreeningAnswersForm.tsx") {
    return /Dropdown selection|Please fix the errors|Failed to load answers|Please try again/i.test(text);
  }

  if (path === "src/components/automation/ScreeningAnswerSuggestions.tsx") {
    return /Failed to load suggestions|setError\(\s*["'`]Could not load saved answers["'`]\s*\)/i.test(text);
  }

  if (path === "src/pages/DashboardUI/noJobsEmptyStateCopy.ts") {
    return /Scan allowed sources|Local checks run on your schedule/i.test(text);
  }

  if (path === "src/pages/Dashboard.tsx") {
    return /Scanning job boards|Scan complete|Failed to load company research/i.test(text);
  }

  if (path === "src/components/InterviewScheduler.tsx") {
    return /Failed to load interviews|Technical Interview|Mark as Complete|>\s*Failed\s*<|Did not go well|feedbackOutcome\.charAt/.test(text) || /Interview Outcome:/.test(text);
  }

  if (path === "src/pages/DashboardUI/DashboardHeader.tsx") {
    return /Scanning job boards|Scanning\.\.\.|Ready to scan|Auto-refresh in/i.test(text);
  }

  if (path === "src/pages/Applications.tsx") {
    if (
      /\{reminder\.reminder_type\}\s*-\s*Due:/i.test(text) ||
      /applications list failed to load/i.test(text) ||
      /Status update failed/i.test(text) ||
      /Restart JobSentinel/i.test(text) ||
      /Move cards between columns, or use Space and arrow keys/i.test(text) ||
      />\s*Analytics\s*</i.test(text)
    ) {
      return true;
    }
  }

  if (path === "src/pages/dashboardErrorCopy.ts") {
    return /Job Search Failed/i.test(text);
  }

  if (path === "src/pages/ApplicationProfile.tsx") {
    return /Failed to load application history|Restart JobSentinel|Marked Sent|Ready to Send|Submission Rate/i.test(text);
  }

  if (path === "src/hooks/useFeedback.ts") {
    return /Failed to load system information|Please try again or copy the report instead|Could not open GitHub/i.test(
      text,
    );
  }

  if (path === "src/utils/api.ts") {
    return /Operation Failed|Support details:|An error occurred/i.test(text);
  }

  if (path === "src/utils/errorMessages.ts") {
    return /Notification Setup Failed|Slack Notification Failed|Discord Notification Failed|Teams Notification Failed|Email Notification Failed|Reminder Setup Failed|API key|API Limit|The database is currently in use|Configuration Missing|configuration file|webhook URL|SMTP credentials|contact support|technical:\s*technicalMessage|JSON\.stringify\(error\)|Try refreshing|restart the app|Check your internet connection and try again\.'|system date\/?time|system date and time|Try again in 10-15 minutes|Check your notification settings and try again\.'|Website Format Changed|Job Source Disabled|currently disabled|More Settings|View Job Sources|stopped accepting more requests|Security Certificate Issue|Resume Analysis Problem|analysis service|No resume has been uploaded|Upload your resume/i.test(
      text,
    );
  }

  if (path === "src/utils/formValidation.ts") {
    return /unsupported pattern symbols|Check brackets or special characters|Invalid regex pattern|unmatched brackets|Pattern is required/i.test(
      text,
    );
  }

  if (path === "src/pages/hooks/useDashboardJobOps.ts") {
    return /Undo failed|Redo failed|Bookmark Failed|Bulk Hide Failed|Bulk Bookmark Failed|Bulk Merge Failed|\d+\s+failed|Couldn't update bookmark\.\s*Try again|Try refreshing|refresh and try again|restart the app|None of the duplicate groups could be merged\. Try merging them individually/i.test(
      text,
    );
  }

  if (path === "src/contexts/UndoContext.tsx") {
    return /Undo failed|Redo failed|Try refreshing/i.test(text);
  }

  if (path === "src/pages/hooks/useDashboardAutoRefresh.ts") {
    return /Job scanning has failed 3 times in a row|manual search|Auto-refreshing|Scanning for new jobs|automatically\. Check your connection/i.test(text);
  }

  if (path === "src/components/BookmarkletGenerator.tsx") {
    const browserButtonPatterns = [
      /Advanced connection settings/i,
      /local safety code/i,
      /If this feels hard/i,
      /block page import/i,
      /Allow clipboard access and try again\./i,
      /when JobSentinel restarts/i,
      /Support settings/i,
      /Support number/i,
      /Help-only settings/i,
      /support reply/i,
      /Import Helper/i,
      /Advanced browser button setting/i,
      /Browser helper number/i,
      /import helper/i,
      /browser import settings/i,
      /browser import connection/i,
      /Could not update browser import/i,
    ];

    if (browserButtonPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/src/commands/bookmarklet.rs") {
    return /Allow clipboard access and try again\.|import helper/i.test(text);
  }

  if (path === "docs/BOOKMARKLET.md") {
    return /advanced settings|another port|advanced connection settings|connection settings|Works best on individual job pages from:[\s\S]{0,260}(?:LinkedIn|Indeed|Glassdoor)|Official ATS job pages|public ATS sources|after restarting JobSentinel|If support asks, open \*\*Connection settings\*\*|local safety code|Debug reports must redact|import helper/i.test(
      text,
    );
  }

  if (path === "src/components/ErrorLogPanel.tsx") {
    return /Advanced: Save Support Details|Save extra app details \(support only\)|Save Extra Local Details|Save Full Local Problem Details|Use this only if a maintainer asks|\{displayMessage\}/i.test(
      text,
    );
  }

  if (path === "src/components/DeepLinkGenerator.tsx") {
    if (/does not monitor directly|Login required/i.test(text)) {
      return true;
    }
  }

  if (path === "src/components/ScraperHealthDashboard.tsx") {
    const sourceStatusPatterns = [
      /Check All Sources/i,
      /Official feed/i,
      /return\s+["'`]Feed["'`]/i,
      /\(retry\s+\$\{?retryAttempt\}?\)|\(retry\s+\d+\)/i,
      />\s*Access\s*</i,
      />\s*Source Type\s*</i,
      />\s*Can Read Jobs\s*</i,
      />\s*Not needed\s*</i,
      />\s*Recent Success\s*</i,
      /Checks Worked/i,
      /Check Time/i,
      /Last Worked/i,
      />\s*Issue\s*</i,
      /success_rate_24h\.toFixed\(0\)\s*\}\s*%/i,
      /Job Source Check Results/i,
      /Source Controls/i,
      /title=["']Source Check Results["']|\/\*\s*Source Check Results Modal\s*\*\//i,
    ];

    if (sourceStatusPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "SECURITY.md") {
    return /email the maintainer directly or use GitHub's private vulnerability/i.test(text);
  }

  if (path === "CODE_OF_CONDUCT.md") {
    return /reported by opening an issue or contacting\s+the maintainer directly/i.test(text);
  }

  if (path === "src/pages/Settings.tsx") {
    const settingsPatterns = [
      /native OS notifications/i,
      /app is focused/i,
      /SMTP server/i,
      /SMTP port/i,
      /Email provider details/i,
      /Provider address/i,
      /Provider number/i,
      /Use this only if your provider gives you manual email details/i,
      /email provider/i,
      /automatic monitoring/i,
      /Advanced federal monitoring/i,
      /Advanced chat alert/i,
      /\(Tech hubs\)/i,
      /HN Who's Hiring/i,
      /Hacker News Who's Hiring/i,
      /Turn Hacker News hiring post checks on or off/i,
      /\(Tech careers\)/i,
      /blocks automatic checks/i,
      /New scans use this warning behavior/i,
      /Browser Integration/i,
      /low-trust job postings/i,
      /Stale-posting warning after \(days\)/i,
      /Repeated-posting warning count/i,
      /Very short description limit \(characters\)/i,
      /Hide risky postings/i,
      /Resume-Based Scoring/i,
      /70%\s*resume match\s*\+\s*30%\s*search words/i,
      /Source host/i,
      /return\s+["'`]Failed["'`]/i,
      /return\s+["'`]Timed out["'`]/i,
    ];

    if (settingsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/feedback/DebugInfoPreview.tsx") {
    const debugPreviewPatterns = [
      /App version/i,
      /^Platform$/im,
      /Device type/i,
    ];

    if (debugPreviewPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/pages/ResumeOptimizer.tsx" ||
    path === "src/pages/ResumeOptimizerJobWordsOverview.tsx" ||
    path === "src/pages/ResumeOptimizerResultsPanel.tsx" ||
    path === "src/pages/resumeOptimizerModel.ts"
  ) {
    const resumeOptimizerPatterns = [
      /Overall match:\s*\$\{/i,
      /Overall match:\s*\d+%/i,
      /How to fix:\s*\{/i,
      /How to fix:/i,
    ];

    if (resumeOptimizerPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/NotificationPreferences.tsx") {
    const notificationPreferencePatterns = [
      /Failed to load notification preferences/i,
      /Loading notification settings/i,
      /Failed to save["'`],\s*["'`]Your changes have been reverted/i,
      /Your last change was undone\.\s*Try again\./i,
      /All Notifications/,
      /Master switch/i,
      /enabled job boards/i,
      /Source Alert Rules/,
      /Which Jobs Alert You/,
      /sources and filters can interrupt you/i,
      /Detailed rules currently apply to Indeed, Greenhouse, Lever, and JobsWithGPT/i,
      /Match strength/i,
      /Alert selectivity/i,
      /\{config\.minScoreThreshold\}%/i,
      /Extra Filters/,
      /Only notify if title contains/,
      /Never notify if title contains/,
      /Minimum Salary/,
      /K\/year/i,
      /Remote Only/,
      /Favorite Companies/,
      /Companies to Skip/,
      /e\.g\., Senior, Lead, Staff/i,
      /placeholder=["'`]e\.g\., 90["'`]/i,
      /thousand per year/i,
    ];

    if (notificationPreferencePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/CommandPalette.tsx") {
    const commandPalettePatterns = [
      /navigation:\s*["'`]Navigation["'`]/,
      /ui:\s*["'`]Interface["'`]/,
      />\s*to navigate\s*</,
      />\s*to select\s*</,
    ];

    if (commandPalettePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/KeyboardShortcutsHelp.tsx") {
    const keyboardHelpPatterns = [
      /title:\s*["'`]Navigation["'`]/,
      /title:\s*["'`]Job Actions["'`]/,
      /title:\s*["'`]Global["'`]/,
      /title:\s*["'`]Filters & Search["'`]/,
      /description:\s*["'`]Toggle bookmark["'`]/,
      /description:\s*["'`]Toggle selection["'`]/,
      /title=["'`]Keyboard Shortcuts["'`]/,
      /Keyboard shortcuts reference/,
      /Use\s*<ShortcutKey>\?<\/ShortcutKey>\s*anytime/,
    ];

    if (keyboardHelpPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/contexts/KeyboardShortcutsContext.tsx") {
    const keyboardShortcutContextPatterns = [
      /description:\s*["'`]Go to Market["'`]/,
      /description:\s*["'`]Show keyboard shortcuts help["'`]/,
      /description:\s*["'`]Focus search \/ filter["'`]/,
      /description:\s*["'`]Submit current form["'`]/,
      /description:\s*["'`]Create new item["'`]/,
    ];

    if (keyboardShortcutContextPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  return undefined;
}
