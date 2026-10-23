// One floating panel for every menu of the app (sections, filters, catalogue, date):
// - phones (< 640 px): bottom sheet over a dimmed backdrop, within thumb reach;
// - larger screens: drop-down anchored to its button (below or above it), sized to the window.
// Rendered in <body> (portal) so no parent overflow / backdrop-filter can clip or misplace it.
// Keyboard: focus moves into the panel, Tab stays inside, Escape closes and gives focus back to
// the button. Mouse / touch: a click outside closes it.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

const MARGIN = 12; // px between the panel and the window edges
const GAP = 8; // px between the button and the panel

interface Props {
  id: string;
  /** Accessible name of the panel (role=dialog). */
  label: string;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  /** Horizontal alignment with the button on larger screens. */
  align?: 'start' | 'end';
  /** Open below the button (top bar) or above it (bottom bar). */
  placement?: 'below' | 'above';
  /** Panel width on larger screens (px, capped to the window). */
  width?: number;
  /** false: the child manages its own scrolling (e.g. a fixed search field above a list). */
  scroll?: boolean;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Popover({ id, label, anchorRef, onClose, children, align = 'start', placement = 'below', width = 320, scroll = true }: Props) {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const panelRef = useRef<HTMLDivElement>(null);
  // Transparent (not visibility:hidden: children with transition-all would animate it and refuse focus)
  // until positioned next to the button.
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Position next to the button (larger screens), kept in sync with resizes / rotations.
  useLayoutEffect(() => {
    if (isPhone) {
      setStyle({});
      return;
    }
    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(width, vw - 2 * MARGIN);
      const next: CSSProperties = { width: w };
      if (placement === 'below') {
        next.top = r.bottom + GAP;
        next.maxHeight = vh - r.bottom - GAP - MARGIN;
      } else {
        next.bottom = vh - r.top + GAP;
        next.maxHeight = r.top - GAP - MARGIN;
      }
      next.left = align === 'start' ? Math.min(Math.max(MARGIN, r.left), vw - MARGIN - w) : Math.max(MARGIN, Math.min(r.right, vw - MARGIN) - w);
      setStyle(next);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isPhone, anchorRef, align, placement, width]);

  // Focus in once the panel is positioned (it is invisible before), on the current choice if any.
  const positioned = isPhone || style.opacity !== 0;
  useEffect(() => {
    if (!positioned) return;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [positioned]);

  // On close, give focus back to the button, unless the user already moved it elsewhere (clicked
  // another control, or a species card took it). Checked a frame later, once the panel is gone.
  useEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    return () => {
      requestAnimationFrame(() => {
        if (panel?.isConnected) return; // React StrictMode re-run, not a real close
        const active = document.activeElement;
        if (!active || active === document.body) anchor?.focus({ preventScroll: true });
      });
    };
  }, [anchorRef]);

  // Escape (handled here so it doesn't also close what is behind), Tab loop, click outside.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [anchorRef]);

  return createPortal(
    <>
      {isPhone && <div className="fixed inset-0 z-[70] bg-slate-950/35" aria-hidden="true" />}
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-label={label}
        aria-modal={isPhone || undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={style}
        className={`fixed z-[71] flex flex-col overflow-hidden bg-white/97 backdrop-blur-xl border border-sky-200/90 shadow-2xl shadow-sky-950/25 text-slate-800 outline-none ${
          isPhone
            ? 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] camarine-sheet-in'
            : 'rounded-2xl camarine-pop-in'
        }`}
      >
        {isPhone && <div className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />}
        {scroll ? <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{children}</div> : children}
      </div>
    </>,
    document.body,
  );
}
