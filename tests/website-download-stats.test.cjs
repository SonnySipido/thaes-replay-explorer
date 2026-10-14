'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{summarize}=require('../docs/download-stats-data.js');
const asset=(suffix,count)=>({name:'Thae-Replay-Explorer-1.0.1-'+suffix,download_count:count});
test('download totals include only app installers and portable packages',()=>{
 const result=summarize([{tag_name:'v1.0.1',published_at:'2026-10-14',assets:[asset('Setup-x64.msi',7),asset('Setup-x64.exe',3),asset('Portable-x64.zip',2),{name:'SHA256SUMS.txt',download_count:100},{name:'thaes-replay-explorer-1.0.1-source.zip',download_count:50}]}]);
 assert.deepEqual(result.totals,{msi:7,exe:3,zip:2,total:12});assert.equal(result.rows[0].version,'1.0.1');
});
test('older EXE-only versions distinguish an unavailable MSI from zero downloads',()=>{
 const result=summarize([{tag_name:'v0.9.2',assets:[asset('Setup-x64.exe',0),asset('Portable-x64.zip',4)]},{tag_name:'v1.0.1',published_at:'2026-10-14',assets:[asset('Setup-x64.msi',0)]}]);
 assert.equal(result.rows[0].msi,0);assert.equal(result.rows[1].msi,null);assert.equal(result.totals.total,4);
});
test('drafts and source-only releases do not inflate totals; newest publications come first',()=>{
 const result=summarize([{tag_name:'vold',published_at:'2026-10-12',assets:[asset('Setup-x64.exe',5)]},{tag_name:'vdraft',draft:true,assets:[asset('Setup-x64.exe',90)]},{tag_name:'vsource',assets:[{name:'source.zip',download_count:500}]},{tag_name:'vnew',published_at:'2026-10-14',assets:[asset('Setup-x64.msi',2)]}]);
 assert.deepEqual(result.rows.map(row=>row.version),['new','old']);assert.equal(result.totals.total,7);
});
test('invalid counts do not produce negative or non-numeric totals',()=>{
 const result=summarize([{tag_name:'v1.0.1',assets:[asset('Setup-x64.msi',-3),asset('Setup-x64.exe','8'),asset('Portable-x64.zip',NaN)]}]);assert.deepEqual(result.totals,{msi:0,exe:0,zip:0,total:0});
});
