import { ApiError } from '../api/types';

const GENERIC = 'Something went wrong. Please try again.';

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone number',
  age: 'Age',
  email: 'Email address',
  token: 'Verification code',
};

const INTERNAL_HINTS = [
  'duplicate key',
  'violates foreign key',
  'violates unique',
  'violates check',
  'violates not-null',
  'postgres',
  'pgrst',
  'relation "',
  "relation '",
  'syntax error',
  'constraint ',
  'insert into ',
  'update "',
  'delete from ',
  '23505',
  '23503',
  '23514',
  '22p02',
  'null value in column',
  'internal server error',
  'validation failed',
];

const ZOD_JARGON = /expected|received null|received undefined|invalid_type|invalid input/i;

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
}

export function humanizeValidationMessage(input: string): string {
  const raw = input.replace(/\r?\n/g, ' ').trim();
  if (!raw) return GENERIC;

  const colonMatch = raw.match(/^(?:body\.)?([a-z_][a-z0-9_]*)\s*:\s*(.+)$/i);
  if (colonMatch) {
    const label = fieldLabel(colonMatch[1]);
    const detail = colonMatch[2].toLowerCase();
    if (detail.includes('null') || detail.includes('undefined')) {
      if (detail.includes('string')) return `${label} is required.`;
      if (detail.includes('number')) return `${label} must be a number.`;
      return `${label} is required.`;
    }
    if (detail.includes('email')) return 'Please enter a valid email address.';
    if (!ZOD_JARGON.test(detail)) {
      return `${label}: ${colonMatch[2]}`;
    }
    return `${label} is invalid. Please check your entry.`;
  }

  if (ZOD_JARGON.test(raw)) {
    if (/phone/i.test(raw)) return 'Phone number is required.';
    if (/first_name|first name/i.test(raw)) return 'First name is required.';
    if (/last_name|last name/i.test(raw)) return 'Last name is required.';
    if (/age/i.test(raw)) return 'Please enter a valid age (13–120).';
    if (/email/i.test(raw)) return 'Please enter a valid email address.';
    return 'Please check your entries and try again.';
  }

  return raw;
}

function looksLikeInternalErrorMessage(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const lower = text.toLowerCase();
  return INTERNAL_HINTS.some((h) => lower.includes(h));
}

/** Defense-in-depth: scrub API strings before showing in UI. */
export function sanitizeUserFacingMessage(input: string | undefined | null): string {
  if (input == null || typeof input !== 'string') return GENERIC;
  const humanized = humanizeValidationMessage(input);
  const singleLine = humanized.trim().slice(0, 280);
  if (looksLikeInternalErrorMessage(singleLine)) return GENERIC;
  if (ZOD_JARGON.test(singleLine)) return humanizeValidationMessage(singleLine);
  return singleLine;
}

export function getUserFacingErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const s = sanitizeUserFacingMessage(err.message);
    if (s === GENERIC && fallback) return fallback;
    return s;
  }
  if (err instanceof Error) {
    const s = sanitizeUserFacingMessage(err.message);
    if (s === GENERIC && fallback) return fallback;
    return s;
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string') {
      const s = sanitizeUserFacingMessage(m);
      if (s === GENERIC && fallback) return fallback;
      return s;
    }
  }
  return fallback || GENERIC;
}
