import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Check } from 'lucide-react';

export interface StudentSearchFilterValue {
  query: string;
  tags: string[];
}

interface Props {
  value: StudentSearchFilterValue;
  onChange: (next: StudentSearchFilterValue) => void;
  availableTags: string[];
  placeholder?: string;
  className?: string;
  variant?: 'light' | 'dark';
}

/**
 * Reusable search-by-name + filter-by-tags control.
 * Used in both the public Leaderboard and the Admin Student List.
 */
export function StudentSearchFilter({
  value,
  onChange,
  availableTags,
  placeholder = 'Search by name...',
  className = '',
  variant = 'light',
}: Props) {
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const sortedTags = useMemo(
    () => [...new Set(availableTags)].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [availableTags]
  );

  const toggleTag = (tag: string) => {
    const exists = value.tags.includes(tag);
    onChange({
      ...value,
      tags: exists ? value.tags.filter((t) => t !== tag) : [...value.tags, tag],
    });
  };

  const clearAll = () => onChange({ query: '', tags: [] });

  const isDark = variant === 'dark';
  const inputCls = isDark
    ? 'w-full pl-12 pr-10 py-3 rounded-2xl border border-base-50/20 bg-base-900/30 text-base-50 placeholder:text-base-50/60 focus:ring-4 focus:ring-base-50/10 focus:border-base-50/40 backdrop-blur-md outline-none text-sm transition-all'
    : 'w-full pl-12 pr-10 py-3.5 rounded-2xl border border-base-200 focus:ring-4 focus:ring-primary-50/50 focus:border-primary-500 transition-all text-sm outline-none bg-base-200/50 focus:bg-base-100';
  const iconCls = isDark ? 'text-base-50/70' : 'text-text-light';
  const btnCls = isDark
    ? 'flex items-center gap-2 px-4 py-3 rounded-2xl border border-base-50/20 bg-base-900/30 text-base-50 hover:bg-base-900/50 backdrop-blur-md text-sm font-bold transition-all'
    : 'flex items-center gap-2 px-4 py-3.5 rounded-2xl border border-base-200 bg-base-100 text-text-main hover:border-primary-300 text-sm font-bold transition-all';

  const hasFilters = value.query || value.tags.length > 0;

  return (
    <div className={`flex flex-col sm:flex-row gap-2 items-stretch ${className}`}>
      <div className="relative flex-1">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 ${iconCls}`} />
        <input
          type="text"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          placeholder={placeholder}
          className={inputCls}
        />
        {value.query && (
          <button
            type="button"
            onClick={() => onChange({ ...value, query: '' })}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-base-50/10 ${iconCls}`}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative" ref={popRef}>
        <button type="button" onClick={() => setOpen((o) => !o)} className={btnCls}>
          <Filter className="h-4 w-4" />
          <span>Tags</span>
          {value.tags.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-600 text-base-50 text-[10px] font-black">
              {value.tags.length}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-base-100 border border-base-200 rounded-2xl shadow-2xl z-50 p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-text-light">
                Filter by tags
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] font-bold text-primary-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {sortedTags.length === 0 ? (
              <p className="text-xs text-text-light px-1 py-3 text-center">
                No tags available yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {sortedTags.map((tag) => {
                  const checked = value.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                        checked
                          ? 'bg-primary-50 text-primary-700 font-bold'
                          : 'hover:bg-base-200/50 text-text-main'
                      }`}
                    >
                      <span className="truncate">{tag}</span>
                      {checked && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {value.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center sm:max-w-[40%]">
          {value.tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                isDark
                  ? 'bg-base-50/15 text-base-50 border border-base-50/20'
                  : 'bg-primary-100 text-primary-700'
              }`}
            >
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="hover:opacity-70"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to filter a list of students by a StudentSearchFilterValue.
 * Matches the name (case-insensitive) and requires ALL selected tags to be present.
 */
export function applyStudentSearchFilter<T extends { name?: string; tags?: string[] }>(
  list: T[],
  filter: StudentSearchFilterValue
): T[] {
  const q = filter.query.trim().toLowerCase();
  const tagSet = filter.tags;
  if (!q && tagSet.length === 0) return list;

  return list.filter((s) => {
    const nameMatch = !q || (s.name || '').toLowerCase().includes(q);
    const tagMatch =
      tagSet.length === 0 ||
      (Array.isArray(s.tags) && tagSet.every((t) => s.tags!.includes(t)));
    return nameMatch && tagMatch;
  });
}

export const emptyStudentSearchFilter: StudentSearchFilterValue = { query: '', tags: [] };