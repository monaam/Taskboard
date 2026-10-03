/**
 * Cross-user authorization check: proves one account cannot touch another's
 * items or checklists.
 *
 * This exists because it once could. Owning the checklist named in the URL was
 * treated as permission to operate on the item id in the URL, so passing your
 * own checklist id with someone else's item id let you edit or delete their
 * row. Four routes shared the mistake.
 *
 *   npx tsx scripts/check-ownership.ts [baseUrl]     # default http://localhost:3001/api
 *
 * Registers two fixed throwaway accounts (ownercheck_*) and reuses them on
 * later runs, so repeated use does not fill the database with users. Point it
 * at a dev API, never production.
 */
const API = process.argv[2] ?? 'http://localhost:3001/api';
const PASSWORD = 'ownercheck-pw-123456';

type Res = { status: number; body: any };

const call = async (method: string, path: string, token?: string, body?: unknown): Promise<Res> => {
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

/** Register, or log in if the account survives from an earlier run. */
const account = async (username: string): Promise<string> => {
  const created = await call('POST', '/auth/register', undefined, { username, password: PASSWORD });
  if (created.status === 201) return created.body.token;
  const loggedIn = await call('POST', '/auth/login', undefined, { username, password: PASSWORD });
  if (loggedIn.status !== 200) throw new Error(`cannot obtain a session for ${username}`);
  return loggedIn.body.token;
};

let pass = 0, fail = 0;
const expect = (label: string, got: number, want: number, note = '') => {
  if (got === want) { pass++; console.log(`  ok   ${label.padEnd(44)} ${got}`); }
  else { fail++; console.log(`  FAIL ${label.padEnd(44)} ${got} (want ${want}) ${note}`); }
};

const main = async () => {
  const victim = await account('ownercheck_victim');
  const attacker = await account('ownercheck_attacker');

  // Start each run from a clean slate so leftovers cannot mask a regression.
  for (const token of [victim, attacker]) {
    const { body } = await call('GET', '/checklists', token);
    for (const c of body ?? []) await call('DELETE', `/checklists/${c.id}`, token);
  }

  const vc = (await call('POST', '/checklists', victim, { title: 'victim list', x: 0, y: 0 })).body;
  const vi = (await call('POST', `/checklists/${vc.id}/items`, victim, { text: 'victim secret' })).body;
  const a1 = (await call('POST', '/checklists', attacker, { title: 'atk 1', x: 0, y: 0 })).body;
  const a2 = (await call('POST', '/checklists', attacker, { title: 'atk 2', x: 0, y: 0 })).body;

  console.log('cross-user attempts (404 = correctly refused, and 404 rather than 403 so an id\n' +
              'cannot be probed for existence)');
  expect('PATCH their item via my checklist',
    (await call('PATCH', `/checklists/${a1.id}/items/${vi.id}`, attacker, { text: 'PWNED' })).status, 404);
  expect('DELETE their item via my checklist',
    (await call('DELETE', `/checklists/${a1.id}/items/${vi.id}`, attacker)).status, 404);
  expect('MOVE their item into my list',
    (await call('POST', '/checklists/move-item', attacker,
      { sourceChecklistId: a1.id, targetChecklistId: a2.id, itemId: vi.id, targetIndex: 0 })).status, 404);
  expect('MOVE naming their list as source',
    (await call('POST', '/checklists/move-item', attacker,
      { sourceChecklistId: vc.id, targetChecklistId: a2.id, itemId: vi.id, targetIndex: 0 })).status, 404);
  expect('REORDER including their item id',
    (await call('POST', `/checklists/${a1.id}/reorder`, attacker, { itemIds: [vi.id] })).status, 404);
  expect('PATCH their checklist',
    (await call('PATCH', `/checklists/${vc.id}`, attacker, { title: 'PWNED' })).status, 404);
  expect('DELETE their checklist',
    (await call('DELETE', `/checklists/${vc.id}`, attacker)).status, 404);
  expect('SELECT-ALL on their checklist',
    (await call('POST', `/checklists/${vc.id}/select-all`, attacker)).status, 404);
  expect('DELETE their completed items',
    (await call('DELETE', `/checklists/${vc.id}/completed`, attacker)).status, 404);

  const after = (await call('GET', '/checklists', victim)).body;
  const titles = after.map((c: any) => c.title);
  const texts = after.flatMap((c: any) => c.items.map((i: any) => i.text));
  const intact = titles.length === 1 && titles[0] === 'victim list' && texts.includes('victim secret');
  if (intact) { pass++; console.log('  ok   victim data intact'); }
  else { fail++; console.log(`  FAIL victim data changed: ${JSON.stringify({ titles, texts })}`); }

  console.log('\nsame-user operations must be unaffected');
  const mine = (await call('POST', `/checklists/${a1.id}/items`, attacker, { text: 'mine' })).body;
  expect('PATCH my own item',
    (await call('PATCH', `/checklists/${a1.id}/items/${mine.id}`, attacker, { text: 'renamed', status: 'in_progress' })).status, 200);
  expect('REORDER my own items',
    (await call('POST', `/checklists/${a1.id}/reorder`, attacker, { itemIds: [mine.id] })).status, 200);
  expect('MOVE my own item between my lists',
    (await call('POST', '/checklists/move-item', attacker,
      { sourceChecklistId: a1.id, targetChecklistId: a2.id, itemId: mine.id, targetIndex: 0 })).status, 200);
  expect('DELETE my own item from its new list',
    (await call('DELETE', `/checklists/${a2.id}/items/${mine.id}`, attacker)).status, 204);
  expect('PATCH an id that does not exist',
    (await call('PATCH', `/checklists/${a1.id}/items/00000000-0000-0000-0000-000000000000`, attacker, { text: 'x' })).status, 404);

  // Leave nothing behind but the two accounts, which the next run reuses.
  for (const token of [victim, attacker]) {
    const { body } = await call('GET', '/checklists', token);
    for (const c of body ?? []) await call('DELETE', `/checklists/${c.id}`, token);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
};

main().catch((e) => { console.error(e); process.exit(1); });
