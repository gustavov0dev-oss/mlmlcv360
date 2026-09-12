import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {availableCartVariant} from '../src/lib/cartAvailability.ts';
const product:any={status:'active',track_stock:true,general_stock:0,variants:[]};
test('Reject empty stock even if backorders are enabled',()=>assert.throws(()=>availableCartVariant({...product,allow_backorder:true},undefined,1),/agotado/));
test('Select an available presentation instead of the first empty one',()=>{const variants:any=[{id:'empty',status:'active',stock:0},{id:'ready',status:'active',stock:2}];assert.equal(availableCartVariant({...product,variants},undefined,1)?.id,'ready');assert.throws(()=>availableCartVariant({...product,variants},'empty',1));assert.throws(()=>availableCartVariant({...product,variants},'ready',3));});
test('Reject inactive variants, archived products and invalid quantities',()=>{assert.throws(()=>availableCartVariant({...product,variants:[{id:'x',status:'inactive',stock:20}]},undefined,1));assert.throws(()=>availableCartVariant({...product,status:'archived'},undefined,1));for(const qty of [0,-1,1.5,NaN])assert.throws(()=>availableCartVariant({...product,general_stock:10},undefined,qty));});
test('Untracked products remain purchasable and tracked stock is capped',()=>{assert.equal(availableCartVariant({...product,track_stock:false},undefined,100),undefined);assert.equal(availableCartVariant({...product,general_stock:3},undefined,3),undefined);assert.throws(()=>availableCartVariant({...product,general_stock:3},undefined,4));});
