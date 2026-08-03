/**
 * Seeds test data for the priority view into the `taskmanager` account.
 *
 * Additive: it never touches checklists it did not create. Re-running deletes
 * only the checklists whose titles are in SEED_TITLES and recreates them, so
 * the script is idempotent without risking hand-made data.
 *
 *   node scripts/seed-priority.mjs
 */
import { PrismaClient } from '@prisma/client';

const USERNAME = 'taskmanager';
const prisma = new PrismaClient();

// null impact/effort = untriaged, so the item belongs in the left column.
const SEED = [
  {
    title: 'Launch blockers',
    color: 'red',
    x: 175,
    y: 620,
    items: [
      { text: 'Fix the login redirect bug' },
      {
        // Long on purpose: exercises line-clamp-2 in a ~204px matrix cell and
        // break-words (no truncation) in the triage row.
        text: 'Sign the release build with the new certificate before the store review deadline, otherwise the whole submission gets bounced and we lose the review slot entirely',
        impact: 'high',
        effort: 'moderate',
        scheduledFor: '2026-08-05',
      },
      {
        text: 'Rotate the production JWT secret',
        impact: 'high',
        effort: 'quick',
        scheduledFor: '2026-08-01',
      },
      { text: 'Migrate the session table off the primary', impact: 'high', effort: 'heavy' },
      // Impact set, effort missing: stays in triage with one segment lit. Also
      // scheduled — the calendar icon is a Prioritized-column affordance, so
      // this row must NOT show one in the triage list.
      { text: 'Write the incident postmortem', impact: 'medium', scheduledFor: '2026-08-03' },
      // Effort set, impact missing: the mirror case.
      { text: 'Add rate limiting to /auth/login', effort: 'quick' },
      { text: 'Audit the third-party script tags' },
    ],
  },
  {
    // Bulk untriaged rows, so the left column overflows and scrolls
    // independently of the matrix.
    title: 'Bug backlog',
    color: 'yellow',
    x: 660,
    y: 620,
    items: [
      { text: 'Checkbox hit area is too small on iOS' },
      { text: 'Drag ghost lags behind the cursor at 200% zoom' },
      { text: 'Date picker clears on Escape in Firefox' },
      { text: 'Long checklist titles overflow the card header' },
      { text: 'Undo does not restore item order' },
      { text: 'Canvas pan drifts after a browser resize' },
      { text: 'Duplicate PATCH fires on a rapid toggle', impact: 'medium' },
      { text: 'Notes textarea loses focus during autosave', effort: 'heavy' },
      { text: 'Completed filter forgets its state on reload' },
      { text: 'Zoom controls overlap the user menu at 320px' },
      { text: 'Item text with an emoji breaks the line clamp' },
      { text: 'Trailing whitespace survives the save' },
    ],
  },
  {
    // Every item fully triaged -> this checklist must render NO heading in the
    // triage column, while still contributing to the matrix.
    title: 'Shipped — verified',
    color: 'green',
    x: 1200,
    y: 620,
    items: [
      { text: 'Ship the collapsible mobile checklist view', impact: 'medium', effort: 'quick' },
      { text: 'Add the build dependencies for bcrypt in Docker', impact: 'low', effort: 'quick' },
      // Past date: scheduledFor has no overdue styling anywhere in the app
      // (only dueDate does), so this must look identical to a future one.
      {
        text: 'Fix the 401 unauthorized redirect to login',
        impact: 'medium',
        effort: 'moderate',
        scheduledFor: '2026-07-20',
      },
      { text: 'Add item metadata: scheduling and priority', impact: 'high', effort: 'moderate' },
    ],
  },
  {
    title: 'Housekeeping',
    color: 'blue',
    x: 1740,
    y: 620,
    items: [
      // Completed AND fully triaged: must be excluded from the matrix anyway.
      { text: "Archive last quarter's boards", completed: true, impact: 'high', effort: 'quick' },
      // Completed and untriaged: must not appear in the triage column.
      { text: 'Delete the stale feature flags', completed: true },
      // Blank text: transient row, excluded from both columns.
      { text: '' },
      { text: 'Clean up the dead ChecklistActions component' },
      { text: 'Remove the stray console.log in Canvas', impact: 'low', effort: 'quick' },
      // Next year: the tooltip carries the full ISO date, so the year is never
      // ambiguous the way a bare "Jan 12" would be.
      {
        text: 'Update the browserslist database',
        impact: 'low',
        effort: 'moderate',
        scheduledFor: '2027-01-12',
      },
    ],
  },
  {
    title: 'Research spikes',
    color: 'purple',
    x: 2280,
    y: 620,
    items: [
      {
        text: 'Evaluate virtualised lists for 500+ item checklists',
        impact: 'medium',
        effort: 'heavy',
        scheduledFor: '2026-09-15',
      },
      { text: 'Prototype offline-first sync', impact: 'low', effort: 'heavy' },
      { text: 'Compare Postgres full-text search against Meili', impact: 'medium', effort: 'moderate' },
      { text: 'Spike: a keyboard-only triage flow' },
      { text: 'Investigate the bundle size regression' },
      { text: 'Test the WebSocket reconnect backoff', impact: 'low' },
    ],
  },
];

const SEED_TITLES = SEED.map((c) => c.title);

const user = await prisma.user.findUnique({ where: { username: USERNAME } });
if (!user) throw new Error(`No user named "${USERNAME}"`);

const removed = await prisma.checklist.deleteMany({
  where: { userId: user.id, title: { in: SEED_TITLES } },
});
if (removed.count) console.log(`Replaced ${removed.count} existing seed checklist(s).`);

// Existing checklists all sit at order 0, so start past them.
let order = 1;
for (const c of SEED) {
  await prisma.checklist.create({
    data: {
      title: c.title,
      x: c.x,
      y: c.y,
      color: c.color,
      order: order++,
      userId: user.id,
      items: {
        create: c.items.map((i, idx) => ({
          text: i.text,
          completed: i.completed ?? false,
          impact: i.impact ?? null,
          effort: i.effort ?? null,
          scheduledFor: i.scheduledFor ?? null,
          order: idx,
        })),
      },
    },
  });
}

// Report what the view should show, computed the same way PriorityView derives
// it: eligible = not completed and text is not blank.
const all = SEED.flatMap((c) => c.items);
const eligible = all.filter((i) => !i.completed && i.text.trim() !== '');
const triaged = eligible.filter((i) => i.impact && i.effort);
const cells = new Set(triaged.map((i) => `${i.impact}|${i.effort}`));

console.log(`Seeded ${SEED.length} checklists / ${all.length} items for "${USERNAME}".`);
console.log(`  to triage : ${eligible.length - triaged.length}`);
console.log(`  matrix    : ${triaged.length} across ${cells.size}/9 cells`);
console.log(`  excluded  : ${all.length - eligible.length} (completed or blank)`);
console.log(`  scheduled : ${triaged.filter((i) => i.scheduledFor).length} in the matrix, ` +
  `${eligible.filter((i) => i.scheduledFor && !(i.impact && i.effort)).length} still in triage`);

await prisma.$disconnect();
