import { memo, useState, useRef, useEffect } from "react";

interface SkillCategoryFilterProps {
  categories: string[];
  selected: string | null;
  onChange: (category: string | null) => void;
  skillCounts?: Record<string, number>;
}

const ChevronIcon = memo(function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-surface-400 transition-transform duration-200 flex-shrink-0 ${
        isOpen ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
});

export const SkillCategoryFilter = memo(function SkillCategoryFilter({
  categories,
  selected,
  onChange,
  skillCounts,
}: SkillCategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
    const totalOptions = categories.length + 1; // +1 for "All Categories"

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          if (highlightedIndex === 0) {
            onChange(null);
          } else {
            onChange(categories[highlightedIndex - 1]);
          }
          setIsOpen(false);
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
            return next >= totalOptions ? 0 : next;
          });
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? totalOptions - 1 : next;
          });
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const getDisplayText = () => {
    if (selected === null) {
      return "All Categories";
    }
    if (skillCounts && skillCounts[selected] !== undefined) {
      return `${selected} (${skillCounts[selected]})`;
    }
    return selected;
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`
          w-full px-4 py-2.5 text-left text-sm
          bg-white dark:bg-surface-800
          border rounded-lg
          transition-all duration-150
          flex items-center justify-between gap-2
          hover:border-surface-300 dark:hover:border-surface-600
          ${
            isOpen
              ? "border-sentinel-400 ring-2 ring-sentinel-100 dark:ring-sentinel-900"
              : "border-surface-200 dark:border-surface-700"
          }
          focus:outline-none
        `}
      >
        <span className="text-surface-800 dark:text-white truncate">
          {getDisplayText()}
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
          <li
            role="option"
            aria-selected={selected === null}
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            onMouseEnter={() => setHighlightedIndex(0)}
            className={`
              px-4 py-2.5 cursor-pointer text-sm
              flex items-center justify-between
              transition-colors
              ${
                selected === null
                  ? "bg-sentinel-50 dark:bg-sentinel-900/30 text-sentinel-700 dark:text-sentinel-400"
                  : highlightedIndex === 0
                    ? "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                    : "text-surface-700 dark:text-surface-300"
              }
            `}
          >
            <span>All Categories</span>
            {selected === null && (
              <svg
                className="w-4 h-4 text-sentinel-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </li>
          {categories.map((category, index) => (
            <li
              key={category}
              role="option"
              aria-selected={category === selected}
              onClick={() => {
                onChange(category);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(index + 1)}
              className={`
                px-4 py-2.5 cursor-pointer text-sm
                flex items-center justify-between
                transition-colors
                ${
                  category === selected
                    ? "bg-sentinel-50 dark:bg-sentinel-900/30 text-sentinel-700 dark:text-sentinel-400"
                    : highlightedIndex === index + 1
                      ? "bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300"
                      : "text-surface-700 dark:text-surface-300"
                }
              `}
            >
              <span className="truncate">
                {category}
                {skillCounts && skillCounts[category] !== undefined && (
                  <span className="ml-2 text-xs text-surface-500 dark:text-surface-400">
                    ({skillCounts[category]})
                  </span>
                )}
              </span>
              {category === selected && (
                <svg
                  className="w-4 h-4 ml-2 flex-shrink-0 text-sentinel-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
