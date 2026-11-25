import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const readme = await readFile(new URL('../README_BN.md', import.meta.url), 'utf8');

test('release UI defines balanced pastel surfaces for light and dark themes', () => {
  for (const token of ['--surface-mint', '--surface-sky', '--surface-lilac', '--surface-sand', '--surface-rose', '--surface-info']) {
    assert.ok(css.includes(token), `missing ${token}`);
  }
  assert.match(css, /:root\[data-theme="dark"\]\s*\{[\s\S]*?--surface-info:/);
});

test('informational notes use even borders with no decorative icon or side stripe', () => {
  assert.match(css, /\.field-hint,[\s\S]*?\.prayer-method-explain\s*>\s*p\s*\{[\s\S]*?border:\s*1px solid/);
  assert.match(css, /\.form-footnote\s*>\s*svg,[\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /\.notice-status-icon\s*\{\s*display:\s*none\s*!important/);
  assert.doesNotMatch(css.slice(css.lastIndexOf('/* Release 1 visual system')), /\.field-hint[^}]*border-left\s*:/);
});

test('card families receive distinct surfaces and consistent breathing room', () => {
  assert.match(css, /\.metric-card\.metric-blue[^}]*background:\s*var\(--surface-sky\)/);
  assert.match(css, /\.tracker-picker-card:nth-child\(6n \+ 3\)[^}]*background:\s*var\(--surface-lilac\)/);
  assert.match(css, /\.deadline-plan-card:nth-child\(4n\)[^}]*background:/);
  assert.match(css, /\.notification-list\s*\{\s*display:\s*grid;\s*gap:\s*13px/);
});

test('Vercel release uses a pinned supported Node major and keeps secrets server-only', () => {
  assert.equal(pkg.engines?.node, '22.x');
  assert.match(readme, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(readme, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(readme, /SUPABASE_SECRET_KEY/);
  assert.match(readme, /LOGIN_THROTTLE_SECRET/);
  assert.match(readme, /git push -u origin main/);
  assert.match(readme, /Production ও Preview/);
});
