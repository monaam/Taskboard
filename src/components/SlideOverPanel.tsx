import { ReactNode } from 'react';

interface SlideOverPanelProps {
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Backdrop + drawer shell, shared by ItemDetailPanel and CreateItemPanel.
 *
 * Must be mounted OUTSIDE <Canvas />: `.canvas-content` carries a transform,
 * which makes it the containing block for `position: fixed` descendants — a
 * sheet inside it would be positioned against the 4000x3000 canvas and scaled
 * by the zoom factor.
 *
 * Breakpoint is `md:` (768px) to match Canvas's `isMobile` media query. `sm:`
 * is 640px and would put the desktop drawer over the mobile list view in the
 * 641-768px band.
 *
 * Deliberately holds no focus logic: focus belongs to the content, which is
 * keyed by item id in the detail panel. Focusing from here would not re-run
 * when the content is swapped A→B, leaving focus outside the drawer and Escape
 * dead.
 */
export const SlideOverPanel = ({ ariaLabel, onClose, children }: SlideOverPanelProps) => (
  <>
    {/* Modal on mobile, non-modal drawer on desktop so the canvas stays usable. */}
    <div className="fixed inset-0 bg-black/30 z-[60] md:hidden" onClick={onClose} />
    <div
      tabIndex={-1}
      role="dialog"
      // No aria-modal: it cannot vary by breakpoint without JS, and it would
      // be a lie on the desktop drawer.
      aria-label={ariaLabel}
      // Escape is handled here, not on window: React 19 attaches at the root
      // container, which is below window in the bubble path, so a window
      // listener could not preempt the text input's own Escape handler.
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-x-0 bottom-0 z-[70] max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-2xl outline-none md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[380px] md:max-h-none md:rounded-none md:border-l md:border-gray-200"
    >
      {children}
    </div>
  </>
);
