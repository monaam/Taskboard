/**
 * The shape a checklist takes on the wire, which is now per-viewer.
 *
 * x/y/order are the CALLER's placement, not the row's -- see resolvePlacement.
 * Keeping the field names means the frontend and the OpenAPI schema did not
 * have to change to gain per-person boards.
 */
/** Must be spread into the query, or the mapping below has nothing to read. */
export declare const checklistInclude: (userId: string | undefined) => {
    items: {
        orderBy: {
            order: "asc";
        };
    };
    user: {
        select: {
            id: boolean;
            username: boolean;
        };
    };
    placements: {
        where: {
            userId: string | undefined;
        };
        select: {
            x: boolean;
            y: boolean;
            order: boolean;
        };
    };
    shares: {
        select: {
            user: {
                select: {
                    id: boolean;
                    username: boolean;
                };
            };
        };
        orderBy: {
            createdAt: "asc";
        };
    };
};
export declare const toChecklistView: (row: any, userId: string | undefined) => any;
/** Board order is per-viewer, so it cannot be an ORDER BY in the query. */
export declare const byOrder: (a: {
    order: number;
}, b: {
    order: number;
}) => number;
//# sourceMappingURL=checklistView.d.ts.map