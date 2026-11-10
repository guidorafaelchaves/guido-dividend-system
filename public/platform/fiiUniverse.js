(function(){
  'use strict';
  async function showUniverse(){
    const main=document.querySelector('.asset-discovery-page');
    if(!main) return;
    const section=document.createElement('section');
    section.className='panel reveal';
    section.innerHTML='<span class="eyebrow">Cobertura de FIIs</span><h2>Universo cadastral de FIIs</h2><p class="muted">Identificacoes ticker/CNPJ do cadastro aberto Lummios (CC BY 4.0). Nao equivale a lista oficial de negociacao ativa na B3; valores, cotacoes e proventos nao foram inferidos.</p><input id="fiiUniverseSearch" type="search" placeholder="Filtrar por ticker ou CNPJ" aria-label="Filtrar FIIs"><p id="fiiUniverseCount" class="muted">Consultando catalogo...</p><div class="table-wrap"><table><thead><tr><th>Ticker</th><th>CNPJ</th><th>Origem</th></tr></thead><tbody id="fiiUniverseRows"></tbody></table></div>';
    main.appendChild(section);
    try{
      const response=await fetch('/data/fii-universe.json',{cache:'no-store'});
      if(!response.ok) throw new Error('Catalogo indisponivel');
      const payload=await response.json();
      if(payload.dataType!=='fii-ticker-cnpj-catalog'||!Array.isArray(payload.records)) throw new Error('Formato invalido');
      const records=payload.records.filter(r=>/^[A-Z]{4}11$/.test(r.ticker)&&/^\d{14}$/.test(r.cnpj));
      const input=section.querySelector('#fiiUniverseSearch');
      const body=section.querySelector('#fiiUniverseRows');
      const count=section.querySelector('#fiiUniverseCount');
      function render(){
        const q=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
        const found=records.filter(r=>(r.ticker+r.cnpj).includes(q));
        count.textContent=found.length+' identificacoes encontradas de '+records.length+'. Exibindo ate 100 por vez. Fonte: Lummios (CC BY 4.0).';
        body.innerHTML=found.slice(0,100).map(r=>'<tr><td><strong>'+r.ticker+'</strong></td><td>'+r.cnpj+'</td><td>Cadastro terceiro; B3 nao validada</td></tr>').join('');
      }
      input.addEventListener('input',render);
      render();
    }catch(err){
      section.querySelector('#fiiUniverseCount').textContent='Catalogo indisponivel no momento; os dados anteriores permanecem preservados.';
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',showUniverse);
  else showUniverse();
})();