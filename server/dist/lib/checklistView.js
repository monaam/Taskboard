"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.byOrder = exports.toChecklistView = exports.checklistInclude = void 0;
const access_1 = require("./access");
/**
 * The shape a checklist takes on the wire, which is now per-viewer.
 *
 * x/y/order are the CALLER's placement, not the row's -- see resolvePlacement.
 * Keeping the field names means the frontend and the OpenAPI schema did not
 * have to change to gain per-person boards.
 */
/** Must be spread into the query, or the mapping below has nothing to read. */
const checklistInclude = (userId) => ({
    items: { orderBy: { order: 'asc' } },
    user: { select: { id: true, username: true } },
    // Filtered to the caller: including everyone's placements would tell each
    // member where the others keep the card.
    placements: {
        where: { userId },
        select: { x: true, y: true, order: true },
    },
    shares: {
        select: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'asc' },
    },
});
exports.checklistInclude = checklistInclude;
const toChecklistView = (row, userId) => {
    const isOwner = row.userId === userId;
    const { x, y, order } = (0, access_1.resolvePlacement)(row, isOwner);
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
        members: (shares ?? []).map((s) => ({ id: s.user.id, username: s.user.username })),
    };
};
exports.toChecklistView = toChecklistView;
/** Board order is per-viewer, so it cannot be an ORDER BY in the query. */
const byOrder = (a, b) => a.order - b.order;
exports.byOrder = byOrder;
//# sourceMappingURL=checklistView.js.map