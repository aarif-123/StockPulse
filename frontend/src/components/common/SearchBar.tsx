import React, { useCallback, useEffect, useRef, useState } from 'react';

interface SearchBarProps {
  /** Called with the debounced search value */
  onSearch: (value: string) => void;
  placeholder?: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Initial value (controlled externally for URL sync use-cases) */
  initialValue?: string;
  className?: string;
  id?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search…',
  debounceMs = 300,
  initialValue = '',
  className,
  id = 'search-bar',
}: SearchBarProps): React.ReactElement {
  const [value, setValue] = useState(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable callback ref so the debounce effect doesn't re-run when the parent re-renders
  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onSearchRef.current(next);
      }, debounceMs);
    },
    [debounceMs],
  );

  const handleClear = useCallback(() => {
    setValue('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearchRef.current('');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className={`search-bar ${className ?? ''}`.trim()}>
      <span className="search-bar__icon" aria-hidden>🔍</span>
      <input
        id={id}
        type="search"
        className="search-bar__input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {value && (
        <button
          className="search-bar__clear"
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
