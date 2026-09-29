import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../src/lib/dates.ts', import.meta.url), 'utf8');
const js = ts.transpile(source, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 });
const dates = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
assert.equal(dates.dateKey('2026-09-26T00:35:00Z', 'America/Lima'), '2026-09-25');
assert.equal(dates.dateKey('2026-09-26T00:35:00Z', 'Asia/Tokyo'), '2026-09-26');
assert.equal(dates.dateKey('2026-10-01T01:00:00Z', 'America/Lima'), '2026-09-30');
assert.equal(dates.dateKey('2026-09-25', 'Asia/Tokyo'), '2026-09-25');
assert.equal(dates.localDate('2026-09-26 00:35:00+00').toISOString(), '2026-09-26T00:35:00.000Z');
assert.equal(dates.localDate('2026-09-26T00:35:00').toISOString(), '2026-09-26T00:35:00.000Z');
assert.equal(dates.dayBoundaryUtc('2026-09-25', false, 'America/Lima').toISOString(), '2026-09-25T05:00:00.000Z');
assert.equal(dates.dayBoundaryUtc('2026-09-25', true, 'America/Lima').toISOString(), '2026-09-26T05:00:00.000Z');
for (const [day, hours] of [['2026-03-08', 23], ['2026-11-01', 25]]) {
  assert.equal((dates.dayBoundaryUtc(day, true, 'America/New_York') - dates.dayBoundaryUtc(day, false, 'America/New_York')) / 3600000, hours);
}
assert.equal(dates.displayDate('invalid'), '—');
assert.equal(dates.dayBoundaryUtc('2026-09-06', false, 'America/Santiago').toISOString(), '2026-09-06T04:00:00.000Z');
console.log('12 date/time assertions passed.');
