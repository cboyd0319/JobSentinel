import { invoke } from "@tauri-apps/api/core";
import {
  errorReporter,
  sanitizeContext,
  sanitizeTextForStorage,
  type ErrorReport,
} from "./errorReporter";

export interface SavedFeedbackFile {
  fileName: string;
  revealToken: string;
}

export interface DebugReportCopyResult {
  content: string;
  copied: boolean;
  errorCount: number;
}

const DEBUG_REPORT_DESCRIPTION =
  "User generated a safe support report from JobSentinel.";
const MAX_FRONTEND_ERRORS_IN_REPORT = 20;

function formatFrontendErrorLog(errors: ErrorReport[]): string {
  const lines = [
    "RECENT APP PROBLEMS (common private details hidden)",
    "Common private details hidden before this report is created: local file paths, links, sign-in tokens, cookies, connection links, email addresses, salary floors, resume text, private notes, and application history. Review before sharing.",
    "",
  ];

  if (errors.length === 0) {
    lines.push("No recent app problems.", "");
    return lines.join("\n");
  }

  for (const error of errors.slice(0, MAX_FRONTEND_ERRORS_IN_REPORT)) {
    lines.push(
      `- Time: ${sanitizeTextForStorage(error.timestamp)}`,
      `  Problem type: ${sanitizeTextForStorage(error.type)}`,
      `  Message: ${sanitizeTextForStorage(error.message)}`,
    );

    if (error.stack || error.componentStack) {
      lines.push(
        "  Technical details: kept in local problem history, not included in this safe support report.",
      );
    }

    if (error.context && Object.keys(error.context).length > 0) {
      const context = sanitizeContext(error.context);
      lines.push(
        `  Extra safe details: ${sanitizeTextForStorage(JSON.stringify(context, null, 2))}`,
      );
    }

    lines.push("");
  }

  if (errors.length > MAX_FRONTEND_ERRORS_IN_REPORT) {
    lines.push(
      `${errors.length - MAX_FRONTEND_ERRORS_IN_REPORT} older app problems left out.`,
      "",
    );
  }

  return lines.join("\n");
}

export async function buildSanitizedDebugReport(
  errors: ErrorReport[] = errorReporter.getErrors(),
): Promise<string> {
  const backendReport = await invoke<string>("generate_feedback_report", {
    category: "bug",
    description: DEBUG_REPORT_DESCRIPTION,
    includeDebugInfo: true,
  });
  const content = `${backendReport}\n\n${formatFrontendErrorLog(errors)}`;

  return invoke<string>("sanitize_feedback_text", { content });
}

export async function copySanitizedDebugReport(
  errors: ErrorReport[] = errorReporter.getErrors(),
): Promise<DebugReportCopyResult> {
  const content = await buildSanitizedDebugReport(errors);
  await navigator.clipboard.writeText(content);

  return { content, copied: true, errorCount: errors.length };
}

export async function saveSanitizedDebugReport(
  errors: ErrorReport[] = errorReporter.getErrors(),
): Promise<SavedFeedbackFile | null> {
  const content = await buildSanitizedDebugReport(errors);
  const suggestedFilename = await invoke<string>("get_feedback_filename");

  return invoke<SavedFeedbackFile | null>("save_feedback_file", {
    content,
    suggestedFilename,
  });
}
