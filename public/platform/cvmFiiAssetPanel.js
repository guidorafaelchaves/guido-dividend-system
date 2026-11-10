(function(global,document){
 'use strict';
 function text(tag,content){const node=document.createElement(tag);node.textContent=String(content);return node;}
 function money(n){return Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
 async function showB3Evidence(root,ticker){
   const section=document.createElement('section');
   section.className='panel reveal';
   section.id='b3InstrumentEvidence';
   section.style.marginTop='18px';
   section.appendChild(text('h2','Situação cadastral B3 — evidência'));
   const status=text('p','Sem confirmação B3: aguardando arquivo de instrumentos autorizado.');
   section.appendChild(status);
   root.appendChild(section);
   try{
     const universeResponse=await fetch('/data/fii-universe.json',{cache:'no-store'});
     if(!universeResponse.ok)return;
     const universe=await universeResponse.json();
     if(universe.dataType!=='fii-ticker-cnpj-catalog'||!Array.isArray(universe.records))return;
     const asset=universe.records.find(r=>r.ticker===ticker);
     if(!asset){status.textContent='Ticker não encontrado no universo cadastral atual; situação B3 não verificada.';return;}
     section.appendChild(text('p','Identificação cadastral: '+(asset.name||ticker)+' · CNPJ '+asset.cnpj+' · '+(asset.assetClass==='FIAGRO'?'FIAGRO':'FII candidato')+' (Lummios, CC BY 4.0).'));
     if(!global.DividendB3Evidence)return;
     const response=await fetch('/data/fii-b3-reconciliation.json',{cache:'no-store'});
     if(!response.ok)return;
     const payload=await response.json();
     const result=global.DividendB3Evidence.find(payload,ticker,asset.cnpj);
     status.textContent=global.DividendB3Evidence.label(result.status)+'.';
     if(result.meta.valid){
       section.appendChild(text('small','Fonte do snapshot: '+result.meta.sourceName+' · referência '+result.meta.date+
         ' · idade '+result.meta.ageDays+' dias'+(result.meta.stale?' · evidência vencida':'')+
         '. Cadastro não comprova transações, volume ou liquidez.'));
     }
     if(result.isin)section.appendChild(text('p','ISIN informado no snapshot autorizado: '+result.isin));
   }catch(_){status.textContent='Evidência B3 não disponível ou inválida; nenhuma situação foi presumida.';}
 }
 async function render(){
   const match=location.pathname.match(/\/ativos\/([A-Za-z0-9]{4,12})\/?(?:index\.html)?$/i);
   const queryTicker=new URLSearchParams(location.search).get('ticker');
   const ticker=String(queryTicker||match?.[1]||'').trim().toUpperCase();
   if(!/^[A-Z0-9]{4,12}$/.test(ticker))return;
   const root=document.getElementById('portalMain');
   if(!root)return;
   const panel=document.createElement('section');
   panel.className='panel reveal';
   panel.id='cvmFiiPanel';
   panel.style.marginTop='18px';
   panel.appendChild(text('h2','Dados contábeis CVM — FII'));
   panel.appendChild(text('p','Consultando correspondência entre ticker e CNPJ...'));
   root.appendChild(panel);
   void showB3Evidence(root,ticker);
   try{
     const response=await fetch('/data/cvm-fii-by-ticker.json',{cache:'no-cache'});
     if(!response.ok)throw Error('Arquivo de vínculos ainda não publicado');
     const data=await response.json();
     if(data.schemaVersion!==1||data.dataType!=='monthly-fii-accounting-by-ticker'||!Array.isArray(data.records))throw Error('Esquema de dados inválido');
     const row=data.records.find(x=>x.ticker===ticker);
     panel.replaceChildren(text('h2','Dados contábeis CVM — FII'));
     if(!row){
       panel.appendChild(text('p','Sem correspondência ticker/CNPJ validada para este ativo. Nenhum indicador será presumido.'));
       return;
     }
     const d=new Date(row.referenceDate+'T12:00:00Z');
     const date=Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR',{timeZone:'UTC'}):row.referenceDate;
     panel.appendChild(text('p','CNPJ: '+row.cnpj+' · Competência: '+date));
     if(Number.isFinite(row.netAssets)&&row.netAssets>=0)panel.appendChild(text('p','Patrimônio líquido informado: '+money(row.netAssets)));
     if(Number.isFinite(row.holders)&&row.holders>=0)panel.appendChild(text('p','Cotistas informados: '+Math.round(row.holders).toLocaleString('pt-BR')));
     if(row.navValidated===true && Number.isFinite(row.navCalculated) && row.navCalculated>0){
       panel.appendChild(text('p','Valor patrimonial por cota conciliado: '+money(row.navCalculated)));
     } else {
       panel.appendChild(text('p','Valor patrimonial por cota: aguardando conciliação oficial dos campos.'));
     }
     const pvpOutput=text('p','P/VP: verificando fechamento de mercado...');
     panel.appendChild(pvpOutput);
     async function updatePvp(){
       if(row.navValidated!==true || !Number.isFinite(row.navCalculated) || row.navCalculated<=0){
         pvpOutput.textContent='P/VP indisponível: valor patrimonial por cota ainda não validado.';
         return;
       }
       try {
         const quote=await global.DividendMarketGateway?.fetchQuote?.(ticker);
         const result=global.DividendFiiPvp?.calculate?.(row,quote);
         if(result?.ok){
           pvpOutput.textContent='P/VP indicativo: '+result.pvp.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:3})+
             '× · fechamento '+result.quoteDate+' ('+result.priceSource+') · VPA CVM '+result.referenceDate+
             '. Competência não é data de divulgação; indicador não é retrospectivo.';
         } else {
           pvpOutput.textContent='P/VP indisponível: '+(result?.reason||'fonte de fechamento não verificada.');
         }
       } catch {
         pvpOutput.textContent='P/VP indisponível: falta fechamento B3 oficial ou licenciado para este ticker.';
       }
     }
     await updatePvp();
     if(row.navValidated===true && Number.isFinite(row.navCalculated) && row.navCalculated>0){
       const wrap=document.createElement('div');
       const input=document.createElement('input');
       input.type='file';input.accept='.txt,.TXT';input.id='fiiCotahistFile';
       input.setAttribute('aria-label','Selecionar arquivo oficial COTAHIST TXT da B3');
       const uploadHint=text('small','Importar COTAHIST TXT obtido diretamente da B3. O sistema verifica o formato, mas não autentica a origem do arquivo; processamento apenas neste navegador.');
       const importStatus=text('p','');
       importStatus.setAttribute('role','status');
       wrap.appendChild(uploadHint);
       wrap.appendChild(input);
       wrap.appendChild(importStatus);
       panel.appendChild(wrap);
       input.addEventListener('change',async()=>{
         const file=input.files?.[0];
         if(!file)return;
         input.disabled=true;
         importStatus.textContent='Validando arquivo oficial COTAHIST e procurando '+ticker+'...';
         try{
           if(file.size>90*1024*1024)throw Error('Arquivo maior que 90 MB. Escolha o COTAHIST TXT descompactado do pregão.');
           if(!global.DividendMarketHub?.parseCotahist||!global.DividendMarketHub?.saveCandidates)
             throw Error('Importador local B3 indisponível.');
           const raw=await file.text();
           const parsed=global.DividendMarketHub.parseCotahist(raw,new Set([ticker]));
           const observations=parsed.observations||[];
           if(!observations.length)throw Error('Nenhum fechamento à vista (mercado 010) encontrado para '+ticker+'.');
           if(observations.some(x=>x.ticker!==ticker||x.source!=='b3-official-file'))
             throw Error('Origem ou ticker incompatível.');
           const old=global.DividendMarketHub.getCandidates();
           global.DividendMarketHub.saveCandidates([...old,...observations]);
           importStatus.textContent='Arquivo processado: '+observations.length+' observações no formato COTAHIST para '+ticker+'.';
           await updatePvp();
         }catch(error){
           importStatus.textContent='Importação não concluída: '+String(error?.message||error);
         }finally{input.value='';input.disabled=false;}
       });
     }

     panel.appendChild(text('small','Fonte contábil: CVM (informe mensal). Identificação ticker/CNPJ: Lummios, CC BY 4.0. Dados não são cotações nem dividendos. P/VP indisponível até fechamento de mercado autorizado, classe confirmada e cronologia da divulgação validada.'));
     const link=document.createElement('a');link.href='https://developers.lummios.com.br/dados-abertos.html';link.textContent='Fonte e licença dos identificadores';link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:block;margin-top:8px';panel.appendChild(link);
   }catch(err){
     panel.replaceChildren(text('h2','Dados contábeis CVM — FII'),text('p','Dados contábeis por ticker ainda indisponíveis. Não alteramos os indicadores existentes.'));
   }
 }
 document.addEventListener('DOMContentLoaded',()=>{render();});
})(window,document);
