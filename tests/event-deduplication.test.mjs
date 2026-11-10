import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const store=new Map();
const context={window:{},localStorage:{
 getItem:key=>store.get(key)||null,
 setItem:(key,value)=>store.set(key,value)
}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/platform/domain.js','utf8'),context);
const D=context.window.DividendDomain;
const a={id:'provider-1',ticker:'MXRF11',kind:'rendimento',amount:0.10,exDate:'2026-11-03',paymentDate:'2026-11-14',status:'estimated',source:'market-provider'};
const b={...a,id:'official-2',status:'confirmed',source:'official'};
const c={...a,id:'second-installment',amount:0.11};
const d={...a,id:'future-projection',paymentDate:'2027-11-14',status:'projected'};
const output=D.deduplicateEvents([a,b,c,d]);
assert.equal(output.length,3,'Repeticoes entre provedores sao conciliadas');
assert.equal(output[0].source,'official','Preferencia por evento confirmado');
assert.equal(D.deduplicateEvents(output).length,3,'Processamento idempotente');
assert.equal(D.deduplicateEvents([{...a,exDate:''},{...b,exDate:''}]).length,2,'Sem data-ex nao e seguro fundir IDs distintos');
store.set('gds_public_events_v1',JSON.stringify([a,c,d]));
store.set('gds_published_events_v1',JSON.stringify([{...b,publicationStatus:'published'}]));
assert.equal(D.publishedEventRepository.all().length,3,'O calendario nao repete eventos equivalentes');
console.log('OK: reconciliacao economica de proventos');
