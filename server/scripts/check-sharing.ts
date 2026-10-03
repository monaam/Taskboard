/**
 * Sharing access rules.
 *
 * Membership is one level: a member does anything to the CONTENTS that the
 * owner can. The list itself -- delete, rename, recolour, who is in it -- stays
 * with the owner. Placement is per person. This asserts all of that, plus that
 * a stranger still sees nothing.
 *
 *   npx tsx scripts/check-sharing.ts [baseUrl]
 *
 * Reuses three fixed accounts (sharecheck_*) and clears their lists each run.
 */
const API = process.argv[2] ?? 'http://localhost:3001/api';
const PASSWORD = 'sharecheck-pw-123456';

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const account = async (username: string): Promise<string> => {
  const made = await call('POST', '/auth/register', undefined, { username, password: PASSWORD });
  if (made.status === 201) return made.body.token;
  const got = await call('POST', '/auth/login', undefined, { username, password: PASSWORD });
  if (got.status !== 200) throw new Error(`no session for ${username}`);
  return got.body.token;
};

let pass = 0, fail = 0;
const expect = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ok   ${label.padEnd(50)} ${JSON.stringify(got)}`); }
  else { fail++; console.log(`  FAIL ${label.padEnd(50)} ${JSON.stringify(got)} (want ${JSON.stringify(want)})`); }
};

const main = async () => {
  const owner = await account('sharecheck_owner');
  const member = await account('sharecheck_member');
  const stranger = await account('sharecheck_stranger');

  for (const t of [owner, member, stranger]) {
    for (const c of (await call('GET', '/checklists', t)).body ?? []) {
      if (c.isOwner) await call('DELETE', `/checklists/${c.id}`, t);
      else await call('DELETE', `/checklists/${c.id}/shares/me`, t);
    }
  }

  const list = (await call('POST', '/checklists', owner, { title: 'shared list', x: 100, y: 50 })).body;
  const mine = (await call('POST', '/checklists', member, { title: 'member own', x: 0, y: 0 })).body;

  console.log('--- the owner view ---');
  expect('create returns isOwner', list.isOwner, true);
  expect('create names the owner', list.owner.username, 'sharecheck_owner');
  expect('no members yet', list.members, []);

  console.log('\n--- sharing ---');
  expect('share with a nonexistent account',
    (await call('POST', `/checklists/${list.id}/shares`, owner, { username: 'nobody_at_all' })).status, 404);
  expect('share with yourself',
    (await call('POST', `/checklists/${list.id}/shares`, owner, { username: 'sharecheck_owner' })).status, 400);
  expect('a non-owner cannot share it',
    (await call('POST', `/checklists/${list.id}/shares`, stranger, { username: 'sharecheck_member' })).status, 404);
  expect('owner shares with the member',
    (await call('POST', `/checklists/${list.id}/shares`, owner, { username: 'sharecheck_member' })).status, 201);
  expect('sharing again is idempotent',
    (await call('POST', `/checklists/${list.id}/shares`, owner, { username: 'sharecheck_member' })).status, 201);
  const shares = (await call('GET', `/checklists/${list.id}/shares`, owner)).body;
  expect('exactly one member', shares.members.length, 1);

  console.log('\n--- what the member sees ---');
  const memberLists = (await call('GET', '/checklists', member)).body;
  const seen = memberLists.find((c: any) => c.id === list.id);
  expect('the shared list appears', !!seen, true);
  expect('flagged as not theirs', seen.isOwner, false);
  expect('badged with the owner', seen.owner.username, 'sharecheck_owner');
  expect('their own list still there', memberLists.some((c: any) => c.id === mine.id), true);
  expect('a stranger sees neither',
    ((await call('GET', '/checklists', stranger)).body ?? []).length, 0);

  console.log('\n--- a member may edit the contents ---');
  const item = (await call('POST', `/checklists/${list.id}/items`, member, { text: 'added by member' })).body;
  expect('add an item', !!item.id, true);
  expect('edit an item',
    (await call('PATCH', `/checklists/${list.id}/items/${item.id}`, member, { status: 'done' })).status, 200);
  expect('reorder items',
    (await call('POST', `/checklists/${list.id}/reorder`, member, { itemIds: [item.id] })).status, 200);
  expect('select all',
    (await call('POST', `/checklists/${list.id}/select-all`, member)).status, 200);
  expect('deselect all',
    (await call('POST', `/checklists/${list.id}/deselect-all`, member)).status, 200);
  expect('move an item into their own list',
    (await call('POST', '/checklists/move-item', member,
      { sourceChecklistId: list.id, targetChecklistId: mine.id, itemId: item.id, targetIndex: 0 })).status, 200);
  expect('move it back',
    (await call('POST', '/checklists/move-item', member,
      { sourceChecklistId: mine.id, targetChecklistId: list.id, itemId: item.id, targetIndex: 0 })).status, 200);
  expect('delete completed',
    (await call('DELETE', `/checklists/${list.id}/completed`, member)).status, 200);
  expect('delete an item',
    (await call('DELETE', `/checklists/${list.id}/items/${item.id}`, member)).status, 204);

  console.log('\n--- but not the list itself ---');
  expect('rename', (await call('PATCH', `/checklists/${list.id}`, member, { title: 'renamed' })).status, 403);
  expect('recolour', (await call('PATCH', `/checklists/${list.id}`, member, { color: 'red' })).status, 403);
  expect('delete the list', (await call('DELETE', `/checklists/${list.id}`, member)).status, 404);
  expect('add a member', (await call('POST', `/checklists/${list.id}/shares`, member, { username: 'sharecheck_stranger' })).status, 404);
  expect('remove a member', (await call('DELETE', `/checklists/${list.id}/shares/${'x'}`, member)).status, 404);
  const afterAttempts = (await call('GET', `/checklists`, owner)).body.find((c: any) => c.id === list.id);
  expect('title unchanged', afterAttempts.title, 'shared list');
  expect('colour unchanged', afterAttempts.color, 'default');

  console.log('\n--- placement is per person ---');
  expect('member moves their copy',
    (await call('PATCH', `/checklists/${list.id}`, member, { x: 900, y: 400 })).status, 200);
  const ownerView = (await call('GET', '/checklists', owner)).body.find((c: any) => c.id === list.id);
  const memberView = (await call('GET', '/checklists', member)).body.find((c: any) => c.id === list.id);
  expect('owner still at 100,50', [ownerView.x, ownerView.y], [100, 50]);
  expect('member at 900,400', [memberView.x, memberView.y], [900, 400]);
  expect('owner moves their own copy',
    (await call('PATCH', `/checklists/${list.id}`, owner, { x: 7, y: 8 })).status, 200);
  const memberAfter = (await call('GET', '/checklists', member)).body.find((c: any) => c.id === list.id);
  expect('member unmoved by the owner', [memberAfter.x, memberAfter.y], [900, 400]);

  console.log('\n--- leaving and removal ---');
  expect('member leaves',
    (await call('DELETE', `/checklists/${list.id}/shares/me`, member)).status, 204);
  expect('and loses sight of it',
    ((await call('GET', '/checklists', member)).body ?? []).some((c: any) => c.id === list.id), false);
  expect('and can no longer edit it',
    (await call('POST', `/checklists/${list.id}/items`, member, { text: 'x' })).status, 404);
  expect('leaving again',
    (await call('DELETE', `/checklists/${list.id}/shares/me`, member)).status, 404);
  await call('POST', `/checklists/${list.id}/shares`, owner, { username: 'sharecheck_member' });
  const memberId = (await call('GET', `/checklists/${list.id}/shares`, owner)).body.members[0].id;
  expect('owner removes the member',
    (await call('DELETE', `/checklists/${list.id}/shares/${memberId}`, owner)).status, 204);
  expect('member loses access again',
    (await call('GET', `/checklists/${list.id}/shares`, member)).status, 404);
  expect("owner's list survives",
    (await call('GET', '/checklists', owner)).body.some((c: any) => c.id === list.id), true);

  for (const t of [owner, member, stranger]) {
    for (const c of (await call('GET', '/checklists', t)).body ?? []) {
      if (c.isOwner) await call('DELETE', `/checklists/${c.id}`, t);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error(e); process.exit(1); });
