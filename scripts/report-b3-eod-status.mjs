#!/usr/bin/env node
// Diagnóstico do feed B3 sem expor URL privada nem token.
import {readFile, mkdir, writeFile} from 'node:fs/promises';

const readJson=async (path)=>{
  try{return JSON.parse(await readFile(path,'utf8'))}catch{return null}
};
const source=await readJson('public/data/radar-eod.json');
const accounting=await readJson('public/data/cvm-fii-by-ticker.json');
const validQuotes=source?.schemaVersion===1&&source?.market==='B3'&&
  Number.isInteger(source.count)&&source.count>=10&&
  source.quotes?.length===source.count&&
  /^\d{4}-\d{2}-\d{2}$/.test(String(source.tradeDate||''));
const eligible=new Set((accounting?.records||[])
  .filter(x=>x.navValidated===true&&Number.isFinite(x.navCalculated)&&x.navCalculated>0)
  .map(x=>x.ticker));
let matched=0;
if(validQuotes){
  for(const q of source.quotes){
    if(eligible.has(q.ticker)&&Number.isFinite(q.close)&&q.close>0)matched++;
  }
}
const outcome=String(process.env.B3_STEP_OUTCOME||'skipped');
const enabled=process.env.B3_FEED_ENABLED==='true';
const report={
  schemaVersion:1,
  dataType:'b3-eod-feed-status',
  checkedAtUtc:new Date().toISOString(),
  githubRunId:process.env.B3_RUN_ID||null,
  feedConfiguredAndRightsConfirmed:enabled,
  feedStepOutcome:outcome,
  latestPublishedSnapshot:validQuotes?{
    tradeDate:source.tradeDate,
    source:source.source,
    quotes:source.count,
    fiiMatchedWithValidatedNav:matched,
    fiiWithValidatedNav:eligible.size,
    isNewFromThisRun:outcome==='success'
  }:null,
  status:outcome==='success'&&validQuotes?'published':
    !enabled?'awaiting-authorized-feed':
    outcome==='failure'?'provider-error':'not-published',
  note:'O snapshot antigo permanece datado; sem autorização de armazenamento, cálculo e exibição de dados B3 não há publicação.'
};
await mkdir('public/data',{recursive:true});
await writeFile('public/data/b3-eod-status.json',JSON.stringify(report,null,2)+'\n');
console.log('Radar B3:',report.status,'cobertura',matched,'/',eligible.size);
