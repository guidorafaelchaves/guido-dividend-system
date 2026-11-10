import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{},document:{},URLSearchParams};
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/platform/fiiDistributions.js','utf8'),context);
const D=context.window.DividendFiiDistributions;
const payload={schemaVersion:1,dataType:'fii-document-linked-distributions',rightsConfirmed:true,sourceName:'Teste',
 records:[
 {ticker:'MXRF11',cnpj:'97521225000125',kind:'RENDIMENTO',exDate:'2026-10-15',paymentDate:'2026-10-25',
  amountPerUnit:.10,sourceUrl:'https://example.org/doc/1',verificationStatus:'document-linked-unverified-content'},
 {ticker:'MXRF11',cnpj:'97521225000125',kind:'AMORTIZACAO',exDate:'2026-09-15',paymentDate:'2026-09-25',
  amountPerUnit:.50,sourceUrl:'https://example.org/doc/2',verificationStatus:'document-linked-unverified-content'},
 {ticker:'MXRF11',cnpj:'00000000000000',kind:'RENDIMENTO',exDate:'2026-10-15',paymentDate:'2026-10-25',
  amountPerUnit:100,sourceUrl:'https://example.org/doc/3',verificationStatus:'document-linked-unverified-content'},
 {ticker:'MXRF11',cnpj:'97521225000125',kind:'RENDIMENTO',exDate:'2026-08-15',paymentDate:'2026-08-25',
  amountPerUnit:50,sourceUrl:'https://example.org/doc/4',verificationStatus:'confirmed'}]};
const rows=D.filter(payload,'MXRF11','97521225000125');
assert.equal(rows.length,2);
assert.equal(rows[0].kind,'RENDIMENTO');
assert.equal(rows[1].kind,'AMORTIZACAO');
assert.equal(D.filter({...payload,rightsConfirmed:false},'MXRF11','97521225000125').length,0);
assert.equal(D.filter(payload,'MXRF11','11111111111111').length,0);
const portal=fs.readFileSync('public/platform/portal.js','utf8');
assert.match(portal,/DividendFiiDistributions\?\.render/);
for(const root of ['public','docs']){
 for(const ticker of ['MXRF11','HGLG11','BBAS3','PETR4','TAEE11']){
  const html=fs.readFileSync(root+'/ativos/'+ticker+'/index.html','utf8');
  assert.match(html,/fiiDistributions\.js/);
 }
 const html=fs.readFileSync(root+'/ativos/index.html','utf8');
 assert.match(html,/fiiDistributions\.js/);
}
console.log('OK: historico documental separado e exibicao por CNPJ');
