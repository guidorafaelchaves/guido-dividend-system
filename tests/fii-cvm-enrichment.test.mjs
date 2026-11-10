import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context={window:{},Date};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/platform/fiiCatalog.js','utf8'),context);
const F=context.window.DividendFiiCatalog;
const universe=JSON.parse(fs.readFileSync('public/data/fii-universe.json','utf8'));
const report=JSON.parse(fs.readFileSync('public/data/cvm-fii-by-ticker.json','utf8'));
const catalog=F.normalize(universe);
const enriched=F.enrichMetrics(catalog,report,new Date('2026-11-10T12:00:00Z'));
assert.equal(enriched.length,527);
assert.equal(enriched.filter(x=>x.cvm).length,357,'A base vigente deve conciliar 357 ticker/CNPJ');
assert.equal(enriched.filter(x=>x.cvm?.navValidated).length,302,'302 VPAs validados');
const mxrf=enriched.find(x=>x.ticker==='MXRF11');
assert.ok(mxrf?.cvm?.navValidated);
assert.ok(mxrf.cvm.navCalculated>0);
assert.equal(mxrf.price,0,'VPA nao pode ser escrito como preco de mercado');
assert.equal(mxrf.dividendYield,0,'Patrimonio nao pode gerar DY sem proventos');
assert.equal(mxrf.cvm.dataType,'monthly-fii-accounting');
assert.match(mxrf.cvm.referenceDate,/^\d{4}-\d{2}-\d{2}$/);
const wrong=F.enrichMetrics(catalog,{...report,records:[{...report.records[0],cnpj:'00000000000000'}]},new Date('2026-11-10T12:00:00Z'));
assert.equal(wrong.some(x=>x.cvm),false,'CNPJ divergente deve barrar associacao');
const noNav=F.enrichMetrics(catalog,{...report,records:[{...report.records[0],navValidated:false,navCalculated:999}]},new Date('2026-11-10T12:00:00Z'));
assert.equal(noNav.find(x=>x.ticker===report.records[0].ticker).cvm.navCalculated,null,'VPA sem validacao nao deve aparecer');
const future=F.enrichMetrics(catalog,{...report,records:[{...report.records[0],referenceDate:'2027-01-01'}]},new Date('2026-11-10T12:00:00Z'));
assert.equal(future.some(x=>x.cvm),false,'Competencia futura deve ser descartada');
const oldTicker=report.records[0].ticker;
const collision=F.enrichMetrics(catalog,{...report,records:[
  {...report.records[0],netAssets:100},
  {...report.records[0],netAssets:101},
  {...report.records[0],netAssets:102}
]},new Date('2026-11-10T12:00:00Z'));
assert.equal(collision.find(x=>x.ticker===oldTicker).cvm,undefined,'Conflitos devem ficar em quarentena');
const portal=fs.readFileSync('public/platform/portal.js','utf8');
assert.match(portal,/FIIs com dados CVM/);
assert.match(portal,/VPA CVM validado/);
assert.match(portal,/assetCatalogLimit\+=100/);
assert.match(portal,/id="assetCatalogMore"/);
assert.match(portal,/navValidated===true/);
new Function(portal);
new Function(fs.readFileSync('public/platform/fiiCatalog.js','utf8'));
console.log('OK: dados CVM reconciliados por ticker/CNPJ, VPA conservador e paginacao');
