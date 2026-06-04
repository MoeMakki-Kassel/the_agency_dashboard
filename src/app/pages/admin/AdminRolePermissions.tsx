import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePermissionMatrix, useUpdatePermission } from "../../../hooks/useRolePermissions";
import type { RoleResource } from "../../../api/types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../components/AuthProvider";
import { createDashboardRole, listDashboardRoles } from "../../../api/roles";

const ALL_RESOURCES: RoleResource[] = [
  "overview",
  "events", "reservations", "payments",
  "incomplete_payments", "users", "suppliers",
  "analytics", "scanner", "settings",
  "messages", "newsletter", "promo_codes",
  "venues",
];

const RESOURCE_TKEY: Record<RoleResource, string> = {
  overview: "admin.nav.overview",
  events: "admin.nav.events",
  reservations: "admin.nav.reservations",
  payments: "admin.nav.payments",
  incomplete_payments: "admin.nav.incomplete_payments",
  users: "admin.nav.users",
  suppliers: "admin.nav.sponsors",
  analytics: "admin.nav.analytics",
  scanner: "admin.nav.scanner",
  settings: "admin.nav.settings",
  messages: "admin.nav.messages",
  newsletter: "admin.nav.newsletter",
  promo_codes: "admin.nav.promo_codes",
  venues: "admin.nav.venues",
};

const ROLE_TKEY: Record<string, string> = {
  super_admin: "admin.roles.role_super",
  secretary: "admin.roles.role_secretary",
  doorman: "admin.roles.role_doorman",
  customer: "admin.roles.role_customer",
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  secretary: "bg-blue-100 text-blue-800",
  doorman: "bg-amber-100 text-amber-800",
  customer: "bg-gray-100 text-gray-800",
};

function roleLabel(slug: string, displayName?: string) {
  if (ROLE_TKEY[slug]) return ROLE_TKEY[slug];
  return displayName || slug;
}

export function AdminRolePermissions() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const qc = useQueryClient();
  const { data: matrix, isLoading } = usePermissionMatrix();
  const { mutate: update, isPending } = useUpdatePermission();
  const [newRoleName, setNewRoleName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rolesData } = useQuery({
    queryKey: ["dashboard-roles"],
    queryFn: () => listDashboardRoles(token!),
    enabled: Boolean(token),
  });

  const roles = useMemo(() => {
    const fromApi = rolesData?.data ?? [];
    if (fromApi.length) return fromApi;
    return Object.keys(matrix ?? {}).map((slug) => ({
      slug,
      display_name: slug,
      is_system: slug === "super_admin" || slug === "secretary" || slug === "doorman" || slug === "customer",
      can_access_dashboard: slug !== "customer",
      created_at: "",
    }));
  }, [rolesData, matrix]);

  const createRoleMutation = useMutation({
    mutationFn: (name: string) => createDashboardRole(token!, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["dashboard-roles"] });
      void qc.invalidateQueries({ queryKey: ["rolePermissionMatrix"] });
      setNewRoleName("");
      setDialogOpen(false);
      toast.success(t("admin.roles.created"));
    },
    onError: (err: Error) => toast.error(err.message || t("admin.roles.create_failed")),
  });

  const handleToggle = (role: string, resource: RoleResource, current: boolean) => {
    if (role === "super_admin") return;
    update({ role, resource, granted: !current });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.roles.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.roles.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent"
        >
          {t("admin.roles.add_role")}
        </button>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{t("admin.roles.add_role")}</h2>
            <label className="block text-sm font-medium mb-2">{t("admin.roles.role_name")}</label>
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm mb-4"
              placeholder={t("admin.roles.role_name_ph")}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm"
              >
                {t("admin.common.cancel")}
              </button>
              <button
                type="button"
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
                onClick={() => createRoleMutation.mutate(newRoleName.trim())}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
              >
                {createRoleMutation.isPending ? t("admin.common.loading") : t("admin.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-x-auto admin-table-wrap min-w-0">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[56rem] border-collapse text-sm admin-table">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="sticky start-0 z-10 bg-muted text-start px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[140px]">
                  {t("admin.roles.col_role")}
                </th>
                {ALL_RESOURCES.map((r) => (
                  <th
                    key={r}
                    className="text-center px-2 py-3 text-[10px] leading-tight font-semibold text-muted-foreground uppercase tracking-wide min-w-[72px] max-w-[96px] whitespace-normal align-bottom"
                  >
                    {t(RESOURCE_TKEY[r])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8e8]">
              {roles.map((roleRow) => {
                const role = roleRow.slug;
                const isSuperAdmin = role === "super_admin";
                const badge = ROLE_BADGE[role] ?? "bg-slate-100 text-slate-800";
                const labelKey = roleLabel(role, roleRow.display_name);
                const label = ROLE_TKEY[role] ? t(labelKey) : roleRow.display_name;
                return (
                  <tr key={role} className="hover:bg-gray-50 transition-colors">
                    <td className="sticky start-0 z-10 bg-card px-4 py-3 align-middle text-start shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge}`}>
                        {label}
                      </span>
                    </td>
                    {ALL_RESOURCES.map((resource) => {
                      const granted = matrix?.[role]?.[resource] ?? false;
                      return (
                        <td key={resource} className="px-2 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={granted}
                            disabled={isSuperAdmin || isPending}
                            onChange={() => handleToggle(role, resource, granted)}
                            className="w-4 h-4 rounded border-gray-300 text-foreground focus:ring-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            aria-label={`${label} — ${t(RESOURCE_TKEY[resource])}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("admin.roles.footer_note")}</p>
    </div>
  );
}
