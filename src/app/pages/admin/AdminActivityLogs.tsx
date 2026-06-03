import { useState } from "react";
import { useActivityLogs } from "../../../hooks/useActivityLogs";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDashboardLocale } from "../../../hooks/useDashboardLocale";
import { downloadCsv } from "../../utils/csvExport";
import { AdminRefreshButton } from "../../components/admin/AdminRefreshButton";

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  "event.create", "event.update", "event.delete",
  "tier.create", "tier.update", "tier.delete",
  "user.role_change", "user.status_change",
  "user.signup", "user.login", "user.logout",
  "sponsor.create", "sponsor.update", "sponsor.delete", "sponsor.upload_logo",
  "permission.update",
  "settings.update",
];

const RESOURCE_OPTIONS = [
  "event", "tier", "user", "sponsor",
  "role_permission", "settings",
];

const ACTION_COLORS: Record<string, string> = {
  "event.create":     "bg-green-100 text-green-800",
  "event.update":     "bg-blue-100 text-blue-800",
  "event.delete":     "bg-red-100 text-red-800",
  "tier.create":      "bg-green-100 text-green-800",
  "tier.update":      "bg-blue-100 text-blue-800",
  "tier.delete":      "bg-red-100 text-red-800",
  "user.role_change": "bg-purple-100 text-purple-800",
  "user.status_change": "bg-amber-100 text-amber-800",
  "user.signup":      "bg-emerald-100 text-emerald-800",
  "user.login":       "bg-sky-100 text-sky-800",
  "user.logout":      "bg-slate-100 text-slate-800",
  "sponsor.create":   "bg-green-100 text-green-800",
  "sponsor.update":   "bg-blue-100 text-blue-800",
  "sponsor.delete":   "bg-red-100 text-red-800",
  "sponsor.upload_logo": "bg-indigo-100 text-indigo-800",
  "permission.update":"bg-gray-100 text-gray-800",
  "settings.update":  "bg-teal-100 text-teal-800",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {action}
    </span>
  );
}

function formatDetails(details: Record<string, unknown> | null) {
  if (!details) return "—";
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

export function AdminActivityLogs() {
  const { t } = useLanguage();
  const { formatDateTime } = useDashboardLocale();
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);

  const params = {
    limit: PAGE_SIZE,
    offset,
    ...(action && { action }),
    ...(resourceType && { resource_type: resourceType }),
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data, isLoading, isFetching, refetch } = useActivityLogs(params);

  const total = data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetPagination = () => setOffset(0);

  const exportPage = () => {
    const rows = (data?.data ?? []).map((log) => ({
      created_at: log.created_at,
      actor: log.user ? `${log.user.first_name} ${log.user.last_name} <${log.user.email}>` : '—',
      action: log.action,
      resource_type: log.resource_type ?? '—',
      resource_id: log.resource_id ?? '—',
      details: formatDetails(log.details),
      ip: log.ip_address ?? '—',
    }));
    downloadCsv(
      `admin_activity_logs_p${page}`,
      [
        { key: 'created_at', header: 'Timestamp' },
        { key: 'actor', header: 'Actor' },
        { key: 'action', header: 'Action' },
        { key: 'resource_type', header: 'Resource type' },
        { key: 'resource_id', header: 'Resource ID' },
        { key: 'details', header: 'Details' },
        { key: 'ip', header: 'IP' },
      ],
      rows
    );
  };

  const rangeLabel =
    total > 0
      ? t('admin.activity.results')
          .replace('{{from}}', String(offset + 1))
          .replace('{{to}}', String(Math.min(offset + PAGE_SIZE, total)))
          .replace('{{total}}', String(total))
      : t('admin.activity.zero_results');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#000000]">{t('admin.activity.title')}</h1>
          <p className="text-sm text-[#8c8c8c] mt-1">{t('admin.activity.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminRefreshButton onClick={() => void refetch()} isFetching={isFetching} />
          <button
            type="button"
            onClick={exportPage}
            disabled={!data?.data.length}
            className="px-4 py-2 border border-[#e8e8e8] bg-white rounded-lg text-sm font-medium hover:bg-[#e8e8e8] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            {t('admin.activity.export')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e8] p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wider">{t('admin.activity.action')}</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); resetPagination(); }}
            className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none bg-white min-w-[160px]"
          >
            <option value="">{t('admin.activity.all_actions')}</option>
            {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wider">{t('admin.activity.resource_type')}</label>
          <select
            value={resourceType}
            onChange={(e) => { setResourceType(e.target.value); resetPagination(); }}
            className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none bg-white min-w-[140px]"
          >
            <option value="">{t('admin.activity.all_types')}</option>
            {RESOURCE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wider">{t('admin.activity.from')}</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => { setFrom(e.target.value); resetPagination(); }}
            className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#8c8c8c] uppercase tracking-wider">{t('admin.activity.to')}</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => { setTo(e.target.value); resetPagination(); }}
            className="border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#000000] outline-none"
          />
        </div>

        {(action || resourceType || from || to) && (
          <button
            type="button"
            onClick={() => { setAction(""); setResourceType(""); setFrom(""); setTo(""); resetPagination(); }}
            className="px-4 py-2 text-sm text-[#8c8c8c] hover:text-[#000000] border border-[#e8e8e8] rounded-lg hover:border-[#000000] transition-colors self-end"
          >
            {t('admin.common.clear_filters')}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
        <div className="admin-table-wrap min-w-0">
          <table className="w-full min-w-[72rem] table-fixed border-collapse text-sm admin-table">
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr className="border-b border-[#e8e8e8] bg-[#e8e8e8]">
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.timestamp')}</th>
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.actor')}</th>
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.action')}</th>
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.resource_type')}</th>
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.resource_id')}</th>
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.details')}</th>
                <th className="text-start px-6 py-4 text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider whitespace-nowrap">{t('admin.activity.ip')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8e8]">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="hover:bg-transparent">
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-[#e8e8e8] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#8c8c8c]">
                    {t('admin.activity.none')}
                  </td>
                </tr>
              ) : (
                data?.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top text-[#8c8c8c] whitespace-nowrap tabular-nums text-sm">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4 align-top text-start min-w-0">
                      {log.user ? (
                        <div>
                          <div className="font-medium text-[#000000] truncate">
                            {log.user.first_name} {log.user.last_name}
                          </div>
                          <div className="text-xs text-[#8c8c8c] truncate">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-[#8c8c8c]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-start">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4 align-top text-start text-[#8c8c8c] truncate">{log.resource_type}</td>
                    <td className="px-6 py-4 align-top text-start font-mono text-xs text-[#8c8c8c] tabular-nums">
                      {log.resource_id ? `${log.resource_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-6 py-4 align-top text-start text-[#8c8c8c] min-w-0 truncate">
                      {formatDetails(log.details)}
                    </td>
                    <td className="px-6 py-4 align-top text-start text-[#8c8c8c] font-mono text-xs tabular-nums">
                      {log.ip_address ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#e8e8e8]">
          <span className="text-sm text-[#8c8c8c]">{rangeLabel}</span>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0 || isLoading}
              className="p-2 rounded-lg border border-[#e8e8e8] hover:border-[#000000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('admin.common.previous')}
            >
              <ChevronLeft size={16} className="rtl:rotate-180" />
            </button>
            <span className="px-3 py-2 text-sm text-[#8c8c8c]">{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total || isLoading}
              className="p-2 rounded-lg border border-[#e8e8e8] hover:border-[#000000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('admin.common.next')}
            >
              <ChevronRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
