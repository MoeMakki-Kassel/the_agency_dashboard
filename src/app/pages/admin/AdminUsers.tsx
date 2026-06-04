import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  ShieldAlert,
  UserCheck,
  Edit2,
  Power,
  Calendar,
  MapPin,
  X,
  Loader2,
  Download,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from 'sonner';
import {
  useAdminUsers,
  useUserStats,
  useUpdateUserRole,
  useUpdateUserStatus,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from '../../../hooks/useUsers';
import type { User } from '../../../api/types';
import type { AdminUserPayload } from '../../../api/users';
import { UserFormDialog } from '../../components/admin/UserFormDialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { listEvents } from '../../../api/events';
import { getDoormenForEvent, assignDoormanToEvent, unassignDoormanFromEvent } from '../../../api/scanner';
import { useAuth } from '../../components/AuthProvider';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDashboardLocale } from '../../../hooks/useDashboardLocale';
import { downloadCsv } from '../../utils/csvExport';
import { getUserFacingErrorMessage } from '../../../utils/userFacingError';
import { deriveEventStatus } from '../../utils/eventSchedule';
import { listDashboardRoles } from '../../../api/roles';

type UsersTab = 'all' | 'customers' | 'team';

const ROLE_TKEY: Record<string, string> = {
  super_admin: 'admin.users.role_super',
  doorman: 'admin.users.role_doorman',
  secretary: 'admin.users.role_secretary',
  customer: 'admin.users.role_customer',
};

function roleLabel(
  t: (k: string) => string,
  role: string,
  displayBySlug: Map<string, string>,
) {
  const fromDb = displayBySlug.get(role);
  if (fromDb) return fromDb;
  const key = ROLE_TKEY[role];
  if (key) return t(key);
  return role;
}

export function AdminUsers() {
  const { t, isRTL } = useLanguage();
  const { formatDate } = useDashboardLocale();
  const [activeTab, setActiveTab] = useState<UsersTab>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');

  const { token, user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: rolesData } = useQuery({
    queryKey: ['dashboard-roles'],
    queryFn: () => listDashboardRoles(token!),
    enabled: Boolean(token),
  });
  const roleDisplayBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rolesData?.data ?? []) {
      m.set(r.slug, r.display_name);
    }
    return m;
  }, [rolesData]);
  const [assigningDoorman, setAssigningDoorman] = useState<{ id: string; name: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const listParams =
    activeTab === 'customers'
      ? { limit: 50, search: searchTerm || undefined, role: 'customer' as const }
      : activeTab === 'team'
        ? { limit: 50, search: searchTerm || undefined, team: true as const }
        : { limit: 50, search: searchTerm || undefined };

  const { data, isLoading } = useAdminUsers(listParams);
  const { data: userStats } = useUserStats();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const users = data?.data ?? [];

  const filteredUsers = useMemo(() => {
    if (!statusFilter) return users;
    return users.filter((u) => u.status === statusFilter);
  }, [users, statusFilter]);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleChangeRole = (id: string, role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    updateRole.mutate(
      { id, role },
      {
        onSuccess: () => toast.success(t('admin.users.toast_role')),
        onError: (err: unknown) => toast.error(getUserFacingErrorMessage(err, 'Failed to update role')),
      }
    );
  };

  const openCreate = () => {
    setFormMode('create');
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setFormMode('edit');
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleFormSubmit = (payload: AdminUserPayload) => {
    if (formMode === 'create') {
      createUserMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('admin.users.toast_created'));
          setFormOpen(false);
        },
        onError: (err: unknown) =>
          toast.error(getUserFacingErrorMessage(err, 'Failed to create user')),
      });
    } else if (editingUser) {
      updateUserMutation.mutate(
        { id: editingUser.id, payload },
        {
          onSuccess: () => {
            toast.success(t('admin.users.toast_updated'));
            setFormOpen(false);
          },
          onError: (err: unknown) =>
            toast.error(getUserFacingErrorMessage(err, 'Failed to update user')),
        },
      );
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteUserMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('admin.users.toast_deleted'));
        setDeleteTarget(null);
      },
      onError: (err: unknown) =>
        toast.error(getUserFacingErrorMessage(err, 'Failed to delete user')),
    });
  };

  const handleToggleStatus = (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    const newStatus: 'active' | 'inactive' = currentStatus === 'active' ? 'inactive' : 'active';
    updateStatus.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => toast.success(newStatus === 'active' ? t('admin.users.toast_status_on') : t('admin.users.toast_status_off')),
        onError: (err: unknown) => toast.error(getUserFacingErrorMessage(err, 'Failed to update status')),
      }
    );
  };

  const exportUsers = () => {
    downloadCsv(
      'admin_users',
      [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: t('admin.users.phone') },
        { key: 'role', header: 'Role' },
        { key: 'status', header: 'Status' },
        { key: 'joined', header: 'Joined' },
      ],
      filteredUsers.map((u) => ({
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        phone: (u.phone && String(u.phone).trim()) ? String(u.phone).trim() : '—',
        role: roleLabel(t, u.role, roleDisplayBySlug),
        status: u.status === 'active' ? t('admin.users.active') : t('admin.users.inactive'),
        joined: formatDate(u.created_at),
      }))
    );
  };

  const getInitialsBg = (role: string) => {
    if (role === 'super_admin') return 'bg-primary text-[#e8e8e8]';
    if (role === 'secretary') return 'bg-primary text-primary-foreground';
    if (role === 'doorman') return 'bg-secondary text-white';
    return 'bg-muted text-muted-foreground';
  };

  const getRoleBadge = (role: string) => {
    if (role === 'super_admin') return 'bg-primary/10 text-foreground';
    if (role === 'secretary') return 'bg-primary/10 text-foreground';
    if (role === 'doorman') return 'bg-secondary/10 text-muted-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const totalCustomers = userStats?.total_customers ?? 0;
  const adminsAndManagers = userStats?.admins_and_managers ?? 0;
  const doorScanners = userStats?.door_scanners ?? 0;

  const tabDefs: { id: UsersTab; label: string }[] = [
    { id: 'all', label: t('admin.users.tab_all') },
    { id: 'customers', label: t('admin.users.tab_customers') },
    { id: 'team', label: t('admin.users.tab_team') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Tajawal'] text-foreground">{t('admin.users.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.users.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2 justify-center"
            >
              <Plus size={16} />
              {t('admin.users.add_user')}
            </button>
          )}
          <button
            type="button"
            onClick={exportUsers}
            className="px-4 py-2 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 justify-center"
          >
            <Download size={16} />
            {t('admin.common.export_csv')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-foreground shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('admin.users.total_customers')}</p>
            <h3 className="text-2xl font-bold text-foreground font-['Space_Grotesk']">
              {totalCustomers.toLocaleString()}
            </h3>
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-foreground shrink-0">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('admin.users.admins_managers')}</p>
            <h3 className="text-2xl font-bold text-foreground font-['Space_Grotesk']">
              {adminsAndManagers}
            </h3>
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-muted-foreground shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('admin.users.door_scanners')}</p>
            <h3 className="text-2xl font-bold text-foreground font-['Space_Grotesk']">
              {doorScanners}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-[0_8px_24px_rgba(20,14,8,0.04)] border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/50">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto hide-scrollbar">
            {tabDefs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex w-full md:w-auto gap-3 flex-col sm:flex-row">
            <div className="relative flex-1 md:w-64">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isRTL ? 'end-3' : 'start-3'}`} size={18} />
              <input
                type="text"
                placeholder={t('admin.users.search_ph')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full bg-card border border-border rounded-lg py-2 text-sm focus:ring-2 focus:ring-primary outline-none ${isRTL ? 'pe-10 ps-4' : 'ps-10 pe-4'}`}
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
                className="appearance-none w-full sm:w-auto px-4 py-2 border border-border bg-card rounded-lg text-foreground font-medium hover:bg-muted transition-colors pe-8 focus:ring-2 focus:ring-primary outline-none"
                aria-label={t('admin.users.status')}
              >
                <option value="">{t('admin.payments.all_statuses')}</option>
                <option value="active">{t('admin.users.active')}</option>
                <option value="inactive">{t('admin.users.inactive')}</option>
              </select>
              <Filter size={16} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${isRTL ? 'start-2' : 'end-2'}`} />
            </div>
          </div>
        </div>

        <div className="admin-table-wrap min-w-0">
          <table className="w-full min-w-[62rem] table-fixed border-collapse admin-table text-sm">
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead className="bg-muted text-xs uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.users.user')}</th>
                <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.users.phone')}</th>
                <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.users.role')}</th>
                <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.users.status')}</th>
                <th className="px-6 py-4 font-medium text-start whitespace-nowrap">{t('admin.users.joined')}</th>
                <th className="px-6 py-4 font-medium text-end whitespace-nowrap"><span className="sr-only">{t('admin.common.actions')}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e8e8]">
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted"></div>
                      <div>
                        <div className="h-4 bg-muted rounded w-28 mb-1"></div>
                        <div className="h-3 bg-muted rounded w-40"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                  <td className="px-6 py-4"><div className="h-6 bg-muted rounded-full w-20"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-14"></div></td>
                  <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                  <td className="px-6 py-4"></td>
                </tr>
              ))}

              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {t('admin.users.none')}
                  </td>
                </tr>
              )}

              {!isLoading && filteredUsers.map((user) => {
                const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
                const displayStatus = user.status === 'active' ? t('admin.users.active') : t('admin.users.inactive');

                return (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 align-top text-start min-w-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getInitialsBg(user.role)}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0">
                            <Mail size={12} className="shrink-0" /> <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-start text-muted-foreground tabular-nums whitespace-nowrap">
                      {(user.phone && String(user.phone).trim()) ? String(user.phone).trim() : '—'}
                    </td>
                    <td className="px-6 py-4 align-top text-start">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadge(user.role)}`}>
                        {roleLabel(t, user.role, roleDisplayBySlug)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top text-start">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${user.status === 'active' ? 'bg-secondary' : 'bg-[#8c8c8c]'}`}></div>
                        <span className={user.status === 'active' ? 'text-foreground' : 'text-muted-foreground'}>{displayStatus}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-start text-muted-foreground tabular-nums">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4 align-top text-end">
                      <div className="relative inline-block text-start">
                        <button
                          type="button"
                          onClick={(e) => toggleMenu(user.id, e)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
                          aria-label={t('admin.common.actions')}
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        {menuOpenId === user.id && (
                          <div className="absolute end-0 mt-2 w-56 bg-card rounded-lg shadow-xl border border-border py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={(e) => openEdit(user, e)}
                                className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted gap-2"
                              >
                                <Edit2 size={14} className="shrink-0" />
                                {t('admin.users.edit_user')}
                              </button>
                            )}
                            <div className="px-4 py-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wider border-b border-border mb-1">
                              {t('admin.users.change_role')}
                            </div>
                            {(rolesData?.data?.length
                              ? rolesData.data
                              : [
                                  { slug: 'customer', display_name: 'Customer' },
                                  { slug: 'doorman', display_name: 'Doorman' },
                                  { slug: 'secretary', display_name: 'Secretary' },
                                  { slug: 'super_admin', display_name: 'Super Admin' },
                                ]
                            ).map((r) => (
                              <button
                                key={r.slug}
                                type="button"
                                onClick={(e) => handleChangeRole(user.id, r.slug, e)}
                                className={`w-full flex items-center px-4 py-2 text-sm hover:bg-muted gap-2 ${user.role === r.slug ? 'font-bold text-foreground' : 'text-foreground'}`}
                              >
                                <Edit2 size={14} className="shrink-0" /> {roleLabel(t, r.slug, roleDisplayBySlug)}
                              </button>
                            ))}
                            {user.role === 'doorman' && (
                              <div className="border-t border-border mt-1 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(null);
                                    setAssigningDoorman({ id: user.id, name: `${user.first_name} ${user.last_name}` });
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted gap-2"
                                >
                                  <Calendar size={14} className="shrink-0" />
                                  {t('admin.users.assign_events')}
                                </button>
                              </div>
                            )}
                            <div className="border-t border-border mt-1 pt-1">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(user.id, user.status, e)}
                                className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-muted gap-2"
                              >
                                <Power size={14} className="shrink-0" />
                                {user.status === 'active' ? t('admin.users.deactivate') : t('admin.users.activate')}
                              </button>
                            </div>
                            {isSuperAdmin && user.id !== currentUser?.id && (
                              <div className="border-t border-border mt-1 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(null);
                                    setDeleteTarget(user);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 gap-2"
                                >
                                  <Trash2 size={14} className="shrink-0" />
                                  {t('admin.users.delete_user')}
                                </button>
                              </div>
                            )}
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
      </div>
      {assigningDoorman && token && (
        <AssignEventsModal
          doorman={assigningDoorman}
          token={token}
          onClose={() => setAssigningDoorman(null)}
        />
      )}

      <UserFormDialog
        open={formOpen}
        mode={formMode}
        user={editingUser}
        saving={createUserMutation.isPending || updateUserMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="border-border bg-card text-foreground sm:max-w-md">
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle className="font-['Tajawal'] text-xl text-foreground">
              {t('admin.users.delete_confirm_title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t('admin.users.delete_confirm_body')}
              {deleteTarget && (
                <span className="block mt-2 font-medium text-foreground">
                  {deleteTarget.first_name} {deleteTarget.last_name} ({deleteTarget.email})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end flex-row flex-wrap">
            <AlertDialogCancel className="border-border">{t('admin.common.cancel')}</AlertDialogCancel>
            <button
              type="button"
              disabled={deleteUserMutation.isPending}
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              {t('admin.users.delete_user')}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function deriveStatus(startIso: string, endIso?: string | null): 'Upcoming' | 'Live Now' | 'Past' {
  const st = deriveEventStatus(startIso, endIso);
  if (st === 'past') return 'Past';
  if (st === 'live') return 'Live Now';
  return 'Upcoming';
}

function formatEventDate(dateTime: string): string {
  return new Date(dateTime)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();
}

interface AssignEventsModalProps {
  doorman: { id: string; name: string };
  token: string;
  onClose: () => void;
}

function AssignEventsModal({ doorman, token, onClose }: AssignEventsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<Array<{ id: string; title: string; date_time: string; end_date_and_time?: string | null; location_name: string }>>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const allEvents = await listEvents(token, { limit: 100 });
        const upcoming = allEvents.data.filter(e => {
          const s = deriveStatus(e.date_time, e.end_date_and_time);
          return s === 'Upcoming' || s === 'Live Now';
        });
        const doormenResults = await Promise.all(
          upcoming.map(e => getDoormenForEvent(token, e.id))
        );
        const assignedIds = new Set(
          upcoming
            .filter((_, i) => doormenResults[i].some(d => d.user_id === doorman.id))
            .map(e => e.id)
        );
        setEvents(upcoming);
        setCheckedIds(new Set(assignedIds));
        setOriginalIds(new Set(assignedIds));
      } catch (err) {
        setLoadError(getUserFacingErrorMessage(err, 'Failed to load events'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [doorman.id, token]);

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSave() {
    const toAssign = [...checkedIds].filter(id => !originalIds.has(id));
    const toUnassign = [...originalIds].filter(id => !checkedIds.has(id));

    const ops = [
      ...toAssign.map(id => ({ id, action: 'assign' as const })),
      ...toUnassign.map(id => ({ id, action: 'unassign' as const })),
    ];

    if (ops.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        ops.map(op =>
          op.action === 'assign'
            ? assignDoormanToEvent(token, op.id, doorman.id)
            : unassignDoormanFromEvent(token, op.id, doorman.id)
        )
      );

      let hasError = false;
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          hasError = true;
          const event = events.find(e => e.id === ops[i].id);
          toast.error(`Failed to ${ops[i].action} ${event?.title ?? 'event'}`);
        }
      });

      if (!hasError) {
        toast.success('Event assignments updated');
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Assign Events</h2>
            <p className="text-sm text-muted-foreground">{doorman.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-lg py-2 ps-9 pe-4 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <p className="text-sm font-medium text-foreground">Failed to load events</p>
              <p className="text-xs text-muted-foreground">{loadError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No upcoming events found.</p>
          ) : (
            filtered.map(event => {
              const status = deriveStatus(event.date_time, event.end_date_and_time);
              const checked = checkedIds.has(event.id);
              return (
                <label
                  key={event.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                    checked
                      ? 'border-[#000000] bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(event.id)}
                    className="w-4 h-4 accent-[#000000] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">{event.title}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar size={11} className="shrink-0" />
                        {formatEventDate(event.date_time)}
                      </span>
                      {event.location_name && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin size={11} className="shrink-0" />
                          {event.location_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                    status === 'Live Now'
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-secondary/10 text-muted-foreground'
                  }`}>
                    {status}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-[#d0d0d0] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
