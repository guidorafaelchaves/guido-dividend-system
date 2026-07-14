const assert = require('node:assert/strict');
const engine = require('../public/financial-engine.js');

function close(actual, expected, tolerance = 1e-8, label = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
}

// XIRR: one-year doubling should be approximately 100%.
close(engine.xirr([
  { date: '2025-01-01', amount: -1000 },
  { date: '2026-01-01', amount: 2000 }
]), 1, 1e-8, 'xirr');

// TWR removes external contributions from performance.
close(engine.timeWeightedReturn([
  { startValue: 1000, endValue: 1100, externalFlow: 0 },
  { startValue: 1100, endValue: 1320, externalFlow: 110 }
]), 0.21, 1e-8, 'twr');

// Calendar series must include zero-income months.
assert.deepEqual(engine.monthlySeries([
  { date: '2026-01-10', amount: 100 },
  { date: '2026-03-10', amount: 120 }
], '2026-01', '2026-03'), [
  { month: '2026-01', value: 100 },
  { month: '2026-02', value: 0 },
  { month: '2026-03', value: 120 }
]);

// Trailing DY uses per-share income in the previous 12 months.
close(engine.trailingDividendYield([
  { date: '2025-07-15', amount: 0.5 },
  { date: '2026-01-15', amount: 0.5 },
  { date: '2024-12-15', amount: 9 }
], 10, '2026-07-14'), 0.1, 1e-8, 'trailing DY');

// Average-cost position: partial sale writes down proportional cost.
const position = engine.rebuildPosition([
  { date: '2026-01-01', type: 'BUY', quantity: 100, unitPrice: 10, fees: 10 },
  { date: '2026-02-01', type: 'BUY', quantity: 100, unitPrice: 20, fees: 10 },
  { date: '2026-03-01', type: 'SELL', quantity: 50, unitPrice: 25, fees: 5 }
]);
close(position.quantity, 150, 1e-8, 'remaining quantity');
close(position.averageCost, 15.1, 1e-8, 'remaining average cost');
close(position.realizedProfit, 490, 1e-8, 'realized profit');

// Amortization reduces cost basis, not recurring income.
const amortized = engine.rebuildPosition([
  { date: '2026-01-01', type: 'BUY', quantity: 100, unitPrice: 10 }
], [
  { date: '2026-02-01', type: 'AMORTIZATION', amount: 200 }
]);
close(amortized.costBasis, 800, 1e-8, 'amortized cost basis');
close(amortized.averageCost, 8, 1e-8, 'amortized average cost');

// Economic return includes price result, income, sales, costs and taxes.
close(engine.economicReturn({
  openingValue: 0,
  closingValue: 1200,
  buys: 1000,
  sales: 100,
  income: 50,
  fees: 10,
  taxes: 5
}), 335, 1e-8, 'economic return');

// Trade validation blocks material mismatches.
assert.equal(engine.validateTradeValue({ quantity: 100, unitPrice: 10, totalValue: 1490 }).status, 'blocked');
assert.equal(engine.validateTradeValue({ quantity: 100, unitPrice: 10, totalValue: 1004 }).status, 'ok');

// Decision output is evidence-based and refuses low-confidence recommendations.
assert.equal(engine.decisionMatrix({ quality: .9, valuation: .9, risk: .2, suitability: .9, dataConfidence: .4 }).action, 'INVESTIGATE');
assert.equal(engine.decisionMatrix({ quality: .9, valuation: .8, risk: .2, suitability: .8, dataConfidence: .9 }).action, 'PRIORITIZE_REVIEW');

console.log('OK: financial engine regression suite passed');
