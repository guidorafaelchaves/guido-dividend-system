(function(global){
  'use strict';

  const STATUS_WEIGHT = Object.freeze({
    confirmed: 1,
    provisioned: .78,
    estimated: .54,
    projected: .34,
    announced: .72,
    paid: 1,
    cancelled: 0
  });

  const STATUS_ORDER = ['confirmed','provisioned','estimated','projected','announced','paid','cancelled'];

  function finite(value){
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function round(value, digits = 2){
    const factor = 10 ** digits;
    return Math.round((finite(value) + Number.EPSILON) * factor) / factor;
  }

  function tickerOf(input){
    return String(input?.ticker || input?.assetId || '').trim().toUpperCase();
  }

  function priceFor(event, asset){
    return finite(event?.currentPrice || asset?.price || event?.price || 0);
  }

  function amountFor(event){
    return finite(event?.amountPerUnit ?? event?.amount ?? event?.valuePerUnit ?? 0);
  }

  function eventYieldPercent(amountPerUnit, currentPrice){
    if(amountPerUnit <= 0 || currentPrice <= 0) return null;
    return round((amountPerUnit / currentPrice) * 100, 4);
  }

  function yieldOnCostPercent(amountPerUnit, averagePrice){
    if(amountPerUnit <= 0 || finite(averagePrice) <= 0) return null;
    return round((amountPerUnit / finite(averagePrice)) * 100, 4);
  }

  function estimatedQuantity(capital, currentPrice, options = {}){
    if(finite(capital) <= 0 || finite(currentPrice) <= 0) return 0;
    const raw = finite(capital) / finite(currentPrice);
    return options.allowFractional === false ? Math.floor(raw) : round(raw, 4);
  }

  function estimatedIncome(quantity, amountPerUnit){
    if(finite(quantity) <= 0 || finite(amountPerUnit) <= 0) return 0;
    return round(finite(quantity) * finite(amountPerUnit), 2);
  }

  function capitalForEvent(event, visibleEvents, simulation){
    const capital = finite(simulation?.capital || 10000);
    if(simulation?.mode === 'distributed'){
      const tickers = [...new Set((visibleEvents || []).map(tickerOf).filter(Boolean))];
      return tickers.length ? capital / tickers.length : capital;
    }
    return capital;
  }

  function isExtraordinary(event){
    const recurrence = String(event?.recurrence || '').toLowerCase();
    const kind = String(event?.kind || event?.eventType || '').toLowerCase();
    return recurrence.includes('extra') || kind.includes('extra');
  }

  function regularityLabel(asset, event){
    if(isExtraordinary(event)) return 'extraordinario';
    const score = finite(asset?.recurrenceScore);
    if(score >= 82) return 'alta regularidade';
    if(score >= 64) return 'recorrencia moderada';
    if(score > 0) return 'irregular';
    return 'historico insuficiente';
  }

  function equivalentYieldPercent(eventYield, recurrence){
    if(eventYield === null) return null;
    const label = String(recurrence || '').toLowerCase();
    const multiplier = label.includes('mensal') ? 12 : label.includes('trimes') ? 4 : label.includes('semes') ? 2 : label.includes('extra') ? 1 : 1;
    return round(finite(eventYield) * multiplier, 4);
  }

  function opportunityScore(input){
    const eventYield = input?.eventYieldPercent === null ? 0 : finite(input?.eventYieldPercent);
    const confidence = finite(input?.confidenceWeight || STATUS_WEIGHT[input?.eventStatus] || .5);
    const days = Number.isFinite(input?.daysToPayment) ? input.daysToPayment : 60;
    const recurrence = String(input?.regularity || '').toLowerCase();
    const source = String(input?.sourceName || '').toLowerCase();
    const yieldScore = Math.min(28, eventYield * 18);
    const confidenceScore = confidence * 24;
    const timeScore = days < 0 ? 2 : days <= 7 ? 18 : days <= 30 ? 14 : days <= 90 ? 8 : 4;
    const recurrenceScore = recurrence.includes('alta') ? 16 : recurrence.includes('moderada') ? 11 : recurrence.includes('extra') ? 4 : recurrence.includes('irregular') ? 5 : 7;
    const sourceScore = source.includes('official') || source.includes('b3') || source.includes('curated') ? 10 : source.includes('demo') ? 7 : 5;
    const penalty = input?.isExtraordinary ? 6 : 0;
    return Math.max(0, Math.min(100, Math.round(yieldScore + confidenceScore + timeScore + recurrenceScore + sourceScore - penalty)));
  }

  function attractivenessLabel(score){
    if(score >= 82) return 'atencao alta';
    if(score >= 64) return 'boa janela';
    if(score >= 45) return 'monitorar';
    return 'baixo sinal';
  }

  function normalizeEventView(event, asset, visibleEvents, simulation = {}){
    const amountPerUnit = amountFor(event);
    const currentPrice = priceFor(event, asset);
    const simulatedCapital = capitalForEvent(event, visibleEvents, simulation);
    const quantity = estimatedQuantity(simulatedCapital, currentPrice, { allowFractional: simulation.allowFractional !== false });
    const income = estimatedIncome(quantity, amountPerUnit);
    const eventYield = eventYieldPercent(amountPerUnit, currentPrice);
    const status = String(event?.status || event?.eventStatus || 'estimated');
    const recurrence = event?.recurrence || (asset?.type === 'FII' ? 'mensal' : 'historica');
    const regularity = regularityLabel(asset, event);
    const daysToPayment = event?.paymentDate ? Math.round((new Date(`${event.paymentDate}T12:00:00`) - new Date()) / 86400000) : null;
    const base = {
      eventId: String(event?.id || `${tickerOf(event)}-${event?.paymentDate || ''}`),
      assetId: String(asset?.id || tickerOf(event)),
      ticker: tickerOf(event),
      assetName: String(asset?.name || tickerOf(event)),
      assetType: String(asset?.type || 'Ativo'),
      eventType: String(event?.kind || event?.eventType || 'provento'),
      eventStatus: status,
      confidence: status,
      confidenceWeight: STATUS_WEIGHT[status] ?? .5,
      amountPerUnit,
      currentPrice,
      eventYieldPercent: eventYield,
      simulatedCapital: round(simulatedCapital, 2),
      estimatedQuantity: quantity,
      estimatedIncome: income,
      recordDate: event?.recordDate || event?.record_date || '',
      exDate: event?.exDate || '',
      paymentDate: event?.paymentDate || '',
      recurrence,
      regularity,
      sourceName: event?.source || 'fonte nao informada',
      updatedAt: event?.updatedAt || asset?.updatedAt || '',
      daysToPayment,
      isExtraordinary: isExtraordinary(event)
    };
    base.equivalentYieldPercent = equivalentYieldPercent(base.eventYieldPercent, base.recurrence);
    base.opportunityScore = opportunityScore(base);
    base.attractiveness = attractivenessLabel(base.opportunityScore);
    return base;
  }

  function buildEventViews(events, assets, simulation = {}){
    const assetMap = new Map((assets || []).map(asset => [tickerOf(asset), asset]));
    const sorted = [...(events || [])].sort((a,b) => String(a.paymentDate || '').localeCompare(String(b.paymentDate || '')));
    return sorted.map(event => normalizeEventView(event, assetMap.get(tickerOf(event)), sorted, simulation));
  }

  function dayKey(value){
    return String(value || '').slice(0,10);
  }

  function summarizeDay(day, eventViews, capital){
    const rows = eventViews.filter(event => dayKey(event.paymentDate) === day);
    const estimatedIncomeTotal = round(rows.reduce((sum, event) => sum + finite(event.estimatedIncome), 0), 2);
    const averageYield = rows.length ? round(rows.reduce((sum, event) => sum + finite(event.eventYieldPercent), 0) / rows.filter(event => event.eventYieldPercent !== null).length, 4) : 0;
    const statusCounts = countByStatus(rows);
    const intensityScore = rows.length * 16 + Math.min(48, estimatedIncomeTotal / Math.max(1, finite(capital)) * 1000) + averageYield * 8;
    return {
      day,
      events: rows,
      eventCount: rows.length,
      estimatedIncomeTotal,
      averageYield: Number.isFinite(averageYield) ? averageYield : 0,
      statusCounts,
      dominantStatus: dominantStatus(statusCounts),
      intensity: intensityLevel(intensityScore)
    };
  }

  function countByStatus(rows){
    return rows.reduce((acc, event) => {
      acc[event.eventStatus] = (acc[event.eventStatus] || 0) + 1;
      return acc;
    }, {});
  }

  function dominantStatus(counts){
    return STATUS_ORDER.find(status => counts[status]) || 'estimated';
  }

  function intensityLevel(score){
    if(score >= 70) return 'exceptional';
    if(score >= 42) return 'high';
    if(score >= 18) return 'medium';
    if(score > 0) return 'low';
    return 'none';
  }

  function daysInMonth(year, monthIndex){
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function monthKeyFromEvents(events, fallbackDate = new Date()){
    const first = [...(events || [])].sort((a,b) => String(a.paymentDate || '').localeCompare(String(b.paymentDate || ''))).find(event => event.paymentDate);
    if(first?.paymentDate) return String(first.paymentDate).slice(0,7);
    return `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2,'0')}`;
  }

  function buildMonth(eventViews, options = {}){
    const month = options.month || monthKeyFromEvents(eventViews);
    const [year, monthNumber] = month.split('-').map(Number);
    const days = Array.from({ length: daysInMonth(year, monthNumber - 1) }, (_, index) => {
      const day = `${month}-${String(index + 1).padStart(2,'0')}`;
      return summarizeDay(day, eventViews, options.capital || 10000);
    });
    return { month, year, monthIndex: monthNumber - 1, days };
  }

  function summarizePeriod(eventViews, simulation = {}){
    const knownEvents = eventViews.filter(event => event.amountPerUnit > 0 && event.currentPrice > 0);
    const totalEstimatedIncome = round(eventViews.reduce((sum, event) => sum + finite(event.estimatedIncome), 0), 2);
    const averageYield = knownEvents.length ? round(knownEvents.reduce((sum, event) => sum + finite(event.eventYieldPercent), 0) / knownEvents.length, 4) : 0;
    const confirmed = eventViews.filter(event => event.eventStatus === 'confirmed').length;
    const estimated = eventViews.filter(event => ['estimated','projected'].includes(event.eventStatus)).length;
    return {
      eventCount: eventViews.length,
      assetCount: new Set(eventViews.map(event => event.ticker)).size,
      paymentDays: new Set(eventViews.map(event => dayKey(event.paymentDate)).filter(Boolean)).size,
      totalAmountPerUnitKnown: round(knownEvents.reduce((sum, event) => sum + event.amountPerUnit, 0), 4),
      averageEventYieldPercent: averageYield,
      simulatedCapital: finite(simulation.capital || 10000),
      totalEstimatedIncome,
      portfolioReturnPercent: finite(simulation.capital) > 0 && simulation.mode === 'distributed' ? round((totalEstimatedIncome / finite(simulation.capital)) * 100, 4) : null,
      confirmedPercent: eventViews.length ? round((confirmed / eventViews.length) * 100, 2) : 0,
      estimatedPercent: eventViews.length ? round((estimated / eventViews.length) * 100, 2) : 0,
      statusCounts: countByStatus(eventViews)
    };
  }

  function cumulativeIncome(eventViews){
    let confirmed = 0;
    let provisioned = 0;
    let estimated = 0;
    return [...eventViews].sort((a,b) => String(a.paymentDate).localeCompare(String(b.paymentDate))).map(event => {
      if(event.eventStatus === 'confirmed') confirmed += finite(event.estimatedIncome);
      else if(event.eventStatus === 'provisioned') provisioned += finite(event.estimatedIncome);
      else estimated += finite(event.estimatedIncome);
      return {
        date: event.paymentDate,
        ticker: event.ticker,
        confirmed: round(confirmed, 2),
        provisioned: round(provisioned, 2),
        estimated: round(estimated, 2),
        total: round(confirmed + provisioned + estimated, 2)
      };
    });
  }

  function narrative(eventViews, summary){
    if(!eventViews.length) return 'Nao ha eventos publicados para o periodo selecionado.';
    const dayCounts = [...new Map(eventViews.map(event => [dayKey(event.paymentDate), 0]))].map(([day]) => ({
      day,
      count: eventViews.filter(event => dayKey(event.paymentDate) === day).length
    })).sort((a,b) => b.count - a.count);
    const topDay = dayCounts[0];
    const extraordinary = eventViews.filter(event => event.isExtraordinary).length;
    return `O periodo possui ${summary.eventCount} eventos distribuidos em ${summary.paymentDays} dias. A maior concentracao esta em ${topDay.day || 'data pendente'}, com ${topDay.count} eventos. ${summary.confirmedPercent}% dos eventos estao confirmados e ${extraordinary} tem natureza extraordinaria ou recorrencia baixa.`;
  }

  function applyFilters(eventViews, filters = {}){
    const query = String(filters.query || '').trim().toLowerCase();
    return eventViews.filter(event => {
      if(query && !`${event.ticker} ${event.assetName} ${event.eventType}`.toLowerCase().includes(query)) return false;
      if(filters.status && event.eventStatus !== filters.status) return false;
      if(filters.assetType && event.assetType !== filters.assetType) return false;
      if(filters.minYield && finite(event.eventYieldPercent) < finite(filters.minYield)) return false;
      return true;
    });
  }

  function daysBetween(startDate, endDate, fallback = 30){
    const start = startDate ? new Date(`${String(startDate).slice(0,10)}T12:00:00`) : null;
    const end = endDate ? new Date(`${String(endDate).slice(0,10)}T12:00:00`) : null;
    if(!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fallback;
    return Math.max(1, Math.round((end - start) / 86400000));
  }

  function incomeTaxRate(days){
    const period = finite(days);
    if(period <= 180) return .225;
    if(period <= 360) return .20;
    if(period <= 720) return .175;
    return .15;
  }

  function periodReturnFromAnnual(annualPercent, days){
    if(finite(annualPercent) <= 0 || finite(days) <= 0) return null;
    return round((finite(annualPercent) / 365) * finite(days), 4);
  }

  function requiredCapitalForIncome(targetIncome, returnPercent){
    if(finite(targetIncome) <= 0 || finite(returnPercent) <= 0) return null;
    return round(finite(targetIncome) / (finite(returnPercent) / 100), 2);
  }

  function incomeEfficiency(income, capital){
    if(finite(capital) <= 0) return null;
    return round((finite(income) / finite(capital)) * 100, 4);
  }

  function normalizeBenchmarkRows(event, benchmarks, options = {}){
    const capital = finite(options.capital || event?.simulatedCapital || 10000);
    const days = daysBetween(event?.recordDate || event?.exDate, event?.paymentDate, options.days || 30);
    const mode = options.taxMode === 'net' ? 'net' : 'gross';
    const eventReturn = finite(event?.eventYieldPercent);
    const eventIncomeGross = eventReturn > 0 ? round(capital * (eventReturn / 100), 2) : finite(event?.estimatedIncome);
    const eventTax = mode === 'net' && event?.assetType === 'Acao' ? incomeTaxRate(days) : 0;
    const eventIncome = round(eventIncomeGross * (1 - eventTax), 2);
    const eventRow = {
      id:'event',
      label:event?.ticker ? `Evento ${event.ticker}` : 'Evento selecionado',
      income:eventIncome,
      returnPercent:incomeEfficiency(eventIncome, capital),
      requiredCapital:requiredCapitalForIncome(eventIncome, incomeEfficiency(eventIncome, capital)),
      capital,
      days,
      predictability:event?.regularity || 'historico insuficiente',
      liquidity:'Mercado',
      taxation:eventTax ? 'IR estimado' : 'Conforme ativo',
      source:event?.sourceName || 'Evento publicado',
      updatedAt:event?.updatedAt || '',
      kind:'event',
      available:eventIncome > 0
    };
    const benchmarkRows = (benchmarks || []).filter(benchmark => benchmark?.active !== false).map(benchmark => {
      const periodReturn = periodReturnFromAnnual(benchmark.annualYieldPercent, days);
      const grossIncome = periodReturn === null ? 0 : round(capital * (periodReturn / 100), 2);
      const taxRate = mode === 'net' && benchmark.taxable ? incomeTaxRate(days) : 0;
      const income = round(grossIncome * (1 - taxRate), 2);
      const returnPercent = incomeEfficiency(income, capital);
      return {
        id:benchmark.id,
        label:benchmark.label,
        income,
        returnPercent,
        requiredCapital:requiredCapitalForIncome(eventIncome, returnPercent),
        capital,
        days,
        predictability:benchmark.predictability || 'Alta',
        liquidity:benchmark.liquidity || 'Conforme produto',
        taxation:taxRate ? `IR ${round(taxRate * 100, 1)}%` : (benchmark.taxation || 'Nao modelado'),
        source:benchmark.source || 'Fonte nao informada',
        updatedAt:benchmark.updatedAt || '',
        kind:'benchmark',
        available:periodReturn !== null && income > 0
      };
    });
    return [eventRow, ...benchmarkRows];
  }

  function buildInvestmentComparison(event, benchmarks, options = {}){
    const rows = normalizeBenchmarkRows(event, benchmarks, options).filter(row => row.available);
    const maxIncome = Math.max(...rows.map(row => row.income), 1);
    const eventRow = rows.find(row => row.id === 'event') || rows[0];
    const reference = rows.find(row => row.id === 'cdb100') || rows.find(row => row.kind === 'benchmark');
    const additionalIncome = reference && eventRow ? round(eventRow.income - reference.income, 2) : 0;
    const requiredReference = reference?.requiredCapital || null;
    const requiredEvent = eventRow?.requiredCapital || eventRow?.capital || null;
    const capitalSaved = requiredReference && requiredEvent ? round(requiredReference - requiredEvent, 2) : 0;
    const eventIsLeader = eventRow ? rows.every(row => eventRow.income >= row.income) : false;
    return {
      rows: rows.map(row => ({ ...row, barPercent:round((row.income / maxIncome) * 100, 2) })),
      eventRow,
      reference,
      additionalIncome,
      capitalSaved,
      eventIsLeader,
      maxIncome,
      days:eventRow?.days || options.days || 30,
      capital:finite(options.capital || event?.simulatedCapital || 10000),
      taxMode:options.taxMode === 'net' ? 'net' : 'gross'
    };
  }

  global.DividendCalendarAnalytics = Object.freeze({
    STATUS_WEIGHT,
    round,
    eventYieldPercent,
    yieldOnCostPercent,
    equivalentYieldPercent,
    opportunityScore,
    attractivenessLabel,
    estimatedQuantity,
    estimatedIncome,
    buildEventViews,
    buildMonth,
    summarizeDay,
    summarizePeriod,
    cumulativeIncome,
    daysBetween,
    incomeTaxRate,
    periodReturnFromAnnual,
    requiredCapitalForIncome,
    incomeEfficiency,
    buildInvestmentComparison,
    narrative,
    applyFilters
  });
})(window);
