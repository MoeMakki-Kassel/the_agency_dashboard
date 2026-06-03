import React, { useState, useEffect } from "react";
import { Search, Download, Mail } from "lucide-react";
import { toast } from 'sonner';
import { useAdminReservations } from '../../../hooks/useReservations';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboardLocale } from '../../../hooks/useDashboardLocale';
import { downloadCsv } from '../../utils/csvExport';
import { useAuth } from '../../components/AuthProvider';
import { downloadAdminReservationTicketsPdf, resendTicketPdfEmail } from '../../../api/tickets';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { AdminRefreshButton } from '../../components/admin/AdminRefreshButton';
import { AdminTable } from '../../components/admin/AdminTable';
import { AdminRowActionsMenu } from '../../components/admin/AdminRowActionsMenu';

const PAGE_SIZE = 50;

function scanCounts(
  paymentStatus: string,
  tickets: Array<{ used_at: string | null; status: string }> | undefined,
  seatQty: number
): { scanned: number; total: number } | null {
  if (paymentStatus !== 'paid') return null;
  const list = tickets ?? [];
  if (list.length === 0) {
    return { scanned: 0, total: Math.max(seatQty, 0) };
  }
  const scanned = list.filter((t) => t.used_at != null || t.status === 'used').length;
  return { scanned, total: list.length };
}

function capitalizeFirst(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AdminReservations() {
  const { t, isRTL } = useLanguage();
  const { formatCurrency } = useDashboardLocale();
  const { token } = useAuth();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [sendingTicketForId, setSendingTicketForId] = useState<string | null>(null);
  const [downloadingTicketForId, setDownloadingTicketForId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching, refetch } = useAdminReservations({
    search: searchTerm || undefined,
    status: 'paid',
    limit: PAGE_SIZE,
    offset,
  });

  const reservations = data?.data ?? [];
  const total = data?.total ?? 0;

  useEffect(() => {
    setOffset(0);
  }, [searchTerm]);

  const handleDownloadTickets = async (reservationId: string, paymentStatus: string) => {
    if (paymentStatus !== 'paid') {
      toast.error(t('admin.reservations.send_tickets_paid_only'));
      setMenuOpenId(null);
      return;
    }
    if (!token) {
      toast.error(t('admin.reservations.download_tickets_failed'));
      return;
    }
    setDownloadingTicketForId(reservationId);
    try {
      const { blob, filename } = await downloadAdminReservationTicketsPdf(token, reservationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('admin.reservations.download_tickets_success'));
      setMenuOpenId(null);
    } catch (err) {
      toast.error(getUserFacingErrorMessage(err, t('admin.reservations.download_tickets_failed')));
    } finally {
      setDownloadingTicketForId(null);
    }
  };

  const handleSendTickets = async (reservationId: string, paymentStatus: string) => {
    if (paymentStatus !== 'paid') {
      toast.error(t('admin.reservations.send_tickets_paid_only'));
      setMenuOpenId(null);
      return;
    }
    if (!token) {
      toast.error(t('admin.reservations.tickets_send_failed'));
      return;
    }
    setSendingTicketForId(reservationId);
    try {
      await resendTicketPdfEmail(token, reservationId);
      toast.success(t('admin.reservations.tickets_sent'));
      setMenuOpenId(null);
    } catch (err) {
      const msg = getUserFacingErrorMessage(err, t('admin.reservations.tickets_send_failed'));
      toast.error(msg);
    } finally {
      setSendingTicketForId(null);
    }
  };

  const exportReservations = () => {
    const rows = reservations.map((res) => {
      const customerName = `${res.users.first_name} ${res.users.last_name}`;
      const eventName = res.events?.title || res.events?.name || t('admin.common.unknown');
      const tier = res.reservation_items[0]?.tiers?.name || 'N/A';
      const qty = res.reservation_items.length;
      const refId = res.reference_number ? String(res.reference_number) : res.id.slice(0, 8);
      return {
        ref_id: refId,
        customer: customerName,
        email: res.users.email,
        event: eventName,
        tier,
        qty: String(qty),
        total: String(res.total_amount),
        status: res.payment_status,
        created_at: res.created_at,
      };
    });
    downloadCsv(
      'admin_reservations',
      [
        { key: 'ref_id', header: 'Ref ID' },
        { key: 'customer', header: 'Customer' },
        { key: 'email', header: 'Email' },
        { key: 'event', header: 'Event' },
        { key: 'tier', header: 'Tier' },
        { key: 'qty', header: 'Qty' },
        { key: 'total', header: 'Total (JOD)' },
        { key: 'status', header: 'Status' },
        { key: 'created_at', header: 'Created' },
      ],
      rows
    );
  };

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const showingText = isLoading
    ? t('admin.common.loading')
    : t('admin.common.showing_entries').replace('{{n}}', String(reservations.length)).replace('{{total}}', String(total));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Tajawal'] text-[#000000]">{t('admin.reservations.title')}</h1>
          <p className="text-[#8c8c8c] mt-1">{t('admin.reservations.subtitle')}</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={exportReservations}
            className="px-4 py-2 border border-[#e8e8e8] bg-white rounded-lg text-sm font-medium hover:bg-[#e8e8e8] transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
          >
            <Download size={16} className="shrink-0 rtl:order-2" />
            {t('admin.common.export_csv')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-[#e8e8e8]">
        <div className="p-4 border-b border-[#e8e8e8] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#e8e8e8]/50">
          <div className="flex w-full md:w-auto gap-3 flex-col sm:flex-row md:ms-auto">
            <div className="relative flex-1 md:w-80">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 text-[#8c8c8c] ${isRTL ? 'end-3' : 'start-3'}`}
                size={18}
              />
              <input
                type="text"
                placeholder={t('admin.reservations.search_ph')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-white border border-[#e8e8e8] rounded-lg py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none ${isRTL ? 'pe-10 ps-4' : 'ps-10 pe-4'}`}
              />
            </div>
            <p className="text-sm text-[#525252] font-medium whitespace-nowrap self-center">
              {t('admin.reservations.paid_only_badge')}
            </p>
          </div>
        </div>

        <AdminTable
          minWidth="52rem"
          colgroup={
            <>
              <col style={{ width: '11%' }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
            </>
          }
        >
            <thead>
              <tr>
                <th>{t('admin.reservations.ref_id')}</th>
                <th>{t('admin.reservations.customer')}</th>
                <th>{t('admin.reservations.event_tier')}</th>
                <th className="text-end">{t('admin.reservations.qty')}</th>
                <th className="text-end">{t('admin.reservations.total')}</th>
                <th>{t('admin.reservations.status_col')}</th>
                <th>{t('admin.reservations.scan_status')}</th>
                <th className="text-end w-12"><span className="sr-only">{t('admin.common.actions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8e8]">
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className=""><div className="h-4 bg-[#e8e8e8] rounded w-20"></div></td>
                  <td className="">
                    <div className="h-4 bg-[#e8e8e8] rounded w-32 mb-1"></div>
                    <div className="h-3 bg-[#e8e8e8] rounded w-40"></div>
                  </td>
                  <td className="">
                    <div className="h-4 bg-[#e8e8e8] rounded w-36 mb-1"></div>
                    <div className="h-3 bg-[#e8e8e8] rounded w-20"></div>
                  </td>
                  <td className=""><div className="h-4 bg-[#e8e8e8] rounded w-6"></div></td>
                  <td className=""><div className="h-4 bg-[#e8e8e8] rounded w-16"></div></td>
                  <td className=""><div className="h-6 bg-[#e8e8e8] rounded-full w-20"></div></td>
                  <td className=""><div className="h-4 bg-[#e8e8e8] rounded w-14"></div></td>
                  <td className=""></td>
                </tr>
              ))}

              {!isLoading && reservations.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#8c8c8c]">
                    {t('admin.reservations.none')}
                  </td>
                </tr>
              )}

              {!isLoading && reservations.map((res) => {
                const status = res.payment_status;
                let statusColor = "bg-[#8c8c8c]/10 text-[#8c8c8c]";
                if (status === "paid") statusColor = "bg-[#525252]/10 text-[#525252]";
                if (status === "pending") statusColor = "bg-[#000000]/10 text-[#000000]";

                const customerName = `${res.users.first_name} ${res.users.last_name}`;
                const eventName = res.events?.title || res.events?.name || t('admin.common.unknown');
                const tier = res.reservation_items[0]?.tiers?.name || 'N/A';
                const qty = res.reservation_items.length;
                const refId = res.reference_number ? String(res.reference_number) : res.id.slice(0, 8);
                const scan = scanCounts(status, res.tickets, qty);

                return (
                  <tr key={res.id} className="hover:bg-[#e8e8e8]/50 transition-colors">
                    <td className=" align-top text-start">
                      <span className="font-mono font-medium text-[#000000]">{refId}</span>
                      {res.is_complimentary && (
                        <span className="ms-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-800">
                          {t('admin.comp.badge')}
                        </span>
                      )}
                    </td>
                    <td className=" align-top text-start min-w-0">
                      <div className="font-medium text-[#000000]">{customerName}</div>
                      <div className="text-xs text-[#8c8c8c] truncate">{res.users.email}</div>
                    </td>
                    <td className=" align-top text-start min-w-0">
                      <div className="text-[#000000] truncate">{eventName}</div>
                      <div className="text-xs text-[#8c8c8c] truncate">{tier}</div>
                    </td>
                    <td className=" align-top text-end tabular-nums text-[#000000]">{qty}</td>
                    <td className=" align-top text-end font-['Space_Grotesk'] font-medium text-[#000000] tabular-nums">{formatCurrency(res.total_amount)}</td>
                    <td className=" align-top text-start">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColor}`}>
                        {capitalizeFirst(status)}
                      </span>
                    </td>
                    <td className=" align-top text-start">
                      {scan === null ? (
                        <span className="text-xs text-[#8c8c8c] tabular-nums">{t('admin.reservations.scan_pending')}</span>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={
                              scan.total === 0
                                ? 'w-2 h-2 rounded-full shrink-0 border-2 border-[#8c8c8c]'
                                : scan.scanned === scan.total
                                  ? 'w-2 h-2 rounded-full shrink-0 border-2 border-green-600 bg-green-600'
                                  : scan.scanned > 0
                                    ? 'w-2 h-2 rounded-full shrink-0 border-2 border-amber-500 bg-amber-500'
                                    : 'w-2 h-2 rounded-full shrink-0 border-2 border-[#8c8c8c]'
                            }
                            aria-hidden
                          />
                          <span className="text-xs text-[#000000] tabular-nums truncate">
                            {t('admin.reservations.scan_ratio')
                              .replace('{{scanned}}', String(scan.scanned))
                              .replace('{{total}}', String(scan.total))}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="align-middle text-end whitespace-nowrap">
                      <AdminRowActionsMenu
                        open={menuOpenId === res.id}
                        onOpenChange={(next) => setMenuOpenId(next ? res.id : null)}
                        triggerLabel={t('admin.common.actions')}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          disabled={sendingTicketForId === res.id}
                          onClick={() => {
                            void handleSendTickets(res.id, status);
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-[#000000] hover:bg-[#e8e8e8] gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <Mail size={14} />
                          {sendingTicketForId === res.id ? t('admin.common.loading') : t('admin.reservations.send_tickets')}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={downloadingTicketForId === res.id || status !== 'paid'}
                          onClick={() => {
                            void handleDownloadTickets(res.id, status);
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-[#000000] hover:bg-[#e8e8e8] gap-2 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <Download size={14} />
                          {downloadingTicketForId === res.id ? t('admin.common.loading') : t('admin.reservations.download_tickets')}
                        </button>
                      </AdminRowActionsMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
        </AdminTable>
        <div className="p-4 border-t border-[#e8e8e8] flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-[#8c8c8c] bg-[#e8e8e8]/30">
          <div>{showingText}</div>
          <div className="flex gap-1 flex-wrap justify-center">
            <button
              type="button"
              disabled={!canPrev || isLoading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="px-3 py-1 border border-[#e8e8e8] rounded bg-white hover:bg-[#e8e8e8] disabled:opacity-50"
            >
              {t('admin.common.previous')}
            </button>
            <button
              type="button"
              disabled={!canNext || isLoading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="px-3 py-1 border border-[#e8e8e8] rounded bg-white hover:bg-[#e8e8e8] disabled:opacity-50"
            >
              {t('admin.common.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
