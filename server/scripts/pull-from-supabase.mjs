/**
 * Mirrors the hosted Supabase database into the local one.
 *
 * Destructive: it deletes local rows before copying, so it refuses to run
 * against anything but localhost. Both databases are read through the same
 * generated Prisma client, which is only correct because the two schemas are
 * identical — if they ever diverge, run the migrations locally first.
 *
 *   node scripts/pull-from-supabase.mjs [--user=<username>] [--yes] [--dry-run]
 *
 *   --user     copy (and wipe) only that one account, leaving other local users
 *              untouched. Without it, every local user is replaced.
 *   --yes      skip the typed confirmation.
 *   --dry-run  read and report, write nothing.
 */
import { createInterface } from 'node:readline/promises';
import { PrismaClient } from '@prisma/client';

// Constructing a client is what loads server/.env into process.env — Prisma does
// it as a side effect — so the target must exist before SOURCE_DATABASE_URL is read.
const target = new PrismaClient();

const CHUNK = 500;
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

const args = process.argv.slice(2);
const userArg = args.find((a) => a.startsWith('--user='));
const username = userArg ? userArg.slice('--user='.length) : null;
const skipPrompt = args.includes('--yes');
const dryRun = args.includes('--dry-run');

// A bare `--user=` would otherwise fall through to the every-user wipe.
if (username === '') await fail('--user= needs a username.');

// A typo like `--dryrun` would otherwise be silently ignored and wipe the database.
const unknown = args.filter(
  (a) => !a.startsWith('--user=') && a !== '--yes' && a !== '--dry-run'
);
if (unknown.length) await fail(`Unknown argument(s): ${unknown.join(' ')}`);

async function fail(message) {
  console.error(`\n${message}\n`);
  await target.$disconnect();
  process.exit(1);
}

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

if (!targetUrl) await fail('DATABASE_URL is not set.');
if (!sourceUrl) {
  await fail('SOURCE_DATABASE_URL is not set. Add the Supabase pooler URL to server/.env.');
}
if (sourceUrl === targetUrl) {
  await fail('SOURCE_DATABASE_URL and DATABASE_URL are the same database. Refusing to run.');
}

const targetHost = new URL(targetUrl).hostname;
if (!LOCAL_HOSTS.includes(targetHost)) {
  await fail(
    `DATABASE_URL points at "${targetHost}". This script deletes rows and may only ` +
      `target ${LOCAL_HOSTS.join(' or ')}.`
  );
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });

// ---------------------------------------------------------------- read source

// findMany returns every scalar column, so id/createdAt/updatedAt ride along and
// the copies keep the remote identity and history.
const users = await source.user.findMany(username ? { where: { username } } : undefined);
if (username && users.length === 0) {
  await source.$disconnect();
  await fail(`No user named "${username}" on the source database.`);
}
const userIds = users.map((u) => u.id);

const checklists = await source.checklist.findMany({ where: { userId: { in: userIds } } });
const textNotes = await source.textNote.findMany({ where: { userId: { in: userIds } } });
const checklistItems = await source.checklistItem.findMany({
  where: { checklistId: { in: checklists.map((c) => c.id) } },
});

// ------------------------------------------------- what the wipe would remove

// The wipe scope has to match the pull scope, so both are derived from the same
// username filter: no --user means every local user goes.
const scope = username ? { username } : {};
const doomedUsers = await target.user.findMany({ where: scope, select: { id: true } });
const doomedUserIds = doomedUsers.map((u) => u.id);
const doomedChecklists = await target.checklist.findMany({
  where: { userId: { in: doomedUserIds } },
  select: { id: true },
});
const doomed = {
  users: doomedUsers.length,
  checklists: doomedChecklists.length,
  checklistItems: await target.checklistItem.count({
    where: { checklistId: { in: doomedChecklists.map((c) => c.id) } },
  }),
  textNotes: await target.textNote.count({ where: { userId: { in: doomedUserIds } } }),
};

const targetUrlParts = new URL(targetUrl);
console.log(`\nSource : ${new URL(sourceUrl).host}`);
console.log(`Target : ${targetUrlParts.host}${targetUrlParts.pathname}`);
console.log(`Scope  : ${username ? `user "${username}"` : 'all users'}\n`);
console.log('              local (delete)   remote (copy)');
for (const [label, local, remote] of [
  ['User', doomed.users, users.length],
  ['Checklist', doomed.checklists, checklists.length],
  ['ChecklistItem', doomed.checklistItems, checklistItems.length],
  ['TextNote', doomed.textNotes, textNotes.length],
]) {
  console.log(`  ${label.padEnd(14)}${String(local).padStart(11)} ${String(remote).padStart(15)}`);
}

if (dryRun) {
  console.log('\nDry run: nothing was written.');
  await source.$disconnect();
  await target.$disconnect();
  process.exit(0);
}

if (!skipPrompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nDelete the local rows above and replace them? Type "yes": ');
  rl.close();
  if (answer.trim() !== 'yes') {
    await source.$disconnect();
    await fail('Aborted.');
  }
}

// ---------------------------------------------------------------- write target

// Deleting the users is enough: Checklist, TextNote and (through Checklist)
// ChecklistItem all cascade.
await target.user.deleteMany({ where: scope });

async function copy(label, model, rows) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await model.createMany({ data: rows.slice(i, i + CHUNK) });
  }
  console.log(`  ${label.padEnd(14)} ${rows.length}`);
}

console.log('\nCopied:');
// Parents before children, so the foreign keys hold at every step.
await copy('User', target.user, users);
await copy('Checklist', target.checklist, checklists);
await copy('TextNote', target.textNote, textNotes);
await copy('ChecklistItem', target.checklistItem, checklistItems);

// Read back rather than trusting the write counts.
console.log('\nLocal totals now:');
console.log(`  User           ${await target.user.count()}`);
console.log(`  Checklist      ${await target.checklist.count()}`);
console.log(`  ChecklistItem  ${await target.checklistItem.count()}`);
console.log(`  TextNote       ${await target.textNote.count()}`);

await source.$disconnect();
await target.$disconnect();
