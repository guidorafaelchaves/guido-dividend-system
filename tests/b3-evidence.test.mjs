import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},Date};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/platform/b3Evidence.js','utf8'),context);
const B=context.window.DividendB3Evidence;
const payload={
 schemaVersion:1,dataType:'fii-b3-reconciliation',rightsConfirmed:true,
 snapshotDate:'2026-11-09',sourceName:'fixture',
 records:[{ticker:'MXRF11',cnpj:'11222333000181',verificationStatus:'observed-active',isin:'BRMXRFCTF001'}]
};
const dt=d=>new Date(d+'T12:00:00Z');
assert.equal(B.find(payload,'MXRF11','11222333000181',dt('2026-11-10')).status,'observed-active');
assert.equal(B.find(payload,'MXRF11','99999999999999',dt('2026-11-10')).status,'unverified');
assert.equal(B.find(payload,'MXRF11','11222333000181',dt('2026-11-20')).status,'stale');
assert.equal(B.find(payload,'MXRF11','11222333000181',dt('2026-11-08')).status,'unverified');
assert.equal(B.find({...payload,rightsConfirmed:false},'MXRF11','11222333000181',dt('2026-11-10')).status,'unverified');
assert.equal(B.find({...payload,snapshotDate:'2026-02-30'},'MXRF11','11222333000181',dt('2026-11-10')).status,'unverified');
for(const path of ['public/platform/cvmFiiAssetPanel.js','public/platform/fiiUniverse.js']){
 new Function(fs.readFileSync(path,'utf8'));
}
for(const ticker of ['MXRF11','HGLG11','BBAS3','TAEE11','PETR4']){
 const html=fs.readFileSync('public/ativos/'+ticker+'/index.html','utf8');
 assert.match(html,/b3Evidence\.js/);
 assert.match(html,/cvmFiiAssetPanel\.js/);
}
console.log('OK: evidence freshness, CNPJ and asset detail script wiring');
