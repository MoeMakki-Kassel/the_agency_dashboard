/** ISO 3166-1 alpha-2 → regional-indicator flag emoji */
export function countryCodeToFlagEmoji(iso2: string): string {
  const upper = iso2.toUpperCase();
  if (upper.length !== 2 || !/^[A-Z]{2}$/.test(upper)) return "🌍";
  const A = 0x1f1e6;
  const cp = (c: string) => A + (c.charCodeAt(0) - 65);
  return String.fromCodePoint(cp(upper[0]), cp(upper[1]));
}

export type CountryDial = {
  iso2: string;
  /** Numeric country calling code without + */
  dial: string;
  /** English label for the select list */
  name: string;
};

/**
 * Curated list: MENA-first, then common international destinations.
 * Order is UX priority (home region first).
 */
export const COUNTRY_DIAL_CODES: CountryDial[] = [
  { iso2: "JO", dial: "962", name: "Jordan" },
  { iso2: "SA", dial: "966", name: "Saudi Arabia" },
  { iso2: "AE", dial: "971", name: "United Arab Emirates" },
  { iso2: "EG", dial: "20", name: "Egypt" },
  { iso2: "KW", dial: "965", name: "Kuwait" },
  { iso2: "QA", dial: "974", name: "Qatar" },
  { iso2: "BH", dial: "973", name: "Bahrain" },
  { iso2: "OM", dial: "968", name: "Oman" },
  { iso2: "LB", dial: "961", name: "Lebanon" },
  { iso2: "IQ", dial: "964", name: "Iraq" },
  { iso2: "PS", dial: "970", name: "Palestine" },
  { iso2: "SY", dial: "963", name: "Syria" },
  { iso2: "YE", dial: "967", name: "Yemen" },
  { iso2: "MA", dial: "212", name: "Morocco" },
  { iso2: "DZ", dial: "213", name: "Algeria" },
  { iso2: "TN", dial: "216", name: "Tunisia" },
  { iso2: "LY", dial: "218", name: "Libya" },
  { iso2: "SD", dial: "249", name: "Sudan" },
  { iso2: "TR", dial: "90", name: "Türkiye" },
  { iso2: "US", dial: "1", name: "United States" },
  { iso2: "CA", dial: "1", name: "Canada" },
  { iso2: "GB", dial: "44", name: "United Kingdom" },
  { iso2: "DE", dial: "49", name: "Germany" },
  { iso2: "FR", dial: "33", name: "France" },
  { iso2: "IT", dial: "39", name: "Italy" },
  { iso2: "ES", dial: "34", name: "Spain" },
  { iso2: "NL", dial: "31", name: "Netherlands" },
  { iso2: "BE", dial: "32", name: "Belgium" },
  { iso2: "CH", dial: "41", name: "Switzerland" },
  { iso2: "SE", dial: "46", name: "Sweden" },
  { iso2: "NO", dial: "47", name: "Norway" },
  { iso2: "DK", dial: "45", name: "Denmark" },
  { iso2: "FI", dial: "358", name: "Finland" },
  { iso2: "PL", dial: "48", name: "Poland" },
  { iso2: "IN", dial: "91", name: "India" },
  { iso2: "PK", dial: "92", name: "Pakistan" },
  { iso2: "BD", dial: "880", name: "Bangladesh" },
  { iso2: "PH", dial: "63", name: "Philippines" },
  { iso2: "ID", dial: "62", name: "Indonesia" },
  { iso2: "MY", dial: "60", name: "Malaysia" },
  { iso2: "SG", dial: "65", name: "Singapore" },
  { iso2: "AU", dial: "61", name: "Australia" },
  { iso2: "NZ", dial: "64", name: "New Zealand" },
  { iso2: "ZA", dial: "27", name: "South Africa" },
  { iso2: "NG", dial: "234", name: "Nigeria" },
  { iso2: "KE", dial: "254", name: "Kenya" },
];

export function getCountryByIso(iso2: string): CountryDial | undefined {
  return COUNTRY_DIAL_CODES.find((c) => c.iso2 === iso2);
}

const NATIONAL_LEN = 10;

/** E.164-style string for API storage (requires exactly 10-digit national). */
export function buildInternationalPhone(dialDigits: string, nationalDigits: string): string {
  const d = dialDigits.replace(/\D/g, "");
  const n = nationalDigits.replace(/\D/g, "");
  if (!d || n.length !== NATIONAL_LEN) return "";
  const national = n.startsWith("0") ? n.slice(1) : n;
  return `+${d}${national}`;
}
