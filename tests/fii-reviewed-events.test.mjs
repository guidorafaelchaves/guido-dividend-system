import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const store=new Map();
const data=JSON.parse(fs.readFileSync('public/data/fii-universe.json','utf8'));
const context={window:{},document:{addEventListener(){}},localStorage:{
  getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)
},URLSearchParams,Date,console};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/platform/domain.js','utf8'),context);
vm.runInContext(fs.readFileSync('public/platform/fiiCatalog.js','utf8'),context);
const domain=context.window.DividendDomain;
const F=context.window.DividendFiiCatalog;
const list=F.normalize(data);
const selected=list.find(x=>x.ticker==='MXRF11');
assert.ok(selected);
F.all=undefined; // Object.freeze prevents modification; provide a wrapper below.
const catalog={all:()=>list};
context.window.DividendFiiCatalog=catalog;
context.window.DividendCalendarAnalytics={};
let script=fs.readFileSync('public/platform/portal.js','utf8');
script=script.replace("  document.addEventListener('DOMContentLoaded', mount);",
  "  global.__testReviewed={load:loadHumanReviewedFiiEvents,events};");
vm.runInContext(script,context);
const U=context.window.__testReviewed;
const sample={id:'fii-reviewed:MXRF11',ticker:'MXRF11',cnpj:selected.cnpj,
 kind:'rendimento',exDate:'2026-10-15',paymentDate:'2026-10-25',amount:0.10,
 status:'confirmed-document',verificationStatus:'human-reviewed-announcement',
 paymentSettlementVerified:false,sourceUrl:'https://example.org/announcements/123'};
const base={schemaVersion:1,dataType:'fii-reviewed-events',events:[sample,
 {...sample,id:'invalid-cnpj',cnpj:'00000000000000',amount:999},
 {...sample,id:'invalid-status',status:'estimated',amount:888},
 {...sample,id:'invalid-http',sourceUrl:'http://example.org/doc',amount:777}]};
context.fetch=async()=>({ok:true,json:async()=>base});
await U.load();
let events=U.events();
const target=events.filter(x=>x.ticker==='MXRF11');
assert.equal(target.length,1,'Anuncio revisado substitui apenas DEMO do mesmo ticker');
assert.equal(target[0].status,'confirmed');
assert.equal(target[0].amount,0.10);
assert.equal(target[0].source,'human-reviewed-document');
const without=events.filter(x=>x.ticker==='BBAS3');
assert.equal(without.length,1,'Nao apagar eventos de outros ativos');
context.fetch=async()=>({ok:false});
await U.load();
events=U.events();
assert.ok(events.some(x=>x.ticker==='MXRF11'&&x.source==='demo-fixture'),
 'Quando feed ausente, comportamento antigo e preservado');
new Function(fs.readFileSync('public/platform/portal.js','utf8'));
console.log('OK: historico FII revisado, somente status validos e nenhuma promocao automatica de pendencias');
