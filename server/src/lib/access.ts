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
export const memberWhere = (userId: string | undefined) => ({
  OR: [{ userId }, { shares: { some: { userId } } }],
});

/** Owned by this user. Use for the list itself. */
export const ownerWhere = (userId: string | undefined) => ({ userId });

/**
 * Resolves a checklist the caller may edit the contents of, or null.
 *
 * Returns the owner id too, because callers need to know whether to write the
 * owner's placement on the row or the member's placement in its own table.
 */
export const findMemberChecklist = async (
  prisma: PrismaClient,
  checklistId: string,
  userId: string | undefined
) =>
  prisma.checklist.findFirst({
    where: { id: checklistId, ...memberWhere(userId) },
    select: { id: true, userId: true },
  });

/** Resolves a checklist the caller owns, or null. */
export const findOwnedChecklist = async (
  prisma: PrismaClient,
  checklistId: string,
  userId: string | undefined
) =>
  prisma.checklist.findFirst({
    where: { id: checklistId, userId },
    select: { id: true, userId: true },
  });

type Placed = {
  x: number;
  y: number;
  order: number;
  placements?: { x: number; y: number; order: number }[];
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
export const resolvePlacement = <T extends Placed>(
  checklist: T,
  isOwner: boolean
): { x: number; y: number; order: number } => {
  if (isOwner) return { x: checklist.x, y: checklist.y, order: checklist.order };
  const mine = checklist.placements?.[0];
  return mine
    ? { x: mine.x, y: mine.y, order: mine.order }
    : { x: checklist.x, y: checklist.y, order: checklist.order };
};

/**
 * Writes a placement to whichever of the two places owns it.
 *
 * Upsert rather than update: a member has no placement row until the first time
 * they move the card.
 */
export const writePlacement = async (
  prisma: PrismaClient,
  checklistId: string,
  userId: string,
  isOwner: boolean,
  values: { x?: number; y?: number; order?: number }
) => {
  if (isOwner) {
    return prisma.checklist.update({
      where: { id: checklistId },
      data: {
        ...(values.x !== undefined && { x: values.x }),
        ...(values.y !== undefined && { y: values.y }),
        ...(values.order !== undefined && { order: values.order }),
      },
    });
  }

  // The owner's position is the sensible starting point for fields the caller
  // did not specify -- the alternative is 0,0.
  const base = await prisma.checklist.findUnique({
    where: { id: checklistId },
    select: { x: true, y: true, order: true },
  });

  return prisma.checklistPlacement.upsert({
    where: { checklistId_userId: { checklistId, userId } },
    create: {
      checklistId,
      userId,
      x: values.x ?? base?.x ?? 0,
      y: values.y ?? base?.y ?? 0,
      order: values.order ?? base?.order ?? 0,
    },
    update: {
      ...(values.x !== undefined && { x: values.x }),
      ...(values.y !== undefined && { y: values.y }),
      ...(values.order !== undefined && { order: values.order }),
    },
  });
};
