import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, X, Tag } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePromoCodes,
  useCreatePromoCode,
  useUpdatePromoCode,
  useDeletePromoCode,
} from '../../../hooks/usePromoCodes';
import { useEventOptions } from '../../../hooks/useEventOptions';
import type { PromoCode, PromoDiscountType } from '../../../api/types';
import type { PromoCodeInput } from '../../../api/promoCodes';
import { AdminRefreshButton } from '../../components/admin/AdminRefreshButton';
import { useLanguage } from '../../contexts/LanguageContext';

type FormState = {
  code: string;
  discount_type: PromoDiscountType;
  discount_value: string;
  usage_limit: string;
  starts_at: string;
  expires_at: string;
  event_id: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  code: '',
  discount_type: 'percent',
  discount_value: '10',
  usage_limit: '',
  starts_at: '',
  expires_at: '',
  event_id: '',
  active: true,
});

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  return new Date(value).toISOString();
}

function formToPayload(form: FormState): PromoCodeInput {
  const value = Number(form.discount_value);
  const base: PromoCodeInput = {
    code: form.code.trim(),
    discount_type: form.discount_type,
    usage_limit: form.usage_limit.trim() ? Number(form.usage_limit) : null,
    starts_at: fromDatetimeLocal(form.starts_at),
    expires_at: fromDatetimeLocal(form.expires_at),
    event_id: form.event_id || null,
    applicable_currencies: ['JOD'],
    active: form.active,
  };
  if (form.discount_type === 'fixed') {
    return { ...base, discount_amount: value, discount_percent: 0 };
  }
  return { ...base, discount_percent: value, discount_amount: null };
}

function formatDiscount(row: PromoCode, t: (key: string) => string): string {
  if (row.discount_type === 'fixed' && row.discount_amount != null) {
    return t('admin.promo_codes.discount_fixed_display').replace('{amount}', String(row.discount_amount));
  }
  return `${row.discount_percent}%`;
}

export function AdminPromoCodes() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data, isLoading, isFetching, refetch } = usePromoCodes({ limit: 100, search: searchTerm || undefined });
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useEventOptions(showModal);
  const createPromo = useCreatePromoCode();
  const updatePromo = useUpdatePromoCode();
  const deletePromo = useDeletePromoCode();

  const promos = data?.data ?? [];
  const events = eventsData?.data ?? [];

  const handleOpenModal = (row?: PromoCode) => {
    void refetchEvents();
    if (row) {
      setEditing(row);
      const dtype = row.discount_type ?? 'percent';
      setForm({
        code: row.code,
        discount_type: dtype,
        discount_value:
          dtype === 'fixed' && row.discount_amount != null
            ? String(row.discount_amount)
            : String(row.discount_percent),
        usage_limit: row.usage_limit != null ? String(row.usage_limit) : '',
        starts_at: toDatetimeLocal(row.starts_at),
        expires_at: toDatetimeLocal(row.expires_at),
        event_id: row.event_id ?? '',
        active: row.active,
      });
    } else {
      setEditing(null);
      setForm(emptyForm());
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSave = () => {
    if (!form.code.trim()) {
      toast.error(t('admin.promo_codes.code_required'));
      return;
    }
    const payload = formToPayload(form);
    if (editing) {
      updatePromo.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            handleCloseModal();
            toast.success(t('admin.promo_codes.updated'));
          },
          onError: (err: Error) => toast.error(err.message || t('admin.promo_codes.save_failed')),
        },
      );
    } else {
      createPromo.mutate(payload, {
        onSuccess: () => {
          handleCloseModal();
          toast.success(t('admin.promo_codes.created'));
        },
        onError: (err: Error) => toast.error(err.message || t('admin.promo_codes.save_failed')),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('admin.promo_codes.delete_confirm'))) return;
    deletePromo.mutate(id, {
      onSuccess: () => toast.success(t('admin.promo_codes.deleted')),
      onError: (err: Error) => toast.error(err.message || t('admin.promo_codes.delete_failed')),
    });
  };

  const formatUsage = (row: PromoCode) => {
    const limit = row.usage_limit != null ? row.usage_limit : '∞';
    return `${row.used_count} / ${limit}`;
  };

  const isSaving = createPromo.isPending || updatePromo.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal'] text-ink-black">{t('admin.promo_codes.title')}</h1>
          <p className="text-[#8c8c8c] text-sm mt-1">{t('admin.promo_codes.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-accent"
          >
            <Plus className="w-4 h-4" />
            {t('admin.promo_codes.add_button')}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-warm-gray/50 shadow-sm">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 text-[#8c8c8c] w-5 h-5 start-3" />
          <input
            type="text"
            placeholder={t('admin.promo_codes.search_ph')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 ps-10 pe-4 rounded-lg border border-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-black/50 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-warm-gray/50 shadow-sm overflow-hidden">
        <div className="admin-table-wrap min-w-0">
          <table className="w-full min-w-[56rem] table-fixed border-collapse admin-table text-sm">
            <colgroup>
              <col style={{ width: '14%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#e8e8e8] border-b border-warm-gray/50 text-xs uppercase tracking-wider font-medium text-[#8c8c8c]">
                <th className="py-4 px-6 text-start whitespace-nowrap">{t('admin.promo_codes.col_code')}</th>
                <th className="py-4 px-6 text-start whitespace-nowrap">{t('admin.promo_codes.col_discount')}</th>
                <th className="py-4 px-6 text-start whitespace-nowrap">{t('admin.promo_codes.col_event')}</th>
                <th className="py-4 px-6 text-start whitespace-nowrap">{t('admin.promo_codes.col_usage')}</th>
                <th className="py-4 px-6 text-start whitespace-nowrap">{t('admin.promo_codes.col_expires')}</th>
                <th className="py-4 px-6 text-start whitespace-nowrap">{t('admin.promo_codes.col_active')}</th>
                <th className="py-4 px-6 text-end whitespace-nowrap">{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray/50">
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-8 px-6 text-center text-[#8c8c8c]">
                  {t('admin.common.loading')}
                </td>
              </tr>
            )}
            {!isLoading &&
              promos.map((row) => (
                <tr key={row.id} className="hover:bg-[#fafafa]">
                  <td className="py-4 px-6 font-mono font-semibold truncate">{row.code}</td>
                  <td className="py-4 px-6 whitespace-nowrap">{formatDiscount(row, t)}</td>
                  <td className="py-4 px-6 truncate" title={row.events?.title ?? t('admin.promo_codes.all_events')}>
                    {row.events?.title ?? t('admin.promo_codes.all_events')}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">{formatUsage(row)}</td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    {row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={
                        row.active
                          ? 'inline-block text-green-700 bg-green-50 px-2 py-0.5 rounded'
                          : 'inline-block text-[#8c8c8c] bg-[#f5f5f5] px-2 py-0.5 rounded'
                      }
                    >
                      {row.active ? t('admin.promo_codes.active_yes') : t('admin.promo_codes.active_no')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(row)}
                        className="p-2 hover:bg-[#e8e8e8] rounded-lg"
                        title={t('admin.common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="p-2 hover:bg-red-50 rounded-lg"
                        title={t('admin.common.delete')}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!isLoading && promos.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 px-6 text-center text-[#8c8c8c]">
                  <Tag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  {t('admin.promo_codes.none')}
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e8e8e8] flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-xl font-['Tajawal']">
                {editing ? t('admin.promo_codes.edit') : t('admin.promo_codes.add_new')}
              </h3>
              <button type="button" onClick={handleCloseModal} className="text-[#8c8c8c] hover:text-black">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.promo_codes.code_label')} *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full border border-[#e8e8e8] rounded-lg py-3 px-4 font-mono uppercase"
                  placeholder="SUMMER20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.promo_codes.discount_type_label')} *</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discount_type"
                      checked={form.discount_type === 'percent'}
                      onChange={() => setForm({ ...form, discount_type: 'percent', discount_value: '10' })}
                    />
                    <span className="text-sm">{t('admin.promo_codes.discount_type_percent')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discount_type"
                      checked={form.discount_type === 'fixed'}
                      onChange={() => setForm({ ...form, discount_type: 'fixed', discount_value: '5' })}
                    />
                    <span className="text-sm">{t('admin.promo_codes.discount_type_fixed')}</span>
                  </label>
                </div>
                <label className="block text-sm font-medium mb-2">
                  {form.discount_type === 'fixed'
                    ? t('admin.promo_codes.discount_amount_label')
                    : t('admin.promo_codes.discount_label')}{' '}
                  *
                </label>
                <input
                  type="number"
                  min={0}
                  max={form.discount_type === 'percent' ? 100 : undefined}
                  step={0.01}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="w-full border border-[#e8e8e8] rounded-lg py-3 px-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.promo_codes.usage_limit_label')}</label>
                <input
                  type="number"
                  min={1}
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  placeholder={t('admin.promo_codes.usage_limit_ph')}
                  className="w-full border border-[#e8e8e8] rounded-lg py-3 px-4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('admin.promo_codes.event_label')}</label>
                <select
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  className="w-full border border-[#e8e8e8] rounded-lg py-3 px-4"
                  disabled={eventsLoading}
                >
                  <option value="">{t('admin.promo_codes.all_events')}</option>
                  {eventsLoading && (
                    <option disabled value="__loading">
                      {t('admin.common.loading')}
                    </option>
                  )}
                  {eventsError && !eventsLoading && (
                    <option disabled value="__error">
                      {t('admin.promo_codes.events_load_error')}
                    </option>
                  )}
                  {!eventsLoading &&
                    !eventsError &&
                    events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('admin.promo_codes.starts_label')}</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full border border-[#e8e8e8] rounded-lg py-3 px-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">{t('admin.promo_codes.expires_label')}</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="w-full border border-[#e8e8e8] rounded-lg py-3 px-4"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">{t('admin.promo_codes.active_label')}</span>
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-accent disabled:opacity-70"
              >
                {isSaving ? t('admin.sponsors.saving') : t('admin.common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
