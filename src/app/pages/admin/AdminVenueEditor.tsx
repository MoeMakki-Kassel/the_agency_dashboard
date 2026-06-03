import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw, Save, Undo2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../components/AuthProvider';
import { VenueMapEditor } from '../../components/admin/VenueMapEditor';
import { ApiError } from '../../../api/types';
import {
  cloneVenueLayout,
  snapshotsEqual,
  type VenueEditorSnapshot,
} from '../../utils/venueLayoutSnapshot';
import {
  getVenueTemplate,
  updateVenueTemplate,
  uploadVenueFloorPlan,
  type VenueLayout,
  type VenueTemplate,
} from '../../../api/venueTemplates';
import { needsTierSetup, normalizeTierConfig } from '../../utils/venueTierConfig';

const DEFAULT_LAYOUT: VenueLayout = {
  page_w: 1200,
  page_h: 850,
  floor_plan_url: null,
  seats: [],
};

function normalizeLayout(raw?: VenueLayout | null): VenueLayout {
  return {
    page_w: raw?.page_w ?? DEFAULT_LAYOUT.page_w,
    page_h: raw?.page_h ?? DEFAULT_LAYOUT.page_h,
    floor_plan_url: raw?.floor_plan_url ?? null,
    seats: Array.isArray(raw?.seats) ? raw.seats : [],
    ga_zone: raw?.ga_zone ?? null,
  };
}

function snapshotFromTemplate(name: string, layout: VenueLayout): VenueEditorSnapshot {
  return { name, layout: cloneVenueLayout(layout) };
}

export function AdminVenueEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<VenueLayout | null>(null);
  const [savedBaseline, setSavedBaseline] = useState<VenueEditorSnapshot | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<VenueEditorSnapshot | null>(null);
  const hydratedForId = useRef<string | null>(null);
  const skipHydrateFromQuery = useRef(false);

  const {
    data: template,
    isPending,
    isError,
    isFetching,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: ['venue-template', id],
    queryFn: () => getVenueTemplate(token!, id!),
    enabled: Boolean(token && id),
  });

  useEffect(() => {
    hydratedForId.current = null;
    skipHydrateFromQuery.current = false;
    setLayout(null);
    setName('');
    setSavedBaseline(null);
    setUndoSnapshot(null);
  }, [id]);

  useEffect(() => {
    if (!template || !id || skipHydrateFromQuery.current) return;
    // Wait for fresh data after setup save — stale cache can still have tier_config: []
    if (isFetching && !isFetched) return;
    if (needsTierSetup(normalizeTierConfig(template.tier_config))) {
      navigate(`/venues/${id}/setup`, { replace: true });
      return;
    }
    if (hydratedForId.current === id) return;
    hydratedForId.current = id;
    const normalized = normalizeLayout(template.layout);
    setName(template.name);
    setLayout(normalized);
    setSavedBaseline(snapshotFromTemplate(template.name, normalized));
    setUndoSnapshot(null);
  }, [template, id, navigate, isFetching, isFetched]);

  const editorLayout = layout ?? (template ? normalizeLayout(template.layout) : null);

  const currentSnapshot = useMemo((): VenueEditorSnapshot | null => {
    if (!editorLayout) return null;
    return { name, layout: editorLayout };
  }, [name, editorLayout]);

  const isDirty = useMemo(() => {
    if (!savedBaseline || !currentSnapshot) return false;
    return !snapshotsEqual(savedBaseline, currentSnapshot);
  }, [savedBaseline, currentSnapshot]);

  const canUndo = undoSnapshot != null;

  const captureUndoIfNeeded = useCallback(() => {
    if (!editorLayout) return;
    setUndoSnapshot((prev) => {
      if (prev) return prev;
      return { name, layout: cloneVenueLayout(editorLayout) };
    });
  }, [editorLayout, name]);

  const handleLayoutChange = useCallback(
    (next: VenueLayout) => {
      captureUndoIfNeeded();
      setLayout(next);
    },
    [captureUndoIfNeeded],
  );

  const handleNameChange = useCallback(
    (nextName: string) => {
      captureUndoIfNeeded();
      setName(nextName);
    },
    [captureUndoIfNeeded],
  );

  const handleUndo = () => {
    if (!undoSnapshot) return;
    setName(undoSnapshot.name);
    setLayout(cloneVenueLayout(undoSnapshot.layout));
    setUndoSnapshot(null);
    toast.message('Undid last change');
  };

  const handleRevertSaved = () => {
    if (!savedBaseline) return;
    if (isDirty && !window.confirm('Discard all unsaved changes and restore the last saved map?')) {
      return;
    }
    setName(savedBaseline.name);
    setLayout(cloneVenueLayout(savedBaseline.layout));
    setUndoSnapshot(null);
    toast.message('Restored last saved map');
  };

  const blocker = useBlocker(isDirty);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    const leave = window.confirm(
      'You have unsaved changes to this venue map. Leave without saving?',
    );
    if (leave) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const applySavedTemplate = (saved: VenueTemplate) => {
    skipHydrateFromQuery.current = true;
    hydratedForId.current = id ?? null;
    const normalized = normalizeLayout(saved.layout);
    setName(saved.name);
    setLayout(normalized);
    setSavedBaseline(snapshotFromTemplate(saved.name, normalized));
    setUndoSnapshot(null);
    qc.setQueryData(['venue-template', id], saved);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; layout: VenueLayout }) =>
      updateVenueTemplate(token!, id!, payload),
    onSuccess: (saved) => {
      applySavedTemplate(saved);
      qc.invalidateQueries({ queryKey: ['venue-templates'] });
      const count = saved.layout?.seats?.length ?? 0;
      toast.success(`Venue map saved (${count} seats)`, {
        description:
          'Moved seats appear on the storefront after refresh. New seats require Re-provision on the event.',
        duration: 8000,
      });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 413) {
        toast.error('Map is too large to save. Restart the API server and try again.');
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Could not save venue map');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const dims = await readImageDimensions(file);
      return uploadVenueFloorPlan(token!, id!, file, dims.width, dims.height);
    },
    onSuccess: (res) => {
      captureUndoIfNeeded();
      skipHydrateFromQuery.current = true;
      setLayout(normalizeLayout(res.layout));
      qc.invalidateQueries({ queryKey: ['venue-template', id] });
      toast.success('Floor plan uploaded — adjust seats if needed, then Save map');
    },
    onError: () => toast.error('Upload failed'),
  });

  const waitingForAuth = authLoading || !token;
  const waitingForTemplate = isPending || !template || hydratedForId.current !== id;

  const handleSave = () => {
    if (!editorLayout) return;
    saveMutation.mutate({ name, layout: editorLayout });
  };

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDirty) return;
    e.preventDefault();
    const leave = window.confirm(
      'You have unsaved changes to this venue map. Leave without saving?',
    );
    if (leave) navigate('/venues');
  };

  if (waitingForAuth) {
    return (
      <div className="py-24 text-center text-[#8c8c8c] text-sm">Loading venue editor…</div>
    );
  }

  if (isError && !template) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load this venue template.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm font-medium underline text-[#525252]"
        >
          Try again
        </button>
        <Link to="/venues" className="block text-sm text-[#8c8c8c] hover:text-black">
          ← Back to venues
        </Link>
      </div>
    );
  }

  if (waitingForTemplate || !editorLayout || !template) {
    return (
      <div className="py-24 text-center text-[#8c8c8c] text-sm">Loading venue editor…</div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-[#e8e8e8] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            to="/venues"
            onClick={handleBackClick}
            className="w-10 h-10 rounded-full border border-[#e8e8e8] flex items-center justify-center text-[#8c8c8c] hover:text-black"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="text-xl font-bold font-['Tajawal'] bg-transparent border-b border-transparent focus:border-[#e8e8e8] outline-none"
            />
            <p className="text-xs text-[#8c8c8c] flex flex-wrap items-center gap-2">
              <span>
                {template.slug} · {editorLayout.seats.length} seats on map
              </span>
              {isDirty && (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium">
                  Unsaved changes
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo last edit (one step)"
            className="inline-flex items-center gap-2 px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm font-medium hover:bg-[#fafafa] disabled:opacity-40"
          >
            <Undo2 size={16} />
            Undo
          </button>
          <button
            type="button"
            onClick={handleRevertSaved}
            disabled={!isDirty && !canUndo}
            title="Restore last saved version from server"
            className="inline-flex items-center gap-2 px-3 py-2 border border-[#e8e8e8] rounded-lg text-sm font-medium hover:bg-[#fafafa] disabled:opacity-40"
          >
            <RotateCcw size={16} />
            Revert to saved
          </button>
          <Link
            to={`/venues/${id}/setup`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#e8e8e8] rounded-lg text-sm font-medium hover:bg-[#fafafa]"
          >
            Sections & tiers
          </Link>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#e8e8e8] rounded-lg text-sm font-medium hover:bg-[#fafafa]"
          >
            <Upload size={16} />
            Upload floor plan
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) uploadMutation.mutate(file);
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving…' : 'Save map'}
          </button>
        </div>
      </div>

      <VenueMapEditor
        layout={editorLayout}
        tierConfig={normalizeTierConfig(template.tier_config)}
        onLayoutChange={handleLayoutChange}
      />
    </div>
  );
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dims;
    } catch {
      /* fall through */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 850 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}
