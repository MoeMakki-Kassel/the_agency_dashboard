import { apiRequest } from './client';
import type { AnalyticsData } from './types';

/** Must match `getPeriodDates` in the_agency_backend/services/analyticsService.js */
export type AnalyticsPeriod = '30d' | '3m' | '6m' | '12m' | 'ytd' | 'all';

export async function getAnalytics(
  token: string,
  period: AnalyticsPeriod = '6m'
): Promise<AnalyticsData> {
  return apiRequest(`/analytics?period=${encodeURIComponent(period)}`, {}, token);
}
