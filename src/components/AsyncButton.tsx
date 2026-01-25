import { forwardRef, memo, useState, useCallback } from "react";
import { Button } from "./Button";
import { useToast } from "../contexts";
import { getErrorMessage, logError } from "../utils/errorUtils";

interface AsyncButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: "primary" | "secondary" | "ghost" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loadingText?: string;
  onClick: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  children: React.ReactNode;
}

/**
 * AsyncButton - A button component that handles async operations with loading states and error handling.
 *
 * Wraps the Button component and automatically manages:
 * - Loading state during async operations
 * - Toast notifications for success/error
 * - Error logging
 * - Disabled state during loading
 *
 * @example
 * <AsyncButton
 *   onClick={async () => {
 *     await invoke("delete_job", { id: jobId });
 *   }}
 *   successMessage="Job deleted successfully"
 *   errorMessage="Failed to delete job"
 *   variant="danger"
 * >
 *   Delete Job
 * </AsyncButton>
 */
export const AsyncButton = memo(forwardRef<HTMLButtonElement, AsyncButtonProps>(
  (
    {
      onClick,
      successMessage,
      errorMessage,
      showSuccessToast = true,
      showErrorToast = true,
      onSuccess,
      onError,
      disabled,
      ...buttonProps
    },
    ref
  ) => {
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    const handleClick = useCallback(async () => {
      try {
        setLoading(true);
        await onClick();

        if (successMessage && showSuccessToast) {
          toast.success("Success", successMessage);
        }

        onSuccess?.();
      } catch (error: unknown) {
        const errMsg = getErrorMessage(error);
        logError("AsyncButton operation failed:", error);

        if (showErrorToast) {
          toast.error("Error", errorMessage || errMsg);
        }

        onError?.(error);
      } finally {
        setLoading(false);
      }
    }, [onClick, successMessage, errorMessage, showSuccessToast, showErrorToast, onSuccess, onError, toast]);

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        loading={loading}
        disabled={disabled || loading}
        {...buttonProps}
      />
    );
  }
));

AsyncButton.displayName = "AsyncButton";
