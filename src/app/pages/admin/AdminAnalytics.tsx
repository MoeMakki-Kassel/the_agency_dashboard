import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  Globe,
  Calendar,
  Download
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useAnalytics } from '../../../hooks/useAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboardLocale } from '../../../hooks/useDashboardLocale';
import { downloadCsv } from '../../utils/csvExport';
import type { AnalyticsPeriod } from '../../../api/analytics';
import type { EventPerformanceRow } from '../../../api/types';
import { ANALYTICS_PERIOD_SEQUENCE, analyticsPeriodLabelKey } from '../../utils/analyticsPeriod';

const COLORS = ['#000000', '#8c8c8c', '#525252', '#000000', '#8c8c8c'];

type EventSortKey = 'revenue' | 'tickets_sold' | 'title';

export function AdminAnalytics() {
  const { t, language } = useLanguage();
  const { formatNumber, formatCurrency } = useDashboardLocale();
  const [period, setPeriod] = useState<AnalyticsPeriod>('6m');
  const [eventSearch, setEventSearch] = useState('');
  const [eventSort, setEventSort] = useState<EventSortKey>('revenue');
  const { data: analytics, isLoading } = useAnalytics(period);

  const monthlyData = analytics?.revenue_trend.map((pt) => ({
    name: pt.month,
    revenue: pt.revenue,
    tickets: pt.ticket_sales,
  })) ?? [];

  const demographicsData = (analytics?.age_demographics ?? []).map((pt) => ({
    name: pt.range,
    value: pt.percentage,
  }));

  const hasDemographics = demographicsData.some((d) => d.value > 0);
  const pieData = hasDemographics ? demographicsData : [{ name: t('admin.analytics.no_demo'), value: 1 }];

  const stats = analytics?.stats;
  const eventsBreakdown = analytics?.events_breakdown ?? [];

  const changeFmt = (n: number | null | undefined) => {
    if (n == null || Number.isNaN(n)) return '—';
    const sign = n > 0 ? '+' : '';
    return `${sign}${formatNumber(n, { maximumFractionDigits: 1 })}%`;
  };

  const totalEventRevenue = useMemo(
    () => eventsBreakdown.reduce((sum, e) => sum + e.revenue, 0),
    [eventsBreakdown],
  );

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    let rows = eventsBreakdown;
    if (q) rows = rows.filter((e) => e.title.toLowerCase().includes(q));
    return [...rows].sort((a, b) => {
      if (eventSort === 'title') return a.title.localeCompare(b.title);
      if (eventSort === 'tickets_sold') return b.tickets_sold - a.tickets_sold;
      return b.revenue - a.revenue;
    });
  }, [eventsBreakdown, eventSearch, eventSort]);

  const topEventId = eventsBreakdown[0]?.event_id;

  const exportAnalytics = () => {
    const rows: Record<string, unknown>[] = [];
    if (stats) {
      rows.push({ section: 'KPI', name: t('admin.overview.new_users'), value: String(stats.new_users.count) });
      rows.push({ section: 'KPI', name: t('admin.overview.events_hosted'), value: String(stats.events_hosted.count) });
      rows.push({ section: 'KPI', name: t('admin.overview.conversion_rate'), value: `${stats.conversion_rate.rate}%` });
      const pv = stats.total_page_views?.count;
      rows.push({ section: 'KPI', name: t('admin.overview.page_views'), value: pv != null ? String(pv) : '—' });
    }
    monthlyData.forEach((row) => {
      rows.push({ section: 'Month', name: row.name, value: `${row.revenue}|${row.tickets}` });
    });
    demographicsData.forEach((d) => {
      rows.push({ section: 'Demographic', name: d.name, value: String(d.value) });
    });
    filteredEvents.forEach((e) => {
      rows.push({
        section: 'Event',
        name: e.title,
        value: `${e.tickets_sold}|${e.revenue}|${e.seats_remaining ?? ''}`,
      });
    });
    downloadCsv(
      `admin_analytics_${period}`,
      [
        { key: 'section', header: 'Section' },
        { key: 'name', header: 'Name' },
        { key: 'value', header: 'Value' },
      ],
      rows
    );
  };

  const yAxisLeft = language === 'AR' ? 'right' : 'left';
  const yAxisRight = language === 'AR' ? 'left' : 'right';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Tajawal'] text-foreground">{t('admin.analytics.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.analytics.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
            className="px-4 py-2 border border-border bg-card rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary outline-none cursor-pointer text-foreground w-full sm:w-auto"
          >
            {ANALYTICS_PERIOD_SEQUENCE.map((p) => (
              <option key={p} value={p}>{t(analyticsPeriodLabelKey(p))}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportAnalytics}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Download size={16} className="shrink-0" />
            {t('admin.common.export_report')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border animate-pulse">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-3"></div>
                  <div className="h-7 bg-muted rounded w-24"></div>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted"></div>
              </div>
              <div className="mt-4 h-4 bg-muted rounded w-40"></div>
            </div>
          ))
        ) : (
          [
            { labelKey: 'admin.overview.new_users', value: stats ? formatNumber(stats.new_users.count) : '—', change: stats ? changeFmt(stats.new_users.change) : '—', icon: Users, color: "text-foreground", bg: "bg-primary/10" },
            { labelKey: 'admin.overview.events_hosted', value: stats ? formatNumber(stats.events_hosted.count) : '—', change: stats ? `${stats.events_hosted.change >= 0 ? '+' : ''}${stats.events_hosted.change}` : '—', icon: Calendar, color: "text-muted-foreground", bg: "bg-secondary/10" },
            { labelKey: 'admin.overview.conversion_rate', value: stats ? `${formatNumber(stats.conversion_rate.rate, { maximumFractionDigits: 1 })}%` : '—', change: stats ? changeFmt(stats.conversion_rate.change) : '—', icon: TrendingUp, color: "text-muted-foreground", bg: "bg-[#8c8c8c]/10" },
            { labelKey: 'admin.overview.page_views', value: stats?.total_page_views?.count != null ? formatNumber(stats.total_page_views.count) : '—', change: stats?.total_page_views?.change != null ? changeFmt(stats.total_page_views.change) : '—', icon: Globe, color: "text-foreground", bg: "bg-primary/10" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{t(kpi.labelKey)}</p>
                    <h3 className="text-2xl font-bold text-foreground mt-2 font-['Space_Grotesk']">{kpi.value}</h3>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm flex-wrap gap-1">
                  <span className="text-muted-foreground font-medium flex items-center gap-1">
                    <TrendingUp size={14} />
                    {kpi.change}
                  </span>
                  <span className="text-muted-foreground ms-1">{t('admin.overview.vs_previous')}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border min-w-0">
          <h3 className="text-lg font-bold font-['Tajawal'] text-foreground mb-6">{t('admin.analytics.revenue_tickets_trend')}</h3>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 0, bottom: 5, left: language === 'AR' ? 8 : -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e8e8" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8c8c8c', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" orientation={yAxisLeft} stroke="#000000" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 1000}k JOD`} />
                <YAxis yAxisId="right" orientation={yAxisRight} stroke="#000000" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#e8e8e8' }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill="#000000" radius={[4, 4, 0, 0]} name={t('admin.analytics.revenue_jod')} />
                <Bar yAxisId="right" dataKey="tickets" fill="#8c8c8c" radius={[4, 4, 0, 0]} name={t('admin.analytics.tickets_sold')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border flex flex-col min-w-0">
          <h3 className="text-lg font-bold font-['Tajawal'] text-foreground mb-6">{t('admin.analytics.audience_age')}</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full min-h-[250px] flex flex-col md:flex-row items-center gap-4">
              <div className="w-full md:w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={hasDemographics ? 5 : 0}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={hasDemographics ? COLORS[index % COLORS.length] : '#e8e8e8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 px-2 md:px-4 space-y-4">
                {demographicsData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center min-w-0">
                      <div className="w-3 h-3 rounded-full me-2 shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">{formatNumber(item.value, { maximumFractionDigits: 1 })}%</span>
                  </div>
                ))}
                {demographicsData.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('admin.common.no_data')}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold font-['Tajawal'] text-foreground">{t('admin.analytics.events_performance')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('admin.analytics.events_performance_hint')}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="search"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder={t('admin.analytics.search_events')}
              className="px-3 py-2 border border-border rounded-lg text-sm w-full sm:w-48"
            />
            <select
              value={eventSort}
              onChange={(e) => setEventSort(e.target.value as EventSortKey)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-card"
            >
              <option value="revenue">{t('admin.analytics.sort_revenue')}</option>
              <option value="tickets_sold">{t('admin.analytics.sort_tickets')}</option>
              <option value="title">{t('admin.analytics.sort_name')}</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto admin-table-wrap">
          <table className="w-full text-sm admin-table">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-start py-3 px-2 font-medium">{t('admin.analytics.col_event')}</th>
                <th className="text-end py-3 px-2 font-medium">{t('admin.analytics.col_tickets')}</th>
                <th className="text-end py-3 px-2 font-medium">{t('admin.analytics.col_revenue')}</th>
                <th className="text-end py-3 px-2 font-medium">{t('admin.analytics.col_share')}</th>
                <th className="text-end py-3 px-2 font-medium">{t('admin.analytics.col_seats_left')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{t('admin.common.loading')}</td></tr>
              ) : filteredEvents.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{t('admin.common.no_data')}</td></tr>
              ) : (
                filteredEvents.map((row: EventPerformanceRow) => {
                  const share = totalEventRevenue > 0 ? (row.revenue / totalEventRevenue) * 100 : 0;
                  const isTop = row.event_id === topEventId;
                  return (
                    <tr
                      key={row.event_id}
                      className={`border-b border-border last:border-0 ${isTop ? 'bg-muted' : ''}`}
                    >
                      <td className="py-3 px-2 font-medium text-foreground">
                        {row.title}
                        {isTop && (
                          <span className="ms-2 text-xs font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {t('admin.analytics.top_seller')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-end">{formatNumber(row.tickets_sold)}</td>
                      <td className="py-3 px-2 text-end">{formatCurrency(row.revenue)}</td>
                      <td className="py-3 px-2 text-end">{formatNumber(share, { maximumFractionDigits: 1 })}%</td>
                      <td className="py-3 px-2 text-end">{row.seats_remaining != null ? formatNumber(row.seats_remaining) : '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
