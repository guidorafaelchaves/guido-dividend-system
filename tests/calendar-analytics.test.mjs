import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('public/platform/calendarAnalytics.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(code, context);

const C = context.window.DividendCalendarAnalytics;

assert.equal(C.eventYieldPercent(0.10, 10.20), 0.9804);
assert.equal(C.equivalentYieldPercent(0.9804, 'mensal'), 11.7648);
assert.equal(C.equivalentYieldPercent(0.9804, 'trimestral'), 3.9216);
assert.equal(C.equivalentYieldPercent(null, 'mensal'), null);
assert.equal(C.eventYieldPercent(0.10, 0), null);
assert.equal(C.eventYieldPercent(-1, 10), null);
assert.equal(C.yieldOnCostPercent(0.12, 8), 1.5);
assert.equal(C.yieldOnCostPercent(0.12, 0), null);

assert.equal(C.estimatedQuantity(10000, 10.20), 980.3922);
assert.equal(C.estimatedQuantity(10000, 10.20, { allowFractional:false }), 980);
assert.equal(C.estimatedQuantity(0, 10.20), 0);
assert.equal(C.estimatedQuantity(10000, 0), 0);
assert.equal(C.estimatedIncome(980, 0.10), 98);
assert.equal(C.estimatedIncome(980, 0), 0);
assert.equal(C.daysBetween('2026-07-13', '2026-08-12'), 30);
assert.equal(C.periodReturnFromAnnual(12.1667, 30), 1);
assert.equal(C.requiredCapitalForIncome(100, 0.8), 12500);
assert.equal(C.incomeEfficiency(98, 10000), 0.98);
assert.equal(C.incomeTaxRate(30), .225);

const assets = [
  { id:'MXRF11', ticker:'MXRF11', name:'Maxi Renda', type:'FII', price:10.20, recurrenceScore:90 },
  { id:'HGLG11', ticker:'HGLG11', name:'Logistica', type:'FII', price:158, recurrenceScore:88 },
  { id:'PETR4', ticker:'PETR4', name:'Petrobras', type:'Acao', price:0, recurrenceScore:50 }
];

const events = [
  { id:'1', ticker:'MXRF11', kind:'rendimento', status:'confirmed', amount:0.10, paymentDate:'2026-08-14', exDate:'2026-07-31' },
  { id:'2', ticker:'HGLG11', kind:'rendimento', status:'provisioned', amount:1.10, paymentDate:'2026-08-14', exDate:'2026-08-01' },
  { id:'3', ticker:'PETR4', kind:'dividendo extraordinario', status:'estimated', amount:1.00, paymentDate:'2026-08-20', exDate:'2026-08-12', recurrence:'extraordinaria' },
  { id:'4', ticker:'SEMVALOR', kind:'jcp', status:'projected', paymentDate:'2026-08-22' }
];

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'perAsset' });
  const mxrf = views.find(event => event.ticker === 'MXRF11');
  assert.equal(mxrf.eventYieldPercent, 0.9804);
  assert.equal(mxrf.equivalentYieldPercent, 11.7648);
  assert.equal(mxrf.estimatedIncome, 98.04);
  assert.equal(mxrf.regularity, 'alta regularidade');
  assert.ok(mxrf.opportunityScore >= 70);
  assert.ok(['atencao alta','boa janela','monitorar','baixo sinal'].includes(mxrf.attractiveness.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));

  const missingPrice = views.find(event => event.ticker === 'PETR4');
  assert.equal(missingPrice.eventYieldPercent, null);
  assert.equal(missingPrice.estimatedIncome, 0);
  assert.equal(missingPrice.isExtraordinary, true);
  assert.ok(missingPrice.opportunityScore < mxrf.opportunityScore);
}

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'distributed' });
  const mxrf = views.find(event => event.ticker === 'MXRF11');
  const hglg = views.find(event => event.ticker === 'HGLG11');
  assert.equal(mxrf.simulatedCapital, 2500);
  assert.equal(hglg.simulatedCapital, 2500);
  assert.equal(mxrf.estimatedIncome, 24.51);
}

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'distributed' });
  const summary = C.summarizePeriod(views, { capital:10000, mode:'distributed' });
  assert.equal(summary.eventCount, 4);
  assert.equal(summary.assetCount, 4);
  assert.equal(summary.paymentDays, 3);
  assert.equal(summary.confirmedPercent, 25);
  assert.ok(summary.totalEstimatedIncome > 0);
  assert.ok(summary.portfolioReturnPercent > 0);
}

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'perAsset' });
  const day = C.summarizeDay('2026-08-14', views, 10000);
  assert.equal(day.eventCount, 2);
  assert.equal(day.statusCounts.confirmed, 1);
  assert.equal(day.statusCounts.provisioned, 1);
  assert.equal(day.dominantStatus, 'confirmed');
  assert.notEqual(day.intensity, 'none');
}

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'perAsset' });
  const cumulative = C.cumulativeIncome(views);
  assert.equal(cumulative.length, 4);
  assert.ok(cumulative.at(-1).total >= cumulative[0].total);
}

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'perAsset' });
  const filtered = C.applyFilters(views, { query:'maxi', status:'confirmed', minYield:.5 });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].ticker, 'MXRF11');
}

{
  const views = C.buildEventViews(events, assets, { capital:10000, mode:'perAsset' });
  const mxrf = views.find(event => event.ticker === 'MXRF11');
  const benchmarks = [
    { id:'cdb100', label:'CDB 100% CDI', annualYieldPercent:10, taxable:true, liquidity:'Conforme produto', predictability:'Alta', source:'teste', updatedAt:'2026-07-13' },
    { id:'poupanca', label:'Poupanca', annualYieldPercent:6, taxable:false, liquidity:'Alta', predictability:'Alta', source:'teste', updatedAt:'2026-07-13' }
  ];
  const gross = C.buildInvestmentComparison(mxrf, benchmarks, { capital:10000, taxMode:'gross' });
  assert.equal(gross.capital, 10000);
  assert.equal(gross.days, 14);
  assert.ok(gross.rows.every(row => row.capital === 10000));
  assert.ok(gross.eventRow.income > gross.reference.income);
  assert.ok(gross.additionalIncome > 0);
  assert.ok(gross.capitalSaved > 0);
  assert.equal(gross.rows[0].barPercent <= 100, true);

  const net = C.buildInvestmentComparison(mxrf, benchmarks, { capital:10000, taxMode:'net' });
  const cdbGross = gross.rows.find(row => row.id === 'cdb100');
  const cdbNet = net.rows.find(row => row.id === 'cdb100');
  assert.ok(cdbNet.income < cdbGross.income);
}

console.log('OK: calendar analytics');
