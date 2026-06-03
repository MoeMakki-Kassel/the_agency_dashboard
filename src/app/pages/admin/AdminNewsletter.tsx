import React, { useEffect, useState } from "react";
import { Search, Download } from "lucide-react";
import { useNewsletterSubscribers } from "../../../hooks/useNewsletterSubscribers";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDashboardLocale } from "../../../hooks/useDashboardLocale";
import { downloadCsv } from "../../utils/csvExport";
import { AdminRefreshButton } from "../../components/admin/AdminRefreshButton";

const PAGE_SIZE = 50;

export function AdminNewsletter() {
  const { t, isRTL } = useLanguage();
  const { formatDate } = useDashboardLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, isFetching, refetch } = useNewsletterSubscribers({
    search: searchTerm || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  useEffect(() => {
    setOffset(0);
  }, [searchTerm]);

  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const showingText = isLoading
    ? t("admin.common.loading")
    : t("admin.common.showing_entries").replace("{{n}}", String(items.length)).replace("{{total}}", String(total));

  const exportCsv = () => {
    downloadCsv(
      "newsletter_subscribers",
      [
        { key: "email", header: "Email" },
        { key: "source", header: "Source" },
        { key: "created", header: "Subscribed" },
      ],
      items.map((m) => ({
        email: m.email,
        source: m.source,
        created: formatDate(m.created_at),
      })),
    );
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal'] text-ink-black">{t("admin.newsletter.title")}</h1>
          <p className="text-[#8c8c8c] text-sm mt-1">{t("admin.newsletter.subtitle")}</p>
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
          <span>{t("admin.newsletter.load_error")}</span>
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
            placeholder={t("admin.newsletter.search_ph")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full py-2 rounded-lg border border-warm-gray/50 focus:outline-none focus:ring-2 focus:ring-black/50 text-sm ${isRTL ? "pe-10 ps-4" : "ps-10 pe-4"}`}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-warm-gray/50 shadow-sm overflow-hidden min-w-0">
        <div className="md:hidden divide-y divide-warm-gray/50">
          {isLoading && (
            <div className="p-4 space-y-2 animate-pulse">
              <div className="h-4 w-[70%] bg-[#e8e8e8] rounded" />
              <div className="h-3 w-24 bg-[#e8e8e8] rounded" />
            </div>
          )}
          {!isLoading && !isError && items.length === 0 && (
            <div className="py-12 px-4 text-center text-[#8c8c8c] text-sm">{t("admin.newsletter.none")}</div>
          )}
          {!isLoading && !isError &&
            items.map((m) => (
              <div key={m.id} className="p-4 flex flex-col gap-1">
                <span className="font-medium text-ink-black text-sm break-all">{m.email}</span>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8c8c8c]">
                  <span className="uppercase tracking-wide">{m.source}</span>
                  <time className="tabular-nums whitespace-nowrap">{formatDate(m.created_at)}</time>
                </div>
              </div>
            ))}
        </div>

        <div className="hidden md:block admin-table-wrap min-w-0">
          <table className="w-full min-w-[40rem] max-w-full table-fixed border-collapse admin-table text-sm">
            <colgroup>
              <col style={{ width: '58%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr className="bg-[#e8e8e8] border-b border-warm-gray/50 font-medium text-ink-black">
                <th className="py-3 px-6 text-start whitespace-nowrap">{t("admin.newsletter.col_email")}</th>
                <th className="py-3 px-6 text-start whitespace-nowrap">{t("admin.newsletter.col_source")}</th>
                <th className="py-3 px-6 text-start whitespace-nowrap">{t("admin.newsletter.col_date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-gray/50">
              {isLoading && (
                <>
                  {[1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td className="py-3 px-6"><div className="h-4 max-w-[14rem] bg-[#e8e8e8] rounded" /></td>
                      <td className="py-3 px-6"><div className="h-4 w-16 bg-[#e8e8e8] rounded" /></td>
                      <td className="py-3 px-6"><div className="h-4 w-24 bg-[#e8e8e8] rounded" /></td>
                    </tr>
                  ))}
                </>
              )}

              {!isLoading && !isError &&
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-[#e8e8e8]/30 transition-colors">
                    <td className="py-3 px-6 font-medium text-ink-black min-w-0 align-top text-start">
                      <span className="truncate block" title={m.email}>{m.email}</span>
                    </td>
                    <td className="py-3 px-6 text-[#8c8c8c] whitespace-nowrap align-top text-start">{m.source}</td>
                    <td className="py-3 px-6 text-[#8c8c8c] whitespace-nowrap tabular-nums text-xs lg:text-sm align-top text-start">{formatDate(m.created_at)}</td>
                  </tr>
                ))}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-[#8c8c8c]">
                    {t("admin.newsletter.none")}
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
    </div>
  );
}
