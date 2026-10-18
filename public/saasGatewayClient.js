(function(global){
  'use strict';

  function enabled(){
    return Boolean(global.RadarAuthService?.isEnabled?.() && global.RadarAuthService?.isSessionFresh?.());
  }

  async function fetchMarketQuote(ticker){
    const hub=global.DividendMarketHub;
    const tk=String(ticker||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    const rows=(hub?.getCandidates?.()||[]).filter(x=>x.ticker===tk)
      .sort((a,b)=>b.date.localeCompare(a.date));
    if(!rows.length)throw new Error('Sem fechamento importado para '+tk+'.');
    return {results:[{
      symbol:tk,regularMarketPrice:rows[0].price,
      regularMarketPreviousClose:rows[1]?.price||null,
      currency:'BRL',marketDate:rows[0].date,
      provider:rows[0].source
    }],realTime:false,source:'harmonized-local'};
  }

  async function requestOpenAIAnalysis(payload){
    if(!enabled()) throw new Error('Gateway SaaS indisponível.');
    return global.RadarAuthService.gatewayFetch('/api/openai/analysis', {
      method:'POST',
      body: JSON.stringify(payload || {})
    });
  }

  global.RadarSaasGateway = {
    enabled,
    fetchMarketQuote,
    requestOpenAIAnalysis
  };
})(window);
