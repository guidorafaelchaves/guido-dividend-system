import assert from 'node:assert/strict';
import '../public/platform/marketHub.js';
const h=globalThis.DividendMarketHub;
assert.ok(h,'Market Hub must register its pure harmonization API');
globalThis.localStorage={
  values:new Map(),
  getItem(key){return this.values.get(key)||null;},
  setItem(key,value){this.values.set(key,String(value));}
};
function line(fields={}){
  const chars=Array(245).fill(' ');
  const put=(start,size,value)=>{const x=String(value).padEnd(size,' ').slice(0,size);for(let i=0;i<size;i++)chars[start+i]=x[i];};
  put(0,2,'01');put(2,8,fields.date||'20261016');put(10,2,'02');
  put(12,12,fields.ticker||'PETR4');put(24,3,fields.market||'010');
  put(108,13,fields.close||'0000000003075');
  return chars.join('');
}
const official=h.parseCotahist('00header\n'+line()+'\n99trailer',new Set(['PETR4']));
assert.equal(official.observations.length,1);
assert.deepEqual(official.observations[0].ticker,'PETR4');
assert.equal(official.observations[0].price,30.75);
assert.equal(official.observations[0].date,'2026-10-16');
assert.equal(h.parseCotahist(line({market:'020'})).observations.length,0,'no derivatives as spot');
assert.equal(h.parseCotahist(line({ticker:'VALE3'}),new Set(['PETR4'])).observations.length,0);
const csv=h.parseCsv('ticker;data;preço\nPETR4;16/10/2026;30,75\nMXRF11;2026-10-16;9,98\n');
assert.equal(csv.observations.length,2);
assert.equal(csv.observations[1].price,9.98);
assert.equal(h.parseCsv('ticker;data;preco\nPETR4;2099-10-16;999').observations.length,0);
const same=[
  {ticker:'PETR4',date:'2026-10-16',price:30.75,source:'b3-official-file'},
  {ticker:'PETR4',date:'2026-10-16',price:30.74,source:'manual-csv'}
];
let result=h.reconcile(same,{});
assert.equal(result.accepted[0].source,'b3-official-file');
assert.equal(result.conflicts.length,0);
result=h.reconcile([...same,{ticker:'PETR4',date:'2026-10-16',price:29,source:'manual-csv'}],{});
assert.equal(result.accepted.length,0,'conflicting sources cannot silently overwrite prices');
assert.equal(result.conflicts.length,1);
result=h.reconcile([same[0]],{PETR4:{precoAtual:31,quoteDate:'2026-10-17',source:'legacy-cache'}});
assert.equal(result.accepted.length,0,'older official data must not overwrite newer quote');
assert.equal(result.unchanged.length,1);
result=h.reconcile([same[0]],{PETR4:{precoAtual:20,quoteDate:'2026-10-16',source:'manual-csv'}});
assert.equal(result.conflicts.length,1,'same-day >1% divergence must be blocked');
h.saveCandidates(same);
assert.equal(h.getCandidates().length,1,'deduplicate by ticker and trading day');
assert.equal(h.getCandidates()[0].source,'b3-official-file');
console.log('OK: B3 COTAHIST, CSV, source precedence, staleness and divergence checks');
