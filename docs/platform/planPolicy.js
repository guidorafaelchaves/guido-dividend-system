(function(global){
  'use strict';

  const PLAN_LIMITS = Object.freeze({
    public: { watchlistAssets:0, portfolios:0, alerts:0, historicalMonths:0, advancedReports:false, aiAnalysis:false },
    free: { watchlistAssets:20, portfolios:1, alerts:5, historicalMonths:12, advancedReports:false, aiAnalysis:false },
    dividend_system: { watchlistAssets:200, portfolios:5, alerts:50, historicalMonths:120, advancedReports:true, aiAnalysis:true },
    family_office: { watchlistAssets:1000, portfolios:25, alerts:250, historicalMonths:240, advancedReports:true, aiAnalysis:true }
  });

  function limitsFor(planId){
    return PLAN_LIMITS[planId] || PLAN_LIMITS.free;
  }

  function canUse(planId, feature, currentCount){
    const limits = limitsFor(planId);
    const value = limits[feature];
    if(typeof value === 'boolean') return value;
    if(typeof value === 'number') return Number(currentCount || 0) < value;
    return false;
  }

  global.DividendPlanPolicy = Object.freeze({ PLAN_LIMITS, limitsFor, canUse });
})(window);
