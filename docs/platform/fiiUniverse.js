(function(){
  'use strict';
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const statuses={
    'observed-active':'Consta ativo no snapshot',
    'observed-inactive':'Consta inativo no snapshot',
    'ambiguous':'Registros conflitantes',
    'class-conflict':'Classe divergente',
    'unverified':'Sem confirmação B3'
  };
  async function showUniverse(){
    const main=document.querySelector('.asset-discovery-page');
    if(!main || document.getElementById('fiiUniverseCatalogue')) return;
    const section=document.createElement('section');
    section.className='panel reveal';
    section.id='fiiUniverseCatalogue';
    section.innerHTML=`<span class="eyebrow">Cobertura cadastral</span>
      <h2>FIIs e FIAGROs</h2>
      <p class="muted">Ticker, nome, CNPJ e setor: Lummios (CC BY 4.0). Os FIIs são candidatos até conciliação com arquivo B3 autorizado. FIAGROs são separados. Nenhum preço, DY ou dividendo é inferido.</p>
      <select id="fiiUniverseClass" aria-label="Tipo de fundo"><option value="FII_CANDIDATE">FIIs candidatos</option><option value="FIAGRO">FIAGROs</option><option value="all">Todos os fundos</option></select>
      <input id="fiiUniverseSearch" type="search" placeholder="Buscar ticker, nome, setor ou CNPJ" aria-label="Buscar fundos">
      <p id="fiiUniverseCount" class="muted">Consultando catálogo...</p>
      <p id="fiiB3Status" class="muted">Negociação B3 não verificada: aguardando arquivo autorizado.</p>
      <div class="table-wrap"><table><thead><tr><th>Ticker</th><th>Tipo</th><th>Nome / setor</th><th>CNPJ</th><th>Evidência B3</th></tr></thead><tbody id="fiiUniverseRows"></tbody></table></div>`;
    main.appendChild(section);
    try {
      const response=await fetch('/guido-dividend-system/data/fii-universe.json',{cache:'no-store'});
      if(!response.ok) throw new Error('Catálogo indisponível');
      const payload=await response.json();
      if(payload.dataType!=='fii-ticker-cnpj-catalog'||!Array.isArray(payload.records)) throw new Error('Formato inválido');
      const records=payload.records.filter(r=>/^[A-Z]{4}11$/.test(r.ticker)&&/^\d{14}$/.test(r.cnpj));
      let evidence=null;
      let snapshotDate='';
      try {
        const b3Response=await fetch('/guido-dividend-system/data/fii-b3-reconciliation.json',{cache:'no-store'});
        if(b3Response.ok){
          const data=await b3Response.json();
          if(globalThis.DividendB3Evidence?.evaluate(data).valid){
            const accepted=Object.keys(statuses);
            evidence=new Map(data.records.filter(r=>accepted.includes(r.verificationStatus)).map(r=>[r.ticker,r]));
            snapshotDate=data.snapshotDate;
            const info=window.DividendB3Evidence.evaluate(data);
            section.querySelector('#fiiB3Status').textContent='Snapshot B3: '+data.snapshotDate+' | '+data.sourceName+' | '+info.ageDays+' dias'+(info.stale?' (DESATUALIZADO)':'')+'. Cadastro não comprova negociações realizadas.';
          }
        }
      } catch (_) { /* Fonte opcional: nao confirmar nada sem dados. */ }
      const search=section.querySelector('#fiiUniverseSearch');
      const filter=section.querySelector('#fiiUniverseClass');
      const count=section.querySelector('#fiiUniverseCount');
      const body=section.querySelector('#fiiUniverseRows');
      function render(){
        const q=search.value.trim().toUpperCase();
        const filtered=records.filter(r=>{
          const cls=r.assetClass||(/fiagro/i.test(r.name||'')?'FIAGRO':'FII_CANDIDATE');
          const hay=[r.ticker,r.cnpj,r.name||'',r.sector||''].join(' ').toUpperCase();
          return (filter.value==='all'||filter.value===cls)&&hay.includes(q);
        });
        count.textContent=filtered.length+' resultados (universo: '+records.length+', incluindo FIAGROs). Exibindo 100 por vez.';
        body.innerHTML=filtered.slice(0,100).map(r=>{
          const cls=r.assetClass==='FIAGRO'||/fiagro/i.test(r.name||'')?'FIAGRO':'FII candidato';
          const row=evidence?.get(r.ticker);
          const status=window.DividendB3Evidence?.find({schemaVersion:1,dataType:'fii-b3-reconciliation',rightsConfirmed:true,snapshotDate:snapshotDate,records:row?[row]:[]},r.ticker,r.cnpj)?.status||'unverified';
          return '<tr><td><strong>'+escapeHtml(r.ticker)+'</strong></td><td>'+escapeHtml(cls)+'</td><td>'+escapeHtml(r.name||'Nome indisponível')+' <small class="muted">'+escapeHtml(r.sector||'')+'</small></td><td>'+escapeHtml(r.cnpj)+'</td><td>'+escapeHtml(statuses[status]||statuses.unverified)+'</td></tr>';
        }).join('');
      }
      search.addEventListener('input',render);
      filter.addEventListener('change',render);
      render();
    }catch(_){
      section.querySelector('#fiiUniverseCount').textContent='Catálogo indisponível; nenhum dado fictício foi apresentado.';
    }
  }
  window.DividendFiiUniverse=Object.freeze({show:showUniverse});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',showUniverse);
  else showUniverse();
})();
