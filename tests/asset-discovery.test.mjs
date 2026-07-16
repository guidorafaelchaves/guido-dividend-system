import assert from 'node:assert/strict';
import fs from 'node:fs';

const portal = fs.readFileSync('public/platform/portal.js', 'utf8');
const css = fs.readFileSync('public/platform/portal.css', 'utf8');

for (const token of [
  'assetDiscoveryData',
  'Descubra o proximo fluxo',
  'O que voce procura?',
  'Proximos a pagar',
  'Ativos que mantem o fluxo',
  'Ultimos dias para entrar',
  'Maiores retornos de evento',
  'Quem pode pagar em cada mes?',
  'Catalogo completo',
  'Cotacao indisponivel'
]) {
  assert.ok(portal.includes(token), `asset discovery token missing: ${token}`);
}

for (const token of [
  'asset-discovery-hero',
  'discovery-asset-card',
  'asset-role-grid',
  'asset-compare-box'
]) {
  assert.ok(css.includes(token), `asset css token missing: ${token}`);
}

for (const file of [
  'docs/design/assets-public-redesign.md',
  'docs/product/asset-discovery.md',
  'docs/methodology/asset-relevance.md',
  'docs/methodology/asset-recurrence.md',
  'docs/testing/asset-discovery-tests.md'
]) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}

console.log('OK: asset discovery');
