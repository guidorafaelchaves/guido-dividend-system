import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('public/platform/portfolioEngine.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(code, context);

const { calculatePosition, eligibleQuantityAt, estimatePersonalIncome } = context.window.DividendPortfolioEngine;

{
  const position = calculatePosition([
    { type:'buy', quantity:'10', priceCents:1000, feesCents:100 },
    { type:'buy', quantity:'10', priceCents:1200, feesCents:0 }
  ]);
  assert.equal(position.quantity, 20);
  assert.equal(position.openCostCents, 22100);
  assert.equal(position.averageCostCents, 1105);
}

{
  const position = calculatePosition([
    { type:'buy', quantity:'10', priceCents:1000 },
    { type:'sell', quantity:'4', priceCents:1300, feesCents:50 }
  ]);
  assert.equal(position.quantity, 6);
  assert.equal(position.openCostCents, 6000);
  assert.equal(position.realizedResultCents, 1150);
}

{
  const position = calculatePosition([
    { type:'buy', quantity:'10', priceCents:1000 },
    { type:'sell', quantity:'10', priceCents:900 }
  ]);
  assert.equal(position.quantity, 0);
  assert.equal(position.openCostCents, 0);
  assert.equal(position.realizedResultCents, -1000);
}

{
  const income = estimatePersonalIncome({ quantity: 12 }, { ticker:'MXRF11', status:'confirmed', amountCents:10, currency:'BRL', paymentDate:'2026-08-14' });
  assert.equal(income.amountCents, 120);
  assert.equal(income.status, 'confirmed');
}

{
  const eligible = eligibleQuantityAt([
    { type:'buy', tradeDate:'2026-07-01', quantity:'10', priceCents:1000 },
    { type:'buy', tradeDate:'2026-08-01', quantity:'5', priceCents:1100 },
    { type:'sell', tradeDate:'2026-08-10', quantity:'3', priceCents:1200 }
  ], '2026-07-31');
  assert.equal(eligible, 10);
}

{
  const position = calculatePosition([
    { type:'buy', tradeDate:'2026-01-01', quantity:'10', priceCents:1000 },
    { type:'bonus', tradeDate:'2026-02-01', quantity:'2' },
    { type:'split', tradeDate:'2026-03-01', factor:'2' },
    { type:'reverse_split', tradeDate:'2026-04-01', factor:'3' }
  ]);
  assert.equal(position.quantity, 8);
  assert.equal(position.openCostCents, 10000);
  assert.equal(position.averageCostCents, 1250);
}

{
  assert.throws(() => calculatePosition([
    { type:'buy', tradeDate:'2026-01-01', quantity:'1', priceCents:1000 },
    { type:'sell', tradeDate:'2026-01-02', quantity:'2', priceCents:1000 }
  ]), /posicao negativa/);
}

console.log('OK: portfolio engine');
