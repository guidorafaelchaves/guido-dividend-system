(function(global){
  'use strict';

  function enabled(){
    return Boolean(global.RadarAuthService?.isEnabled?.() && global.RadarAuthService?.isSessionFresh?.());
  }

  async function fetchBrapiQuote(ticker, options={}){
    if(!enabled()) throw new Error('Gateway SaaS indisponível.');
    const params = new URLSearchParams({ ticker:String(ticker || '').toUpperCase() });
    if(options.range) params.set('range', options.range);
    if(options.interval) params.set('interval', options.interval);
    return global.RadarAuthService.gatewayFetch(`/api/brapi/quote?${params.toString()}`, { method:'GET' });
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
    fetchBrapiQuote,
    requestOpenAIAnalysis
  };
})(window);
