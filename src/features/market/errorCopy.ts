import { getUserFriendlyError } from "../../shared/errorReporting/messages";

export function getMarketDataErrorCopy(error: unknown) {
  const friendly = getUserFriendlyError(error);
  return {
    inlineMessage: friendly.action ?? friendly.message,
    toastTitle: friendly.title === "JobSentinel needs attention" ? "Hiring trends unavailable" : friendly.title,
    toastMessage: friendly.action ? `${friendly.message}\n\n${friendly.action}` : friendly.message,
  };
}
