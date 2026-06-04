import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

const MENU_WIDTH = 192;
const MENU_EST_HEIGHT = 88;
const VIEWPORT_PAD = 8;
const GAP = 4;

type MenuCoords = { top: number; left: number };

function placeMenu(anchor: HTMLElement): MenuCoords {
  const rect = anchor.getBoundingClientRect();
  const rtl = document.documentElement.dir === 'rtl';
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < MENU_EST_HEIGHT + GAP + VIEWPORT_PAD;
  const top = openUp ? rect.top - MENU_EST_HEIGHT - GAP : rect.bottom + GAP;
  let left = rtl ? rect.left : rect.right - MENU_WIDTH;
  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PAD));
  return { top: Math.max(VIEWPORT_PAD, top), left };
}

export type AdminRowActionsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel: string;
  children: React.ReactNode;
};

/** Table row ⋮ menu — portaled so parent overflow does not clip the dropdown. */
export function AdminRowActionsMenu({
  open,
  onOpenChange,
  triggerLabel,
  children,
}: AdminRowActionsMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    setCoords(placeMenu(triggerRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={20} />
      </button>
      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[200] w-48 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border py-1 animate-in fade-in zoom-in-95 duration-200"
            style={{ top: coords.top, left: coords.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
