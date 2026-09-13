import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutSnapshots, rememberCheckout, forgetCheckout, subtractPurchased } from '../src/lib/checkoutCart.ts';
const data=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)}});
test('starting a checkout records the purchase without clearing cart storage',()=>{
 data.set('mlm360_cart',JSON.stringify([{id:'a',quantity:2}]));
 rememberCheckout({userId:'u',orderId:'o',fingerprint:'f',items:[{id:'a',quantity:2}]});
 assert.equal(JSON.parse(data.get('mlm360_cart')!)[0].quantity,2);
 assert.equal(checkoutSnapshots()[0].orderId,'o');
});
test('settlement preserves other products and quantities added after checkout',()=>{
 assert.deepEqual(subtractPurchased([{id:'a',quantity:4},{id:'b',quantity:1}],[{id:'a',quantity:2}]),[{id:'a',quantity:2},{id:'b',quantity:1}]);
});
test('settlement does not remove a product removed and re-added with a new cart identity',()=>{
 assert.deepEqual(subtractPurchased([{id:'new-a',quantity:1}],[{id:'old-a',quantity:1}]),[{id:'new-a',quantity:1}]);
});
test('forgetting a settled checkout makes repeated verification harmless',()=>{forgetCheckout('o');assert.equal(checkoutSnapshots().length,0);});
