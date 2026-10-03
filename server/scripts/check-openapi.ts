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
  process.exit(0);
}
process.exit(1);
