(function(global){
  'use strict';
  // P/VP indicativo, NÃO retrospectivo: competência CVM não é data de divulgação.
  const MAX_QUOTE_AGE_DAYS=7;
  const ALLOWED_SOURCES=new Set(['published-d1','local-import']);
  function validDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function calculate(accounting,quote,now=new Date()){
    if(!accounting || !quote)return {ok:false,reason:'Sem dados contábeis ou fechamento disponível.'};
    if(accounting.navValidated!==true || !Number.isFinite(accounting.navCalculated) || accounting.navCalculated<=0)
      return {ok:false,reason:'VPA sem conciliação contábil válida.'};
    if(accounting.ticker!==quote.ticker)
      return {ok:false,reason:'Ticker incompatível entre fontes.'};
    if(!ALLOWED_SOURCES.has(quote.dataSource) ||
       (quote.dataSource==='local-import' && quote.source!=='b3-official-file'))
      return {ok:false,reason:'Fechamento não identificado como fonte oficial ou licenciada.'};
    if(!validDate(accounting.referenceDate)||!validDate(quote.quoteDate))
      return {ok:false,reason:'Datas inválidas.'};
    if(quote.quoteDate < accounting.referenceDate)
      return {ok:false,reason:'Fechamento anterior à competência contábil.'};
    const price=Number(quote.price);
    if(!Number.isFinite(price)||price<=0)
      return {ok:false,reason:'Preço de fechamento inválido.'};
    const today=new Intl.DateTimeFormat('en-CA',{
      timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'
    }).format(now);
    const age=(Date.parse(today+'T12:00:00Z')-Date.parse(quote.quoteDate+'T12:00:00Z'))/86400000;
    if(age<1 || age>MAX_QUOTE_AGE_DAYS)
      return {ok:false,reason:'Fechamento não é D-1 elegível ou está defasado (mais de 7 dias).'};
    const pvp=price/accounting.navCalculated;
    if(!Number.isFinite(pvp)||pvp<=0 || pvp>1000)
      return {ok:false,reason:'P/VP fora de limites de consistência.'};
    return {ok:true,pvp,price,nav:accounting.navCalculated,quoteDate:quote.quoteDate,
      referenceDate:accounting.referenceDate,priceSource:quote.source,
      disclosure:'P/VP indicativo: preço de fechamento / VPA CVM. Competência não equivale à data de divulgação. Não é série histórica ajustada.'};
  }
  global.DividendFiiPvp=Object.freeze({calculate,validDate,MAX_QUOTE_AGE_DAYS});
})(typeof window!=='undefined'?window:globalThis);
