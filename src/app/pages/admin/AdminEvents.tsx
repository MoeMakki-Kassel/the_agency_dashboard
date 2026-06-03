import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Calendar,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { useEvents, useDeleteEvent } from "../../../hooks/useEvents";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDashboardLocale } from "../../../hooks/useDashboardLocale";
import { downloadCsv } from "../../utils/csvExport";
import { getUserFacingErrorMessage } from "../../../utils/userFacingError";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { AdminRefreshButton } from "../../components/admin/AdminRefreshButton";
import { isUnlistedVisibility } from "../../utils/eventVisibility";
import { deriveEventStatus, EVENT_DISPLAY_TIME_ZONE } from "../../utils/eventSchedule";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1540039155732-61ee14b12658?auto=format&fit=crop&w=400&q=80";

type EventStatusKey = 'upcoming' | 'live' | 'past';

function eventStatusLabel(t: (k: string) => string, s: EventStatusKey) {
  if (s === 'past') return t('admin.events.status_past');
  if (s === 'live') return t('admin.events.status_live');
  return t('admin.events.status_upcoming');
}

function listVisibilityLabel(t: (k: string) => string, visibility: string | undefined) {
  return isUnlistedVisibility(visibility)
    ? t('admin.events.visibility_unlisted')
    : t('admin.events.visibility_public');
}

function visibilityPillClass(visibility: string | undefined) {
  return isUnlistedVisibility(visibility)
    ? 'bg-[#525252]/10 text-[#525252]'
    : 'bg-[#000000]/10 text-[#000000]';
}

type EventsTab = 'All' | 'Upcoming' | 'Live Now' | 'Past';

export function AdminEvents() {
  const { t, isRTL } = useLanguage();
  const { locale, formatDate } = useDashboardLocale();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<EventsTab>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const tabDefs: { id: EventsTab; label: string }[] = [
    { id: 'All', label: t('admin.events.tab_all') },
    { id: 'Upcoming', label: t('admin.events.tab_upcoming') },
    { id: 'Live Now', label: t('admin.events.tab_live') },
    { id: 'Past', label: t('admin.events.tab_past') },
  ];

  const { data, isLoading, isFetching, refetch } = useEvents({ limit: 50 });
  const deleteEventMutation = useDeleteEvent();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const openDeleteConfirm = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setDeleteTarget({ id, title });
  };

  const confirmDeleteEvent = () => {
    if (!deleteTarget) return;
    deleteEventMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('admin.events.delete_success'));
        setDeleteTarget(null);
      },
      onError: (err: Error) => toast.error(getUserFacingErrorMessage(err, 'Failed to delete event')),
    });
  };

  const deleteListItems = [
    t('admin.events.delete_modal_item_reservations'),
    t('admin.events.delete_modal_item_tickets'),
    t('admin.events.delete_modal_item_scan_logs'),
    t('admin.events.delete_modal_item_waitlist'),
    t('admin.events.delete_modal_item_access'),
  ];

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const allEvents = data?.data ?? [];

  const filteredEvents = allEvents.filter(event => {
    const st = deriveEventStatus(event.date_time, event.end_date_and_time);
    const statusTab: EventsTab =
      st === 'upcoming' ? 'Upcoming' :
      st === 'live' ? 'Live Now' :
      'Past';

    const matchesTab = activeTab === 'All' || statusTab === activeTab;

    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const formatEventSchedule = (start: string, end?: string | null) => {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleString(locale, { timeZone: EVENT_DISPLAY_TIME_ZONE });
    if (end) {
      return `${fmt(start)} – ${fmt(end)}`;
    }
    return formatDate(start, { day: '2-digit', month: 'short', year: 'numeric', timeZone: EVENT_DISPLAY_TIME_ZONE });
  };

  const exportEvents = () => {
    downloadCsv(
      'admin_events',
      [
        { key: 'title', header: 'Title' },
        { key: 'date', header: 'Date' },
        { key: 'venue', header: 'Venue' },
        { key: 'tiers', header: 'Tiers' },
        { key: 'status', header: 'Status' },
        { key: 'visibility', header: t('admin.events.visibility_col') },
      ],
      filteredEvents.map((event) => {
        const st = deriveEventStatus(event.date_time, event.end_date_and_time);
        const tierCount = event.tiers?.length ?? 0;
        return {
          title: event.title,
          date: formatEventSchedule(event.date_time, event.end_date_and_time),
          venue: event.location_name,
          tiers: String(tierCount),
          status: eventStatusLabel(t, st),
          visibility: listVisibilityLabel(t, event.visibility),
        };
      })
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-['Tajawal'] text-[#000000]">{t('admin.events.title')}</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={exportEvents}
            className="px-5 py-2.5 border border-[#e8e8e8] bg-white rounded-lg text-sm font-medium hover:bg-[#e8e8e8] transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} className="shrink-0" />
            {t('admin.common.export_csv')}
          </button>
          <Link to="/events/new" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <Plus size={18} className="shrink-0" />
            {t('admin.events.create_new')}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-[#e8e8e8] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#e8e8e8] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#e8e8e8]/50">
          <div className="flex overflow-x-auto w-full md:w-auto hide-scrollbar gap-2">
            {tabDefs.map((tab) => (
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

          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-[#8c8c8c] ${isRTL ? 'end-3' : 'start-3'}`} size={18} />
              <input
                type="text"
                placeholder={t('admin.events.search_ph')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full bg-white border border-[#e8e8e8] rounded-lg py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none ${isRTL ? 'pe-10 ps-4' : 'ps-10 pe-4'}`}
              />
            </div>
            <div className="flex border border-[#e8e8e8] rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setView('grid')}
                className={`p-2 ${view === 'grid' ? 'bg-[#e8e8e8] text-[#000000]' : 'text-[#8c8c8c]'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button
                onClick={() => setView('table')}
                className={`p-2 ${view === 'table' ? 'bg-[#e8e8e8] text-[#000000]' : 'text-[#8c8c8c]'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-[#e8e8e8] rounded-xl overflow-hidden bg-white animate-pulse">
                  <div className="h-40 bg-[#e8e8e8]" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-[#e8e8e8] rounded w-3/4" />
                    <div className="h-4 bg-[#e8e8e8] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium text-[#000000]">{t('admin.events.no_found')}</p>
              <p className="text-sm text-[#8c8c8c] mt-1">{t('admin.events.adjust')}</p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map(event => {
                const st = deriveEventStatus(event.date_time, event.end_date_and_time);
                const tierCount = event.tiers?.length ?? 0;

                let badgeColor = "text-[#8c8c8c]";
                if (st === "upcoming") badgeColor = "text-[#525252]";
                if (st === "live") badgeColor = "text-[#000000]";

                return (
                  <div key={event.id} className="border border-[#e8e8e8] rounded-xl overflow-hidden hover:shadow-lg transition-shadow group bg-white">
                    <div className="h-40 relative overflow-hidden bg-[#000000]">
                      <img
                        src={event.cover_photo || FALLBACK_IMAGE}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 start-3 flex flex-wrap gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-md bg-white/90 ${badgeColor}`}>
                          {eventStatusLabel(t, st)}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-md bg-white/90 ${visibilityPillClass(event.visibility)}`}>
                          {listVisibilityLabel(t, event.visibility)}
                        </span>
                      </div>
                      <div className="absolute top-3 end-3 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative">
                          <button
                            onClick={(e) => toggleMenu(event.id, e)}
                            className="w-8 h-8 rounded-full bg-white/90 text-[#000000] flex items-center justify-center hover:bg-white"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                            {menuOpenId === event.id && (
                            <div className="absolute end-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-[#e8e8e8] py-1 z-10 animate-in fade-in zoom-in-95 duration-200">
                              <Link
                                to={`/events/${event.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-[#000000] hover:bg-[#e8e8e8]"
                              >
                                <Edit2 size={14} /> {t('admin.common.edit')}
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => openDeleteConfirm(event.id, event.title, e)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#525252] hover:bg-accent/10 text-start"
                              >
                                <Trash2 size={14} /> {t('admin.common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-[#000000] mb-2">{event.title}</h3>

                      <div className="space-y-1.5 mb-5">
                        <div className="flex items-center gap-2 text-sm text-[#8c8c8c]">
                          <Calendar size={14} className="shrink-0" />
                          {formatEventSchedule(event.date_time, event.end_date_and_time)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-[#8c8c8c]">
                          <MapPin size={14} className="shrink-0" />
                          <span className="truncate">{event.location_name}</span>
                        </div>
                      </div>

                      {tierCount > 0 && (
                        <div className="text-sm text-[#8c8c8c]">
                          <span className="font-medium text-[#000000]">{tierCount}</span>{' '}
                          {tierCount !== 1 ? t('admin.overview.tiers') : t('admin.overview.tier')}
                        </div>
                      )}
                    </div>
                    {/* Mobile: always-visible action bar */}
                    <div className="md:hidden flex border-t border-[#e8e8e8] divide-x divide-[#e8e8e8] rtl:flex-row-reverse">
                      <Link
                        to={`/events/${event.id}/edit`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#000000] hover:bg-[#e8e8e8] transition-colors"
                      >
                        <Edit2 size={14} /> {t('admin.common.edit')}
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => openDeleteConfirm(event.id, event.title, e)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-[#525252] hover:bg-accent/10 transition-colors"
                      >
                        <Trash2 size={14} /> {t('admin.common.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="admin-table-wrap min-w-0">
              <table className="w-full min-w-[64rem] table-fixed border-collapse admin-table text-sm">
                <colgroup>
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead className="bg-[#e8e8e8] text-xs uppercase text-[#8c8c8c] tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.events.event_col')}</th>
                    <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.events.date_venue')}</th>
                    <th className="px-6 py-4 font-medium text-end whitespace-nowrap">{t('admin.events.tiers_col')}</th>
                    <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.events.status_col')}</th>
                    <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.events.visibility_col')}</th>
                    <th className="px-6 py-4 font-medium text-end whitespace-nowrap"><span className="sr-only">{t('admin.common.actions')}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e8]">
                  {filteredEvents.map(event => {
                    const st = deriveEventStatus(event.date_time, event.end_date_and_time);
                    const tierCount = event.tiers?.length ?? 0;

                    return (
                      <tr key={event.id} className="hover:bg-[#e8e8e8]/50 transition-colors">
                        <td className="px-6 py-4 align-top text-start min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={event.cover_photo || FALLBACK_IMAGE}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                            <span className="font-medium text-[#000000] truncate">{event.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-start text-[#8c8c8c] min-w-0">
                          <div className="tabular-nums">{formatEventSchedule(event.date_time, event.end_date_and_time)}</div>
                          <div className="text-xs truncate">{event.location_name}</div>
                        </td>
                        <td className="px-6 py-4 align-top text-end tabular-nums text-[#000000]">
                          <div>
                            {tierCount} {tierCount !== 1 ? t('admin.overview.tiers') : t('admin.overview.tier')}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-start">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${st === 'upcoming' ? 'bg-[#525252]/10 text-[#525252]' :
                              st === 'live' ? 'bg-[#000000]/10 text-[#000000]' :
                              'bg-[#8c8c8c]/10 text-[#8c8c8c]'
                            }`}>
                            {eventStatusLabel(t, st)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-start">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${visibilityPillClass(event.visibility)}`}>
                            {listVisibilityLabel(t, event.visibility)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-end">
                          <div className="relative inline-block text-start">
                            <button
                              type="button"
                              onClick={(e) => toggleMenu(event.id, e)}
                              className="text-[#8c8c8c] hover:text-[#000000] p-1 rounded-full hover:bg-[#e8e8e8] transition-colors"
                              aria-label={t('admin.common.actions')}
                            >
                              <MoreHorizontal size={20} />
                            </button>
                            {menuOpenId === event.id && (
                              <div className="absolute end-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-[#e8e8e8] py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                                <Link
                                  to={`/events/${event.id}/edit`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#000000] hover:bg-[#e8e8e8]"
                                >
                                  <Edit2 size={14} /> {t('admin.common.edit')}
                                </Link>
                                <button
                                  type="button"
                                  onClick={(e) => openDeleteConfirm(event.id, event.title, e)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#525252] hover:bg-accent/10 text-start"
                                >
                                  <Trash2 size={14} /> {t('admin.common.delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-[#e8e8e8] bg-white text-[#000000] sm:max-w-md">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-['Tajawal'] text-xl text-[#000000]">
              {t('admin.events.delete_modal_title')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-[#525252] text-sm text-start">
                <p>
                  {t('admin.events.delete_modal_intro').replace('{{title}}', deleteTarget?.title ?? '')}
                </p>
                <p className="font-medium text-[#000000]">{t('admin.events.delete_modal_list_heading')}</p>
                <ul className="list-disc ps-5 space-y-1.5">
                  {deleteListItems.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end flex-row flex-wrap">
            <AlertDialogCancel
              type="button"
              className="mt-0 border-[#e8e8e8] bg-white text-[#000000] hover:bg-[#e8e8e8]"
            >
              {t('admin.common.cancel')}
            </AlertDialogCancel>
            <button
              type="button"
              disabled={deleteEventMutation.isPending}
              onClick={confirmDeleteEvent}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#b91c1c] px-4 text-sm font-semibold text-white hover:bg-[#991b1b] disabled:opacity-50 disabled:pointer-events-none"
            >
              {deleteEventMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                t('admin.events.delete_modal_confirm')
              )}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
