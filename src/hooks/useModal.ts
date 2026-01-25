import { useState, useCallback, useEffect, KeyboardEvent, MouseEvent } from "react";

interface UseModalOptions {
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseModalResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  backdropClickHandler: (e: MouseEvent) => void;
  keyDownHandler: (e: KeyboardEvent) => void;
}

/**
 * Custom hook for managing modal state with backdrop and keyboard handlers.
 * Reduces boilerplate for modal open/close/backdrop/escape patterns.
 *
 * @example
 * const templatesModal = useModal({
 *   closeOnEscape: true,
 *   closeOnBackdropClick: true,
 *   onClose: () => console.log("Modal closed"),
 * });
 *
 * // Usage
 * <Button onClick={templatesModal.open}>Open Modal</Button>
 * {templatesModal.isOpen && (
 *   <div
 *     onClick={templatesModal.backdropClickHandler}
 *     onKeyDown={templatesModal.keyDownHandler}
 *   >
 *     <Modal onClose={templatesModal.close}>Content</Modal>
 *   </div>
 * )}
 */
export function useModal(options: UseModalOptions = {}): UseModalResult {
  const {
    closeOnEscape = true,
    closeOnBackdropClick = true,
    onOpen,
    onClose,
  } = options;

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      if (newState) {
        onOpen?.();
      } else {
        onClose?.();
      }
      return newState;
    });
  }, [onOpen, onClose]);

  const backdropClickHandler = useCallback(
    (e: MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        close();
      }
    },
    [closeOnBackdropClick, close]
  );

  const keyDownHandler = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        close();
      }
    },
    [closeOnEscape, close]
  );

  // Close modal on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (isOpen) {
        onClose?.();
      }
    };
  }, [isOpen, onClose]);

  return {
    isOpen,
    open,
    close,
    toggle,
    backdropClickHandler,
    keyDownHandler,
  };
}
