import type { VenueLayout } from '../../api/venueTemplates';

export type VenueEditorSnapshot = {
  name: string;
  layout: VenueLayout;
};

export function cloneVenueLayout(layout: VenueLayout): VenueLayout {
  return JSON.parse(JSON.stringify(layout)) as VenueLayout;
}

export function cloneEditorSnapshot(s: VenueEditorSnapshot): VenueEditorSnapshot {
  return {
    name: s.name,
    layout: cloneVenueLayout(s.layout),
  };
}

/** Stable fingerprint for dirty-checking (name + seat positions). */
export function editorSnapshotFingerprint(s: VenueEditorSnapshot): string {
  return JSON.stringify({
    name: s.name,
    page_w: s.layout.page_w,
    page_h: s.layout.page_h,
    floor_plan_url: s.layout.floor_plan_url,
    ga_zone: s.layout.ga_zone,
    seats: s.layout.seats,
  });
}

export function snapshotsEqual(a: VenueEditorSnapshot, b: VenueEditorSnapshot): boolean {
  return editorSnapshotFingerprint(a) === editorSnapshotFingerprint(b);
}
