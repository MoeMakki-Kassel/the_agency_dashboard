import type { AnalyticsPeriod } from '../../api/analytics';

/** Dropdown order and API mapping for analytics endpoints */
export const ANALYTICS_PERIOD_SEQUENCE: AnalyticsPeriod[] = ['30d', '6m', 'ytd', 'all'];

export function analyticsPeriodLabelKey(period: AnalyticsPeriod): string {
  switch (period) {
    case '30d':
      return 'admin.period.last_30d';
    case '6m':
      return 'admin.period.last_6m';
    case 'ytd':
      return 'admin.period.this_year';
    case 'all':
      return 'admin.period.all_time';
    default:
      return 'admin.period.last_6m';
  }
}
