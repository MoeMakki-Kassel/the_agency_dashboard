import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  TrendingUp,
  Ticket,
  Activity,
  ArrowRight,
  MoreHorizontal,
  Globe,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useAnalytics } from '../../../hooks/useAnalytics';
import { useAdminReservations } from '../../../hooks/useReservations';
import { useEvents } from '../../../hooks/useEvents';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboardLocale } from '../../../hooks/useDashboardLocale';
import { downloadCsv } from '../../utils/csvExport';
import { AdminTable } from '../../components/admin/AdminTable';
import type { AnalyticsPeriod } from '../../../api/analytics';
import { ANALYTICS_PERIOD_SEQUENCE, analyticsPeriodLabelKey } from '../../utils/analyticsPeriod';
import { AdminRefreshButton } from '../../components/admin/AdminRefreshButton';

function capitalizeFirst(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AdminOverview() {
  const { t, language } = useLanguage();
  const { formatNumber, formatCurrency } = useDashboardLocale();
  const [period, setPeriod] = useState<AnalyticsPeriod>('6m');

  const { data: analytics, isLoading: analyticsLoading, isFetching: analyticsFetching, refetch: refetchAnalytics } = useAnalytics(period);
  const { data: reservationsData, isLoading: reservationsLoading, isFetching: reservationsFetching, refetch: refetchReservations } = useAdminReservations({ limit: 7, status: 'paid' });
  const { data: eventsData, isFetching: eventsFetching, refetch: refetchEvents } = useEvents({ limit: 3 });

  const handleRefresh = () => {
    void refetchAnalytics();
    void refetchReservations();
    void refetchEvents();
  };
  const isRefreshing = analyticsFetching || reservationsFetching || eventsFetching;

  const stats = analytics?.stats;
  const revenueChartData = analytics?.revenue_trend.map((pt) => ({
    name: pt.month,
    revenue: pt.revenue,
  })) ?? [];

  const recentReservations = reservationsData?.data ?? [];
  const topEvents = eventsData?.data ?? [];

  const timeAgo = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60_000);
      if (mins < 1) return t('admin.time.just_now');
      if (mins < 60) {
        const key = t('admin.time.mins_ago');
        return key.replace('{{n}}', String(mins));
      }
      const hours = Math.floor(mins / 60);
      if (hours < 24) {
        const key = t('admin.time.hours_ago');
        return key.replace('{{n}}', String(hours));
      }
      const days = Math.floor(hours / 24);
      const key = t('admin.time.days_ago');
      return key.replace('{{n}}', String(days));
    } catch {
      return '';
    }
  };

  const fmtJodCompact = (amount: number) => {
    if (amount >= 1_000_000) return `${formatNumber(amount / 1_000_000, { maximumFractionDigits: 1 })}M JOD`;
    if (amount >= 1_000) return `${formatNumber(amount / 1_000, { maximumFractionDigits: 1 })}k JOD`;
    return `${formatNumber(amount)} JOD`;
  };

  const exportOverview = () => {
    const rows: Record<string, unknown>[] = [];
    if (stats) {
      rows.push({ category: 'KPI', name: t('admin.overview.new_users'), value: String(stats.new_users.count) });
      rows.push({ category: 'KPI', name: t('admin.overview.events_hosted'), value: String(stats.events_hosted.count) });
      rows.push({ category: 'KPI', name: t('admin.overview.conversion_rate'), value: `${stats.conversion_rate.rate}%` });
      const pv = stats.total_page_views?.count;
      rows.push({
        category: 'KPI',
        name: t('admin.overview.page_views'),
        value: pv != null ? String(pv) : '—',
      });
    }
    revenueChartData.forEach((pt) => {
      rows.push({ category: 'Revenue', name: pt.name, value: String(pt.revenue) });
    });
    recentReservations.forEach((res) => {
      const customerName = `${res.users.first_name} ${res.users.last_name}`;
      const eventName = res.events?.title || res.events?.name || t('admin.common.unknown');
      const refId = res.reference_number ? String(res.reference_number) : res.id.slice(0, 8);
      rows.push({
        category: 'Reservation',
        name: refId,
        value: `${customerName} | ${eventName} | ${res.total_amount} | ${res.payment_status}`,
      });
    });
    downloadCsv(
      `admin_overview_${period}`,
      [
        { key: 'category', header: 'Category' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' },
      ],
      rows
    );
  };

  const pageViewsDisplay = useMemo(() => {
    const c = stats?.total_page_views?.count;
    return c != null ? formatNumber(c) : '—';
  }, [stats, formatNumber]);

  const changeFmt = (n: number | null | undefined) => {
    if (n == null || Number.isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${formatNumber(n, { maximumFractionDigits: 1 })}%`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Tajawal'] text-foreground">{t('admin.overview.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.overview.subtitle')}</p>
        </div>
        <div className="flex flex-col xs:flex-row flex-wrap gap-3 w-full lg:w-auto">
          <AdminRefreshButton onClick={handleRefresh} isFetching={isRefreshing} />
          <button
            type="button"
            onClick={exportOverview}
            className="px-4 py-2 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted transition-colors w-full sm:w-auto"
          >
            {t('admin.common.export_report')}
          </button>
          <Link
            to="/events/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors text-center w-full sm:w-auto"
          >
            + {t('admin.common.create_event')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border animate-pulse">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-28 mb-3"></div>
                  <div className="h-7 bg-muted rounded w-20"></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted"></div>
              </div>
              <div className="mt-4 h-4 bg-muted rounded w-32"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.overview.new_users')}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2 font-['Space_Grotesk']">
                    {stats ? formatNumber(stats.new_users.count) : '—'}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-foreground shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm flex-wrap gap-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp size={14} />
                  {stats ? changeFmt(stats.new_users.change) : '—'}
                </span>
                <span className="text-muted-foreground ms-1">{t('admin.overview.vs_previous')}</span>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.overview.events_hosted')}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2 font-['Space_Grotesk']">
                    {stats ? formatNumber(stats.events_hosted.count) : '—'}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#8c8c8c]/10 flex items-center justify-center text-muted-foreground shrink-0">
                  <Ticket size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm flex-wrap gap-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp size={14} />
                  {stats ? changeFmt(stats.events_hosted.change) : '—'}
                </span>
                <span className="text-muted-foreground ms-1">{t('admin.overview.vs_previous')}</span>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.overview.conversion_rate')}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2 font-['Space_Grotesk']">
                    {stats ? `${formatNumber(stats.conversion_rate.rate, { maximumFractionDigits: 1 })}%` : '—'}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-muted-foreground shrink-0">
                  <Activity size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm flex-wrap gap-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp size={14} />
                  {stats ? changeFmt(stats.conversion_rate.change) : '—'}
                </span>
                <span className="text-muted-foreground ms-1">{t('admin.overview.vs_previous')}</span>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{t('admin.overview.page_views')}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2 font-['Space_Grotesk']">
                    {pageViewsDisplay}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-foreground shrink-0">
                  <Globe size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm flex-wrap gap-1">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <TrendingUp size={14} />
                  {stats?.total_page_views?.change != null
                    ? changeFmt(stats.total_page_views.change)
                    : '—'}
                </span>
                <span className="text-muted-foreground ms-1">{t('admin.overview.vs_previous')}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <h3 className="text-lg font-bold font-['Tajawal'] text-foreground">{t('admin.overview.revenue_overview')}</h3>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
              className="bg-muted border-none text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-primary outline-none max-w-full"
            >
              {ANALYTICS_PERIOD_SEQUENCE.map((p) => (
                <option key={p} value={p}>{t(analyticsPeriodLabelKey(p))}</option>
              ))}
            </select>
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueChartData}
                margin={{ top: 5, right: language === 'AR' ? 0 : 20, bottom: 5, left: language === 'AR' ? 20 : 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8e8" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8c8c8c', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8c8c8c', fontSize: 12 }}
                  tickFormatter={(value) => fmtJodCompact(Number(value))}
                  orientation={language === 'AR' ? 'right' : 'left'}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), t('admin.overview.revenue_overview')]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#000000"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#000000', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
          <div className="flex justify-between items-center mb-6 gap-2">
            <h3 className="text-lg font-bold font-['Tajawal'] text-foreground">{t('admin.overview.top_events')}</h3>
            <Link to="/events" className="text-sm text-foreground hover:underline shrink-0">
              {t('admin.common.view_all')}
            </Link>
          </div>
          <div className="space-y-6">
            {topEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('admin.overview.no_events')}</p>
            )}
            {topEvents.map((event, i) => {
              const n = event.tiers?.length ?? 0;
              const tierLabel = `${n} ${n !== 1 ? t('admin.overview.tiers') : t('admin.overview.tier')}`;
              return (
                <div key={event.id ?? i}>
                  <div className="flex items-center gap-3 mb-2">
                    {event.cover_photo && (
                      <img
                        src={event.cover_photo}
                        alt={event.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground text-sm truncate block">{event.title}</span>
                      <span className="text-xs text-muted-foreground">{tierLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold font-['Tajawal'] text-foreground">{t('admin.overview.recent_reservations')}</h3>
          <Link to="/reservations" className="text-sm font-medium text-foreground flex items-center gap-1 hover:underline">
            {t('admin.common.view_all')}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>
        <AdminTable
          colgroup={
            <>
              <col style={{ width: '10%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
            </>
          }
        >
            <thead>
              <tr>
                <th>{t('admin.overview.ref')}</th>
                <th>{t('admin.overview.customer')}</th>
                <th>{t('admin.overview.event')}</th>
                <th className="text-end">{t('admin.overview.amount')}</th>
                <th>{t('admin.overview.status')}</th>
                <th>{t('admin.overview.time')}</th>
                <th className="text-end"><span className="sr-only">{t('admin.common.view_all')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8e8]">
              {reservationsLoading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className=""><div className="h-4 bg-muted rounded w-16"></div></td>
                  <td className=""><div className="h-4 bg-muted rounded w-28"></div></td>
                  <td className=""><div className="h-4 bg-muted rounded w-36"></div></td>
                  <td className=""><div className="h-4 bg-muted rounded w-14"></div></td>
                  <td className=""><div className="h-5 bg-muted rounded-full w-20"></div></td>
                  <td className=""><div className="h-4 bg-muted rounded w-20"></div></td>
                  <td className=""></td>
                </tr>
              ))}

              {!reservationsLoading && recentReservations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">{t('admin.overview.no_reservations')}</td>
                </tr>
              )}

              {!reservationsLoading && recentReservations.map((res, i) => {
                const customerName = `${res.users.first_name} ${res.users.last_name}`;
                const eventName = res.events?.title || res.events?.name || t('admin.common.unknown');
                const refId = res.reference_number ? String(res.reference_number) : res.id.slice(0, 8);
                const status = res.payment_status;
                return (
                  <tr key={res.id ?? i} className="hover:bg-muted/50 transition-colors">
                    <td className=" align-top text-start font-mono text-foreground">{refId}</td>
                    <td className=" align-top text-start font-medium text-foreground min-w-0 truncate">{customerName}</td>
                    <td className=" align-top text-start text-muted-foreground min-w-0 truncate">{eventName}</td>
                    <td className=" align-top text-end font-['Space_Grotesk'] font-medium tabular-nums">{formatCurrency(res.total_amount)}</td>
                    <td className=" align-top text-start">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'paid' ? 'bg-secondary/10 text-muted-foreground' :
                        'bg-[#8c8c8c]/10 text-muted-foreground'
                      }`}>
                        {capitalizeFirst(status)}
                      </span>
                    </td>
                    <td className=" align-top text-start text-muted-foreground tabular-nums">{timeAgo(res.created_at)}</td>
                    <td className=" align-top text-end">
                      <Link to="/reservations" className="text-muted-foreground hover:text-foreground inline-flex p-1" aria-label={t('admin.common.view_all')}>
                        <MoreHorizontal size={20} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </AdminTable>
      </div>
    </div>
  );
}
