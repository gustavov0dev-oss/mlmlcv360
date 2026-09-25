import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { videoSource } from '../src/lib/productMedia.ts';
test('YouTube watch, shorts and shortened links are video URLs', () => {
 for(const url of ['https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share','https://youtu.be/dQw4w9WgXcQ?t=10','https://youtube.com/shorts/dQw4w9WgXcQ']) assert.equal(videoSource(url)?.kind,'youtube');
});
test('Direct videos work with signed query strings and fragments',()=>assert.equal(videoSource('https://cdn.example.com/file.MP4?token=abc#t=1')?.kind,'file'));
test('Vimeo and embedded Vimeo are supported',()=>{for(const url of ['https://vimeo.com/123456','https://player.vimeo.com/video/123456'])assert.equal(videoSource(url)?.kind,'vimeo')});
test('Images, malformed and spoofed URLs are not videos',()=>{for(const url of ['https://example.com/photo.jpg','not a url','javascript:alert(1)','https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'])assert.equal(videoSource(url),null)});
