import test from 'node:test';
import assert from 'node:assert/strict';
import {findProfilePhoto,imageType,limitedBytes} from '../supabase/functions/whatsapp-photo/photo';
test('extracts only public WhatsApp photos and decodes query parameters',()=>{assert.equal(findProfilePhoto('<img src="https://pps.whatsapp.net/a.jpg?x=1&amp;y=2">'),'https://pps.whatsapp.net/a.jpg?x=1&y=2');for(const url of ['https://evil.test/a','https://pps.whatsapp.net.evil.test/a','http://pps.whatsapp.net/a','https://user:pass@pps.whatsapp.net/a','https://pps.whatsapp.net:444/a'])assert.equal(findProfilePhoto(`<img src="${url}">`),null);});
test('rejects oversized downloads and non-image responses',async()=>{await assert.rejects(limitedBytes(new Response('123456'),5));assert.equal(imageType(new TextEncoder().encode('<svg/>')),null);assert.equal(imageType(new Uint8Array([255,216,255,0])),'image/jpeg');assert.deepEqual(await limitedBytes(new Response('ok'),5),new Uint8Array([111,107]));});
