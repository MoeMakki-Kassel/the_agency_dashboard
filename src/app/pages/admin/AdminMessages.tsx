import React, { useEffect, useState } from "react";
import { Search, Download, Mail, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { useContactMessages, useMarkContactMessageRead } from "../../../hooks/useContactMessages";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDashboardLocale } from "../../../hooks/useDashboardLocale";
import { downloadCsv } from "../../utils/csvExport";
import { getUserFacingErrorMessage } from "../../../utils/userFacingError";
import { AdminRefreshButton } from "../../components/admin/AdminRefreshButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const PAGE_SIZE = 50;

export function AdminMessages() {
  const { t, isRTL } = useLanguage();
  const { formatDate } = useDashboardLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useContactMessages({
    search: searchTerm || undefined,
    unread_only: unreadOnly,
    limit: PAGE_SIZE,
    offset,
  });

  const markRead = useMarkContactMessageRead();

  useEffect(() => {
    setOffset(0);
  }, [searchTerm, unreadOnly]);

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  const selected = items.find((m) => m.id === detailId) ?? null;

  const showingText = isLoading
    ? t("admin.common.loading")
    : t("admin.common.showing_entries").replace("{{n}}", String(items.length)).replace("{{total}}", String(total));

  const exportCsv = () => {
    downloadCsv(
      "contact_messages",
      [
        { key: "name", header: "Name" },
        { key: "email", header: "Email" },
        { key: "phone", header: "Phone" },
        { key: "subject", header: "Subject" },
        { key: "read", header: "Read" },
        { key: "created", header: "Created" },
      ],
      items.map((m) => ({
        name: m.name,
        email: m.email,
        phone: m.phone ?? "",
        subject: m.subject,
        read: m.read_at ? "yes" : "no",
        created: formatDate(m.created_at),
      })),
    );
  };

  const handleMarkRead = (id: string) => {
    markRead.mutate(id, {
      onSuccess: () => toast.success(t("admin.messages.marked_read")),
      onError: (e) => toast.error(getUserFacingErrorMessage(e, "Failed")),
    });
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal'] text-ink-black">{t("admin.messages.title")}</h1>
          <p className="text-[#8c8c8c] text-sm mt-1">{t("admin.messages.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={exportCsv}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-warm-gray rounded-lg text-sm font-medium hover:bg-warm-gray/10 transition-colors flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 shrink-0" />
            {t("admin.common.export_csv")}
          </button>
        </div>
      </div>

      {isError && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span>{t("admin.messages.load_error")}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 self-start sm:self-auto px-3 py-1.5 rounded-lg border border-red-300 bg-white text-red-900 font-medium hover:bg-red-100/80"
          >
            {t("admin.waitlist.retry")}
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-warm-gray/50 shadow-sm">
        <div className="relative flex-1">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 text-[#8c8c8c] w-5 h-5 ${isRTL ? "end-3" : "start-3"}`}
          />
          <input
            type="text"
            placeholder={t("admin.messages.search_ph")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full py-2 rounded-lg border border-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-black/50 text-sm ${isRTL ? "pe-10 ps-4" : "ps-10 pe-4"}`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-black whitespace-nowrap cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded border-warm-gray"
          />
          {t("admin.messages.unread_only")}
        </label>
      </div>

      <div className="bg-white rounded-xl border border-warm-gray/50 shadow-sm overflow-hidden min-w-0">
        {/* Mobile / narrow: stacked cards */}
        <div className="md:hidden divide-y divide-warm-gray/50">
          {isLoading && (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-4 w-[75%] bg-[#e8e8e8] rounded" />
              <div className="h-4 w-1/2 bg-[#e8e8e8] rounded" />
            </div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="py-12 px-4 text-center text-[#8c8c8c] text-sm">{t("admin.messages.none")}</div>
          )}
          {!isLoading && !isError &&
            items.map((m) => (
              <div key={m.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className="shrink-0 pt-0.5">
                      {m.read_at ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" aria-label={t("admin.messages.read")} />
                      ) : (
                        <Circle className="w-5 h-5 text-[#8c8c8c]" aria-label={t("admin.messages.unread")} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink-black text-sm break-words">{m.name}</div>
                      <div className="text-xs text-[#8c8c8c] flex items-start gap-1 mt-1 break-all">
                        <Mail className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{m.email}</span>
                      </div>
                    </div>
                  </div>
                  <time className="text-xs text-[#8c8c8c] whitespace-nowrap shrink-0 tabular-nums">
                    {formatDate(m.created_at)}
                  </time>
                </div>
                <p className="text-sm text-ink-black line-clamp-2">{m.subject}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailId(m.id)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-warm-gray hover:bg-[#e8e8e8]"
                  >
                    {t("admin.messages.view")}
                  </button>
                  {!m.read_at && (
                    <button
                      type="button"
                      disabled={markRead.isPending}
                      onClick={() => handleMarkRead(m.id)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-black text-white hover:bg-accent disabled:opacity-50"
                    >
                      {t("admin.messages.mark_read")}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* md+: fixed column table — avoids huge gaps on wide screens */}
        <div className="hidden md:block admin-table-wrap min-w-0">
          <table className="w-full min-w-[56rem] max-w-full table-fixed border-collapse admin-table text-sm">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#e8e8e8] border-b border-warm-gray/50 font-medium text-ink-black">
                <th className="py-3 px-6 align-middle text-center whitespace-nowrap">{t("admin.messages.col_status")}</th>
                <th className="py-3 px-6 align-middle text-start whitespace-nowrap">{t("admin.messages.col_from")}</th>
                <th className="py-3 px-6 align-middle text-start whitespace-nowrap">{t("admin.messages.col_subject")}</th>
                <th className="py-3 px-6 align-middle text-start whitespace-nowrap">{t("admin.messages.col_date")}</th>
                <th className="py-3 px-6 align-middle text-end whitespace-nowrap">{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray/50">
              {isLoading && (
                <>
                  {[1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td className="py-3 px-6"><div className="h-4 w-6 bg-[#e8e8e8] rounded mx-auto" /></td>
                      <td className="py-3 px-6"><div className="h-4 max-w-[12rem] bg-[#e8e8e8] rounded" /></td>
                      <td className="py-3 px-6"><div className="h-4 max-w-full bg-[#e8e8e8] rounded" /></td>
                      <td className="py-3 px-6"><div className="h-4 w-20 bg-[#e8e8e8] rounded" /></td>
                      <td className="py-3 px-6" />
                    </tr>
                  ))}
                </>
              )}

              {!isLoading && !isError &&
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-[#e8e8e8]/30 transition-colors">
                    <td className="py-3 px-6 align-middle text-center">
                      {m.read_at ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" aria-label={t("admin.messages.read")} />
                      ) : (
                        <Circle className="w-5 h-5 text-[#8c8c8c] mx-auto" aria-label={t("admin.messages.unread")} />
                      )}
                    </td>
                    <td className="py-3 px-6 align-middle min-w-0 text-start">
                      <div className="font-medium text-ink-black truncate" title={m.name}>{m.name}</div>
                      <div className="text-xs text-[#8c8c8c] flex items-center gap-1 mt-0.5 min-w-0">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate" title={m.email}>{m.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 align-middle min-w-0 text-start">
                      <span className="text-ink-black truncate block" title={m.subject}>{m.subject}</span>
                    </td>
                    <td className="py-3 px-6 align-middle text-[#8c8c8c] whitespace-nowrap tabular-nums text-xs lg:text-sm text-start">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="py-3 px-6 align-middle text-end">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailId(m.id)}
                          className="px-2.5 py-1.5 text-xs lg:text-sm rounded-lg border border-warm-gray hover:bg-[#e8e8e8] shrink-0"
                        >
                          {t("admin.messages.view")}
                        </button>
                        {!m.read_at && (
                          <button
                            type="button"
                            disabled={markRead.isPending}
                            onClick={() => handleMarkRead(m.id)}
                            className="px-2.5 py-1.5 text-xs lg:text-sm rounded-lg bg-black text-white hover:bg-accent disabled:opacity-50 shrink-0"
                          >
                            {t("admin.messages.mark_read")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8c8c8c]">
                    {t("admin.messages.none")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-warm-gray/50 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-[#8c8c8c] bg-[#e8e8e8]/30">
          <div>{showingText}</div>
          <div className="flex gap-1 flex-wrap justify-center">
            <button
              type="button"
              disabled={!canPrev || isLoading || isError}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="px-3 py-1 border border-warm-gray rounded bg-white hover:bg-[#e8e8e8] disabled:opacity-50"
            >
              {t("admin.common.previous")}
            </button>
            <button
              type="button"
              disabled={!canNext || isLoading || isError}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="px-3 py-1 border border-warm-gray rounded bg-white hover:bg-[#e8e8e8] disabled:opacity-50"
            >
              {t("admin.common.next")}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Tajawal']">{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p className="text-[#8c8c8c]">
                {selected.name} · {selected.email}
                {selected.phone ? ` · ${selected.phone}` : ""}
              </p>
              <p className="text-ink-black whitespace-pre-wrap">{selected.message}</p>
              <p className="text-xs text-[#8c8c8c]">{formatDate(selected.created_at)}</p>
              {!selected.read_at && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-accent"
                  onClick={() => {
                    handleMarkRead(selected.id);
                    setDetailId(null);
                  }}
                >
                  {t("admin.messages.mark_read")}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
