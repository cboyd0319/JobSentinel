import { useState, useRef, useEffect } from 'react';

/**
 * Well-known companies for autocomplete suggestions.
 * Extracted from CompanyResearchPanel for reuse.
 */
export const COMPANY_SUGGESTIONS: Array<{
  name: string;
  displayName: string;
  industry: string;
  remotePolicy?: string;
}> = [
  // FAANG / Big Tech
  { name: 'google', displayName: 'Google', industry: 'Technology', remotePolicy: 'Hybrid' },
  { name: 'meta', displayName: 'Meta', industry: 'Social Media', remotePolicy: 'Hybrid' },
  { name: 'amazon', displayName: 'Amazon', industry: 'E-commerce', remotePolicy: 'Varies by team' },
  { name: 'microsoft', displayName: 'Microsoft', industry: 'Technology', remotePolicy: 'Hybrid' },
  { name: 'apple', displayName: 'Apple', industry: 'Consumer Electronics', remotePolicy: 'Mostly On-site' },
  { name: 'netflix', displayName: 'Netflix', industry: 'Streaming', remotePolicy: 'Hybrid' },
  // AI Companies
  { name: 'openai', displayName: 'OpenAI', industry: 'AI Research', remotePolicy: 'On-site preferred' },
  { name: 'anthropic', displayName: 'Anthropic', industry: 'AI Research', remotePolicy: 'Hybrid' },
  { name: 'deepmind', displayName: 'DeepMind', industry: 'AI Research', remotePolicy: 'Hybrid' },
  { name: 'huggingface', displayName: 'Hugging Face', industry: 'AI/ML Platform', remotePolicy: 'Remote-first' },
  // Fintech
  { name: 'stripe', displayName: 'Stripe', industry: 'Fintech', remotePolicy: 'Remote-friendly' },
  { name: 'plaid', displayName: 'Plaid', industry: 'Fintech', remotePolicy: 'Hybrid' },
  { name: 'square', displayName: 'Square', industry: 'Fintech', remotePolicy: 'Remote-friendly' },
  { name: 'coinbase', displayName: 'Coinbase', industry: 'Crypto', remotePolicy: 'Remote-first' },
  { name: 'robinhood', displayName: 'Robinhood', industry: 'Fintech', remotePolicy: 'Hybrid' },
  // Cloud / Infrastructure
  { name: 'cloudflare', displayName: 'Cloudflare', industry: 'Cloud/Security', remotePolicy: 'Hybrid' },
  { name: 'datadog', displayName: 'Datadog', industry: 'Cloud Monitoring', remotePolicy: 'Hybrid' },
  { name: 'snowflake', displayName: 'Snowflake', industry: 'Cloud Data', remotePolicy: 'Hybrid' },
  { name: 'databricks', displayName: 'Databricks', industry: 'Cloud Data', remotePolicy: 'Hybrid' },
  { name: 'vercel', displayName: 'Vercel', industry: 'Developer Tools', remotePolicy: 'Remote-first' },
  { name: 'supabase', displayName: 'Supabase', industry: 'Developer Tools', remotePolicy: 'Remote-first' },
  // E-commerce / Retail
  { name: 'shopify', displayName: 'Shopify', industry: 'E-commerce', remotePolicy: 'Remote-first' },
  { name: 'instacart', displayName: 'Instacart', industry: 'Delivery', remotePolicy: 'Hybrid' },
  { name: 'doordash', displayName: 'DoorDash', industry: 'Delivery', remotePolicy: 'Hybrid' },
  // Travel / Hospitality
  { name: 'airbnb', displayName: 'Airbnb', industry: 'Travel', remotePolicy: 'Remote-friendly' },
  { name: 'uber', displayName: 'Uber', industry: 'Transportation', remotePolicy: 'Hybrid' },
  { name: 'lyft', displayName: 'Lyft', industry: 'Transportation', remotePolicy: 'Hybrid' },
  // Social / Communication
  { name: 'discord', displayName: 'Discord', industry: 'Communication', remotePolicy: 'Remote-friendly' },
  { name: 'slack', displayName: 'Slack', industry: 'Enterprise', remotePolicy: 'Hybrid' },
  { name: 'zoom', displayName: 'Zoom', industry: 'Video', remotePolicy: 'Hybrid' },
  { name: 'figma', displayName: 'Figma', industry: 'Design', remotePolicy: 'Hybrid' },
  { name: 'notion', displayName: 'Notion', industry: 'Productivity', remotePolicy: 'Hybrid' },
  { name: 'linear', displayName: 'Linear', industry: 'Developer Tools', remotePolicy: 'Remote-first' },
  // Security
  { name: '1password', displayName: '1Password', industry: 'Security', remotePolicy: 'Remote-first' },
  { name: 'crowdstrike', displayName: 'CrowdStrike', industry: 'Cybersecurity', remotePolicy: 'Hybrid' },
  { name: 'paloalto', displayName: 'Palo Alto Networks', industry: 'Cybersecurity', remotePolicy: 'Hybrid' },
  // Gaming
  { name: 'roblox', displayName: 'Roblox', industry: 'Gaming', remotePolicy: 'Hybrid' },
  { name: 'epic', displayName: 'Epic Games', industry: 'Gaming', remotePolicy: 'Hybrid' },
  // Healthcare
  { name: 'oscar', displayName: 'Oscar Health', industry: 'Healthcare', remotePolicy: 'Hybrid' },
  // Hot Startups
  { name: 'cursor', displayName: 'Cursor', industry: 'AI/Developer Tools', remotePolicy: 'Remote-friendly' },
  { name: 'replit', displayName: 'Replit', industry: 'Developer Tools', remotePolicy: 'Remote-friendly' },
  { name: 'railway', displayName: 'Railway', industry: 'Cloud', remotePolicy: 'Remote-first' },
  { name: 'fly', displayName: 'Fly.io', industry: 'Cloud', remotePolicy: 'Remote-first' },
  { name: 'planetscale', displayName: 'PlanetScale', industry: 'Database', remotePolicy: 'Remote-first' },
  { name: 'neon', displayName: 'Neon', industry: 'Database', remotePolicy: 'Remote-first' },
  { name: 'turso', displayName: 'Turso', industry: 'Database', remotePolicy: 'Remote-first' },
];

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (company: string) => void;
  placeholder?: string;
  existingCompanies?: string[];
  buttonColor?: 'sentinel' | 'blue' | 'red' | 'surface';
}

export function CompanyAutocomplete({
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

  // Filter suggestions based on input
  const suggestions = value.trim().length >= 1
    ? COMPANY_SUGGESTIONS.filter(company => {
        const searchTerm = value.toLowerCase();
        const matchesName = company.name.includes(searchTerm) ||
                          company.displayName.toLowerCase().includes(searchTerm);
        const notAlreadyAdded = !existingCompanies.some(
          existing => existing.toLowerCase() === company.displayName.toLowerCase()
        );
        return matchesName && notAlreadyAdded;
      }).slice(0, 6) // Limit to 6 suggestions
    : [];

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

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex].displayName);
        } else {
          handleAdd();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const selectSuggestion = (companyName: string) => {
    onAdd(companyName);
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onAdd(trimmed);
      onChange('');
    }
  };

  const buttonColors = {
    sentinel: 'bg-sentinel-500 hover:bg-sentinel-600',
    blue: 'bg-blue-500 hover:bg-blue-600',
    red: 'bg-red-500 hover:bg-red-600',
    surface: 'bg-surface-500 hover:bg-surface-600',
  };

  return (
    <div ref={wrapperRef} className="relative" role="combobox" aria-expanded={showSuggestions && suggestions.length > 0} aria-haspopup="listbox" aria-controls="company-suggestions-list">
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
      {showSuggestions && suggestions.length > 0 && (
        <div id="company-suggestions-list" className="absolute z-50 w-full mt-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg overflow-hidden" role="listbox" aria-label="Company suggestions">
          {suggestions.map((company, index) => (
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
          ))}
          {value.trim() && !suggestions.some(s => s.displayName.toLowerCase() === value.trim().toLowerCase()) && (
            <div className="px-3 py-2 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500" role="status" aria-live="polite">
              Press Enter to add "{value.trim()}" as a custom company
            </div>
          )}
        </div>
      )}
    </div>
  );
}
