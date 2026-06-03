import type { LucideIcon } from "lucide-react";
import {
  Home,
  Calendar,
  Ticket,
  CreditCard,
  Users,
  BarChart,
  QrCode,
  Settings,
  UserPlus,
  Package,
  Shield,
  Activity,
  Mail,
  Newspaper,
  Tag,
  Map,
} from "lucide-react";
import type { MyPermissions, RoleResource } from "../api/types";

export type AdminSidebarNavItem = {
  tkey: string;
  path: string;
  icon: LucideIcon;
  resource: RoleResource | null;
  superAdminOnly: boolean;
};

/** Single source for sidebar + default path + index redirect. Keep order = display order. */
export const ADMIN_SIDEBAR_NAV_ITEMS: readonly AdminSidebarNavItem[] = [
  { tkey: "admin.nav.overview", path: "/", icon: Home, resource: "overview", superAdminOnly: false },
  { tkey: "admin.nav.events", path: "/events", icon: Calendar, resource: "events", superAdminOnly: false },
  { tkey: "admin.nav.venues", path: "/venues", icon: Map, resource: "venues", superAdminOnly: false },
  { tkey: "admin.nav.reservations", path: "/reservations", icon: Ticket, resource: "reservations", superAdminOnly: false },
  { tkey: "admin.nav.event_seat_map", path: "/event-seat-map", icon: Map, resource: "reservations", superAdminOnly: false },
  { tkey: "admin.nav.payments", path: "/payments", icon: CreditCard, resource: "payments", superAdminOnly: false },
  { tkey: "admin.nav.messages", path: "/messages", icon: Mail, resource: "messages", superAdminOnly: false },
  { tkey: "admin.nav.newsletter", path: "/newsletter", icon: Newspaper, resource: "newsletter", superAdminOnly: false },
  {
    tkey: "admin.nav.incomplete_payments",
    path: "/incomplete-payments",
    icon: CreditCard,
    resource: "incomplete_payments",
    superAdminOnly: false,
  },
  { tkey: "admin.nav.users", path: "/users", icon: Users, resource: "users", superAdminOnly: false },
  { tkey: "admin.nav.sponsors", path: "/sponsors", icon: Package, resource: "suppliers", superAdminOnly: false },
  { tkey: "admin.nav.promo_codes", path: "/promo-codes", icon: Tag, resource: "promo_codes", superAdminOnly: false },
  { tkey: "admin.nav.analytics", path: "/analytics", icon: BarChart, resource: "analytics", superAdminOnly: false },
  { tkey: "admin.nav.scanner", path: "/scan", icon: QrCode, resource: "scanner", superAdminOnly: false },
  { tkey: "admin.nav.settings", path: "/settings", icon: Settings, resource: "settings", superAdminOnly: false },
  { tkey: "admin.nav.role_permissions", path: "/role-permissions", icon: Shield, resource: null, superAdminOnly: true },
  { tkey: "admin.nav.activity_logs", path: "/activity-logs", icon: Activity, resource: null, superAdminOnly: true },
];

export type DashboardNavGateContext = {
  userRole?: string | null;
  myPerms?: Pick<MyPermissions, "resources"> | null;
  permsLoading: boolean;
};

type NavGate = Pick<AdminSidebarNavItem, "path" | "resource" | "superAdminOnly">;

function isSuperAdmin(role: string | null | undefined) {
  return role === "super_admin";
}

/** Matches sidebar visibility: super-admin-only rows for `super_admin` only; other rows require `resource` and granted `resources` entry (unless `super_admin`, who sees all non–super-admin-only rows). */
export function filterVisibleDashboardNavItems(
  ctx: DashboardNavGateContext,
  items: readonly AdminSidebarNavItem[] = ADMIN_SIDEBAR_NAV_ITEMS,
): AdminSidebarNavItem[] {
  const { userRole, myPerms, permsLoading } = ctx;

  return items.filter((item) => {
    const gate: NavGate = item;
    if (gate.superAdminOnly) return isSuperAdmin(userRole);
    if (gate.resource == null) return false;
    if (isSuperAdmin(userRole)) return true;
    if (permsLoading || myPerms?.resources == null) return false;
    return myPerms.resources.includes(gate.resource);
  });
}

/**
 * First visible sidebar path while permissions are idle, or `'/'` while loading.
 * If nothing is granted, `/login` (caller should rarely hit this before permissions resolve).
 */
export function getDefaultDashboardPath(ctx: DashboardNavGateContext): string {
  if (ctx.permsLoading) return "/";
  const visible = filterVisibleDashboardNavItems(ctx);
  if (visible.length === 0) return "/login";
  return visible[0].path;
}

export function userHasOverviewAccess(ctx: DashboardNavGateContext): boolean {
  if (ctx.permsLoading || ctx.myPerms?.resources == null) return false;
  return ctx.myPerms.resources.includes("overview");
}

/** Route → same access rules as sidebar (blocks deep links). */
export function resolveRouteAccess(pathname: string): NavGate | null {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/scan") {
    return { path: "/scan", resource: "scanner", superAdminOnly: false };
  }
  if (path === "/role-permissions") {
    return { path, resource: null, superAdminOnly: true };
  }
  if (path === "/activity-logs") {
    return { path, resource: null, superAdminOnly: true };
  }
  if (path === "/" || path === "") {
    return { path: "/", resource: "overview", superAdminOnly: false };
  }
  if (path.startsWith("/events")) {
    return { path: "/events", resource: "events", superAdminOnly: false };
  }
  if (path.startsWith("/venues")) {
    return { path: "/venues", resource: "venues", superAdminOnly: false };
  }
  if (path.startsWith("/reservations") || path.startsWith("/event-seat-map")) {
    return { path: "/reservations", resource: "reservations", superAdminOnly: false };
  }
  if (path.startsWith("/payments")) {
    return { path: "/payments", resource: "payments", superAdminOnly: false };
  }
  if (path.startsWith("/incomplete-payments")) {
    return { path: "/incomplete-payments", resource: "incomplete_payments", superAdminOnly: false };
  }
  if (path.startsWith("/users")) {
    return { path: "/users", resource: "users", superAdminOnly: false };
  }
  if (path.startsWith("/sponsors")) {
    return { path: "/sponsors", resource: "suppliers", superAdminOnly: false };
  }
  if (path.startsWith("/promo-codes")) {
    return { path: "/promo-codes", resource: "promo_codes", superAdminOnly: false };
  }
  if (path.startsWith("/analytics")) {
    return { path: "/analytics", resource: "analytics", superAdminOnly: false };
  }
  if (path.startsWith("/messages")) {
    return { path: "/messages", resource: "messages", superAdminOnly: false };
  }
  if (path.startsWith("/newsletter")) {
    return { path: "/newsletter", resource: "newsletter", superAdminOnly: false };
  }
  if (path.startsWith("/settings")) {
    return { path: "/settings", resource: "settings", superAdminOnly: false };
  }

  return null;
}

export function canAccessRoute(ctx: DashboardNavGateContext, pathname: string): boolean {
  if (ctx.permsLoading || ctx.myPerms?.resources == null) return false;

  const gate = resolveRouteAccess(pathname);
  if (!gate) return false;

  if (gate.superAdminOnly) return isSuperAdmin(ctx.userRole);
  if (gate.resource == null) return false;
  if (isSuperAdmin(ctx.userRole)) return true;

  if (gate.path === "/" || gate.path === "") {
    return userHasOverviewAccess(ctx) || filterVisibleDashboardNavItems(ctx).length > 0;
  }

  return ctx.myPerms.resources.includes(gate.resource);
}
