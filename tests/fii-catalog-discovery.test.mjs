import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(fs.readFileSync('public/data/fii-universe.json','utf8'));
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/platform/fiiCatalog.js','utf8'),context);
const F=context.window.DividendFiiCatalog;
const items=F.normalize(data);
assert.equal(items.length,527,'O universo de FIIs e FIAGROs deve ser completo');
assert.equal(items.filter(x=>x.type==='FIAGRO').length,29);
assert.equal(items.filter(x=>x.type==='FII').length,498);
assert.ok(items.every(x=>x.price===0&&x.dividendYield===0&&x.catalogOnly===true));
assert.ok(items.every(x=>x.cnpj?.length===14));
assert.ok(items.every(x=>x.name && x.sector));
const example=items.find(x=>x.ticker==='MXRF11');
assert.ok(example,'MXRF11 deve estar no catálogo');
const demo=[{ticker:'MXRF11',price:10.28,dividendYield:12.4,source:'demo-fixture',name:'Exemplo'}];
const merged=F.merge(demo,items);
assert.equal(merged.length,527,'Nao repetir ticker existente');
assert.equal(merged.find(x=>x.ticker==='MXRF11').price,0,'Precos demo nao devem ser exibidos como reais');
const actual=F.merge([{ticker:'MXRF11',price:10.50,dividendYield:5,source:'official',name:'Dado financeiro'}],items);
assert.equal(actual.find(x=>x.ticker==='MXRF11').price,10.50,'Dado financeiro verdadeiro nao deve ser sobrescrito');
const portal=fs.readFileSync('public/platform/portal.js','utf8');
assert.ok(portal.includes('DividendFiiCatalog?.merge'));
assert.match(portal,/DividendFiiCatalog\?\.load/);
assert.match(portal,/data\.all\.filter\(row => row\.asset\.type === 'FII'\)/);
assert.match(portal,/catalog\.innerHTML=candidates\.slice\(0,assetCatalogLimit\)/);
assert.match(portal,/\/ativos\/\?ticker=/);
assert.match(portal,/DividendFiiUniverse\?\.show/);
assert.match(fs.readFileSync('public/platform/cvmFiiAssetPanel.js','utf8'),/queryTicker/);
for(const root of ['public','docs']){
 for(const page of ['/index.html','/ativos/index.html']){
   const html=fs.readFileSync(root+page,'utf8');
   assert.ok(html.indexOf('fiiCatalog.js')<html.indexOf('portal.js'));
 }
 const html=fs.readFileSync(root+'/ativos/MXRF11/index.html','utf8');
 assert.match(html,/fiiCatalog\.js/);
}
console.log('OK: 527 ativos pesquisaveis, dados demo isolados e links dinamicos');
