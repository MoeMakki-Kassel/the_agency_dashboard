export type ViewBox = [number, number, number, number];

export const ZOOM_STEP = 0.82;
const MIN_VIEW_FRAC = 0.06;

export function clampView(view: ViewBox, pageW: number, pageH: number): ViewBox {
  const [vx, vy, vw, vh] = view;
  const minW = pageW * MIN_VIEW_FRAC;
  const minH = pageH * MIN_VIEW_FRAC;
  const w = Math.max(minW, Math.min(pageW, vw));
  const h = Math.max(minH, Math.min(pageH, vh));
  const x = Math.max(0, Math.min(pageW - w, vx));
  const y = Math.max(0, Math.min(pageH - h, vy));
  return [x, y, w, h];
}

/** scale < 1 zooms in (smaller viewport), scale > 1 zooms out */
export function zoomView(view: ViewBox, scale: number, pageW: number, pageH: number): ViewBox {
  const [vx, vy, vw, vh] = view;
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  const nw = vw * scale;
  const nh = vh * scale;
  return clampView([cx - nw / 2, cy - nh / 2, nw, nh], pageW, pageH);
}

export function panView(view: ViewBox, dx: number, dy: number, pageW: number, pageH: number): ViewBox {
  const [vx, vy, vw, vh] = view;
  return clampView([vx + dx, vy + dy, vw, vh], pageW, pageH);
}

export function fullView(pageW: number, pageH: number): ViewBox {
  return [0, 0, pageW, pageH];
}

export function boundsForPoints(
  points: { x: number; y: number; w?: number; h?: number }[],
  pageW: number,
  pageH: number,
  padding = 48,
): ViewBox | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const w = p.w ?? 10;
    const h = p.h ?? 10;
    minX = Math.min(minX, p.x - w / 2);
    minY = Math.min(minY, p.y - h / 2);
    maxX = Math.max(maxX, p.x + w / 2);
    maxY = Math.max(maxY, p.y + h / 2);
  }
  const vx = Math.max(0, minX - padding);
  const vy = Math.max(0, minY - padding);
  const vw = Math.min(pageW - vx, maxX - minX + padding * 2);
  const vh = Math.min(pageH - vy, maxY - minY + padding * 2);
  return clampView([vx, vy, vw, vh], pageW, pageH);
}
