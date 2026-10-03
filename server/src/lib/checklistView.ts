import { resolvePlacement } from './access';

/**
 * The shape a checklist takes on the wire, which is now per-viewer.
 *
 * x/y/order are the CALLER's placement, not the row's -- see resolvePlacement.
 * Keeping the field names means the frontend and the OpenAPI schema did not
 * have to change to gain per-person boards.
 */

/** Must be spread into the query, or the mapping below has nothing to read. */
export const checklistInclude = (userId: string | undefined) => ({
  items: { orderBy: { order: 'asc' as const } },
  user: { select: { id: true, username: true } },
  // Filtered to the caller: including everyone's placements would tell each
  // member where the others keep the card.
  placements: {
    where: { userId },
    select: { x: true, y: true, order: true },
  },
  shares: {
    select: { user: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
});

export const toChecklistView = (row: any, userId: string | undefined) => {
  const isOwner = row.userId === userId;
  const { x, y, order } = resolvePlacement(row, isOwner);
  // placements and shares are internal shapes; owner and members replace them.
  const { placements, shares, user, ...rest } = row;

  return {
    ...rest,
    x,
    y,
    order,
    isOwner,
    owner: { id: user.id, username: user.username },
    // Visible to members too, not just the owner: knowing who else is on a
    // list is the point of sharing it. Only changing the membership is
    // reserved.
    members: (shares ?? []).map((s: any) => ({ id: s.user.id, username: s.user.username })),
  };
};

/** Board order is per-viewer, so it cannot be an ORDER BY in the query. */
export const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;
