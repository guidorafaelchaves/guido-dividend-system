import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('public/platform/fiiPvp.js','utf8');
const context={Intl,Date,Number,String,Set,Object};
vm.runInNewContext(source,context);
const calc=context.DividendFiiPvp.calculate;
const now=new Date('2026-11-09T13:00:00Z');
const accounting={ticker:'MXRF11',referenceDate:'2026-09-01',navCalculated:9.352547,navValidated:true};
const quote={ticker:'MXRF11',price:10.1,quoteDate:'2026-11-06',source:'b3-official-file',dataSource:'local-import',realTime:false};

test('P/VP usa somente fechamento oficial válido e VPA conciliado',()=>{
 const r=calc(accounting,quote,now);
 assert.equal(r.ok,true);
 assert.ok(Math.abs(r.pvp-10.1/9.352547)<1e-9);
 assert.equal(r.quoteDate,'2026-11-06');
});

test('P/VP não aceita CSV manual sem origem oficial comprovada',()=>{
 const r=calc(accounting,{...quote,source:'manual-csv'},now);
 assert.equal(r.ok,false);
});

test('P/VP bloqueia VPA não validado',()=>{
 assert.equal(calc({...accounting,navValidated:false},quote,now).ok,false);
});

test('P/VP bloqueia cotação anterior ao informe',()=>{
 assert.equal(calc(accounting,{...quote,quoteDate:'2026-08-29'},now).ok,false);
});

test('P/VP bloqueia fechamento do próprio dia e fechamento antigo',()=>{
 assert.equal(calc(accounting,{...quote,quoteDate:'2026-11-09'},now).ok,false);
 assert.equal(calc(accounting,{...quote,quoteDate:'2026-10-20'},now).ok,false);
});

test('P/VP bloqueia ticker errado e preço zero',()=>{
 assert.equal(calc(accounting,{...quote,ticker:'KNRI11'},now).ok,false);
 assert.equal(calc(accounting,{...quote,price:0},now).ok,false);
});

test('Snapshot licenciado D-1 permite cálculo',()=>{
 const r=calc(accounting,{...quote,dataSource:'published-d1',source:'Feed autorizado B3'},now);
 assert.equal(r.ok,true);
});
