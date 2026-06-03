import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { VenueLayout, VenueLayoutSeat, VenueTierConfig } from '../../../api/venueTemplates';
import {
  boundsForPoints,
  fullView,
  panView,
  zoomView,
  ZOOM_STEP,
  type ViewBox,
} from '../../utils/svgViewBox';
import { assignedMapTiers, tierLabel } from '../../utils/venueTierConfig';

function nextSeatNumber(
  seats: VenueLayoutSeat[],
  sectionKey: string,
  row: string,
  startFrom: number,
): number {
  const inRow = seats.filter((s) => s.section_key === sectionKey && s.row === row);
  if (inRow.length === 0) return Math.max(1, startFrom);
  return Math.max(...inRow.map((s) => s.number)) + 1;
}

function makeSeatKey(sectionKey: string, row: string, num: number) {
  return `${sectionKey}_${row}_${num}`.toLowerCase();
}

const MIN_HIT_SIZE = 18;
const TOOLTIP_OFFSET_X = 18;
const TOOLTIP_OFFSET_Y = -40;
const TOOLTIP_HIDE_MS = 30;

function tooltipTransform(clientX: number, clientY: number) {
  return `translate(${clientX + TOOLTIP_OFFSET_X}px, ${clientY + TOOLTIP_OFFSET_Y}px)`;
}

function moveTooltipEl(el: HTMLDivElement | null, clientX: number, clientY: number) {
  if (!el) return;
  el.style.transform = tooltipTransform(clientX, clientY);
}

type EditorTooltip = { label: string; x: number; y: number };

type EditorMode = 'place' | 'move_section' | 'move_row';

const NUDGE_STEP = 5;

interface VenueMapEditorProps {
  layout: VenueLayout;
  tierConfig: VenueTierConfig[];
  onLayoutChange: (layout: VenueLayout) => void;
}

export function VenueMapEditor({ layout, tierConfig, onLayoutChange }: VenueMapEditorProps) {
  const mapSections = useMemo(() => assignedMapTiers(tierConfig), [tierConfig]);
  const [editorMode, setEditorMode] = useState<EditorMode>('place');
  const [sectionKey, setSectionKey] = useState<string>('');
  const [row, setRow] = useState('A');
  const [seatNumberStart, setSeatNumberStart] = useState(1);
  const [seatW, setSeatW] = useState(10);
  const [seatH, setSeatH] = useState(10);
  const [shape, setShape] = useState<'rect' | 'circle'>('rect');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [groupDrag, setGroupDrag] = useState<{
    mode: 'section' | 'row';
    sectionKey: string;
    row?: string;
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  const [tooltip, setTooltip] = useState<EditorTooltip | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const mapWrapRef = useRef<HTMLDivElement | null>(null);
  const hideTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const { page_w: pageW, page_h: pageH, floor_plan_url: floorPlanUrl, seats } = layout;

  useEffect(() => {
    if (mapSections.length === 0) return;
    setSectionKey((prev) =>
      mapSections.some((t) => t.key === prev) ? prev : mapSections[0].key,
    );
  }, [mapSections]);

  const [view, setView] = useState<ViewBox>(() => fullView(pageW, pageH));
  const viewRef = useRef(view);
  viewRef.current = view;
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panDrag = useRef<{ startX: number; startY: number; view: ViewBox } | null>(null);

  useEffect(() => {
    setView(fullView(pageW, pageH));
  }, [pageW, pageH]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
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

  const fitSection = useCallback(() => {
    const pts = seats
      .filter((s) => s.section_key === sectionKey)
      .map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
    const bounds = boundsForPoints(pts, pageW, pageH);
    if (bounds) setView(bounds);
    else toast.error('No seats in this section');
  }, [seats, sectionKey, pageW, pageH]);

  const isPanning = spaceHeld && !dragKey && !groupDrag;

  useEffect(() => {
    const inRow = seats.filter((s) => s.section_key === sectionKey && s.row === row);
    if (inRow.length > 0) {
      setSeatNumberStart(Math.max(...inRow.map((s) => s.number)) + 1);
    }
  }, [sectionKey, row]);

  const countsBySection = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of seats) {
      c[s.section_key] = (c[s.section_key] || 0) + 1;
    }
    return c;
  }, [seats]);

  const updateSeats = useCallback(
    (nextSeats: VenueLayoutSeat[]) => {
      onLayoutChange({ ...layoutRef.current, seats: nextSeats });
    },
    [onLayoutChange],
  );

  const svgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const addSeatAt = (x: number, y: number) => {
    if (!sectionKey || mapSections.length === 0) {
      toast.error('Add assigned sections under Sections & tiers before placing seats.');
      return;
    }
    const num = nextSeatNumber(seats, sectionKey, row, seatNumberStart);
    const seat: VenueLayoutSeat = {
      key: makeSeatKey(sectionKey, row, num),
      section_key: sectionKey,
      row,
      number: num,
      x,
      y,
      shape,
      w: seatW,
      h: seatH,
    };
    updateSeats([...seats, seat]);
    setSelectedKey(seat.key);
    setSeatNumberStart(num + 1);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('[data-seat]')) return;
    if (spaceHeld || editorMode !== 'place') return;
    const { x, y } = svgPoint(e.clientX, e.clientY);
    addSeatAt(x, y);
  };

  const startGroupDrag = (
    e: React.PointerEvent,
    mode: 'section' | 'row',
    targetSection: string,
    targetRow?: string,
  ) => {
    const { x, y } = svgPoint(e.clientX, e.clientY);
    const current = layoutRef.current.seats;
    const origins = new Map<string, { x: number; y: number }>();
    for (const s of current) {
      if (s.section_key !== targetSection) continue;
      if (mode === 'row' && s.row !== targetRow) continue;
      origins.set(s.key, { x: s.x, y: s.y });
    }
    if (origins.size === 0) {
      toast.error(mode === 'row' ? 'No seats in this section/row' : 'No seats in this section');
      return;
    }
    setGroupDrag({ mode, sectionKey: targetSection, row: targetRow, startX: x, startY: y, origins });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleSeatPointerDown = (e: React.PointerEvent, seat: VenueLayoutSeat) => {
    e.stopPropagation();
    if (spaceHeld) return;
    setSelectedKey(seat.key);
    setSectionKey(seat.section_key);
    setRow(seat.row);
    const inRow = seats.filter((s) => s.section_key === seat.section_key && s.row === seat.row);
    setSeatNumberStart(
      inRow.length > 0 ? Math.max(...inRow.map((s) => s.number)) + 1 : seat.number,
    );

    if (editorMode === 'move_section') {
      startGroupDrag(e, 'section', seat.section_key);
      return;
    }
    if (editorMode === 'move_row') {
      startGroupDrag(e, 'row', seat.section_key, seat.row);
      return;
    }

    setDragKey(seat.key);
    const { x, y } = svgPoint(e.clientX, e.clientY);
    dragOffset.current = { dx: x - seat.x, dy: y - seat.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (spaceHeld) {
      panDrag.current = { startX: e.clientX, startY: e.clientY, view: [...viewRef.current] as ViewBox };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    if (editorMode === 'place') return;
    if ((e.target as Element).closest('[data-seat]')) return;
    if (editorMode === 'move_section') {
      startGroupDrag(e, 'section', sectionKey);
    } else if (editorMode === 'move_row') {
      startGroupDrag(e, 'row', sectionKey, row);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panDrag.current) {
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const scaleX = panDrag.current.view[2] / svg.clientWidth;
      const scaleY = panDrag.current.view[3] / svg.clientHeight;
      const dx = (e.clientX - panDrag.current.startX) * scaleX;
      const dy = (e.clientY - panDrag.current.startY) * scaleY;
      setView(panView(panDrag.current.view, -dx, -dy, pageW, pageH));
      return;
    }
    if (groupDrag) {
      const { x, y } = svgPoint(e.clientX, e.clientY);
      const dx = x - groupDrag.startX;
      const dy = y - groupDrag.startY;
      updateSeats(
        layoutRef.current.seats.map((s) => {
          const origin = groupDrag.origins.get(s.key);
          if (!origin) return s;
          return { ...s, x: origin.x + dx, y: origin.y + dy };
        }),
      );
      return;
    }
    if (!dragKey) return;
    const { x, y } = svgPoint(e.clientX, e.clientY);
    updateSeats(
      layoutRef.current.seats.map((s) =>
        s.key === dragKey ? { ...s, x: x - dragOffset.current.dx, y: y - dragOffset.current.dy } : s,
      ),
    );
  };

  const handlePointerUp = () => {
    setDragKey(null);
    setGroupDrag(null);
    panDrag.current = null;
  };

  const nudgeSeats = (dx: number, dy: number, scope: 'section' | 'row') => {
    const current = layoutRef.current.seats;
    let moved = 0;
    const next = current.map((s) => {
      if (s.section_key !== sectionKey) return s;
      if (scope === 'row' && s.row !== row) return s;
      moved += 1;
      return { ...s, x: s.x + dx, y: s.y + dy };
    });
    if (moved === 0) {
      toast.error(scope === 'row' ? 'No seats in this section/row' : 'No seats in this section');
      return;
    }
    updateSeats(next);
  };

  const deleteSectionSeats = () => {
    const count = seats.filter((s) => s.section_key === sectionKey).length;
    if (count === 0) {
      toast.error('No seats in this section');
      return;
    }
    if (!window.confirm(`Delete all ${count} seats in ${sectionKey}?`)) return;
    updateSeats(seats.filter((s) => s.section_key !== sectionKey));
    setSelectedKey(null);
    toast.success(`Removed ${count} seats`);
  };

  const deleteSelected = () => {
    if (!selectedKey) return;
    updateSeats(seats.filter((s) => s.key !== selectedKey));
    setSelectedKey(null);
  };

  const duplicateRow = () => {
    const source = seats.filter((s) => s.section_key === sectionKey && s.row === row);
    if (source.length === 0) {
      toast.error('No seats in current section/row to duplicate');
      return;
    }
    const rows = [...new Set(seats.filter((s) => s.section_key === sectionKey).map((s) => s.row))].sort();
    const idx = rows.indexOf(row);
    const nextRow =
      idx >= 0 && idx < rows.length - 1 ? rows[idx + 1] : String.fromCharCode(row.charCodeAt(0) + 1);
    const refY = seats.find((s) => s.section_key === sectionKey && s.row === nextRow)?.y;
    const offsetY = refY != null ? source[0].y - refY : -18;
    const baseY = source[0].y;
    const newSeats = source.map((s) => ({
      ...s,
      key: makeSeatKey(sectionKey, nextRow, s.number),
      row: nextRow,
      number: s.number,
      y: baseY - offsetY,
    }));
    updateSeats([...seats, ...newSeats]);
    setRow(nextRow);
    const nums = newSeats.map((s) => s.number);
    setSeatNumberStart(nums.length > 0 ? Math.max(...nums) + 1 : seatNumberStart);
    toast.success(`Duplicated row ${row} → ${nextRow}`);
  };

  const selected = seats.find((s) => s.key === selectedKey);

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
    hideTipTimerRef.current = setTimeout(() => {
      setTooltip(null);
      hideTipTimerRef.current = null;
    }, TOOLTIP_HIDE_MS);
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
    const onMove = (e: MouseEvent) => moveTooltipEl(tooltipRef.current, e.clientX, e.clientY);
    wrap.addEventListener('mousemove', onMove, { passive: true });
    return () => wrap.removeEventListener('mousemove', onMove);
  }, [tooltip]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-64 shrink-0 space-y-4 bg-white border border-[#e8e8e8] rounded-xl p-4">
        <div>
          <label className="block text-xs font-medium text-[#525252] mb-1">Tool</label>
          <select
            value={editorMode}
            onChange={(e) => setEditorMode(e.target.value as EditorMode)}
            className="w-full border border-[#e8e8e8] rounded-lg px-2 py-2 text-sm"
          >
            <option value="place">Place seats (click map)</option>
            <option value="move_section">Move whole section</option>
            <option value="move_row">Move row only</option>
          </select>
          <p className="text-xs text-[#8c8c8c] mt-1">
            {editorMode === 'place'
              ? 'Click empty map to add. Drag one seat to nudge it.'
              : editorMode === 'move_section'
                ? 'Drag any seat in the section — the whole section moves.'
                : 'Drag any seat in the row — the whole row moves.'}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#525252] mb-1">Nudge (5px)</label>
          <div className="grid grid-cols-3 gap-1 max-w-[132px]">
            <span />
            <button
              type="button"
              className="py-1.5 text-sm border rounded-lg hover:bg-[#fafafa]"
              onClick={() => nudgeSeats(0, -NUDGE_STEP, editorMode === 'move_row' ? 'row' : 'section')}
            >
              ↑
            </button>
            <span />
            <button
              type="button"
              className="py-1.5 text-sm border rounded-lg hover:bg-[#fafafa]"
              onClick={() => nudgeSeats(-NUDGE_STEP, 0, editorMode === 'move_row' ? 'row' : 'section')}
            >
              ←
            </button>
            <span className="text-[10px] text-center self-center text-[#8c8c8c]">
              {editorMode === 'move_row' ? 'row' : 'sec'}
            </span>
            <button
              type="button"
              className="py-1.5 text-sm border rounded-lg hover:bg-[#fafafa]"
              onClick={() => nudgeSeats(NUDGE_STEP, 0, editorMode === 'move_row' ? 'row' : 'section')}
            >
              →
            </button>
            <span />
            <button
              type="button"
              className="py-1.5 text-sm border rounded-lg hover:bg-[#fafafa]"
              onClick={() => nudgeSeats(0, NUDGE_STEP, editorMode === 'move_row' ? 'row' : 'section')}
            >
              ↓
            </button>
            <span />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#525252] mb-1">Section</label>
          {mapSections.length === 0 ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2">
              No assigned sections. Open <strong>Sections & tiers</strong> and add seated areas first.
            </p>
          ) : (
            <select
              value={sectionKey}
              onChange={(e) => setSectionKey(e.target.value)}
              className="w-full border border-[#e8e8e8] rounded-lg px-2 py-2 text-sm"
            >
              {mapSections.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-[#525252] mb-1">Row</label>
          <input
            value={row}
            onChange={(e) => setRow(e.target.value.toUpperCase())}
            className="w-full border border-[#e8e8e8] rounded-lg px-2 py-2 text-sm"
            maxLength={2}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#525252] mb-1">Start seat #</label>
          <input
            type="number"
            min={1}
            value={seatNumberStart}
            onChange={(e) => setSeatNumberStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full border border-[#e8e8e8] rounded-lg px-2 py-2 text-sm"
          />
          <p className="text-xs text-[#8c8c8c] mt-1">
            First click in this row uses this number (e.g. 3 → 3, 4, 5…). Then auto-increment.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-[#8c8c8c]">Width</label>
            <input
              type="number"
              value={seatW}
              onChange={(e) => setSeatW(Number(e.target.value) || 10)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8c8c8c]">Height</label>
            <input
              type="number"
              value={seatH}
              onChange={(e) => setSeatH(Number(e.target.value) || 10)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#525252] mb-1">Shape</label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as 'rect' | 'circle')}
            className="w-full border rounded-lg px-2 py-2 text-sm"
          >
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
          </select>
        </div>
        {editorMode === 'place' && (
          <p className="text-xs text-[#8c8c8c]">Click the map to place a seat. Drag seats to adjust.</p>
        )}
        <button
          type="button"
          onClick={duplicateRow}
          disabled={editorMode !== 'place'}
          className="w-full py-2 text-sm border border-[#e8e8e8] rounded-lg hover:bg-[#fafafa] disabled:opacity-40"
        >
          Duplicate row (next row)
        </button>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={!selectedKey || editorMode !== 'place'}
          className="w-full py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg disabled:opacity-40"
        >
          Delete selected
        </button>
        <button
          type="button"
          onClick={deleteSectionSeats}
          className="w-full py-2 text-sm bg-red-50 text-red-800 border border-red-200 rounded-lg"
        >
          Delete entire section
        </button>
        {selected && (
          <p className="text-xs text-[#525252]">
            Selected: {selected.section_key} {selected.row}-{selected.number}
          </p>
        )}
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-medium text-[#000000]">Seat counts</p>
          {tierConfig
            .filter((t) => t.selection_mode !== 'general_admission')
            .map((t) => (
              <p key={t.key} className="text-xs text-[#8c8c8c]">
                {t.name}: {countsBySection[t.key] ?? 0}
              </p>
            ))}
          <p className="text-xs text-[#8c8c8c]">Total map seats: {seats.length}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-[480px]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-xs text-[#8c8c8c]">
            Scroll to zoom · hold <kbd className="px-1 py-0.5 bg-[#eee] rounded text-[10px]">Space</kbd> and drag to pan
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={zoomOut}
              className="p-2 border border-[#e8e8e8] rounded-lg hover:bg-white"
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="p-2 border border-[#e8e8e8] rounded-lg hover:bg-white"
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={fitSection}
              className="px-2 py-2 text-xs font-medium border border-[#e8e8e8] rounded-lg hover:bg-white"
            >
              Fit section
            </button>
            <button
              type="button"
              onClick={resetView}
              className="px-2 py-2 text-xs font-medium border border-[#e8e8e8] rounded-lg hover:bg-white"
            >
              Reset view
            </button>
          </div>
        </div>
      <div
        ref={mapWrapRef}
        className={`flex-1 overflow-auto border border-[#e8e8e8] rounded-xl bg-[#fafafa] p-2 relative ${
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
          <p className="text-sm text-[#8c8c8c] p-4">Upload a floor plan image to begin marking seats.</p>
        )}
        <svg
          ref={svgRef}
          viewBox={view.join(' ')}
          className={`w-full min-w-[640px] h-auto touch-none ${
            isPanning
              ? 'cursor-grab'
              : editorMode === 'place'
                ? 'cursor-crosshair'
                : 'cursor-grab'
          }`}
          onClick={handleSvgClick}
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
            const isSel = seat.key === selectedKey;
            const inActiveSection =
              editorMode !== 'place' && seat.section_key === sectionKey;
            const inActiveRow =
              editorMode === 'move_row' && seat.section_key === sectionKey && seat.row === row;
            const w = seat.w ?? 10;
            const h = seat.h ?? 10;
            const hit = Math.max(MIN_HIT_SIZE, w + 4, h + 4);
            const fill = isSel
              ? '#2563eb'
              : inActiveRow || (inActiveSection && editorMode === 'move_section')
                ? 'rgba(96, 165, 250, 0.9)'
                : 'rgba(74, 222, 128, 0.85)';
            const stroke = isSel
              ? '#1d4ed8'
              : inActiveRow || (inActiveSection && editorMode === 'move_section')
                ? '#2563eb'
                : '#16a34a';
            const sectionLabel = tierLabel(tierConfig, seat.section_key);
            const tipLabel = `${sectionLabel} · Row ${seat.row} · Seat ${seat.number}`;
            const onHoverEnter = (e: React.MouseEvent) => showTooltip(tipLabel, e);
            if (seat.shape === 'circle') {
              const r = Math.max(w, h) / 2;
              const hitR = Math.max(hit / 2, r + 2);
              return (
                <g key={seat.key}>
                  <circle
                    data-seat-hit
                    cx={seat.x}
                    cy={seat.y}
                    r={hitR}
                    fill="transparent"
                    onMouseEnter={onHoverEnter}
                    onMouseLeave={scheduleHideTooltip}
                  />
                  <circle
                    data-seat
                    cx={seat.x}
                    cy={seat.y}
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.5}
                    onPointerDown={(e) => handleSeatPointerDown(e, seat)}
                  >
                    <title>{tipLabel}</title>
                  </circle>
                </g>
              );
            }
            return (
              <g key={seat.key}>
                <rect
                  data-seat-hit
                  x={seat.x - hit / 2}
                  y={seat.y - hit / 2}
                  width={hit}
                  height={hit}
                  fill="transparent"
                  onMouseEnter={onHoverEnter}
                  onMouseLeave={scheduleHideTooltip}
                />
                <rect
                  data-seat
                  x={seat.x - w / 2}
                  y={seat.y - h / 2}
                  width={w}
                  height={h}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                  rx={1}
                  onPointerDown={(e) => handleSeatPointerDown(e, seat)}
                >
                  <title>{tipLabel}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>
      </div>
    </div>
  );
}
