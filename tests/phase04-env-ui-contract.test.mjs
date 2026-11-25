import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('minimal login shows only the two credential fields and login action', () => {
  const page = read('../src/app/login/page.tsx');
  const form = read('../src/components/login-form.tsx');
  assert.match(page, /Amar Nfser Hisab/);
  assert.match(form, /type="email"/);
  assert.match(form, /type=\{showPassword \? "text" : "password"\}/);
  assert.match(form, /লগইন/);
  assert.doesNotMatch(page, /setupStatus\.missing|hero-panel|marketing-copy|login-description/);
});

test('environment diagnostics remain server-only and do not expose secret values', () => {
  const env = read('../src/lib/env.server.ts');
  assert.match(env, /getLoginEnvironmentStatus/);
  assert.match(env, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(env, /LOGIN_THROTTLE_SECRET/);
});

test('login API keeps validation and server-side authentication', () => {
  const route = read('../src/app/api/auth/login/route.ts');
  assert.match(route, /signInWithPassword/);
  assert.match(route, /readJsonBody/);
  assert.match(route, /createLoginHandoff/);
  assert.match(route, /LOGIN_HANDOFF_COOKIE/);
});
