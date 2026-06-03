import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../components/AuthProvider";
import { useMyPermissions } from "../../../hooks/useRolePermissions";
import type { DashboardNavGateContext } from "../../../utils/adminNav";
import { getDefaultDashboardPath, userHasOverviewAccess } from "../../../utils/adminNav";
import { AdminOverview } from "./AdminOverview";

export function AdminDashboardIndex() {
  const { user } = useAuth();
  const { data: myPerms, isLoading: permsLoading, isError: permsError } = useMyPermissions();

  const ctx: DashboardNavGateContext = {
    userRole: user?.role,
    myPerms: myPerms ?? undefined,
    permsLoading,
  };

  if (permsError) return <Navigate to="/login" replace />;

  if (permsLoading || myPerms == null) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[40vh] text-[#8c8c8c]">
        Loading...
      </div>
    );
  }

  if (userHasOverviewAccess(ctx)) return <AdminOverview />;

  return <Navigate to={getDefaultDashboardPath(ctx)} replace />;
}
