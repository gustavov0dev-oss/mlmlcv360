import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aboutFields, resolveAboutConfig, safeAboutUrl, reorderAboutItems } from '../src/lib/aboutContent';

test('saved text, including intentionally empty text, takes priority over defaults', () => {
  const config = resolveAboutConfig({ company_name: 'Empresa', about_hero_title: 'Título nuevo', about_hero_subtitle: '', razon_social: '' });
  assert.equal(config.about_hero_title, 'Título nuevo');
  assert.equal(config.about_hero_subtitle, '');
  assert.equal(config.razon_social, '');
  assert.equal(config.about_founders_title, 'El equipo detras de Empresa');
  const keys = Object.values(aboutFields()).flat().map(field => field.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('CTA destinations reject script, protocol-relative and malformed URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//evil.test', '/\\evil.test', 'https://', 'https://example.com/\nother']) assert.equal(safeAboutUrl(url), '');
  assert.equal(safeAboutUrl('/registro?plan=pro'), '/registro?plan=pro');
  assert.equal(safeAboutUrl('https://example.com/contacto'), 'https://example.com/contacto');
});

test('reordering preserves every record and its active state without mutating the input', () => {
  const rows = ['a', 'b', 'c'].map((id, sort_order) => ({ id, sort_order, is_active: id !== 'b', title: id }));
  const changed = reorderAboutItems(rows, 'c', 'a');
  assert.deepEqual(changed.map(row => row.id), ['c', 'a', 'b']);
  assert.deepEqual(changed.map(row => row.sort_order), [0, 1, 2]);
  assert.equal(changed[2].is_active, false);
  assert.deepEqual(rows.map(row => row.id), ['a', 'b', 'c']);
  assert.equal(reorderAboutItems(rows, 'missing', 'a'), rows);
  assert.equal(reorderAboutItems(rows, 'a', 'a'), rows);
});
