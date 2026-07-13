import { getUserFriendlyError } from "./messages";

const GENERIC_ERROR_TITLE = "JobSentinel needs attention";
const GENERIC_ERROR_MESSAGE = "JobSentinel ran into a problem.";

type SafeErrorCopyOptions = {
  fallbackTitle?: string;
  fallbackMessage?: string;
  includeAction?: boolean;
};

type SafeErrorCopy = {
  title: string;
  message: string;
};

export function getSafeErrorToastCopy(
  error: unknown,
  options: SafeErrorCopyOptions = {},
): SafeErrorCopy {
  const friendly = getUserFriendlyError(error);
  const title =
    friendly.title === GENERIC_ERROR_TITLE && options.fallbackTitle
      ? options.fallbackTitle
      : friendly.title;
  const baseMessage =
    friendly.message === GENERIC_ERROR_MESSAGE && options.fallbackMessage
      ? options.fallbackMessage
      : friendly.message;

  return {
    title,
    message:
      options.includeAction === false || !friendly.action
        ? baseMessage
        : `${baseMessage}\n\n${friendly.action}`,
  };
}
