/**
 * Fails if the Express routers and the OpenAPI document disagree.
 *
 * The document in src/lib/openapi.ts is hand-written, so the only thing keeping
 * it honest is a check that walks the real routers and compares. Run with:
 *
 *   npx tsx scripts/check-openapi.ts
 */
import type { Router } from 'express';
import authRoutes from '../src/routes/auth';
import checklistRoutes from '../src/routes/checklists';
import textNoteRoutes from '../src/routes/textNotes';
import tokenRoutes from '../src/routes/tokens';
import { buildOpenApiDocument } from '../src/lib/openapi';

type Layer = {
  route?: { path: string; methods: Record<string, boolean> };
};

/** Express writes ':id'; OpenAPI writes '{id}'. */
const toOpenApiPath = (mount: string, path: string): string => {
  const joined = `${mount}${path === '/' ? '' : path}`;
  return joined.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
};

const collect = (mount: string, router: Router): string[] => {
  const out: string[] = [];
  for (const layer of (router as unknown as { stack: Layer[] }).stack) {
    if (!layer.route) continue;
    const path = toOpenApiPath(mount, layer.route.path);
    for (const method of Object.keys(layer.route.methods)) {
      if (method === '_all') continue;
      out.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return out;
};

const actual = new Set([
  ...collect('/api/auth', authRoutes),
  ...collect('/api/checklists', checklistRoutes),
  ...collect('/api/textnotes', textNoteRoutes),
  ...collect('/api/tokens', tokenRoutes),
  // Declared on the app itself rather than a router.
  'GET /api/health',
  'GET /api/docs',
]);

const doc = buildOpenApiDocument('http://example.test');
const documented = new Set<string>();
for (const [path, operations] of Object.entries(doc.paths)) {
  for (const method of Object.keys(operations as Record<string, unknown>)) {
    documented.add(`${method.toUpperCase()} ${path}`);
  }
}

const missing = [...actual].filter((r) => !documented.has(r)).sort();
const extra = [...documented].filter((r) => !actual.has(r)).sort();

console.log(`routes on the server : ${actual.size}`);
console.log(`routes documented    : ${documented.size}`);

if (missing.length) {
  console.log('\nUNDOCUMENTED (exist on the server, absent from the spec):');
  for (const r of missing) console.log('  ' + r);
}
if (extra.length) {
  console.log('\nPHANTOM (in the spec, no such route):');
  for (const r of extra) console.log('  ' + r);
}

if (!missing.length && !extra.length) {
  console.log('\nOK — the spec matches the routers exactly.');
} else {
  process.exit(1);
}

/**
 * Pass a base URL to additionally check the document against a running API:
 * that documented enums match what the server enforces, and that documented
 * response properties match what it actually returns.
 *
 *   npx tsx scripts/check-openapi.ts http://localhost:3001/api
 *
 * Route coverage above is static. This part needs a live server because the
 * only authority on a response shape is a response.
 */
const liveUrl = process.argv[2];

if (liveUrl) {
  const PASSWORD = 'doccheck-pw-123456';

  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await fetch(liveUrl + path, {
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

  let lp = 0, lf = 0;
  const check = (label: string, ok: boolean, detail = '') => {
    if (ok) { lp++; console.log(`  ok   ${label}`); }
    else { lf++; console.log(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`); }
  };

  const run = async () => {
    console.log('\n--- live document ---');
    const live = (await call('GET', '/docs')).body;
    check('GET /docs serves the document unauthenticated', !!live?.openapi);

    const username = 'doccheck_user';
    let token = (await call('POST', '/auth/register', undefined, { username, password: PASSWORD })).body?.token;
    if (!token) token = (await call('POST', '/auth/login', undefined, { username, password: PASSWORD })).body?.token;
    if (!token) throw new Error('cannot obtain a session');

    for (const c of (await call('GET', '/checklists', token)).body ?? []) {
      await call('DELETE', `/checklists/${c.id}`, token);
    }

    const checklist = (await call('POST', '/checklists', token, { title: 'doc check', x: 1, y: 2 })).body;
    const item = (await call('POST', `/checklists/${checklist.id}/items`, token, {
      text: 'doc item', status: 'in_progress', impact: 'high', effort: 'quick',
      scheduledFor: '2026-10-15', dueDate: '2026-10-20', notes: 'n',
    })).body;
    const note = (await call('POST', '/textnotes', token, { text: 'n', x: 0, y: 0 })).body;

    console.log('\n--- documented enums must match what the server enforces ---');
    // The 400 message lists the accepted values, so it can be compared directly.
    const enumVsServer = async (
      schema: string, path: string, field: string, bad: string
    ) => {
      const documented: string[] = live.components.schemas[schema].enum;
      const res = await call('PATCH', path, token, { [field]: bad });
      const listed = (res.body?.error ?? '').replace(/^.*one of /, '').replace(/ or null$/, '')
        .split(',').map((v: string) => v.trim()).filter(Boolean);
      check(`${schema}: documented [${documented.join(', ')}] == enforced [${listed.join(', ')}]`,
        res.status === 400 && JSON.stringify(documented) === JSON.stringify(listed),
        `HTTP ${res.status} ${res.body?.error ?? ''}`);
    };
    const itemPath = `/checklists/${checklist.id}/items/${item.id}`;
    await enumVsServer('ItemStatus', itemPath, 'status', 'bogus');
    await enumVsServer('Impact', itemPath, 'impact', 'bogus');
    await enumVsServer('Effort', itemPath, 'effort', 'bogus');

    // Every documented status value must actually be accepted.
    for (const value of live.components.schemas.ItemStatus.enum) {
      const res = await call('PATCH', itemPath, token, { status: value });
      check(`status '${value}' accepted as documented`, res.status === 200, `HTTP ${res.status}`);
    }

    console.log('\n--- documented response properties must match real responses ---');
    const compare = (schema: string, actual: Record<string, unknown>) => {
      const documented = Object.keys(live.components.schemas[schema].properties);
      const real = Object.keys(actual);
      const undocumented = real.filter((k) => !documented.includes(k));
      const phantom = documented.filter((k) => !real.includes(k));
      check(`${schema}: ${real.length} fields returned, all documented`,
        undocumented.length === 0, `undocumented: ${undocumented.join(', ')}`);
      check(`${schema}: no documented field is absent from the response`,
        phantom.length === 0, `documented but missing: ${phantom.join(', ')}`);
    };
    compare('Checklist', (await call('GET', '/checklists', token)).body[0]);
    compare('ChecklistItem', item);
    compare('TextNote', note);

    console.log('\n--- documented status codes must be the real ones ---');
    check('POST /checklists -> 201 as documented',
      (await call('POST', '/checklists', token, { title: 't', x: 0, y: 0 })).status === 201);
    check('DELETE item -> 204 as documented',
      (await call('DELETE', itemPath, token)).status === 204);
    check('bad body -> 400 as documented',
      (await call('POST', `/checklists/${checklist.id}/items`, token, { text: 'x', impact: 'nope' })).status === 400);
    check('no credential -> 401 as documented',
      (await call('GET', '/checklists')).status === 401);
    check('another account\'s id -> 404 as documented',
      (await call('PATCH', '/checklists/00000000-0000-0000-0000-000000000000', token, { title: 'x' })).status === 404);

    for (const c of (await call('GET', '/checklists', token)).body ?? []) {
      await call('DELETE', `/checklists/${c.id}`, token);
    }
    for (const n of (await call('GET', '/textnotes', token)).body ?? []) {
      await call('DELETE', `/textnotes/${n.id}`, token);
    }

    console.log(`\nlive checks: ${lp} passed, ${lf} failed`);
    if (lf) process.exit(1);
  };

  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
