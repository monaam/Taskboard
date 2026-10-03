/** Unit checks for src/lib/tokens.ts — the security-critical half of the feature. */
import crypto from 'crypto';
import {
  createToken, hashToken, looksLikeApiToken, isScope, scopeAllowsMethod,
  expiryFromDays, TOKEN_PREFIX, SCOPES,
} from '../src/lib/tokens';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n       ' + detail : '')); }
};

console.log('--- token generation ---');
const a = createToken();
const b = createToken();
ok('carries the prefix', a.plaintext.startsWith(TOKEN_PREFIX));
ok('two tokens differ', a.plaintext !== b.plaintext);
ok('two hashes differ', a.tokenHash !== b.tokenHash);
ok('32 bytes of entropy (43 base64url chars)', a.plaintext.length - TOKEN_PREFIX.length === 43,
   'got ' + (a.plaintext.length - TOKEN_PREFIX.length));
ok('base64url only — url/shell safe', /^[A-Za-z0-9_-]+$/.test(a.plaintext.slice(TOKEN_PREFIX.length)));
ok('hash is sha256 hex', /^[0-9a-f]{64}$/.test(a.tokenHash));
ok('hash is of the FULL token, prefix included',
   a.tokenHash === crypto.createHash('sha256').update(a.plaintext).digest('hex'));
ok('hash is NOT of the secret alone',
   a.tokenHash !== crypto.createHash('sha256').update(a.plaintext.slice(TOKEN_PREFIX.length)).digest('hex'));

console.log('--- the stored prefix leaks nothing usable ---');
ok('prefix is a strict, short prefix', a.plaintext.startsWith(a.prefix) && a.prefix.length === TOKEN_PREFIX.length + 6);
ok('prefix withholds >= 37 secret chars', a.plaintext.length - a.prefix.length >= 37,
   'withheld ' + (a.plaintext.length - a.prefix.length));

console.log('--- hashing is deterministic ---');
ok('same input, same hash', hashToken(a.plaintext) === hashToken(a.plaintext));
ok('different input, different hash', hashToken('tbp_x') !== hashToken('tbp_y'));

console.log('--- prefix detection ---');
ok('ours is detected', looksLikeApiToken(a.plaintext));
ok('a JWT is not', !looksLikeApiToken('eyJhbGciOiJIUzI1NiJ9.e30.abc'));
ok('empty string is not', !looksLikeApiToken(''));

console.log('--- scope validation ---');
ok("'read' valid", isScope('read'));
ok("'write' valid", isScope('write'));
ok("'admin' rejected", !isScope('admin'));
ok('number rejected', !isScope(1));
ok('exactly two scopes exist', SCOPES.length === 2);

console.log('--- read tokens are limited by HTTP method ---');
for (const m of ['GET', 'HEAD', 'OPTIONS', 'get', 'head']) {
  ok(`read allows ${m}`, scopeAllowsMethod('read', m));
}
for (const m of ['POST', 'PATCH', 'PUT', 'DELETE', 'post', 'delete']) {
  ok(`read denies ${m}`, !scopeAllowsMethod('read', m));
}
for (const m of ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']) {
  ok(`write allows ${m}`, scopeAllowsMethod('write', m));
}
// An unknown scope must not accidentally behave like write.
ok('an unknown scope is treated as read-only', !scopeAllowsMethod('banana', 'POST'));

console.log('--- expiry parsing ---');
ok('null -> never', expiryFromDays(null) === null);
ok('undefined -> never', expiryFromDays(undefined) === null);
ok("'' -> never", expiryFromDays('') === null);
ok("'never' -> never", expiryFromDays('never') === null);
ok('0 -> never (not an instant expiry)', expiryFromDays(0) === null);
ok('negative -> never', expiryFromDays(-5) === null);
ok('absurd (4000) -> never', expiryFromDays(4000) === null);
const d90 = expiryFromDays(90)!;
const days = (d90.getTime() - Date.now()) / 86_400_000;
ok('90 -> ~90 days out', Math.abs(days - 90) < 0.01, 'got ' + days.toFixed(4));
ok("'90' as a string works too", expiryFromDays('90') !== null);
ok('3650 (max) accepted', expiryFromDays(3650) !== null);
ok('3651 rejected', expiryFromDays(3651) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
