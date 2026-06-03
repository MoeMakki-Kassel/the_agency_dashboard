const TIER_PALETTE = [
  { fill: '#8b5cf6' },
  { fill: '#f59e0b' },
  { fill: '#0ea5e9' },
  { fill: '#d946ef' },
  { fill: '#14b8a6' },
  { fill: '#f97316' },
] as const;

export function getTierFill(tierId: string, tierIndex?: number): string {
  if (tierIndex !== undefined && tierIndex >= 0) {
    return TIER_PALETTE[tierIndex % TIER_PALETTE.length].fill;
  }
  let hash = 0;
  for (let i = 0; i < tierId.length; i++) {
    hash = (hash << 5) - hash + tierId.charCodeAt(i);
    hash |= 0;
  }
  return TIER_PALETTE[Math.abs(hash) % TIER_PALETTE.length].fill;
}

export function seatStatusFill(
  status: string,
  paymentStatus?: string | null,
): string {
  if (status === 'booked' || paymentStatus === 'paid') return '#dc2626';
  if (status === 'locked' || paymentStatus === 'pending') return '#f59e0b';
  return '#22c55e';
}
