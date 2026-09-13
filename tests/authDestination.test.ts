import test from 'node:test';
import assert from 'node:assert/strict';
import {authDestination} from '../src/lib/authDestination.ts';
test('preserves the checkout and selected method through login',()=>assert.equal(authDestination('?next=%2Fpago%3Fplan%3Dpro%26method%3Dpaypal',null),'/pago?plan=pro&method=paypal'));
test('explicit selection overrides a prior attempt',()=>assert.equal(authDestination('?plan=elite','/pago?plan=pro'),'/pago?plan=elite'));
test('blocks external and recursive auth destinations',()=>{for(const next of ['https://example.com','//example.com','/\\example.com','/login','/registro?plan=pro','/\n/example.com'])assert.equal(authDestination('?next='+encodeURIComponent(next),null),'/dashboard');});
test('keeps registration without membership optional',()=>assert.equal(authDestination('',null),'/dashboard'));
