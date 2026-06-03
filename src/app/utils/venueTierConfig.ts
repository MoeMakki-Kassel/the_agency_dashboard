import type { VenueTierConfig } from '../../api/venueTemplates';

export function slugifyTierKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'section';
}

export function assignedMapTiers(tierConfig: VenueTierConfig[]): VenueTierConfig[] {
  return tierConfig.filter((t) => t.selection_mode !== 'general_admission');
}

/** API may return jsonb as array or occasionally a JSON string. */
export function normalizeTierConfig(raw: unknown): VenueTierConfig[] {
  if (Array.isArray(raw)) return raw as VenueTierConfig[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as VenueTierConfig[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function needsTierSetup(tierConfig: VenueTierConfig[] | undefined | null): boolean {
  const tiers = normalizeTierConfig(tierConfig);
  if (!tiers.length) return true;
  return assignedMapTiers(tiers).length === 0;
}

export function tierLabel(tierConfig: VenueTierConfig[], sectionKey: string): string {
  return tierConfig.find((t) => t.key === sectionKey)?.name ?? sectionKey;
}

export type TierDraftRow = {
  localId: string;
  name: string;
  key: string;
  keyTouched: boolean;
  selection_mode: 'assigned' | 'general_admission';
  capacity: string;
};

export function tierConfigToDrafts(tiers: VenueTierConfig[]): TierDraftRow[] {
  return tiers.map((t) => ({
    localId: crypto.randomUUID(),
    name: t.name,
    key: t.key,
    keyTouched: true,
    selection_mode: t.selection_mode,
    capacity: t.capacity != null ? String(t.capacity) : '100',
  }));
}

export function emptyTierDraft(): TierDraftRow {
  return {
    localId: crypto.randomUUID(),
    name: '',
    key: '',
    keyTouched: false,
    selection_mode: 'assigned',
    capacity: '100',
  };
}

export function validateTierDrafts(rows: TierDraftRow[]): string | null {
  if (rows.length === 0) return 'Add at least one section or tier.';
  const keys = new Set<string>();
  let hasAssigned = false;
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) return 'Every tier needs a display name.';
    const key = row.key.trim() || slugifyTierKey(name);
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      return `Invalid key “${key}”. Use lowercase letters, numbers, and underscores (start with a letter).`;
    }
    if (keys.has(key)) return `Duplicate key “${key}”. Each tier must have a unique key.`;
    keys.add(key);
    if (row.selection_mode === 'assigned') hasAssigned = true;
    if (row.selection_mode === 'general_admission') {
      const cap = parseInt(row.capacity, 10);
      if (!Number.isFinite(cap) || cap < 1) {
        return `“${name}” needs a capacity of at least 1 for general admission.`;
      }
    }
  }
  if (!hasAssigned) {
    return 'Add at least one assigned section (seated area on the map). General admission alone is not enough to place seats.';
  }
  return null;
}

export function draftsToTierConfig(rows: TierDraftRow[]): VenueTierConfig[] {
  return rows.map((row) => {
    const name = row.name.trim();
    const key = row.key.trim() || slugifyTierKey(name);
    const base: VenueTierConfig = { key, name, selection_mode: row.selection_mode };
    if (row.selection_mode === 'general_admission') {
      base.capacity = Math.max(1, parseInt(row.capacity, 10) || 1);
    }
    return base;
  });
}

/** Preset for the original IYAD theatre layout. */
export const IYAD_TIER_PRESET: VenueTierConfig[] = [
  { key: 'balcony_left', name: 'Balcony Left', selection_mode: 'assigned' },
  { key: 'balcony_right', name: 'Balcony Right', selection_mode: 'assigned' },
  { key: 'vvip', name: 'VVIP', selection_mode: 'assigned' },
  { key: 'vip', name: 'VIP', selection_mode: 'assigned' },
  { key: 'regular', name: 'General Admission', selection_mode: 'general_admission', capacity: 500 },
];
