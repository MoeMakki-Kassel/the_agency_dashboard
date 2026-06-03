import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../AuthProvider";
import { useMyPermissions } from "../../../hooks/useRolePermissions";
import {
  canAccessRoute,
  getDefaultDashboardPath,
  type DashboardNavGateContext,
} from "../../../utils/adminNav";

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { data: myPerms, isLoading, isError } = useMyPermissions();

  const ctx: DashboardNavGateContext = {
    userRole: user?.role,
    myPerms: myPerms ?? undefined,
    permsLoading: isLoading,
  };

  if (isError) return <Navigate to="/login" replace />;

  if (isLoading || myPerms == null) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh] text-[#8c8c8c]">
        Loading...
      </div>
    );
  }

  if (!canAccessRoute(ctx, location.pathname)) {
    const fallback = getDefaultDashboardPath(ctx);
    if (fallback === "/login") return <Navigate to="/login" replace />;
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
