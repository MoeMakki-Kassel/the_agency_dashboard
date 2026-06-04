import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "../AuthProvider";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  Bell,
  Search,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useMyPermissions } from '../../../hooks/useRolePermissions';
import { useSettings } from '../../../hooks/useSettings';
import {
  ADMIN_SIDEBAR_NAV_ITEMS,
  filterVisibleDashboardNavItems,
  getDefaultDashboardPath,
  type DashboardNavGateContext,
} from '../../../utils/adminNav';
import { AdminRouteGuard } from './AdminRouteGuard';
import fallbackLogo from "../../../imports/logo_theagencyjo.png";

export function AdminLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { data: myPerms, isLoading: permsLoading } = useMyPermissions();
  const { data: settings } = useSettings();
  const logoUrlDark = settings?.logo_url_dark?.trim();
  const logoUrlLight = settings?.logo_url?.trim();
  /** Dark sidebar: prefer light-on-dark asset; fall back to default logo URL, then bundled asset. */
  const sidebarLogoSrc = logoUrlDark || logoUrlLight || fallbackLogo;
  const sidebarLogoInvert =
    !logoUrlDark && !logoUrlLight ? "filter brightness-0 invert" : "";

  const navCtx: DashboardNavGateContext = {
    userRole: user?.role,
    myPerms: myPerms ?? undefined,
    permsLoading,
  };
  const visibleNavItems = filterVisibleDashboardNavItems(navCtx);
  const logoHomePath = getDefaultDashboardPath(navCtx);

  // Off-canvas slide must be max-lg only: at lg+ we only use lg:translate-x-0. If rtl:translate-x-full
  // and lg:translate-x-0 both apply, cascade can let rtl win and hide the sidebar on desktop.
  const sidebarTransform = mobileMenuOpen
    ? 'translate-x-0'
    : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full lg:translate-x-0';

  return (
    <div className="flex h-screen bg-background text-foreground font-['Inter']">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-secondary/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-50 w-[min(100vw-3rem,260px)] sm:w-[260px] bg-primary text-[#e8e8e8] flex flex-col transition-transform duration-300 ease-in-out lg:relative ${sidebarTransform}`}
      >
        <div className="p-6 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <Link to={logoHomePath} className="block" onClick={() => setMobileMenuOpen(false)}>
              <img
                src={sidebarLogoSrc}
                alt="TheAgencyJo."
                className={`h-8 w-auto max-w-full object-contain ${sidebarLogoInvert}`}
              />
            </Link>
            <div className="text-xs text-muted-foreground mt-2 uppercase tracking-wider font-semibold">
              {t('admin.shell.admin_panel')}
            </div>
          </div>
          <button
            type="button"
            className="lg:hidden text-[#e8e8e8] shrink-0 p-1"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t('admin.common.cancel')}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto overscroll-contain pb-4">
          {visibleNavItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" &&
                location.pathname.startsWith(`${item.path}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary/15 text-white"
                    : "text-[#e8e8e8] hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-e-full" />
                )}
                <Icon size={20} className={isActive ? "text-white" : "text-muted-foreground"} />
                <span className="font-medium truncate">{t(item.tkey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            type="button"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#e8e8e8] hover:bg-white/5 hover:text-white w-full transition-colors"
            onClick={() => {
              signOut();
              window.location.href = '/login';
            }}
          >
            <LogOut size={20} className="text-muted-foreground" />
            <span className="font-medium">{t('admin.shell.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="min-h-[72px] bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 px-4 lg:px-8 py-2 lg:py-0 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 -ms-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>

            <div className="max-w-md w-full relative flex-1 min-w-0">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isRTL ? 'end-3' : 'start-3'}`}
                size={20}
              />
              <input
                type="search"
                placeholder={t('admin.shell.search_placeholder')}
                className={`w-full bg-input text-foreground border-none rounded-full py-2 text-sm focus:ring-2 focus:ring-primary outline-none ${
                  isRTL ? 'pe-10 ps-4' : 'ps-10 pe-4'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 shrink-0 ms-auto">
            <div
              className="flex rounded-lg overflow-hidden border border-border bg-muted shrink-0"
              role="group"
              aria-label={t('admin.shell.topbar_language_aria')}
            >
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                  language === 'EN' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-white/5'
                }`}
              >
                {t('admin.shell.lang_en')}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('AR')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                  language === 'AR' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-white/5'
                }`}
              >
                {t('admin.shell.lang_ar')}
              </button>
            </div>
            <button type="button" className="relative text-muted-foreground hover:text-foreground transition-colors p-1">
              <Bell size={24} />
              <span className="absolute top-0 end-0 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-white" />
            </button>
            <button
              type="button"
              className="flex items-center gap-3 border-s border-border ps-3 lg:ps-6 cursor-pointer hover:bg-gray-50 rounded-lg p-1 text-start"
              onClick={() => {
                signOut();
                window.location.href = '/login';
              }}
            >
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[#8c8c8c] text-white flex items-center justify-center font-bold text-sm lg:text-base shrink-0">
                {user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : 'AD'}
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {user ? `${user.first_name} ${user.last_name}` : 'Admin'}
                </div>
                <div className="text-xs text-muted-foreground truncate">{user?.email ?? t('admin.shell.logout')}</div>
              </div>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 relative">
          <AdminRouteGuard>
            <Outlet />
          </AdminRouteGuard>
        </div>
      </main>
    </div>
  );
}
