// Centralized time-range labels & options used across the app.
// Keep UI text consistent — never hardcode "total"/"all-time" strings in components.

export type TimeRange = 'all-time' | 'monthly' | 'weekly';

export const TIME_RANGE = {
  ALL_TIME: 'all-time',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
} as const satisfies Record<string, TimeRange>;

export interface TimeRangeOption {
  value: TimeRange;
  label: string;       // Sentence-case label, e.g. "All-Time"
  shortLabel: string;  // Short/uppercase label for chips & filters
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: TIME_RANGE.ALL_TIME, label: 'All-Time', shortLabel: 'All-Time' },
  { value: TIME_RANGE.MONTHLY,  label: 'Monthly',  shortLabel: 'Monthly'  },
  { value: TIME_RANGE.WEEKLY,   label: 'Weekly',   shortLabel: 'Weekly'   },
];

// Caption helpers — use these anywhere the app reports points/stats so
// "all-time" wording stays consistent.
export const POINTS_CAPTION = {
  ALL_TIME: 'All-Time Pts',
  MONTHLY: 'Monthly Pts',
  WEEKLY: 'Weekly Pts',
} as const;

export const STATS_CAPTION = {
  STUDENTS: 'All-Time Students',
  ACTIVE_GOALS: 'Active Goals',
  UNIQUE_VIEWS: 'All-Time Unique Views',
  POINTS_DISTRIBUTED: 'All-Time Points Distributed',
} as const;
