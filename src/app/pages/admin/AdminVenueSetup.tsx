import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../components/AuthProvider';
import {
  getVenueTemplate,
  updateVenueTemplate,
  type VenueLayout,
  type VenueTierConfig,
} from '../../../api/venueTemplates';
import {
  draftsToTierConfig,
  emptyTierDraft,
  IYAD_TIER_PRESET,
  slugifyTierKey,
  tierConfigToDrafts,
  validateTierDrafts,
  normalizeTierConfig,
  type TierDraftRow,
} from '../../utils/venueTierConfig';

export function AdminVenueSetup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [venueName, setVenueName] = useState('');
  const [rows, setRows] = useState<TierDraftRow[]>([emptyTierDraft(), emptyTierDraft()]);
  const [ready, setReady] = useState(false);
  const savedAndLeavingRef = useRef(false);
  const hydratedIdRef = useRef<string | null>(null);

  const { data: template, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['venue-template', id],
    queryFn: () => getVenueTemplate(token!, id!),
    enabled: Boolean(token && id),
  });

  useEffect(() => {
    savedAndLeavingRef.current = false;
    hydratedIdRef.current = null;
    setReady(false);
    setRows([emptyTierDraft(), emptyTierDraft()]);
    setVenueName('');
  }, [id]);

  useEffect(() => {
    if (!template || !id || savedAndLeavingRef.current) return;
    if (hydratedIdRef.current === id) return;
    hydratedIdRef.current = id;
    setVenueName(template.name);
    const tiers = normalizeTierConfig(template.tier_config);
    setRows(tiers.length ? tierConfigToDrafts(tiers) : [emptyTierDraft(), emptyTierDraft()]);
    setReady(true);
  }, [template, id]);

  const saveMutation = useMutation({
    mutationFn: async (tierConfig: VenueTierConfig[]) => {
      const layout = template?.layout as VenueLayout | undefined;
      const validKeys = new Set(tierConfig.map((t) => t.key));
      let nextLayout = layout;
      const seats = layout?.seats ?? [];
      const orphaned = seats.filter((s) => !validKeys.has(s.section_key));
      if (orphaned.length > 0 && layout) {
        const remove = window.confirm(
          `${orphaned.length} seat(s) use section keys that are no longer defined. Remove those seats from the map and continue?`,
        );
        if (!remove) throw new Error('Save cancelled');
        nextLayout = {
          ...layout,
          seats: seats.filter((s) => validKeys.has(s.section_key)),
        };
      }
      return updateVenueTemplate(token!, id!, {
        name: venueName.trim() || template!.name,
        tier_config: tierConfig,
        ...(nextLayout && nextLayout !== layout ? { layout: nextLayout } : {}),
      });
    },
    onSuccess: (saved) => {
      savedAndLeavingRef.current = true;
      qc.setQueryData(['venue-template', id], saved);
      void qc.invalidateQueries({ queryKey: ['venue-templates'] });
      toast.success('Sections saved — you can now place seats on the map');
      navigate(`/venues/${id}/edit`, { replace: true });
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'Save cancelled') return;
      toast.error(err instanceof Error ? err.message : 'Could not save sections');
    },
  });

  const updateRow = (localId: string, patch: Partial<TierDraftRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.localId !== localId) return r;
        const next = { ...r, ...patch };
        if (patch.name != null && !next.keyTouched) {
          next.key = slugifyTierKey(patch.name);
        }
        return next;
      }),
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyTierDraft()]);

  const removeRow = (localId: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.localId !== localId)));
  };

  const applyPreset = (preset: VenueTierConfig[]) => {
    setRows(tierConfigToDrafts(preset));
    toast.message('Preset loaded — adjust names and keys as needed');
  };

  const handleContinue = () => {
    const err = validateTierDrafts(rows);
    if (err) {
      toast.error(err);
      return;
    }
    if (!template?.layout?.floor_plan_url) {
      toast.error('Upload a floor plan before defining sections.');
      navigate('/venues');
      return;
    }
    saveMutation.mutate(draftsToTierConfig(rows));
  };

  if (authLoading || !token) {
    return <div className="py-24 text-center text-sm text-[#8c8c8c]">Loading…</div>;
  }

  if (isError && !template) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load this venue.</p>
        <button type="button" onClick={() => refetch()} className="text-sm underline">
          Try again
        </button>
        <Link to="/venues" className="block text-sm text-[#8c8c8c]">
          ← Back to venues
        </Link>
      </div>
    );
  }

  if (isPending || (isFetching && !ready) || !template || !ready) {
    return <div className="py-24 text-center text-sm text-[#8c8c8c]">Loading venue setup…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-in fade-in">
      <div className="flex items-start gap-4">
        <Link
          to="/venues"
          className="w-10 h-10 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#8c8c8c] hover:text-black shrink-0"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal']">Define sections & tiers</h1>
          <p className="text-sm text-[#8c8c8c] mt-1">
            Each venue can have different sections (VVIP, balconies, general admission, etc.). Set them up
            before placing seats on the floor plan.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 space-y-4">
        <div>
          <label htmlFor="venue-setup-name" className="block text-sm font-medium mb-1">
            Venue name
          </label>
          <input
            id="venue-setup-name"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            className="w-full border border-[#e8e8e8] rounded-lg py-2.5 px-3 text-sm outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {template.layout?.floor_plan_url ? (
          <p className="text-xs text-[#525252] bg-[#fafafa] border border-[#e8e8e8] rounded-lg px-3 py-2">
            Floor plan uploaded. Continue when your sections match this venue.
          </p>
        ) : (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No floor plan on this template. Go back and add a venue with an image first.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyPreset(IYAD_TIER_PRESET)}
          className="text-xs px-3 py-1.5 border border-[#e8e8e8] rounded-lg hover:bg-[#fafafa]"
        >
          Load IYAD theatre preset
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">Sections / pricing tiers</h2>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#525252] hover:text-black"
          >
            <Plus size={16} />
            Add tier
          </button>
        </div>

        {rows.map((row, index) => (
          <div
            key={row.localId}
            className="bg-white border border-[#e8e8e8] rounded-xl p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-[#8c8c8c]">Tier {index + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(row.localId)}
                disabled={rows.length <= 1}
                className="p-1.5 text-[#8c8c8c] hover:text-red-600 disabled:opacity-30"
                aria-label="Remove tier"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">Display name</label>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(row.localId, { name: e.target.value })}
                  placeholder="e.g. VVIP, Balcony Left"
                  className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">Internal key</label>
                <input
                  value={row.key}
                  onChange={(e) =>
                    updateRow(row.localId, {
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
                      keyTouched: true,
                    })
                  }
                  placeholder="e.g. vvip, balcony_left"
                  className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm font-mono"
                />
                <p className="text-[10px] text-[#8c8c8c] mt-0.5">Used in seat data; auto-filled from name if left blank.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">Type</label>
                <select
                  value={row.selection_mode}
                  onChange={(e) =>
                    updateRow(row.localId, {
                      selection_mode: e.target.value as TierDraftRow['selection_mode'],
                    })
                  }
                  className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="assigned">Assigned seats (on map)</option>
                  <option value="general_admission">General admission (no map seats)</option>
                </select>
              </div>
              {row.selection_mode === 'general_admission' && (
                <div>
                  <label className="block text-xs font-medium text-[#525252] mb-1">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={row.capacity}
                    onChange={(e) => updateRow(row.localId, { capacity: e.target.value })}
                    className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end sticky bottom-0 bg-[#fafafa] py-4 border-t border-[#e8e8e8] -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:border-0 sm:static">
        <button
          type="button"
          onClick={handleContinue}
          disabled={saveMutation.isPending || !template.layout?.floor_plan_url}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Continue to seat editor'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
