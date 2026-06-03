import React, { useMemo } from 'react';
import type { AdminSeatMapPayload, AdminSeatMapSeat } from '../../../api/adminSeatMap';
import { getTierFill, seatStatusFill } from '../../utils/tierColors';

const VISUAL_SCALE = 1.15;

export function isSeatSelectableForComp(seat: AdminSeatMapSeat): boolean {
  return seat.status === 'available' && !seat.reservation;
}

type Props = {
  payload: AdminSeatMapPayload;
  selectedTierId: string | null;
  onSeatSelect: (seat: AdminSeatMapSeat | null) => void;
  selectedSeatId: string | null;
  compSelectMode?: boolean;
  selectedSeatIds?: Set<string>;
  onSeatToggle?: (seat: AdminSeatMapSeat) => void;
};

export function AdminSeatMapViewer({
  payload,
  selectedTierId,
  onSeatSelect,
  selectedSeatId,
  compSelectMode = false,
  selectedSeatIds,
  onSeatToggle,
}: Props) {
  const { layout, seats, tiers } = payload;
  const pageW = layout.page_w || 1200;
  const pageH = layout.page_h || 850;

  const tierIndex = useMemo(() => {
    const m = new Map<string, number>();
    tiers.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [tiers]);

  const visibleSeats = useMemo(() => {
    if (!selectedTierId) return seats;
    return seats.filter((s) => s.tier_id === selectedTierId);
  }, [seats, selectedTierId]);

  const viewBox = `0 0 ${pageW} ${pageH}`;

  const handleSeatClick = (seat: AdminSeatMapSeat) => {
    if (compSelectMode && onSeatToggle) {
      if (isSeatSelectableForComp(seat)) {
        onSeatToggle(seat);
      }
      return;
    }
    onSeatSelect(selectedSeatId === seat.id ? null : seat);
  };

  return (
    <div className="relative w-full overflow-auto rounded-xl border border-[#e8e8e8] bg-[#fafafa] max-h-[min(70vh,720px)]">
      <svg viewBox={viewBox} className="w-full min-w-[320px]" style={{ minHeight: 280 }} role="img">
        {layout.floor_plan_url && (
          <image href={layout.floor_plan_url} x={0} y={0} width={pageW} height={pageH} preserveAspectRatio="xMidYMid meet" />
        )}
        {visibleSeats.map((seat) => {
          const w = (seat.w ?? 10) * VISUAL_SCALE;
          const h = (seat.h ?? 10) * VISUAL_SCALE;
          const isCompSelected = compSelectMode && selectedSeatIds?.has(seat.id);
          const fill = isCompSelected ? '#3b82f6' : seatStatusFill(seat.status, seat.reservation?.payment_status);
          const stroke = isCompSelected
            ? '#1d4ed8'
            : selectedSeatId === seat.id
              ? '#000'
              : 'rgba(0,0,0,0.25)';
          const strokeWidth = isCompSelected || selectedSeatId === seat.id ? 2 : 0.5;
          const selectable = compSelectMode && isSeatSelectableForComp(seat);
          const cx = seat.map_x;
          const cy = seat.map_y;
          const onClick = () => handleSeatClick(seat);
          const cursor = compSelectMode
            ? selectable
              ? 'cursor-pointer'
              : 'cursor-not-allowed'
            : 'cursor-pointer';

          if (seat.shape === 'circle') {
            const r = Math.max(w, h) / 2;
            return (
              <circle
                key={seat.id}
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={0.92}
                className={cursor}
                onClick={onClick}
              />
            );
          }
          return (
            <rect
              key={seat.id}
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              rx={1}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={compSelectMode && !selectable ? 0.45 : 0.92}
              className={cursor}
              onClick={onClick}
            />
          );
        })}
      </svg>
      <div className="absolute bottom-2 start-2 flex flex-wrap gap-2 text-[10px] bg-white/90 rounded-lg px-2 py-1 border border-[#e8e8e8]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Held</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#dc2626]" /> Booked</span>
        {compSelectMode && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Selected</span>
        )}
      </div>
    </div>
  );
}
