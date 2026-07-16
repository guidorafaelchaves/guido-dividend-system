import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync('public/platform/planPolicy.js', 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(code, context);

const { limitsFor, canUse } = context.window.DividendPlanPolicy;

assert.equal(limitsFor('free').watchlistAssets, 20);
assert.equal(limitsFor('free').portfolios, 1);
assert.equal(canUse('free', 'watchlistAssets', 19), true);
assert.equal(canUse('free', 'watchlistAssets', 20), false);
assert.equal(canUse('free', 'advancedReports', 0), false);
assert.equal(canUse('dividend_system', 'advancedReports', 0), true);

console.log('OK: plan policy');
