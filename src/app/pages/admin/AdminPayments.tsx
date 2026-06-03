import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useLanguage } from '../../contexts/LanguageContext';
import { downloadCsv } from '../../utils/csvExport';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { useAdminPaymentSummary, useAdminPaymentTransactions } from '../../../hooks/useAdminPayments';
import { AdminRefreshButton } from '../../components/admin/AdminRefreshButton';
import type { AdminPaymentTransactionRow } from '../../../api/payments';

type PaymentsTab = 'transactions';
type TrxStatus = 'Succeeded' | 'Refunded' | 'Failed';

interface TrxRow {
  resId: string;
  id: string;
  date: string;
  customer: string;
  amount: string;
  currency: string;
  baseAmount: string;
  method: string;
  last4: string;
  status: TrxStatus;
  type: 'Charge' | 'Refund';
}

function mapDbToTrx(row: AdminPaymentTransactionRow, currency: string): TrxRow {
  const name = [row.users?.first_name, row.users?.last_name].filter(Boolean).join(' ').trim() || row.users?.email || '—';
  const status: TrxRow['status'] =
    row.payment_status === 'paid' ? 'Succeeded' :
    row.payment_status === 'refunded' ? 'Refunded' : 'Failed';
  const type: TrxRow['type'] = row.payment_status === 'refunded' ? 'Refund' : 'Charge';
  const ref = row.payment_reference || '';
  const last4 = ref.length >= 4 ? ref.slice(-4) : '—';
  const amt = Number(row.total_amount).toFixed(2);
  return {
    resId: row.id,
    id: row.reference_number != null ? `RES-${row.reference_number}` : row.id.slice(0, 8),
    date: new Date(row.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    customer: name,
    amount: `${amt} ${currency}`,
    currency,
    baseAmount: `${amt} ${currency}`,
    method: 'NI Checkout',
    last4,
    status,
    type,
  };
}

function statusLabel(t: (k: string) => string, s: TrxStatus) {
  if (s === 'Succeeded') return t('admin.payments.status_succeeded');
  if (s === 'Failed') return t('admin.payments.status_failed');
  return t('admin.payments.status_refunded');
}

export function AdminPayments() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<PaymentsTab>('transactions');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'paid' | 'failed' | 'refunded'>('');

  useEffect(() => {
    const tmr = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(tmr);
  }, [search]);

  const { data: summary, isLoading: summaryLoading, error: summaryError, isFetching: summaryFetching, refetch: refetchSummary } = useAdminPaymentSummary();
  const { data: txPage, isLoading: txLoading, error: txError, isFetching: txFetching, refetch: refetchTransactions } = useAdminPaymentTransactions({
    search: debouncedSearch || undefined,
    status: statusFilter,
  });

  const currency = summary?.currency || 'JOD';

  const transactions = useMemo(() => {
    if (!txPage?.data) return [];
    return txPage.data.map((r) => mapDbToTrx(r, currency));
  }, [txPage, currency]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return transactions.filter((trx) => {
      const matchQ = !q || trx.id.toLowerCase().includes(q) || trx.customer.toLowerCase().includes(q);
      return matchQ;
    });
  }, [transactions, debouncedSearch]);

  const exportCsv = () => {
    downloadCsv(
      'admin_payments',
      [
        { key: 'id', header: 'ID' },
        { key: 'date', header: 'Date' },
        { key: 'customer', header: 'Customer' },
        { key: 'amount', header: 'Amount' },
        { key: 'baseAmount', header: 'Base' },
        { key: 'method', header: 'Method' },
        { key: 'status', header: 'Status' },
        { key: 'type', header: 'Type' },
      ],
      filtered.map((trx) => ({
        id: trx.id,
        date: trx.date,
        customer: trx.customer,
        amount: trx.amount,
        baseAmount: trx.baseAmount,
        method: `${trx.method} •••• ${trx.last4}`,
        status: statusLabel(t, trx.status),
        type: trx.type === 'Refund' ? t('admin.payments.type_refund') : trx.type,
      }))
    );
  };

  const tabs: { id: PaymentsTab; label: string }[] = [
    { id: 'transactions', label: t('admin.payments.tab_transactions') },
  ];

  const paidTotal = summary ? Number(summary.paid_total).toFixed(2) : '—';
  const pendingCheckout = summary ? Number(summary.pending_checkout_total).toFixed(2) : '—';
  const refunded30d = summary ? Number(summary.refunded_30d_total).toFixed(2) : '—';
  const failed7d = summary?.failed_7d_count ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Tajawal'] text-[#000000]">{t('admin.payments.title')}</h1>
          <p className="text-[#8c8c8c] mt-1">{t('admin.payments.subtitle')}</p>
          {(summaryError || txError) && (
            <p className="text-sm text-red-600 mt-2">
              {getUserFacingErrorMessage(summaryError || txError, 'Failed to load payments')}
            </p>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <AdminRefreshButton
            onClick={() => {
              void refetchSummary();
              void refetchTransactions();
            }}
            isFetching={summaryFetching || txFetching}
          />
          <button
            type="button"
            onClick={exportCsv}
            className="px-4 py-2 border border-[#e8e8e8] bg-white rounded-lg text-sm font-medium hover:bg-[#e8e8e8] transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-initial"
          >
            <Download size={16} className="shrink-0" />
            {t('admin.common.export_csv')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#000000] text-[#e8e8e8] p-6 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute end-0 top-0 w-32 h-32 bg-[#000000]/20 rounded-full blur-2xl -me-10 -mt-10"></div>
          <p className="text-sm font-medium text-white/70 mb-2">{t('admin.payments.balance')}</p>
          <h3 className="text-4xl font-bold font-['Space_Grotesk'] mb-2">
            {summaryLoading ? '…' : paidTotal} {!summaryLoading && <span className="text-lg text-white/60">{currency}</span>}
          </h3>
          <p className="text-xs text-white/50 mb-3">From paid reservations (not merchant settlement balance).</p>
          <div className="flex flex-wrap items-center text-sm gap-2">
            <span className="bg-[#525252]/20 text-[#e8e8e8] px-2 py-0.5 rounded flex items-center gap-1">
              <ArrowUpRight size={14} /> {summaryLoading ? '—' : `${summary?.paid_count ?? 0} paid`}
            </span>
            <span className="text-white/50">{t('admin.payments.next_payout')}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-[#e8e8e8]">
          <p className="text-sm font-medium text-[#8c8c8c] mb-2">{t('admin.payments.pending_clearing')}</p>
          <h3 className="text-3xl font-bold text-[#000000] font-['Space_Grotesk'] mb-2">
            {summaryLoading ? '…' : pendingCheckout} <span className="text-lg text-[#8c8c8c]">{currency}</span>
          </h3>
          <p className="text-sm text-[#8c8c8c]">Active pending reservations with checkout opened (hosted payment).</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-[#e8e8e8]">
          <p className="text-sm font-medium text-[#8c8c8c] mb-2">{t('admin.payments.refunds_30d')}</p>
          <h3 className="text-3xl font-bold text-[#000000] font-['Space_Grotesk'] mb-2">
            {summaryLoading ? '…' : refunded30d} <span className="text-lg text-[#8c8c8c]">{currency}</span>
          </h3>
          <div className="flex flex-wrap items-center text-sm gap-2">
            <span className="text-[#525252] flex items-center gap-1 font-medium">
              <ArrowDownLeft size={14} /> {summaryLoading ? '—' : `${failed7d} failed (7d)`}
            </span>
            <span className="text-[#8c8c8c]">{t('admin.payments.refund_note')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-[#e8e8e8] overflow-hidden mt-8">
        <div className="p-4 border-b border-[#e8e8e8] flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#e8e8e8]/50">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 hide-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-[#000000] shadow-sm border border-[#e8e8e8]"
                    : "text-[#8c8c8c] hover:text-[#000000] hover:bg-white/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'transactions' && (
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
              <div className="relative flex-1 lg:w-64">
                <Search className={`absolute top-1/2 -translate-y-1/2 text-[#8c8c8c] ${isRTL ? 'end-3' : 'start-3'}`} size={18} />
                <input
                  type="text"
                  placeholder={t('admin.payments.search_ph')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full bg-white border border-[#e8e8e8] rounded-lg py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none ${isRTL ? 'pe-10 ps-4' : 'ps-10 pe-4'}`}
                />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full sm:w-auto appearance-none px-4 py-2 border border-[#e8e8e8] bg-white rounded-lg text-[#000000] font-medium hover:bg-[#e8e8e8] transition-colors flex items-center gap-2 pe-8 focus:ring-2 focus:ring-[#000000] outline-none"
                  aria-label={t('admin.payments.filter_status')}
                >
                  <option value="">{t('admin.payments.all_statuses')}</option>
                  <option value="paid">{t('admin.payments.status_succeeded')}</option>
                  <option value="failed">{t('admin.payments.status_failed')}</option>
                  <option value="refunded">{t('admin.payments.status_refunded')}</option>
                </select>
                <Filter size={16} className={`absolute top-1/2 -translate-y-1/2 text-[#8c8c8c] pointer-events-none ${isRTL ? 'start-2' : 'end-2'}`} />
              </div>
            </div>
          )}
        </div>

        {activeTab !== 'transactions' ? (
          <div className="p-12 text-center text-[#8c8c8c]">{t('admin.payments.placeholder_tab')}</div>
        ) : txLoading ? (
          <div className="p-12 text-center text-[#8c8c8c]">Loading…</div>
        ) : (
          <div className="admin-table-wrap min-w-0">
            <table className="w-full min-w-[56rem] table-fixed border-collapse admin-table text-sm">
              <colgroup>
                <col style={{ width: '19%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead className="bg-[#e8e8e8] text-xs uppercase text-[#8c8c8c] tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.payments.transaction')}</th>
                  <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.payments.customer')}</th>
                  <th className="px-6 py-4 font-medium text-end whitespace-nowrap">{t('admin.payments.amount_charged')}</th>
                  <th className="px-6 py-4 font-medium text-end whitespace-nowrap">{t('admin.payments.amount_base')}</th>
                  <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.payments.method')}</th>
                  <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.payments.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8e8]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#8c8c8c]">No transactions</td>
                  </tr>
                ) : (
                  filtered.map((trx) => {
                    let statusColor = "bg-[#8c8c8c]/10 text-[#8c8c8c]";
                    if (trx.status === "Succeeded") statusColor = "bg-[#525252]/10 text-[#525252]";
                    if (trx.status === "Failed" || trx.status === "Refunded") statusColor = "bg-[#525252]/10 text-[#525252]";

                    return (
                      <tr key={trx.resId} className="hover:bg-[#e8e8e8]/50 transition-colors">
                        <td className="px-6 py-4 align-top text-start">
                          <div className="font-mono font-medium text-[#000000]">{trx.id}</div>
                          <div className="text-xs text-[#8c8c8c]">{trx.date}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-start font-medium text-[#000000]">
                          {trx.customer}
                          {trx.type === 'Refund' && (
                            <span className="ms-2 text-xs font-normal text-[#525252] bg-[#525252]/10 px-1.5 rounded">
                              {t('admin.payments.type_refund')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top text-end font-['Space_Grotesk'] font-medium text-[#000000] tabular-nums">{trx.amount}</td>
                        <td className="px-6 py-4 align-top text-end font-['Space_Grotesk'] text-[#8c8c8c] tabular-nums">{trx.baseAmount}</td>
                        <td className="px-6 py-4 align-top text-start">
                          <div className="flex items-center text-[#000000] gap-2 min-w-0">
                            <CreditCard size={14} className="text-[#8c8c8c] shrink-0" />
                            <span className="min-w-0 truncate">{trx.method} •••• {trx.last4}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-start">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColor}`}>
                            {statusLabel(t, trx.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
