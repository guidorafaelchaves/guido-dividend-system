#!/usr/bin/env node
// Descoberta diária de conjuntos de dados oficiais da CVM.
// Publica somente metadados verificados; não confunde arquivos de informes com proventos ou cotações.
import {mkdir, writeFile} from 'node:fs/promises';

const DATASETS = ['fii-doc-inf_mensal','cia_aberta-cad','cia_aberta-doc-dfp','cia_aberta-doc-itr'];
const result = [];
for (const slug of DATASETS) {
  const url = 'https://dados.cvm.gov.br/api/3/action/package_show?id=' + encodeURIComponent(slug);
  let payload;
  for (let attempt=0;attempt<3;attempt++) {
    try {
      const response = await fetch(url,{headers:{accept:'application/json','user-agent':'GuidoDividendSystem/1.0 (public data metadata)'},signal:AbortSignal.timeout(25000)});
      if (!response.ok) throw new Error('HTTP '+response.status);
      payload = await response.json();
      if (!payload?.success || payload?.result?.name !== slug) throw new Error('Resposta CVM inválida: '+slug);
      break;
    } catch(err) {
      if (attempt===2) throw new Error('Falha na CVM '+slug+': '+err.message);
      await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));
    }
  }
  const item = payload.result;
  const resources = (item.resources||[]).filter(r=>/^https:\/\/dados\.cvm\.gov\.br\//i.test(r.url||''))
    .map(r=>({name:String(r.name||''),format:String(r.format||''),url:r.url,lastModified:r.last_modified||null}))
    .sort((a,b)=>a.url.localeCompare(b.url));
  if (!resources.length) throw new Error('Conjunto sem arquivos oficiais: '+slug);
  result.push({id:slug,title:String(item.title||slug),metadataUpdated:item.metadata_modified||null,license:item.license_id||null,
    datasetUrl:'https://dados.cvm.gov.br/dataset/'+slug,resources});
}
await mkdir('public/data',{recursive:true});
const snapshot = {schemaVersion:1,source:'CVM - Portal de Dados Abertos',dataType:'official-dataset-catalog',datasets:result};
await writeFile('public/data/cvm-catalog.json',JSON.stringify(snapshot,null,2)+'\n');
console.log('Catálogo CVM validado:',result.length,'conjuntos; sem simular preços ou dividendos.');
