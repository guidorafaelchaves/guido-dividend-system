import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const cvmScript=pathToFileURL(resolve('scripts/refresh-cvm-catalog.mjs')).href;
const b3Script=pathToFileURL(resolve('scripts/refresh-radar-eod.mjs')).href;

async function inIsolatedDirectory(fn){
  const cwd=process.cwd();
  const directory=await mkdtemp(join(tmpdir(),'radar-eod-test-'));
  try{process.chdir(directory);return await fn(directory);}
  finally{process.chdir(cwd);await rm(directory,{recursive:true,force:true});}
}

test('CVM: publica somente metadados de recursos oficiais HTTPS',async()=>{
  await inIsolatedDirectory(async(dir)=>{
    const fetchBefore=globalThis.fetch;
    try {
      globalThis.fetch=async(url)=>{
        const slug=new URL(url).searchParams.get('id');
        return new Response(JSON.stringify({success:true,result:{
          name:slug,title:'Dataset '+slug,license_id:'odc-odbl',
          metadata_modified:'2026-11-02T11:00:00',
          resources:[
            {name:'Dado',format:'CSV',url:'https://dados.cvm.gov.br/dados/exemplo.csv'},
            {name:'Terceiro',format:'CSV',url:'https://outro.example/data.csv'}
          ]
        }}),{status:200,headers:{'content-type':'application/json'}});
      };
      await import(cvmScript+'?case=valid');
      const catalog=JSON.parse(await readFile(join(dir,'public/data/cvm-catalog.json'),'utf8'));
      assert.equal(catalog.datasets.length,4);
      for(const set of catalog.datasets){
        assert.equal(set.resources.length,1);
        assert.ok(set.resources[0].url.startsWith('https://dados.cvm.gov.br/'));
      }
      assert.equal(catalog.dataType,'official-dataset-catalog');
      assert.equal(catalog.datasets[0].license,'odc-odbl');
    } finally{globalThis.fetch=fetchBefore;}
  });
});

test('B3: rejeita pregão atual mesmo que o fornecedor responda com sucesso',async()=>{
  await inIsolatedDirectory(async()=>{
    const priorFetch=globalThis.fetch;
    const priorUrl=process.env.RADAR_EOD_FEED_URL;
    const priorPermission=process.env.RADAR_EOD_PUBLICATION_ALLOWED;
    try {
      process.env.RADAR_EOD_FEED_URL='https://feeds.example/closing';
      process.env.RADAR_EOD_PUBLICATION_ALLOWED='true';
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      globalThis.fetch=async()=>new Response(JSON.stringify({
        source:'Fornecedor fictício',tradeDate:today,
        quotes:Array.from({length:10},(_,i)=>({ticker:'TEST'+String(i),close:10+i}))
      }),{status:200});
      await assert.rejects(()=>import(b3Script+'?case=today'),/pregão anterior/);
    } finally{
      globalThis.fetch=priorFetch;
      if(priorUrl===undefined)delete process.env.RADAR_EOD_FEED_URL;else process.env.RADAR_EOD_FEED_URL=priorUrl;
      if(priorPermission===undefined)delete process.env.RADAR_EOD_PUBLICATION_ALLOWED;else process.env.RADAR_EOD_PUBLICATION_ALLOWED=priorPermission;
    }
  });
});
