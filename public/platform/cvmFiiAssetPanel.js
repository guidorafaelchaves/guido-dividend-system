(function(global,document){
 'use strict';
 function text(tag,content){const node=document.createElement(tag);node.textContent=String(content);return node;}
 function money(n){return Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
 async function render(){
   const match=location.pathname.match(/\/ativos\/([A-Za-z0-9]{4,12})\/?(?:index\.html)?$/i);
   if(!match)return;
   const ticker=match[1].toUpperCase();
   const root=document.getElementById('portalMain');
   if(!root)return;
   const panel=document.createElement('section');
   panel.className='panel reveal';
   panel.id='cvmFiiPanel';
   panel.style.marginTop='18px';
   panel.appendChild(text('h2','Dados contábeis CVM — FII'));
   panel.appendChild(text('p','Consultando correspondência entre ticker e CNPJ...'));
   root.appendChild(panel);
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
     // Quantidade de cotas pode representar a classe, não o fundo inteiro: não derivar P/VP.
     panel.appendChild(text('small','Fonte contábil: CVM (informe mensal). Identificação ticker/CNPJ: Lummios, CC BY 4.0. Dados não são cotações nem dividendos. P/VP indisponível até fechamento de mercado autorizado, classe confirmada e cronologia da divulgação validada.'));
     const link=document.createElement('a');link.href='https://developers.lummios.com.br/dados-abertos.html';link.textContent='Fonte e licença dos identificadores';link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:block;margin-top:8px';panel.appendChild(link);
   }catch(err){
     panel.replaceChildren(text('h2','Dados contábeis CVM — FII'),text('p','Dados contábeis por ticker ainda indisponíveis. Não alteramos os indicadores existentes.'));
   }
 }
 document.addEventListener('DOMContentLoaded',()=>{render();});
})(window,document);
