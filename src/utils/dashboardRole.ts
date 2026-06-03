import type { User } from '../api/types';

const TEAM_ROLES: ReadonlyArray<string> = ['super_admin', 'secretary', 'doorman'];

export function isDashboardTeamRole(role: string | undefined): boolean {
  if (!role || role === 'customer') return false;
  if (TEAM_ROLES.includes(role)) return true;
  return /^[a-z][a-z0-9_]*$/.test(role);
}
