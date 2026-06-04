import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Mail, Phone, User, Clock, DollarSign, Ticket, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { downloadCsv } from '../../utils/csvExport';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { useAdminIncompletePayments } from '../../../hooks/useAdminPayments';
import { AdminRefreshButton } from '../../components/admin/AdminRefreshButton';
import { AdminTable } from '../../components/admin/AdminTable';
import type { AdminIncompletePaymentRow } from '../../../api/payments';

const ALL_EVENTS_VALUE = '__all__';

function formatSeatLabel(item: { tiers?: { name: string } | null; seats?: { seat_number: string } | null }) {
  const tier = item.tiers?.name || '';
  const seat = item.seats?.seat_number || '';
  if (tier && seat) return `${tier} · ${seat}`;
  return seat || tier || '—';
}

function mapRow(row: AdminIncompletePaymentRow) {
  const name = [row.users?.first_name, row.users?.last_name].filter(Boolean).join(' ').trim() || '—';
  const seats = (row.reservation_items || []).map(formatSeatLabel);
  const created = new Date(row.created_at);
  const elapsedMs = Date.now() - created.getTime();
  const hours = Math.floor(elapsedMs / 3600000);
  const timeElapsed = hours < 1 ? '<1h' : `${hours}h`;
  const isPastExpiry = row.expires_at ? new Date(row.expires_at).getTime() <= Date.now() : false;
  const paymentStatus: 'pending' | 'expired' | 'cancelled' =
    row.payment_status === 'cancelled'
      ? 'cancelled'
      : row.payment_status === 'expired' || isPastExpiry
        ? 'expired'
        : 'pending';
  return {
    id: row.id,
    name,
    email: row.users?.email || '—',
    phone: row.users?.phone?.trim() || '—',
    event: row.events?.title || '—',
    seats,
    totalAmount: Number(row.total_amount),
    date: created.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    timeElapsed,
    expiresAt: row.expires_at,
    paymentStatus,
  };
}

export function AdminIncompletePayments() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterEventId, setFilterEventId] = useState(ALL_EVENTS_VALUE);

  useEffect(() => {
    const tmr = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => window.clearTimeout(tmr);
  }, [searchTerm]);

  const { data, isLoading, error, isFetching, refetch } = useAdminIncompletePayments({
    search: debouncedSearch || undefined,
    eventId: filterEventId,
  });

  const items = useMemo(() => (data?.data || []).map(mapRow), [data]);

  const eventIdOptions = useMemo(() => {
    const m = new Map<string, string>();
    (data?.data || []).forEach((r) => {
      if (r.event_id) m.set(r.event_id, r.events?.title || r.event_id);
    });
    return [
      { id: ALL_EVENTS_VALUE, label: t('admin.waitlist.all_events') },
      ...[...m.entries()].map(([id, title]) => ({ id, label: title })),
    ];
  }, [data, t]);

  const exportCsv = () => {
    downloadCsv(
      'admin_incomplete_payments',
      [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'event', header: 'Event' },
        { key: 'seats', header: 'Seats' },
        { key: 'amount', header: 'Amount' },
        { key: 'status', header: 'Status' },
        { key: 'progress', header: 'Progress' },
        { key: 'updated', header: 'Updated' },
      ],
      items.map((item) => ({
        name: item.name,
        email: item.email,
        phone: item.phone,
        event: item.event,
        seats: item.seats.join('; '),
        amount: String(item.totalAmount),
        status:
          item.paymentStatus === 'expired'
            ? t('admin.incomplete.status_expired')
            : t('admin.incomplete.status_pending'),
        progress: t('admin.incomplete.step_checkout'),
        updated: item.date,
      }))
    );
  };

  const totalSeats = items.reduce((sum, item) => sum + item.seats.length, 0);
  const potential = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal'] text-ink-black">{t('admin.incomplete.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('admin.incomplete.subtitle')}</p>
          <p className="text-muted-foreground text-xs mt-1">{t('admin.incomplete.subnote')}</p>
          {error && (
            <p className="text-sm text-red-600 mt-2">{getUserFacingErrorMessage(error, 'Failed to load')}</p>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-warm-gray rounded-lg text-sm font-medium hover:bg-warm-gray/10 transition-colors flex-1 sm:flex-initial"
          >
            <Download className="w-4 h-4 shrink-0" />
            {t('admin.common.export_csv')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-warm-gray/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 start-3" />
          <input
            type="text"
            placeholder={t('admin.incomplete.search_ph')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 ps-10 pe-4 rounded-lg border border-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-muted-foreground w-5 h-5 shrink-0" />
          <select
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
            className="flex-1 min-w-0 ps-3 pe-8 py-2 rounded-lg border border-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
          >
            {eventIdOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-warm-gray/50 shadow-sm p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.incomplete.total')}</p>
              <p className="text-3xl font-bold text-ink-black mt-1">{isLoading ? '…' : items.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-warm-gray/50 shadow-sm p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.incomplete.potential')}</p>
              <p className="text-3xl font-bold text-ink-black mt-1">
                {isLoading ? '…' : `${potential} JOD`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#8c8c8c]/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-warm-gray/50 shadow-sm p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.incomplete.seats')}</p>
              <p className="text-3xl font-bold text-ink-black mt-1">
                {isLoading ? '…' : totalSeats}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6 text-foreground" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-warm-gray/50 shadow-sm overflow-hidden">
        <AdminTable
          minWidth="68rem"
          colgroup={
            <>
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
            </>
          }
        >
            <thead>
              <tr>
                <th>{t('admin.incomplete.customer')}</th>
                <th>{t('admin.incomplete.contact')}</th>
                <th>{t('admin.incomplete.event')}</th>
                <th>{t('admin.incomplete.seats_col')}</th>
                <th className="text-end">{t('admin.incomplete.amount')}</th>
                <th>{t('admin.incomplete.status_col')}</th>
                <th>{t('admin.incomplete.progress')}</th>
                <th>{t('admin.incomplete.time')}</th>
                <th className="text-end">{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className=" align-top text-start min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-ink-black truncate">{item.name}</span>
                      </div>
                    </td>
                    <td className=" align-top text-start min-w-0">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2 text-ink-black min-w-0">
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{item.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-ink-black">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          {item.phone}
                        </div>
                      </div>
                    </td>
                    <td className=" align-top text-start min-w-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/5 text-foreground truncate max-w-full">
                        {item.event}
                      </span>
                    </td>
                    <td className=" align-top text-start min-w-0">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {item.seats.map((seat, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#8c8c8c]/10 text-muted-foreground">
                            {seat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className=" align-top text-end tabular-nums">
                      <span className="font-bold text-ink-black">{item.totalAmount} JOD</span>
                    </td>
                    <td className=" align-top text-start">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.paymentStatus === 'cancelled'
                            ? 'bg-red-500/15 text-red-900'
                            : item.paymentStatus === 'expired'
                              ? 'bg-[#8c8c8c]/15 text-muted-foreground'
                              : 'bg-amber-500/15 text-amber-900'
                        }`}
                      >
                        {item.paymentStatus === 'cancelled'
                          ? t('admin.incomplete.status_cancelled')
                          : item.paymentStatus === 'expired'
                            ? t('admin.incomplete.status_expired')
                            : t('admin.incomplete.status_pending')}
                      </span>
                    </td>
                    <td className=" align-top text-start">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#b7b7b7]/20 text-muted-foreground">
                        {t('admin.incomplete.step_checkout')}
                      </span>
                    </td>
                    <td className=" align-top text-start min-w-0">
                      <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 shrink-0" />
                          {item.timeElapsed}
                        </div>
                        <div className="text-xs truncate">
                          {item.paymentStatus === 'cancelled'
                            ? t('admin.incomplete.cancelled_note')
                            : item.expiresAt
                              ? item.paymentStatus === 'expired'
                                ? `${t('admin.incomplete.expired_at')} ${new Date(item.expiresAt).toLocaleString()}`
                                : `${t('admin.incomplete.expires_at')} ${new Date(item.expiresAt).toLocaleString()}`
                              : '—'}
                        </div>
                      </div>
                    </td>
                    <td className=" align-top text-end">
                      <a
                        href={`mailto:${item.email}?subject=${encodeURIComponent('Complete your payment')}`}
                        className="inline-flex px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-accent transition-colors gap-1 items-center"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              )}

              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    {t('admin.incomplete.none')}
                  </td>
                </tr>
              )}
            </tbody>
        </AdminTable>
      </div>
    </div>
  );
}
