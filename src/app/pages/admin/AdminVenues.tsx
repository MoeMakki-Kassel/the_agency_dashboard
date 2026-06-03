import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Map, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../components/AuthProvider';
import {
  createVenueTemplate,
  deleteVenueTemplate,
  listVenueTemplates,
  uploadVenueFloorPlan,
  type VenueLayout,
} from '../../../api/venueTemplates';

const DEFAULT_LAYOUT: VenueLayout = {
  page_w: 1200,
  page_h: 850,
  floor_plan_url: null,
  seats: [],
  ga_zone: { type: 'rect', x: 980, y: 120, w: 180, h: 600 },
};

function defaultVenueName(): string {
  const d = new Date();
  const date = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return `Venue ${date}`;
}

export function AdminVenues() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['venue-templates'],
    queryFn: () => listVenueTemplates(token!),
    enabled: Boolean(token),
  });

  const createMutation = useMutation({
    mutationFn: async (file: File) => {
      const template = await createVenueTemplate(token!, {
        name: defaultVenueName(),
        slug: `venue-${Date.now().toString(36)}`,
        layout: DEFAULT_LAYOUT,
        tier_config: [],
      });
      try {
        const dims = await readImageDimensions(file);
        await uploadVenueFloorPlan(token!, template.id, file, dims.width, dims.height);
      } catch (uploadErr) {
        try {
          await deleteVenueTemplate(token!, template.id);
        } catch {
          /* best-effort cleanup */
        }
        throw uploadErr;
      }
      return template;
    },
    onSuccess: (template) => {
      qc.invalidateQueries({ queryKey: ['venue-templates'] });
      toast.success('Floor plan uploaded — define your sections next');
      navigate(`/venues/${template.id}/setup`);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not create venue — check the API server logs or try another image';
      toast.error(msg, { duration: 8000 });
    },
  });

  const templates = data?.data ?? [];

  const handlePickFloorPlan = () => {
    if (!createMutation.isPending) fileRef.current?.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal']">Venue templates</h1>
          <p className="text-sm text-[#8c8c8c] mt-1">
            Upload floor plans and mark seats as SVG overlays for interactive booking.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePickFloorPlan}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-60"
        >
          <Plus size={18} />
          {createMutation.isPending ? 'Uploading…' : 'Add venue'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            createMutation.mutate(file);
          }}
        />
      </div>

      {isLoading && <p className="text-sm text-[#8c8c8c]">Loading…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="relative bg-white border border-[#e8e8e8] rounded-xl p-5 hover:border-[#000000] transition-colors group"
          >
            <Link to={`/venues/${t.id}/edit`} className="block">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#e8e8e8] flex items-center justify-center shrink-0">
                  <Map size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-[#000000] truncate">{t.name}</h2>
                  <p className="text-xs text-[#8c8c8c] truncate">{t.slug}</p>
                </div>
              </div>
              <p className="text-xs text-[#525252]">
                {t.tier_config?.length ?? 0} tiers ·{' '}
                <span className="underline">Edit map</span> →
              </p>
            </Link>
          </div>
        ))}
      </div>

      {!isLoading && templates.length === 0 && (
        <div className="text-center py-16 border border-dashed border-[#e8e8e8] rounded-xl">
          <Upload className="mx-auto text-[#8c8c8c] mb-3" size={32} />
          <p className="text-sm text-[#8c8c8c] mb-4">
            No venue templates yet. Add a venue and choose a floor plan image to start marking seats.
          </p>
          <button
            type="button"
            onClick={handlePickFloorPlan}
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            <Plus size={18} />
            {createMutation.isPending ? 'Uploading…' : 'Add venue'}
          </button>
        </div>
      )}
    </div>
  );
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .then((bitmap) => {
        const dims = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return dims;
      })
      .catch(() => readImageDimensionsLegacy(file));
  }
  return readImageDimensionsLegacy(file);
}

function readImageDimensionsLegacy(file: File): Promise<{ width: number; height: number }> {
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
