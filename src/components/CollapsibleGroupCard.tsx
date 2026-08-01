import { ReactNode, useId, useState } from 'react';

interface CollapsibleGroupCardProps {
  title: string;
  count: number;
  children: ReactNode;
}

/**
 * A titled, collapsible card holding a divided list of rows.
 *
 * Collapse state is deliberately ephemeral and local: it is scoped to a working
 * session, and a card unmounts on its own once its last item leaves the group.
 * React reconciles these by the caller's key, so a card keeps its state while
 * other groups appear and disappear around it.
 */
export const CollapsibleGroupCard = ({ title, count, children }: CollapsibleGroupCardProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Button inside the heading, per the ARIA disclosure pattern: the
          heading keeps its place in the document outline and the button is
          what gets the expanded state. Preflight strips h3's own styling, so
          the button carries the entire appearance. */}
      <h3>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={panelId}
          onClick={() => setCollapsed((c) => !c)}
          className={`flex w-full items-center gap-2 bg-gray-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:bg-gray-100 ${
            // Transparent rather than absent when collapsed: keeps the header
            // height identical and avoids doubling up on the card's own border.
            collapsed ? 'border-b border-transparent' : 'border-b border-gray-100'
          }`}
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
              collapsed ? '-rotate-90' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {/* The count is the point of collapsing: it says how much work is
              still hidden in there. */}
          <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {count}
          </span>
        </button>
      </h3>
      {/* Hidden by class rather than unmounted, so aria-controls always points
          at a node that exists. */}
      <div id={panelId} className={collapsed ? 'hidden' : 'divide-y divide-gray-100'}>
        {children}
      </div>
    </div>
  );
};
