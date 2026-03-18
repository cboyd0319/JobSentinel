import { memo, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { COMPANY_SUGGESTIONS } from '../utils/companySuggestions';

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (company: string) => void;
  placeholder?: string;
  existingCompanies?: string[];
  buttonColor?: 'sentinel' | 'blue' | 'red' | 'surface';
}

export const CompanyAutocomplete = memo(function CompanyAutocomplete({
  value,
  onChange,
  onAdd,
  placeholder = "Type a company name...",
  existingCompanies = [],
  buttonColor = 'blue',
}: CompanyAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  // Filter suggestions based on input (memoized to prevent useCallback dependency issues)
  const suggestions = useMemo(() => {
    if (value.trim().length < 1) return [];
    return COMPANY_SUGGESTIONS.filter(company => {
      const searchTerm = value.toLowerCase();
      const matchesName = company.name.includes(searchTerm) ||
                        company.displayName.toLowerCase().includes(searchTerm);
      const notAlreadyAdded = !existingCompanies.some(
        existing => existing.toLowerCase() === company.displayName.toLowerCase()
      );
      return matchesName && notAlreadyAdded;
    }).slice(0, 6); // Limit to 6 suggestions
  }, [value, existingCompanies]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track mounted state
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length]);

  const selectSuggestion = useCallback((companyName: string) => {
    onAdd(companyName);
    onChange('');
    setShowSuggestions(false);
    
    // Focus input after state updates with proper timing
    requestAnimationFrame(() => {
      if (isMountedRef.current && inputRef.current && document.body.contains(inputRef.current)) {
        inputRef.current.focus();
      }
    });
  }, [onAdd, onChange]);

  const handleAdd = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      onChange('');
    }
  }, [value, onAdd, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
      return;
    }

    // Keyboard handlers lookup (better performance than switch)
    const keyHandlers: Record<string, () => void> = {
      ArrowDown: () => setSelectedIndex(prev => (prev + 1) % suggestions.length),
      ArrowUp: () => setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length),
      Enter: () => {
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex].displayName);
        } else {
          handleAdd();
        }
      },
      Escape: () => setShowSuggestions(false),
    };

    const handler = keyHandlers[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }, [showSuggestions, suggestions, selectedIndex, selectSuggestion, handleAdd]);

  const buttonColors = {
    sentinel: 'bg-sentinel-500 hover:bg-sentinel-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    red: 'bg-red-500 hover:bg-red-600',
    surface: 'bg-surface-500 hover:bg-surface-600',
  };

  return (
    <div ref={wrapperRef} className="relative" role="combobox" aria-expanded={showSuggestions && suggestions.length > 0} aria-haspopup="listbox" aria-controls="company-suggestions-list">
      {/* Screen reader announcement for suggestion count */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {showSuggestions && value.trim().length >= 1 && suggestions.length > 0
          ? `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} available`
          : ''}
      </span>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 text-sm border border-surface-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
          autoComplete="off"
          aria-label="Company name"
          aria-autocomplete="list"
          aria-activedescendant={showSuggestions && suggestions.length > 0 ? `company-suggestion-${selectedIndex}` : undefined}
        />
        <button
          onClick={handleAdd}
          className={`px-3 py-1.5 text-sm text-white rounded-lg transition-colors ${buttonColors[buttonColor]}`}
          aria-label="Add company"
        >
          Add
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && value.trim().length >= 1 && (
        <div id="company-suggestions-list" className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg overflow-hidden" role="listbox" aria-label="Company suggestions">
          {suggestions.length > 0 ? (
            suggestions.map((company, index) => (
              <button
                key={company.name}
                id={`company-suggestion-${index}`}
                onClick={() => selectSuggestion(company.displayName)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-sentinel-50 dark:bg-sentinel-900/30'
                    : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                }`}
                role="option"
                aria-selected={index === selectedIndex}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-surface-900 dark:text-surface-100">
                    {company.displayName}
                  </span>
                  {company.remotePolicy && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      company.remotePolicy.toLowerCase().includes('remote')
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400'
                    }`}>
                      {company.remotePolicy}
                    </span>
                  )}
                </div>
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  {company.industry}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-surface-500 dark:text-surface-400" role="status" aria-live="polite">
              No matching companies found
            </div>
          )}
          {value.trim() && !suggestions.some(s => s.displayName.toLowerCase() === value.trim().toLowerCase()) && (
            <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500" role="status" aria-live="polite">
              Press Enter to add "{value.trim()}" as a custom company
            </div>
          )}
        </div>
      )}
    </div>
  );
});
