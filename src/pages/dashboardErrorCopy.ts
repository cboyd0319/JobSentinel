import { getUserFriendlyError } from "../utils/errorMessages";

export function getDashboardLoadErrorMessage(error: unknown): string {
  const friendly = getUserFriendlyError(error);
  return friendly.action ?? friendly.message;
}

export function getDashboardSearchErrorCopy(error: unknown) {
  const friendly = getUserFriendlyError(error);
  return {
    title: friendly.title === "Something Went Wrong" ? "Job Search Failed" : friendly.title,
    message: friendly.action ? `${friendly.message}\n\n${friendly.action}` : friendly.message,
  };
}
