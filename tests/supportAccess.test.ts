import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {canSupportAccess,canAccessUnconfirmed} from '../supabase/functions/support-access/policy.ts';
const actor={id:'operator',role:'admin',status:'active'};
const target={id:'member',role:'user',status:'active'};
test('Administrators can enter an active ordinary account',()=>assert.equal(canSupportAccess(actor,target,{}),true));
test('Viewing users does not grant account access',()=>assert.equal(canSupportAccess({...actor,role:'support'},target,{support:{view_users:true}}),false));
test('Explicit permission enables delegated account access',()=>assert.equal(canSupportAccess({...actor,role:'support'},target,{support:{impersonate_users:true}}),true));
test('No privileged targets, inactive accounts or nested self access',()=>{
 for(const role of ['admin','super_admin','support'])assert.equal(canSupportAccess(actor,{...target,role},{}),false);
 assert.equal(canSupportAccess(actor,{...target,status:'suspended'},{}),false);
 assert.equal(canSupportAccess({...actor,status:'suspended'},target,{}),false);
 assert.equal(canSupportAccess(actor,{...target,id:actor.id},{}),false);
});

test('Unconfirmed email access is reserved for superadministrators',()=>{assert.equal(canAccessUnconfirmed('super_admin',false),true);assert.equal(canAccessUnconfirmed('admin',false),false);assert.equal(canAccessUnconfirmed('support',false),false);assert.equal(canSupportAccess({...actor,role:'super_admin'},{...target,status:'pending'},{}),true);});

test('Superadmin can support every other role and account status',()=>{for(const role of ['user','support','admin','super_admin','caporal'])for(const status of ['active','pending','suspended'])assert.equal(canSupportAccess({...actor,role:'super_admin'},{...target,role,status},{}),true);assert.equal(canSupportAccess({...actor,role:'super_admin'},{...target,id:actor.id},{}),false);});
