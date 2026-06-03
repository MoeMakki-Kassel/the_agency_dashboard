import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { COUNTRY_DIAL_CODES, type CountryDial } from "../data/countryDialCodes";
import { CountryFlagGlyph } from "./CountryFlagGlyph";
import { useLanguage } from "../contexts/LanguageContext";
import { formFieldDirProps } from "../utils/formFieldDir";
import { NATIONAL_PHONE_LENGTH, sanitizeNationalDigits } from "../utils/phoneValidation";

type PhoneCountryFieldProps = {
  country: CountryDial;
  onCountryChange: (iso2: string) => void;
  nationalNumber: string;
  onNationalNumberChange: (digits: string) => void;
  nationalPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Set after failed submit to highlight invalid national length */
  invalid?: boolean;
};

export function PhoneCountryField({
  country,
  onCountryChange,
  nationalNumber,
  onNationalNumberChange,
  nationalPlaceholder,
  disabled,
  required,
  invalid,
}: PhoneCountryFieldProps) {
  const { isRTL } = useLanguage();
  const fdTel = formFieldDirProps(
    isRTL,
    "latin",
    `box-border h-12 min-h-12 min-w-0 flex-1 basis-0 rounded-lg border bg-white px-4 text-sm leading-none text-ink-black placeholder:text-[#8c8c8c] focus:outline-none focus:ring-2 focus:ring-black/50 focus:border-black disabled:opacity-60 sm:min-w-[12rem] ${
      invalid ? "border-red-500 focus:ring-red-500/40" : "border-[#e8e8e8]"
    }`,
  );

  /** No SelectValue here: shared SelectTrigger styles force `select-value` to display:flex, which breaks sr-only and duplicates label + dial next to our custom row. */
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Select
        value={country.iso2}
        onValueChange={onCountryChange}
        disabled={disabled}
      >
        <SelectTrigger
          type="button"
          aria-label={`${country.name}, +${country.dial}`}
          dir={isRTL ? "rtl" : undefined}
          className="h-12 min-h-12 w-full shrink-0 rounded-lg border border-[#e8e8e8] bg-white px-2.5 text-sm shadow-none focus:ring-2 focus:ring-black/50 focus:border-black data-[size=default]:h-12 sm:w-[9rem] sm:max-w-[9rem] text-start"
        >
          <div className="flex min-w-0 items-center gap-1.5 pr-0.5">
            <CountryFlagGlyph iso2={country.iso2} className="h-[1.125rem] w-[1.6875rem]" />
            <span className="font-medium tabular-nums text-ink-black">
              +{country.dial}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-72 z-[100] bg-white border border-[#e8e8e8]">
          {COUNTRY_DIAL_CODES.map((c) => {
            return (
              <SelectItem
                key={c.iso2}
                value={c.iso2}
                textValue={`${c.iso2} ${c.name} +${c.dial}`}
                className="cursor-pointer"
              >
                <span className="flex items-center gap-2.5 py-0.5">
                  <CountryFlagGlyph iso2={c.iso2} />
                  <span className="font-medium tabular-nums text-[#1f1b16]">
                    +{c.dial}
                  </span>
                  <span className="text-mid-gray truncate text-xs sm:text-sm">
                    {c.name}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        required={required}
        maxLength={NATIONAL_PHONE_LENGTH}
        minLength={required ? NATIONAL_PHONE_LENGTH : undefined}
        aria-invalid={invalid || undefined}
        value={nationalNumber}
        onChange={(e) => {
          onNationalNumberChange(sanitizeNationalDigits(e.target.value));
        }}
        className={fdTel.className}
        dir={fdTel.dir}
        placeholder={nationalPlaceholder ?? "0791234567"}
      />
    </div>
  );
}
