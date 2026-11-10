(function(global,document){
  'use strict';
  const money=value=>Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:8});
  const displayDate=value=>{
    const parts=String(value||'').split('-');
    return parts.length===3?parts.reverse().join('/'):'-';
  };
  const make=(tag,txt)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=String(txt);return el;};
  function filter(payload,ticker,cnpj){
    if(!payload||payload.schemaVersion!==1||payload.dataType!=='fii-document-linked-distributions'||
       payload.rightsConfirmed!==true||!Array.isArray(payload.records))return [];
    const filtered=payload.records.filter(r=>{
      const amount=Number(r.amountPerUnit);
      return r.ticker===ticker && r.cnpj===cnpj &&
        (r.kind==='RENDIMENTO'||r.kind==='AMORTIZACAO') &&
        r.verificationStatus==='document-linked-unverified-content' &&
        Number.isFinite(amount)&&amount>0&&
        /^\d{4}-\d{2}-\d{2}$/.test(r.exDate||'')&&
        /^\d{4}-\d{2}-\d{2}$/.test(r.paymentDate||'')&&
        typeof r.sourceUrl==='string'&&/^https:\/\//i.test(r.sourceUrl);
    });
    return filtered.sort((a,b)=>b.exDate.localeCompare(a.exDate)||b.paymentDate.localeCompare(a.paymentDate));
  }
  async function render(){
    const query=new URLSearchParams(location.search).get('ticker');
    const match=location.pathname.match(/\/ativos\/([A-Za-z0-9]{4,12})\/?(?:index\.html)?$/i);
    const ticker=String(query||match?.[1]||'').trim().toUpperCase();
    if(!/^[A-Z]{4}11$/.test(ticker))return;
    const root=document.getElementById('portalMain');
    if(!root||document.getElementById('fiiDistributionHistoryPanel'))return;
    const section=make('section');
    section.className='panel reveal';
    section.id='fiiDistributionHistoryPanel';
    section.style.marginTop='18px';
    section.appendChild(make('h2','Histórico documental de proventos'));
    const status=make('p','Consultando histórico com referência documental...');
    section.appendChild(status);
    root.appendChild(section);
    try{
      const asset=global.DividendFiiCatalog?.all().find(r=>r.ticker===ticker);
      if(!asset?.cnpj){status.textContent='Ativo sem vínculo cadastral ticker/CNPJ validado para essa consulta.';return;}
      const response=await fetch('/guido-dividend-system/data/fii-distributions.json',{cache:'no-store'});
      if(!response.ok){status.textContent='Ainda não existe histórico documental autorizado publicado para este fundo.';return;}
      const payload=await response.json();
      const records=filter(payload,ticker,asset.cnpj);
      if(!records.length){status.textContent='Sem distribuições documentadas importadas para este fundo. Isso não significa ausência de pagamentos.';return;}
      status.textContent=records.length+' registros com referência documental, sujeitos à verificação do conteúdo original. Fonte do arquivo: '+String(payload.sourceName||'não identificada')+'. Não são confirmação de pagamento liquidado nem base automática de DY.';
      const wrap=make('div');wrap.className='table-wrap';
      const table=make('table');
      const head=make('thead');
      const hrow=make('tr');
      ['Espécie','Data-com','Pagamento informado','Por cota','Documento'].forEach(h=>hrow.appendChild(make('th',h)));
      head.appendChild(hrow);table.appendChild(head);
      const body=make('tbody');
      for(const record of records.slice(0,100)){
        const tr=make('tr');
        [record.kind==='AMORTIZACAO'?'Amortização':'Rendimento',
         displayDate(record.exDate),displayDate(record.paymentDate),
         money(record.amountPerUnit)].forEach(v=>tr.appendChild(make('td',v)));
        const td=make('td');
        const link=make('a','Consultar fonte');
        link.href=record.sourceUrl;
        link.target='_blank';
        link.rel='noopener noreferrer';
        td.appendChild(link);
        tr.appendChild(td);body.appendChild(tr);
      }
      table.appendChild(body);wrap.appendChild(table);section.appendChild(wrap);
      section.appendChild(make('small','Apenas registros documentais importados e identificados por CNPJ. Amortizações são devoluções de capital e não são somadas como rendimentos. O documento vinculado precisa ser conferido antes de considerar um provento confirmado.'));
    }catch(_){
      status.textContent='Histórico documental indisponível; nenhum rendimento foi estimado.';
    }
  }
  global.DividendFiiDistributions=Object.freeze({filter,render});
})(window,document);
