import React, { useLayoutEffect } from "react";
import { createBrowserRouter, Navigate } from "react-router";

import { Login } from "./pages/Login";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminRouteGuard } from "./components/admin/AdminRouteGuard";
import { AdminDashboardIndex } from "./pages/admin/AdminDashboardIndex";
import { AdminEvents } from "./pages/admin/AdminEvents";
import { AdminEventEditor } from "./pages/admin/AdminEventEditor";
import { AdminReservations } from "./pages/admin/AdminReservations";
import { AdminEventSeatMap } from "./pages/admin/AdminEventSeatMap";
import { AdminQRScanner } from "./pages/admin/AdminQRScanner";
import { AdminAnalytics } from "./pages/admin/AdminAnalytics";
import { AdminPayments } from "./pages/admin/AdminPayments";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminIncompletePayments } from "./pages/admin/AdminIncompletePayments";
import { AdminSponsors } from "./pages/admin/AdminSponsors";
import { AdminPromoCodes } from "./pages/admin/AdminPromoCodes";
import { AdminRolePermissions } from "./pages/admin/AdminRolePermissions";
import { AdminActivityLogs } from "./pages/admin/AdminActivityLogs";
import { AdminVenues } from "./pages/admin/AdminVenues";
import { AdminVenueEditor } from "./pages/admin/AdminVenueEditor";
import { AdminVenueSetup } from "./pages/admin/AdminVenueSetup";
import { AdminMessages } from "./pages/admin/AdminMessages";
import { AdminNewsletter } from "./pages/admin/AdminNewsletter";
import { useAuth } from "./components/AuthProvider";
import { isDashboardTeamRole } from "../utils/dashboardRole";

// A simple protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, user, loading, signOut } = useAuth();
  const invalidRole = Boolean(user && !isDashboardTeamRole(user.role));

  useLayoutEffect(() => {
    if (!loading && invalidRole) signOut();
  }, [loading, invalidRole, signOut]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (invalidRole) return <Navigate to="/login" replace />;
  if (token && !user) return <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">Loading...</div>;

  return <>{children}</>;
}

export const router = createBrowserRouter([
  // ── Login page ──────────────────────────────────────────────────────────────
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, Component: AdminDashboardIndex },
      { path: "events", Component: AdminEvents },
      { path: "events/new", Component: AdminEventEditor },
      { path: "events/:id/edit", Component: AdminEventEditor },
      { path: "venues", Component: AdminVenues },
      { path: "venues/:id/setup", Component: AdminVenueSetup },
      { path: "venues/:id/edit", Component: AdminVenueEditor },
      { path: "reservations", Component: AdminReservations },
      { path: "event-seat-map", Component: AdminEventSeatMap },
      { path: "analytics", Component: AdminAnalytics },
      { path: "incomplete-payments", Component: AdminIncompletePayments },
      { path: "payments", Component: AdminPayments },
      { path: "users", Component: AdminUsers },
      { path: "sponsors", Component: AdminSponsors },
      { path: "promo-codes", Component: AdminPromoCodes },
      { path: "messages", Component: AdminMessages },
      { path: "newsletter", Component: AdminNewsletter },
      { path: "settings", Component: AdminSettings },
      { path: "role-permissions", Component: AdminRolePermissions },
      { path: "activity-logs", Component: AdminActivityLogs },
    ],
  },
  {
    path: "/scan",
    element: (
      <ProtectedRoute>
        <AdminRouteGuard>
          <AdminQRScanner />
        </AdminRouteGuard>
      </ProtectedRoute>
    ),
  },
]);