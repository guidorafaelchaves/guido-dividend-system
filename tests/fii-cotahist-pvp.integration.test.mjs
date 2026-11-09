import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const storage=new Map();
const sandbox={
  console,Intl,Date,Set,Map,Number,String,Object,
  localStorage:{
    getItem:key=>storage.get(key)||null,
    setItem:(key,value)=>storage.set(key,String(value))
  },
  fetch:async()=>({ok:false})
};
sandbox.window=sandbox;
vm.createContext(sandbox);
for(const file of ['public/platform/marketHub.js','public/platform/marketGateway.js','public/platform/fiiPvp.js']){
  vm.runInContext(readFileSync(file,'utf8'),sandbox,{filename:file});
}
function makeCotahist(ticker='MXRF11',date='20261106',priceCents=1010){
  const chars=Array(245).fill(' ');
  function put(start,value){for(let i=0;i<value.length;i++)chars[start+i]=value[i];}
  put(0,'01');put(2,date);put(12,ticker.padEnd(12));put(24,'010');
  put(108,String(priceCents).padStart(13,'0'));
  return chars.join('');
}

test('arquivo COTAHIST oficial importado fornece preço ao cálculo P/VP',async()=>{
 const {DividendMarketHub:hub,DividendMarketGateway:gateway,DividendFiiPvp:pvp}=sandbox;
 const parsed=hub.parseCotahist(makeCotahist(),new Set(['MXRF11']));
 assert.equal(parsed.observations.length,1);
 assert.equal(parsed.observations[0].source,'b3-official-file');
 assert.equal(parsed.observations[0].price,10.1);
 hub.saveCandidates(parsed.observations);
 const quote=await gateway.fetchQuote('MXRF11');
 assert.equal(quote.price,10.1);
 assert.equal(quote.source,'b3-official-file');
 assert.equal(quote.quoteDate,'2026-11-06');
 const result=pvp.calculate({
   ticker:'MXRF11',referenceDate:'2026-09-01',
   navCalculated:9.352547,navValidated:true
 },quote,new Date('2026-11-09T13:00:00Z'));
 assert.equal(result.ok,true);
 assert.ok(Math.abs(result.pvp-10.1/9.352547)<1e-8);
});

test('derivativos não são admitidos como fechamento à vista',()=>{
 const line=makeCotahist().slice(0,24)+'020'+makeCotahist().slice(27);
 assert.equal(sandbox.DividendMarketHub.parseCotahist(line).observations.length,0);
});

test('não usa ticker de outro FII no cálculo de P/VP',()=>{
 const parsed=sandbox.DividendMarketHub.parseCotahist(makeCotahist('KNRI11'),new Set(['MXRF11']));
 assert.equal(parsed.observations.length,0);
});

test('CSV de preços manuais não satisfaz fonte oficial para P/VP',async()=>{
 const candidate=sandbox.DividendMarketHub.parseCsv('ticker,data,preco\nMXRF11,2026-11-07,10.70');
 assert.equal(candidate.observations[0].source,'manual-csv');
 const result=sandbox.DividendFiiPvp.calculate(
   {ticker:'MXRF11',referenceDate:'2026-09-01',navCalculated:9.352547,navValidated:true},
   {ticker:'MXRF11',price:10.7,quoteDate:'2026-11-07',source:'manual-csv',dataSource:'local-import'},
   new Date('2026-11-09T13:00:00Z'));
 assert.equal(result.ok,false);
});
