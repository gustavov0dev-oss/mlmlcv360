import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opportunityDefaults, parseOpportunitySection, opportunityVideoUrl } from '../src/lib/opportunityContent';

test('all sections retain their existing content before the first save', () => {
 const defaults = opportunityDefaults('Cluv360');
 assert.equal(defaults.hero.text.subtitle.startsWith('Cluv360'), true);
 assert.equal(defaults.story.items.length, 4);
 assert.equal(defaults.profiles.items.length, 4);
 assert.equal(defaults.comparison.items.length, 6);
 assert.equal(defaults.commitments.items.length, 4);
 assert.equal(parseOpportunitySection(undefined, defaults.hero), defaults.hero);
});
test('saved blank text, empty lists, order, visibility and comparison choices survive reloading', () => {
 const defaults = opportunityDefaults();
 const edited = {...defaults.comparison,text:{...defaults.comparison.text,subtitle:''},items:[{...defaults.comparison.items[1],traditional:true,cluv:false,is_active:false},defaults.comparison.items[0]]};
 assert.deepEqual(parseOpportunitySection(JSON.stringify(edited),defaults.comparison),edited);
 const empty = {...defaults.story,items:[]};
 assert.deepEqual(parseOpportunitySection(JSON.stringify(empty),defaults.story),empty);
});
test('malformed saved data fails explicitly instead of restoring deleted items', () => {
 const defaults = opportunityDefaults();
 assert.throws(()=>parseOpportunitySection('broken',defaults.story));
 assert.throws(()=>parseOpportunitySection(JSON.stringify({...defaults.story,items:[defaults.story.items[0],defaults.story.items[0]]}),defaults.story));
 assert.throws(()=>parseOpportunitySection(JSON.stringify({...defaults.comparison,items:[{...defaults.comparison.items[0],cluv:'true'}]}),defaults.comparison));
});
test('video links normalize only supported hosts and valid IDs', () => {
 assert.equal(opportunityVideoUrl('https://youtu.be/29Pthrvd-fM'),'https://www.youtube.com/embed/29Pthrvd-fM');
 assert.equal(opportunityVideoUrl('https://www.youtube.com/watch?v=29Pthrvd-fM'),'https://www.youtube.com/embed/29Pthrvd-fM');
 assert.equal(opportunityVideoUrl('https://vimeo.com/123456'),'https://player.vimeo.com/video/123456');
 for(const url of ['', 'javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=29Pthrvd-fM', 'https://example.com/video', 'https://youtube.com/watch?v=bad']) assert.equal(opportunityVideoUrl(url),'');
});
