import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
function loader() {
  const cache = new Map();
  function load(name, parent = path.join(process.cwd(), 'fixture.ts')) {
    if (!name.startsWith('@/') && !name.startsWith('.')) return require(name);
    const base = name.startsWith('@/') ? path.join(process.cwd(), name.slice(2)) : path.resolve(path.dirname(parent), name);
    const file = [base, base + '.ts'].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(child => load(child, file), { exports }, exports);
    return exports;
  }
  return load;
}

test('versioned cookie ignores legacy values in either request order and GET does not extend expiry', async () => {
  const prior = process.env.ZAF_PI_SESSION_SECRET;
  process.env.ZAF_PI_SESSION_SECRET = 'ab'.repeat(32);
  try {
    const load = loader(), api = load('@/lib/zaf/pi/session'), route = load('@/app/api/zaf/pi/session/route');
    const value = api.sealPiSession({ uid: 'fixture-uid', username: 'server-account' });
    for (const pair of [
      `${api.PI_LEGACY_SESSION_COOKIE}=legacy; ${api.PI_SESSION_COOKIE}=${value}`,
      `${api.PI_SESSION_COOKIE}=${value}; ${api.PI_LEGACY_SESSION_COOKIE}=legacy`,
    ]) {
      const response = await route.GET(new NextRequest('https://zaf-tech.invalid/api/zaf/pi/session', { headers: { cookie: pair } }));
      assert.deepEqual(await response.json(), { user: { username: 'server-account' } });
      assert.equal(response.headers.get('set-cookie'), null);
      assert.match(response.headers.get('cache-control'), /no-store/);
    }
    const oldOnly = new NextRequest('https://zaf-tech.invalid/api/zaf/pi/session', { headers: { cookie: `${api.PI_LEGACY_SESSION_COOKIE}=${value}` } });
    assert.deepEqual(await (await route.GET(oldOnly)).json(), { user: null });
  } finally { if (prior === undefined) delete process.env.ZAF_PI_SESSION_SECRET; else process.env.ZAF_PI_SESSION_SECRET = prior; }
});

test('logout serializes distinct partitioned and legacy deletions', async () => {
  const load = loader(), api = load('@/lib/zaf/pi/session'), route = load('@/app/api/zaf/pi/session/route');
  const response = await route.DELETE(new NextRequest('https://zaf-tech.invalid/api/zaf/pi/session', { method: 'DELETE', headers: { origin: 'https://zaf-tech.invalid' } }));
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  const current = cookies.find(s => s.startsWith(api.PI_SESSION_COOKIE + '='));
  const old = cookies.find(s => s.startsWith(api.PI_LEGACY_SESSION_COOKIE + '='));
  for (const cookie of cookies) { assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /Max-Age=0/); assert.match(cookie, /SameSite=none/i); assert.ok(!/Domain=/i.test(cookie)); }
  assert.match(current, /Partitioned/i);
  assert.doesNotMatch(old, /Partitioned/i);
});

test('anonymous cookie probe uses real session attributes without identity', async () => {
  const route = loader()('@/app/api/zaf/pi/storage/route');
  for (const [cookie, available] of [['', false], ['__Host-zaf-pi-storage-probe=1', true], ['__Host-zaf-pi-storage-probe=attacker', false]]) {
    const response = await route.GET(new NextRequest('https://zaf-tech.invalid/api/zaf/pi/storage', { headers: { cookie } }));
    assert.deepEqual(await response.json(), { available });
    const header = response.headers.get('set-cookie');
    for (const pattern of [/HttpOnly/, /Secure/, /SameSite=none/i, /Partitioned/i, /Max-Age=300/]) assert.match(header, pattern);
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
});

test('storage setup requires first-party interaction and rejects injected content', async () => {
  const route = loader()('@/app/signin/storage/route');
  const response = await route.GET(new Request('https://zaf-tech.invalid/signin/storage?lang=%3Cscript%3E&returnTo=https://evil.invalid'));
  const html = await response.text();
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<form method="post" action="\/signin\/storage">/);
  assert.doesNotMatch(html, /<script|evil\.invalid/i);
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(response.headers.get('content-security-policy'), /form-action 'self'/);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('storage bootstrap POST has exact origin checking and a fixed return destination', async () => {
  const route = loader()('@/app/signin/storage/route');
  for (const origin of ['', 'https://evil.invalid', 'null']) {
    const response = await route.POST(new Request('https://zaf-tech.invalid/signin/storage', { method: 'POST', headers: { origin } }));
    assert.equal(response.status, 403); assert.equal(response.headers.get('set-cookie'), null);
  }
  const response = await route.POST(new Request('https://zaf-tech.invalid/signin/storage?returnTo=https://evil.invalid', { method: 'POST', headers: { origin: 'https://zaf-tech.invalid' } }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://zaftechpu0455.pinet.com/');
  assert.match(response.headers.get('set-cookie'), /^__Host-zaf-pi-storage-visit=1;/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=1800/);
  assert.doesNotMatch(response.headers.get('set-cookie'), /session-v2/);
});
