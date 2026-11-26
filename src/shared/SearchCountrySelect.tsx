/** Loads and renders the bounded local country table for optional job-location filtering. */

import { useEffect, useRef, useState } from "react";
import { invoke } from "../platform/tauri";
import {
  isSearchCountryCode,
  parseSearchCountryOptions,
  searchCountryLabel,
  type SearchCountryOption,
} from "./searchCountry";

interface SearchCountrySelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

function selectedCountry(value: string | null | undefined): string | null {
  return isSearchCountryCode(value) ? value : null;
}

export function SearchCountrySelect({ value, onChange }: SearchCountrySelectProps) {
  const [options, setOptions] = useState<SearchCountryOption[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const latestRequest = useRef(0);
  const selected = selectedCountry(value);

  const loadOptions = () => {
    setOptions(null);
    setLoadFailed(false);
    const request = ++latestRequest.current;

    void Promise.resolve(invoke<unknown>("get_search_country_options"))
      .then((result) => {
        if (latestRequest.current === request) setOptions(parseSearchCountryOptions(result));
      })
      .catch(() => {
        if (latestRequest.current === request) setLoadFailed(true);
      });
  };

  useEffect(() => {
    loadOptions();
    return () => {
      latestRequest.current += 1;
    };
  }, []);

  const displayedOptions = options ?? [];
  const selectedIsListed = selected !== null && displayedOptions.some(([code]) => code === selected);

  return (
    <div className="mb-6 rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
      <label className="block text-sm font-medium text-surface-700 dark:text-surface-200" htmlFor="search-country">
        Search country (optional)
      </label>
      <select
        id="search-country"
        className="mt-2 w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-surface-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-100"
        onChange={(event) => onChange(event.target.value || null)}
        value={selected ?? ""}
      >
        <option value="">Any country</option>
        {selected && !selectedIsListed && (
          <option value={selected}>{searchCountryLabel(selected)}</option>
        )}
        {displayedOptions.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      <p className="mt-2 text-xs text-surface-600 dark:text-surface-300">
        Filters job lists and future alert checks; running checks keep their starting settings. Unclear country matches stay included. Work authorization is not assessed.
      </p>
      {loadFailed && (
        <div className="mt-2 flex items-center gap-2" role="alert">
          <span className="text-xs text-danger dark:text-red-300">Could not load country choices.</span>
          <button
            className="text-xs font-medium text-sentinel-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentinel-500 dark:text-sentinel-300"
            onClick={loadOptions}
            type="button"
          >
            Retry country choices
          </button>
        </div>
      )}
    </div>
  );
}
