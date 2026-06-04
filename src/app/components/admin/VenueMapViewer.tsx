import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus } from 'lucide-react';
import type { VenueLayout, VenueTierConfig } from '../../../api/venueTemplates';
import {
  boundsForPoints,
  fullView,
  panView,
  zoomView,
  ZOOM_STEP,
  type ViewBox,
} from '../../utils/svgViewBox';

const SECTION_LABELS: Record<string, string> = {
  balcony_left: 'Balcony Left',
  balcony_right: 'Balcony Right',
  vvip: 'VVIP',
  vip: 'VIP',
  regular: 'General Admission',
};

const TOOLTIP_OFFSET_X = 18;
const TOOLTIP_OFFSET_Y = -40;

function tooltipTransform(clientX: number, clientY: number) {
  return `translate(${clientX + TOOLTIP_OFFSET_X}px, ${clientY + TOOLTIP_OFFSET_Y}px)`;
}

type EditorTooltip = { label: string; x: number; y: number };

type VenueMapViewerProps = {
  layout: VenueLayout;
  tierConfig: VenueTierConfig[];
};

export function VenueMapViewer({ layout, tierConfig }: VenueMapViewerProps) {
  const [tooltip, setTooltip] = useState<EditorTooltip | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const hideTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { page_w: pageW, page_h: pageH, floor_plan_url: floorPlanUrl, seats } = layout;

  const [view, setView] = useState<ViewBox>(() => fullView(pageW, pageH));
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panDrag = useRef<{ startX: number; startY: number; view: ViewBox } | null>(null);

  useEffect(() => {
    setView(fullView(pageW, pageH));
  }, [pageW, pageH]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const el = mapWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scale = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setView((v) => zoomView(v, scale, pageW, pageH));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [pageW, pageH]);

  const zoomIn = useCallback(() => {
    setView((v) => zoomView(v, ZOOM_STEP, pageW, pageH));
  }, [pageW, pageH]);

  const zoomOut = useCallback(() => {
    setView((v) => zoomView(v, 1 / ZOOM_STEP, pageW, pageH));
  }, [pageW, pageH]);

  const resetView = useCallback(() => {
    setView(fullView(pageW, pageH));
  }, [pageW, pageH]);

  const fitAllSeats = useCallback(() => {
    const pts = seats.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    const bounds = boundsForPoints(pts, pageW, pageH);
    if (bounds) setView(bounds);
  }, [seats, pageW, pageH]);

  const countsBySection = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of seats) {
      c[s.section_key] = (c[s.section_key] || 0) + 1;
    }
    return c;
  }, [seats]);

  const cancelHideTooltip = useCallback(() => {
    if (hideTipTimerRef.current) {
      clearTimeout(hideTipTimerRef.current);
      hideTipTimerRef.current = null;
    }
  }, []);

  const hideTooltipNow = useCallback(() => {
    cancelHideTooltip();
    setTooltip(null);
  }, [cancelHideTooltip]);

  const scheduleHideTooltip = useCallback(() => {
    cancelHideTooltip();
    hideTipTimerRef.current = setTimeout(() => setTooltip(null), 30);
  }, [cancelHideTooltip]);

  const showTooltip = useCallback(
    (label: string, e: React.MouseEvent) => {
      cancelHideTooltip();
      setTooltip({ label, x: e.clientX, y: e.clientY });
    },
    [cancelHideTooltip],
  );

  useEffect(() => () => cancelHideTooltip(), [cancelHideTooltip]);

  useEffect(() => {
    const wrap = mapWrapRef.current;
    if (!wrap || !tooltip) return;
    const onMove = (e: MouseEvent) => {
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = tooltipTransform(e.clientX, e.clientY);
      }
    };
    wrap.addEventListener('mousemove', onMove, { passive: true });
    return () => wrap.removeEventListener('mousemove', onMove);
  }, [tooltip]);

  const isPanning = spaceHeld;

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!spaceHeld) return;
    if ((e.target as Element).closest('[data-seat]')) return;
    panDrag.current = { startX: e.clientX, startY: e.clientY, view };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!panDrag.current) return;
    const { startX, startY, view: v0 } = panDrag.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setView(panView(v0, dx, dy, pageW, pageH));
  };

  const handlePointerUp = () => {
    panDrag.current = null;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-56 shrink-0 space-y-3 bg-card text-card-foreground border border-border rounded-xl p-4">
        <p className="text-xs font-medium text-foreground">View only</p>
        <p className="text-xs text-muted-foreground">
          Seat map changes are managed by TheAgencyJo. Contact support to update this template.
        </p>
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-foreground">Seat counts</p>
          {tierConfig
            .filter((t) => t.selection_mode !== 'general_admission')
            .map((t) => (
              <p key={t.key} className="text-xs text-muted-foreground">
                {t.name}: {countsBySection[t.key] ?? 0}
              </p>
            ))}
          <p className="text-xs text-muted-foreground pt-1">Total map seats: {seats.length}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-[480px]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">
            Scroll to zoom · hold <kbd className="px-1 py-0.5 bg-[#eee] rounded text-[10px]">Space</kbd> and drag to pan
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={zoomOut}
              className="p-2 border border-border rounded-lg hover:bg-muted"
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="p-2 border border-border rounded-lg hover:bg-muted"
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={fitAllSeats}
              className="px-2 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted"
            >
              Fit all seats
            </button>
            <button
              type="button"
              onClick={resetView}
              className="px-2 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted"
            >
              Reset view
            </button>
          </div>
        </div>
        <div
          ref={mapWrapRef}
          className={`flex-1 overflow-auto border border-border rounded-xl bg-muted p-2 relative ${
            isPanning ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseLeave={hideTooltipNow}
        >
          {tooltip &&
            createPortal(
              <div
                ref={tooltipRef}
                className="pointer-events-none fixed top-0 left-0 z-[9999] px-2.5 py-1.5 rounded-lg bg-[#111] text-white text-xs font-medium shadow-lg whitespace-nowrap will-change-transform"
                style={{ transform: tooltipTransform(tooltip.x, tooltip.y) }}
                role="tooltip"
              >
                {tooltip.label}
              </div>,
              document.body,
            )}
          {!floorPlanUrl && (
            <p className="text-sm text-muted-foreground p-4">No floor plan image on this template.</p>
          )}
          <svg
            ref={svgRef}
            viewBox={view.join(' ')}
            className={`w-full min-w-[640px] h-auto touch-none ${isPanning ? 'cursor-grab' : 'cursor-default'}`}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {floorPlanUrl && (
              <image
                href={floorPlanUrl}
                x={0}
                y={0}
                width={pageW}
                height={pageH}
                preserveAspectRatio="none"
                pointerEvents="none"
              />
            )}
            {layout.ga_zone && layout.ga_zone.type === 'rect' && (
              <rect
                x={layout.ga_zone.x}
                y={layout.ga_zone.y}
                width={layout.ga_zone.w}
                height={layout.ga_zone.h}
                fill="rgba(100,100,100,0.15)"
                stroke="#999"
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            )}
            {seats.map((seat) => {
              const w = seat.w ?? 10;
              const h = seat.h ?? 10;
              const fill = 'rgba(74, 222, 128, 0.85)';
              const stroke = '#16a34a';
              const sectionLabel = SECTION_LABELS[seat.section_key] ?? seat.section_key;
              const tipLabel = `${sectionLabel} · Row ${seat.row} · Seat ${seat.number}`;
              const onHoverEnter = (e: React.MouseEvent) => showTooltip(tipLabel, e);
              if (seat.shape === 'circle') {
                const r = Math.max(w, h) / 2;
                return (
                  <circle
                    key={seat.key}
                    cx={seat.x}
                    cy={seat.y}
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.5}
                    onMouseEnter={onHoverEnter}
                    onMouseLeave={scheduleHideTooltip}
                  >
                    <title>{tipLabel}</title>
                  </circle>
                );
              }
              return (
                <rect
                  key={seat.key}
                  x={seat.x - w / 2}
                  y={seat.y - h / 2}
                  width={w}
                  height={h}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                  rx={1}
                  onMouseEnter={onHoverEnter}
                  onMouseLeave={scheduleHideTooltip}
                >
                  <title>{tipLabel}</title>
                </rect>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
