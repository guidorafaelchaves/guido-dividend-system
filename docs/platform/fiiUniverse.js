(function(){
  'use strict';
  async function showUniverse(){
    const main=document.querySelector('.asset-discovery-page');
    if(!main) return;
    const section=document.createElement('section');
    section.className='panel reveal';
    section.innerHTML='<span class="eyebrow">Cobertura de FIIs</span><h2>Fundos imobiliarios e FIAGROs</h2><p class="muted">Identificacoes ticker/CNPJ do cadastro aberto Lummios (CC BY 4.0). FIAGROs sao separados de candidatos a FII; a listagem ativa na B3 ainda nao foi confirmada. Sem cotacoes ou proventos inferidos.</p><select id="fiiUniverseClass" aria-label="Tipo de fundo"><option value="FII_CANDIDATE">FIIs candidatos</option><option value="FIAGRO">FIAGROs</option><option value="all">Todos os fundos</option></select><input id="fiiUniverseSearch" type="search" placeholder="Filtrar por ticker ou CNPJ" aria-label="Filtrar FIIs"><p id="fiiUniverseCount" class="muted">Consultando catalogo...</p><div class="table-wrap"><table><thead><tr><th>Ticker</th><th>Tipo</th><th>Fundo / setor</th><th>CNPJ</th></tr></thead><tbody id="fiiUniverseRows"></tbody></table></div>';
    main.appendChild(section);
    try{
      const response=await fetch('/data/fii-universe.json',{cache:'no-store'});
      if(!response.ok) throw new Error('Catalogo indisponivel');
      const payload=await response.json();
      if(payload.dataType!=='fii-ticker-cnpj-catalog'||!Array.isArray(payload.records)) throw new Error('Formato invalido');
      const records=payload.records.filter(r=>/^[A-Z]{4}11$/.test(r.ticker)&&/^\d{14}$/.test(r.cnpj));
      const input=section.querySelector('#fiiUniverseSearch');
      const body=section.querySelector('#fiiUniverseRows');
      const classFilter=section.querySelector('#fiiUniverseClass');
      const count=section.querySelector('#fiiUniverseCount');
      function render(){
        const q=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
        const found=records.filter(r=>{
          const assetClass=r.assetClass || (/fiagro/i.test(r.name||'')?'FIAGRO':'FII_CANDIDATE');
          return (classFilter.value==='all'||classFilter.value===assetClass) &&
            (r.ticker+r.cnpj+(r.name||'').toUpperCase()+(r.sector||'').toUpperCase()).includes(q);
        });
        count.textContent=found.length+' identificacoes encontradas de '+records.length+' no total (inclui FIAGRO). Exibindo ate 100 por vez. Fonte: Lummios (CC BY 4.0).';
        const safe=v=>String(v||'').replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
        body.innerHTML=found.slice(0,100).map(r=>'<tr><td><strong>'+safe(r.ticker)+'</strong></td><td>'+safe(r.assetClass==='FIAGRO'||/fiagro/i.test(r.name||'')?'FIAGRO':'FII candidato')+'</td><td>'+safe(r.name||'Nome indisponivel')+'<small class="muted"> '+safe(r.sector||'')+'</small></td><td>'+safe(r.cnpj)+'</td></tr>').join('');
      }
      input.addEventListener('input',render);
      classFilter.addEventListener('change',render);
      render();
    }catch(err){
      section.querySelector('#fiiUniverseCount').textContent='Catalogo indisponivel no momento; os dados anteriores permanecem preservados.';
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',showUniverse);
  else showUniverse();
})();