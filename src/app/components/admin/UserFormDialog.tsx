import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import type { User } from '../../../api/types';
import type { AdminUserPayload } from '../../../api/users';
import { listDashboardRoles } from '../../../api/roles';
import { useAuth } from '../AuthProvider';
import { useLanguage } from '../../contexts/LanguageContext';
import { PhoneCountryField } from '../PhoneCountryField';
import { COUNTRY_DIAL_CODES, getCountryByIso } from '../../data/countryDialCodes';
import {
  isValidNationalPhone,
  parseE164ToForm,
  phoneFormToE164,
} from '../../utils/phoneValidation';
import { toast } from 'sonner';

const ROLE_TKEY: Record<string, string> = {
  super_admin: 'admin.users.role_super',
  doorman: 'admin.users.role_doorman',
  secretary: 'admin.users.role_secretary',
  customer: 'admin.users.role_customer',
};

function roleOptionLabel(slug: string, displayName: string, t: (k: string) => string) {
  if (displayName.trim()) return displayName;
  const key = ROLE_TKEY[slug];
  if (key) return t(key);
  return slug;
}

export interface UserFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  user?: User | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: AdminUserPayload) => void;
}

export function UserFormDialog({
  open,
  mode,
  user,
  saving,
  onClose,
  onSubmit,
}: UserFormDialogProps) {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountryIso, setPhoneCountryIso] = useState('JO');
  const [phoneNational, setPhoneNational] = useState('');
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [age, setAge] = useState('');
  const [role, setRole] = useState('customer');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const { data: rolesData } = useQuery({
    queryKey: ['dashboard-roles'],
    queryFn: () => listDashboardRoles(token!),
    enabled: Boolean(open && token),
  });

  const assignableRoles = rolesData?.data?.length
    ? rolesData.data
    : [
        { slug: 'customer', display_name: 'Customer', is_system: true, can_access_dashboard: false, created_at: '' },
        { slug: 'doorman', display_name: 'Doorman', is_system: true, can_access_dashboard: true, created_at: '' },
        { slug: 'secretary', display_name: 'Secretary', is_system: true, can_access_dashboard: true, created_at: '' },
        { slug: 'super_admin', display_name: 'Super Admin', is_system: true, can_access_dashboard: true, created_at: '' },
      ];

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && user) {
      setFirstName(user.first_name ?? '');
      setLastName(user.last_name ?? '');
      setEmail(user.email ?? '');
      const parsed = parseE164ToForm(user.phone);
      setPhoneCountryIso(parsed.phoneCountryIso);
      setPhoneNational(parsed.phoneNational);
      setPhoneInvalid(false);
      setAge(user.age != null ? String(user.age) : '');
      setRole(user.role || 'customer');
      setStatus(user.status);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneCountryIso('JO');
      setPhoneNational('');
      setPhoneInvalid(false);
      setAge('');
      setRole('customer');
      setStatus('active');
    }
  }, [open, mode, user]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedFirst || !trimmedEmail) return;

    const nationalTrimmed = phoneNational.trim();
    let phoneE164: string | undefined;
    if (nationalTrimmed) {
      if (!isValidNationalPhone(nationalTrimmed)) {
        setPhoneInvalid(true);
        toast.error(t('validation.phoneNationalTenDigits'));
        return;
      }
      phoneE164 = phoneFormToE164(phoneCountryIso, nationalTrimmed) || undefined;
      if (!phoneE164) {
        setPhoneInvalid(true);
        toast.error(t('validation.phoneNationalTenDigits'));
        return;
      }
    }
    setPhoneInvalid(false);

    const payload: AdminUserPayload = {
      first_name: trimmedFirst,
      last_name: lastName.trim() || undefined,
      email: trimmedEmail,
      phone: phoneE164,
      role,
    };
    const ageNum = age.trim() ? parseInt(age, 10) : undefined;
    if (ageNum != null && !Number.isNaN(ageNum)) payload.age = ageNum;
    if (mode === 'edit') payload.status = status;
    onSubmit(payload);
  };

  const title =
    mode === 'create' ? t('admin.users.add_user') : t('admin.users.edit_user');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-card text-card-foreground rounded-xl w-full max-w-md p-6 shadow-xl border border-border space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-2">
          <h2 id="user-form-title" className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label={t('admin.common.cancel')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.users.first_name')}</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-border rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.users.last_name')}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-border rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.email')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.phone')}</label>
          <PhoneCountryField
              country={getCountryByIso(phoneCountryIso) ?? COUNTRY_DIAL_CODES[0]}
              onCountryChange={(iso) => {
                setPhoneInvalid(false);
                setPhoneCountryIso(iso);
              }}
              nationalNumber={phoneNational}
              onNationalNumberChange={(n) => {
                setPhoneInvalid(false);
                setPhoneNational(n);
              }}
              nationalPlaceholder={t('validation.phoneNationalPlaceholder')}
              invalid={phoneInvalid}
            />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.age')}</label>
          <input
            type="number"
            min={13}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full border border-border rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{t('admin.users.change_role')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-border bg-input text-foreground rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            {assignableRoles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {roleOptionLabel(r.slug, r.display_name, t)}
              </option>
            ))}
          </select>
        </div>

        {mode === 'edit' && (
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.users.status')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full border border-border bg-input text-foreground rounded-lg py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">{t('admin.users.active')}</option>
              <option value="inactive">{t('admin.users.inactive')}</option>
            </select>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
          >
            {t('admin.common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-accent disabled:opacity-60 inline-flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {mode === 'create' ? t('admin.users.create_user') : t('admin.users.save_user')}
          </button>
        </div>
      </form>
    </div>
  );
}
