'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {duplicateGroups,uniqueReplays}=require('../ui/replay-filters.js');
const a='a'.repeat(64),b='b'.repeat(64);
test('identical content across paths collapses while same-named different content stays',()=>{
 const rows=[{key:'one',name:'match.w3g',file:'C:/one/match.w3g',contentHash:a},{key:'two',name:'renamed.w3g',file:'D:/two/renamed.w3g',contentHash:a},{key:'three',name:'match.w3g',file:'D:/two/match.w3g',contentHash:b}];
 assert.equal(duplicateGroups(rows).size,1);assert.deepEqual(uniqueReplays(rows).map(r=>r.key),['one','three']);assert.equal(rows.length,3);
});
test('selected or externally requested copies stay visible without showing their duplicates',()=>{
 const rows=[{key:'one',contentHash:a},{key:'other',contentHash:b},{key:'selected',contentHash:a}];
 assert.deepEqual(uniqueReplays(rows,['selected']).map(r=>r.key),['other','selected']);assert.deepEqual(uniqueReplays(rows,['one','selected']).map(r=>r.key),['one','other']);
 assert.deepEqual(uniqueReplays(rows.filter(r=>r.key==='selected')).map(r=>r.key),['selected']);
});
test('unhashed or invalid hashes are never treated as identical',()=>{
 const rows=[{key:'one'},{key:'two'},{key:'three',contentHash:''},{key:'four',contentHash:'invalid'},{key:'five',contentHash:'invalid'}];assert.deepEqual(uniqueReplays(rows),rows);assert.equal(duplicateGroups(rows).size,0);
});
