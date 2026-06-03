import { useMemo } from 'react';
import { useLanguage } from '../app/contexts/LanguageContext';

export function useDashboardLocale() {
  const { language, isRTL } = useLanguage();

  const locale = language === 'AR' ? 'ar-JO' : 'en-US';

  return useMemo(
    () => ({
      locale,
      language,
      isRTL,
      formatDate: (iso: string, opts?: Intl.DateTimeFormatOptions) => {
        try {
          return new Date(iso).toLocaleDateString(locale, opts ?? { year: 'numeric', month: 'short', day: '2-digit' });
        } catch {
          return iso;
        }
      },
      formatDateTime: (iso: string) => {
        try {
          return new Date(iso).toLocaleString(locale);
        } catch {
          return iso;
        }
      },
      formatNumber: (n: number, opts?: Intl.NumberFormatOptions) =>
        new Intl.NumberFormat(locale, opts).format(n),
      formatCurrency: (amount: number, currency = 'JOD') =>
        new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 3 }).format(amount),
    }),
    [locale, language, isRTL]
  );
}
