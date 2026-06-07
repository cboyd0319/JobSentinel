import { memo, useEffect, useId, useRef, ReactNode, KeyboardEvent, MouseEvent } from "react";
import { lockBodyScroll } from "../utils/bodyScrollLock";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "wide";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  closeButtonLabel?: string;
}

// Size styles (extracted to prevent re-creation on each render)
const SIZE_STYLES = {
  sm: "app-modal-size-sm max-w-sm",
  md: "app-modal-size-md max-w-md",
  lg: "app-modal-size-lg max-w-lg",
  xl: "app-modal-size-xl max-w-xl",
  wide: "app-modal-size-wide max-w-6xl",
} as const;

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  closeButtonLabel = "Close modal",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const isMountedRef = useRef(true);
  const generatedId = useId();
  const titleId = `${generatedId}-modal-title`;
  const descriptionId = `${generatedId}-modal-description`;

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      const unlockBodyScroll = lockBodyScroll();

      // Focus the modal with proper timing and mounted check
      const rafId = requestAnimationFrame(() => {
        if (isMountedRef.current && modalRef.current) {
          modalRef.current.focus();
        }
      });

      return () => {
        cancelAnimationFrame(rafId);
        unlockBodyScroll();
      };
    } else {
      // Return focus to previous element with null check
      if (previousActiveElement.current instanceof HTMLElement && document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
    }

    return undefined;
  }, [isOpen]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      onClose();
    }

    // Focus trap
    if (e.key === "Tab" && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape" && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="app-modal-overlay fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Backdrop */}
      <div
        className="app-modal-backdrop absolute inset-0"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 1,
        }}
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`
          app-modal-panel relative w-full ${SIZE_STYLES[size]}
          flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden
          focus:outline-none
        `}
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "calc(100vh - 2rem)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          opacity: 1,
        }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="app-modal-header flex min-w-0 items-start justify-between gap-3 p-6 pb-0">
            <div className="min-w-0">
	              {title && (
	                <h2
	                  id={titleId}
	                  className="app-modal-title break-words font-display text-display-lg text-surface-900 [overflow-wrap:anywhere] dark:text-white"
	                >
                  {title}
                </h2>
              )}
	              {description && (
	                <p
	                  id={descriptionId}
	                  className="mt-1 break-words text-sm text-surface-500 [overflow-wrap:anywhere] dark:text-surface-400"
	                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="app-modal-close
                  -mt-1 -mr-1 shrink-0 p-2 rounded-lg
                  text-surface-400 hover:text-surface-600
                  dark:text-surface-500 dark:hover:text-surface-300
                  hover:bg-surface-100 dark:hover:bg-surface-700
                  transition-colors
                "
                aria-label={closeButtonLabel}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="app-modal-body overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
});

// Modal footer component for action buttons
interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export const ModalFooter = memo(function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div className={`app-modal-footer sticky bottom-0 flex items-center justify-end gap-3 border-t border-surface-100 bg-white pt-4 dark:border-surface-700 dark:bg-surface-800 ${className}`}>
      {children}
    </div>
  );
});
