import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWhatsAppConfig,validateWhatsAppConfig,validWhatsAppNumber,whatsappLink} from '../src/lib/whatsappContent';
test('preserves the existing number and custom message',()=>{const c=parseWhatsAppConfig({whatsapp_enabled:'true',whatsapp_number:'+51 987-654-321',whatsapp_message:'Hola & gracias'});assert.equal(c.contacts.length,1);assert.equal(validateWhatsAppConfig(c),null);assert.equal(whatsappLink(c.contacts[0]),'https://wa.me/51987654321?text=Hola%20%26%20gracias');});
test('does not fabricate contacts; an empty saved list overrides legacy data',()=>{const c=parseWhatsAppConfig({});assert.equal(c.contacts.length,0);assert.equal(validateWhatsAppConfig({...c,enabled:true})!==null,true);assert.equal(parseWhatsAppConfig({whatsapp_number:'51987654321',whatsapp_widget:JSON.stringify(c)}).contacts.length,0);});
test('rejects invalid numbers and malformed saved data',()=>{for(const value of ['javascript:alert(1)','123','000000000','51987abc321'])assert.equal(validWhatsAppNumber(value),false);assert.throws(()=>parseWhatsAppConfig({whatsapp_widget:'{}'}));});
