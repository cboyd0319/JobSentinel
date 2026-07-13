import { getUserFriendlyError } from "../../shared/errorReporting/messages";

export function getDashboardLoadErrorMessage(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action ?? friendly.message;
}

export function getDashboardSearchErrorCopy(error: unknown) {
  const friendly = getUserFriendlyError(error);
  return {
    title: friendly.title === "JobSentinel needs attention" ? "Could not search jobs" : friendly.title,
    message: friendly.action ? `${friendly.message}\n\n${friendly.action}` : friendly.message,
  };
}
