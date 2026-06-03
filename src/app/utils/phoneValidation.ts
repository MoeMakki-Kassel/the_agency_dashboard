import { COUNTRY_DIAL_CODES, getCountryByIso } from "../data/countryDialCodes";

export const NATIONAL_PHONE_LENGTH = 10;

const DIAL_SORTED_DESC = [...COUNTRY_DIAL_CODES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

/** Strip non-digits and cap at 10 for national input. */
export function sanitizeNationalDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, NATIONAL_PHONE_LENGTH);
}

export function isValidNationalPhone(digits: string): boolean {
  const n = digits.replace(/\D/g, "");
  return n.length === NATIONAL_PHONE_LENGTH;
}

/** Strip one leading 0 from a validated 10-digit national number. */
export function stripLeadingZeroNational(national10: string): string {
  const n = national10.replace(/\D/g, "");
  if (n.length === NATIONAL_PHONE_LENGTH && n.startsWith("0")) {
    return n.slice(1);
  }
  return n;
}

/**
 * Build E.164 (+dial+national) from dial code and exactly 10-digit national input.
 * Returns empty string if national is not exactly 10 digits.
 */
export function nationalDigitsToE164(dialDigits: string, nationalDigits: string): string {
  const d = dialDigits.replace(/\D/g, "");
  const raw = nationalDigits.replace(/\D/g, "");
  if (!d || !isValidNationalPhone(raw)) return "";
  const national = stripLeadingZeroNational(raw);
  if (!national) return "";
  return `+${d}${national}`;
}

/** E.164 produced by nationalDigitsToE164 (optional leading +, country + national). */
export function isValidE164Phone(value: string): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  const withPlus = v.startsWith("+") ? v : `+${digits}`;
  const body = withPlus.slice(1).replace(/\D/g, "");
  if (!body || body[0] === "0") return false;

  for (const c of DIAL_SORTED_DESC) {
    if (body.startsWith(c.dial)) {
      const national = body.slice(c.dial.length);
      if (national.length >= 7 && national.length <= 12) return true;
    }
  }
  return /^\+[1-9]\d{9,14}$/.test(withPlus.replace(/\s/g, ""));
}

export type PhoneFormState = {
  phoneCountryIso: string;
  phoneNational: string;
};

/**
 * Parse stored E.164 (or legacy digit string) into country ISO + 10-digit national for forms.
 */
export function parseE164ToForm(
  stored: string | null | undefined,
  defaultIso = "JO",
): PhoneFormState {
  const empty: PhoneFormState = {
    phoneCountryIso: defaultIso,
    phoneNational: "",
  };
  if (!stored || !String(stored).trim()) return empty;

  let digits = String(stored).replace(/\D/g, "");
  if (!digits) return empty;

  for (const c of DIAL_SORTED_DESC) {
    if (digits.startsWith(c.dial)) {
      let national = digits.slice(c.dial.length);
      if (national.length === 9) {
        national = `0${national}`;
      }
      if (national.length > NATIONAL_PHONE_LENGTH) {
        national = national.slice(-NATIONAL_PHONE_LENGTH);
      }
      return {
        phoneCountryIso: c.iso2,
        phoneNational: national.slice(0, NATIONAL_PHONE_LENGTH),
      };
    }
  }

  return {
    phoneCountryIso: defaultIso,
    phoneNational: sanitizeNationalDigits(digits),
  };
}

/** Build E.164 from form state; empty national yields empty string. */
export function phoneFormToE164(iso2: string, nationalDigits: string): string {
  const country = getCountryByIso(iso2);
  if (!country) return "";
  return nationalDigitsToE164(country.dial, nationalDigits);
}
