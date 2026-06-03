import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../components/AuthProvider';
import { useLanguage } from '../../contexts/LanguageContext';
import { listEventOptions } from '../../../api/events';
import { fetchAdminEventSeatMap, type AdminSeatMapSeat } from '../../../api/adminSeatMap';
import { issueComplimentaryReservations } from '../../../api/complimentaryReservations';
import { ApiError } from '../../../api/types';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { phoneFormToE164 } from '../../utils/phoneValidation';
import { AdminSeatMapViewer, isSeatSelectableForComp } from '../../components/admin/AdminSeatMapViewer';
import { PhoneCountryField } from '../../components/PhoneCountryField';
import { COUNTRY_DIAL_CODES, getCountryByIso } from '../../data/countryDialCodes';

const SUMMARY_KEYS = ['available', 'locked', 'booked', 'total'] as const;
const MAX_COMP_SEATS = 20;

export function AdminEventSeatMap() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const isSuperAdmin = user?.role === 'super_admin';

  const [eventId, setEventId] = useState('');
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<AdminSeatMapSeat | null>(null);

  const [compSelectMode, setCompSelectMode] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(new Set());
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [compEmail, setCompEmail] = useState('');
  const [compFirstName, setCompFirstName] = useState('');
  const [compLastName, setCompLastName] = useState('');
  const [compPhoneCountryIso, setCompPhoneCountryIso] = useState('JO');
  const [compPhoneNational, setCompPhoneNational] = useState('');
  const [compNote, setCompNote] = useState('');
  const [compSendEmail, setCompSendEmail] = useState(true);

  const resetCompSelection = useCallback(() => {
    setCompSelectMode(false);
    setSelectedSeatIds(new Set());
    setCompModalOpen(false);
  }, []);

  const { data: optionsData } = useQuery({
    queryKey: ['event-options'],
    queryFn: () => listEventOptions(token!),
    enabled: Boolean(token),
  });
  const events = optionsData?.data ?? [];

  const {
    data: seatMap,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-seat-map', eventId],
    queryFn: () => fetchAdminEventSeatMap(token!, eventId),
    enabled: Boolean(token && eventId),
    retry: false,
  });

  const errorStatus = error instanceof ApiError ? error.status : undefined;
  const errorMessage = isError
    ? getUserFacingErrorMessage(error, t('admin.seat_map.load_error'))
    : '';
  const errorLower = errorMessage.toLowerCase();

  const apiRouteMissing = isError && errorStatus === 404 && errorMessage === 'Not Found';
  const noVenueTemplate =
    isError && !apiRouteMissing && errorLower.includes('venue template');

  const handleSeatToggle = (seat: AdminSeatMapSeat) => {
    if (!isSeatSelectableForComp(seat)) return;
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else if (next.size < MAX_COMP_SEATS) {
        next.add(seat.id);
      } else {
        toast.error(t('admin.comp.max_seats'));
      }
      return next;
    });
  };

  const openCompModal = () => {
    if (selectedSeatIds.size < 1) {
      toast.error(t('admin.comp.select_seats_first'));
      return;
    }
    setCompModalOpen(true);
  };

  const submitComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !eventId) return;
    const email = compEmail.trim().toLowerCase();
    if (!email || !compFirstName.trim() || !compLastName.trim()) {
      toast.error(t('admin.comp.required_fields'));
      return;
    }
    const national = compPhoneNational.trim();
    const phone = national ? phoneFormToE164(compPhoneCountryIso, national) : undefined;
    if (national && !phone) {
      toast.error(t('admin.comp.phone_invalid'));
      return;
    }

    setCompSubmitting(true);
    try {
      const result = await issueComplimentaryReservations(token, eventId, {
        seat_ids: [...selectedSeatIds],
        email,
        first_name: compFirstName.trim(),
        last_name: compLastName.trim(),
        phone,
        note: compNote.trim() || undefined,
        send_email: compSendEmail,
      });
      const ref = result.reservation.reference_number ?? result.reservation.id.slice(0, 8);
      toast.success(t('admin.comp.success').replace('{{ref}}', String(ref)));
      setCompEmail('');
      setCompFirstName('');
      setCompLastName('');
      setCompPhoneNational('');
      setCompNote('');
      resetCompSelection();
      await queryClient.invalidateQueries({ queryKey: ['admin-seat-map', eventId] });
      refetch();
    } catch (err: unknown) {
      toast.error(getUserFacingErrorMessage(err, t('admin.comp.error')));
    } finally {
      setCompSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-3xl font-bold font-['Tajawal'] text-[#000000]">{t('admin.seat_map.title')}</h1>
        <p className="text-[#8c8c8c] mt-1">{t('admin.seat_map.subtitle')}</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#e8e8e8]">
        <label className="block text-sm font-medium mb-2">{t('admin.seat_map.select_event')}</label>
        <select
          value={eventId}
          onChange={(e) => {
            setEventId(e.target.value);
            setTierFilter(null);
            setSelectedSeat(null);
            resetCompSelection();
          }}
          className="w-full max-w-md px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm bg-white"
        >
          <option value="">{t('admin.seat_map.choose_event')}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      {!eventId && (
        <p className="text-sm text-[#8c8c8c]">{t('admin.seat_map.pick_event_hint')}</p>
      )}

      {eventId && noVenueTemplate && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          {t('admin.seat_map.no_venue_template')}
        </div>
      )}

      {eventId && apiRouteMissing && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950 space-y-2">
          <p>{t('admin.seat_map.api_not_found')}</p>
          <p className="text-xs opacity-90">{t('admin.seat_map.api_not_found_hint')}</p>
        </div>
      )}

      {eventId && isError && !noVenueTemplate && !apiRouteMissing && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950 space-y-3">
          <p>{errorMessage}</p>
          <button type="button" onClick={() => refetch()} className="text-sm font-medium underline">
            {t('admin.seat_map.try_again')}
          </button>
        </div>
      )}

      {eventId && (isPending || isFetching) && !seatMap && !isError && (
        <p className="text-sm text-[#8c8c8c]">{t('admin.common.loading')}</p>
      )}

      {seatMap && (
        <>
          {isSuperAdmin && (
            <div className="flex flex-wrap items-center gap-3 bg-white border border-[#e8e8e8] rounded-xl p-4">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={compSelectMode}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      resetCompSelection();
                    } else {
                      setCompSelectMode(true);
                      setSelectedSeat(null);
                    }
                  }}
                  className="rounded"
                />
                {t('admin.comp.select_mode')}
              </label>
              {compSelectMode && (
                <>
                  <span className="text-sm text-[#8c8c8c]">
                    {t('admin.comp.selected_count').replace('{{count}}', String(selectedSeatIds.size))}
                  </span>
                  <button
                    type="button"
                    onClick={openCompModal}
                    disabled={selectedSeatIds.size < 1}
                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg disabled:opacity-40"
                  >
                    {t('admin.comp.issue_button')}
                  </button>
                  <button
                    type="button"
                    onClick={resetCompSelection}
                    className="text-sm text-[#8c8c8c] underline"
                  >
                    {t('admin.comp.cancel_selection')}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUMMARY_KEYS.map((key) => {
              const colors: Record<string, string> = {
                available: 'bg-green-100 text-green-900',
                locked: 'bg-amber-100 text-amber-900',
                booked: 'bg-red-100 text-red-900',
                total: 'bg-[#e8e8e8] text-[#000000]',
              };
              return (
                <div key={key} className={`rounded-xl p-4 ${colors[key]}`}>
                  <p className="text-xs font-medium uppercase opacity-80">{t(`admin.seat_map.${key}`)}</p>
                  <p className="text-2xl font-bold mt-1">{seatMap.summary[key]}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTierFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                tierFilter === null ? 'bg-black text-white border-black' : 'bg-white border-[#e8e8e8]'
              }`}
            >
              {t('admin.seat_map.all_tiers')}
            </button>
            {seatMap.tiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setTierFilter(tier.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  tierFilter === tier.id ? 'bg-black text-white border-black' : 'bg-white border-[#e8e8e8]'
                }`}
              >
                {tier.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AdminSeatMapViewer
                payload={seatMap}
                selectedTierId={tierFilter}
                selectedSeatId={compSelectMode ? null : selectedSeat?.id ?? null}
                onSeatSelect={setSelectedSeat}
                compSelectMode={compSelectMode}
                selectedSeatIds={selectedSeatIds}
                onSeatToggle={handleSeatToggle}
              />
            </div>
            <div className="bg-white rounded-xl border border-[#e8e8e8] p-4 min-h-[200px]">
              <h3 className="font-bold text-sm mb-3">{t('admin.seat_map.seat_details')}</h3>
              {compSelectMode ? (
                <p className="text-sm text-[#8c8c8c]">{t('admin.comp.select_mode_hint')}</p>
              ) : !selectedSeat ? (
                <p className="text-sm text-[#8c8c8c]">{t('admin.seat_map.click_seat')}</p>
              ) : selectedSeat.reservation ? (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.seat_label')}</dt>
                    <dd className="font-medium">{selectedSeat.seat_number}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.status')}</dt>
                    <dd className="font-medium capitalize">{selectedSeat.reservation.payment_status}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.reference')}</dt>
                    <dd className="font-medium">
                      {selectedSeat.reservation.reference_number ?? selectedSeat.reservation.id.slice(0, 8)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.guest')}</dt>
                    <dd className="font-medium">
                      {[selectedSeat.reservation.user.first_name, selectedSeat.reservation.user.last_name]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.email')}</dt>
                    <dd className="font-medium break-all">{selectedSeat.reservation.user.email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.phone')}</dt>
                    <dd className="font-medium">{selectedSeat.reservation.user.phone || '—'}</dd>
                  </div>
                </dl>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-[#8c8c8c]">{t('admin.seat_map.seat_label')}</dt>
                    <dd className="font-medium">{selectedSeat.seat_number}</dd>
                  </div>
                  <p className="text-green-700 font-medium">{t('admin.seat_map.available')}</p>
                </dl>
              )}
            </div>
          </div>
        </>
      )}

      {compModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#e8e8e8]">
              <h2 className="text-lg font-bold font-['Tajawal']">{t('admin.comp.modal_title')}</h2>
              <button
                type="button"
                onClick={() => setCompModalOpen(false)}
                className="p-1 rounded-full hover:bg-[#e8e8e8]"
                aria-label={t('admin.common.close')}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitComp} className="p-4 space-y-4">
              <p className="text-sm text-[#8c8c8c]">
                {t('admin.comp.modal_desc').replace('{{count}}', String(selectedSeatIds.size))}
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.comp.email')}</label>
                <input
                  type="email"
                  required
                  value={compEmail}
                  onChange={(e) => setCompEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('admin.comp.first_name')}</label>
                  <input
                    type="text"
                    required
                    value={compFirstName}
                    onChange={(e) => setCompFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('admin.comp.last_name')}</label>
                  <input
                    type="text"
                    required
                    value={compLastName}
                    onChange={(e) => setCompLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.comp.phone')}</label>
                <PhoneCountryField
                  country={getCountryByIso(compPhoneCountryIso) ?? COUNTRY_DIAL_CODES[0]}
                  onCountryChange={setCompPhoneCountryIso}
                  nationalNumber={compPhoneNational}
                  onNationalNumberChange={setCompPhoneNational}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.comp.note')}</label>
                <textarea
                  value={compNote}
                  onChange={(e) => setCompNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm resize-none"
                  placeholder={t('admin.comp.note_placeholder')}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={compSendEmail}
                  onChange={(e) => setCompSendEmail(e.target.checked)}
                  className="rounded"
                />
                {t('admin.comp.send_email')}
              </label>
              <button
                type="submit"
                disabled={compSubmitting}
                className="w-full py-3 bg-black text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {compSubmitting && <Loader2 size={18} className="animate-spin" />}
                {t('admin.comp.submit')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
