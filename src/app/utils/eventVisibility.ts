export type EventVisibility = 'public' | 'unlisted';

/** Map API/legacy values to public | unlisted for labels and forms. */
export function normalizeEventVisibility(
  value: string | null | undefined,
): EventVisibility {
  const s = String(value ?? 'public')
    .toLowerCase()
    .trim();
  if (s === 'unlisted' || s === 'private') return 'unlisted';
  return 'public';
}

export function isUnlistedVisibility(value: string | null | undefined): boolean {
  return normalizeEventVisibility(value) === 'unlisted';
}
