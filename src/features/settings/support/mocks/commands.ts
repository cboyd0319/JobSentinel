import {
  generateMockFeedbackReport,
  getMockConfigSummary,
  getMockFeedbackFilename,
  getMockSystemInfo,
  sanitizeMockFeedbackText,
  saveMockFeedbackFile,
} from "../../../../shared/errorReporting/mocks/supportReports";
import { getStringArg } from "../../../../test-support/mocks/handlers/commandHelpers";
import type { MockConfig } from "../../../../test-support/mocks/handlers/types";

export interface MockSupportCommandResult {
  handled: boolean;
  value: unknown;
}

export function handleMockSupportCommand(
  command: string,
  args: Record<string, unknown> | undefined,
  config: MockConfig,
  hasActiveResume: boolean,
): MockSupportCommandResult {
  switch (command) {
    case "get_system_info":
      return handled(getMockSystemInfo());
    case "get_config_summary":
      return handled(getMockConfigSummary(config, hasActiveResume));
    case "get_debug_log_events":
      return handled([]);
    case "generate_feedback_report":
      return handled(generateMockFeedbackReport(args, config, hasActiveResume));
    case "sanitize_feedback_text":
      return handled(sanitizeMockFeedbackText(args));
    case "get_feedback_filename":
      return handled(getMockFeedbackFilename());
    case "save_feedback_file":
      return handled(saveMockFeedbackFile(args));
    case "open_github_issues":
      return handled(undefined);
    case "reveal_saved_feedback_file": {
      const revealToken =
        getStringArg(args, "revealToken") ?? getStringArg(args, "reveal_token");
      if (!revealToken) throw new Error("Reveal token cannot be empty");
      return handled(undefined);
    }
    default:
      return { handled: false, value: undefined };
  }
}

function handled(value: unknown): MockSupportCommandResult {
  return { handled: true, value };
}
