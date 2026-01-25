import { memo, useState, useRef, useEffect, ReactNode } from "react";

interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const Dropdown = memo(function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  error,
  disabled = false,
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          if (!option.disabled) {
            onChange(option.value);
            setIsOpen(false);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= options.length ? 0 : next;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? options.length - 1 : next;
          });
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `dropdown-option-${highlightedIndex}` : undefined}
        className={`
          w-full px-4 py-3 text-left
          bg-white dark:bg-surface-800
          border rounded-lg
          transition-all duration-150
          flex items-center justify-between gap-2
          ${disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-surface-300 dark:hover:border-surface-600"
          }
          ${error
            ? "border-danger focus:border-danger focus:ring-danger/20"
            : isOpen
              ? "border-sentinel-400 ring-2 ring-sentinel-100 dark:ring-sentinel-900"
              : "border-surface-200 dark:border-surface-700"
          }
          focus:outline-none
        `}
      >
        <span className={selectedOption ? "text-surface-800 dark:text-white" : "text-surface-400"}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="
            absolute z-50 w-full mt-1
            bg-white dark:bg-surface-800
            border border-surface-200 dark:border-surface-700
            rounded-lg shadow-lg
            max-h-60 overflow-auto
            py-1
            animate-slide-up
          "
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`dropdown-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setIsOpen(false);
                }
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                px-4 py-2.5 cursor-pointer
                flex items-center gap-2
                transition-colors
                ${option.disabled
                  ? "text-surface-400 cursor-not-allowed"
                  : option.value === value
                    ? "bg-sentinel-50 dark:bg-sentinel-900/30 text-sentinel-700 dark:text-sentinel-400"
                    : highlightedIndex === index
                      ? "bg-surface-100 dark:bg-surface-700"
                      : "text-surface-700 dark:text-surface-300"
                }
              `}
            >
              {option.icon}
              {option.label}
              {option.value === value && (
                <svg className="w-4 h-4 ml-auto text-sentinel-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-danger flex items-center gap-1">
          {error}
        </p>
      )}
    </div>
  );
});

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-surface-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
