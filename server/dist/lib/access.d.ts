import { PrismaClient } from '@prisma/client';
/**
 * Who may touch a checklist.
 *
 * Every data route used to inline `where: { userId: req.userId }`. Sharing
 * turns that one condition into two different ones -- member access and owner
 * access -- and the last authorization bug in this file came from a check being
 * written out by hand at each call site and getting it subtly wrong in four of
 * them. So the conditions live here, named, and the routes reference them.
 *
 * Membership is a single level: a member can do anything to a list's CONTENTS
 * that the owner can. Only the list itself -- deleting, renaming, recolouring,
 * and who is in it -- is reserved.
 */
/** Owned by this user, or shared with them. Use for reading and for item writes. */
export declare const memberWhere: (userId: string | undefined) => {
    OR: ({
        userId: string | undefined;
        shares?: undefined;
    } | {
        shares: {
            some: {
                userId: string | undefined;
            };
        };
        userId?: undefined;
    })[];
};
/** Owned by this user. Use for the list itself. */
export declare const ownerWhere: (userId: string | undefined) => {
    userId: string | undefined;
};
/**
 * Resolves a checklist the caller may edit the contents of, or null.
 *
 * Returns the owner id too, because callers need to know whether to write the
 * owner's placement on the row or the member's placement in its own table.
 */
export declare const findMemberChecklist: (prisma: PrismaClient, checklistId: string, userId: string | undefined) => Promise<{
    id: string;
    userId: string;
} | null>;
/** Resolves a checklist the caller owns, or null. */
export declare const findOwnedChecklist: (prisma: PrismaClient, checklistId: string, userId: string | undefined) => Promise<{
    id: string;
    userId: string;
} | null>;
type Placed = {
    x: number;
    y: number;
    order: number;
    placements?: {
        x: number;
        y: number;
        order: number;
    }[];
};
/**
 * The caller's own view of where a list sits.
 *
 * The owner's placement is the row's own x/y/order; a member's is their
 * placement row. A member who has never moved the card falls back to the
 * owner's position, which puts it somewhere sensible the first time they see
 * it rather than at the origin under everything else.
 *
 * Expects the query to have included `placements` filtered to the caller --
 * including every member's placements would leak where other people keep it.
 */
export declare const resolvePlacement: <T extends Placed>(checklist: T, isOwner: boolean) => {
    x: number;
    y: number;
    order: number;
};
/**
 * Writes a placement to whichever of the two places owns it.
 *
 * Upsert rather than update: a member has no placement row until the first time
 * they move the card.
 */
export declare const writePlacement: (prisma: PrismaClient, checklistId: string, userId: string, isOwner: boolean, values: {
    x?: number;
    y?: number;
    order?: number;
}) => Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    updatedAt: Date;
    y: number;
    title: string;
    x: number;
    color: string;
    order: number;
} | {
    id: string;
    userId: string;
    y: number;
    x: number;
    order: number;
    checklistId: string;
}>;
export {};
//# sourceMappingURL=access.d.ts.map