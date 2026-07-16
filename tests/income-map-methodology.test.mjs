import assert from 'node:assert/strict';
import fs from 'node:fs';

const portal = fs.readFileSync('public/platform/portal.js', 'utf8');
const css = fs.readFileSync('public/platform/portal.css', 'utf8');

for (const token of [
  'incomeMapAnalytics',
  'Transforme o calendario em estrategia de fluxo',
  'Indice de continuidade',
  'Quem sustenta o fluxo?',
  'Dependencia do fluxo',
  'Onde existem lacunas?',
  'Eventos que podem preencher o fluxo'
]) {
  assert.ok(portal.includes(token), `income map token missing: ${token}`);
}

for (const token of [
  'Como os dados sao construidos',
  'Nenhum numero deve aparecer sem origem',
  'Fluxo dos dados',
  'Hierarquia de autoridade',
  'Estados dos eventos',
  'Formula',
  'methodPrice',
  'Divergencias',
  'Auditoria'
]) {
  assert.ok(portal.includes(token), `methodology token missing: ${token}`);
}

for (const token of [
  'income-heatmap',
  'methodology-layout',
  'formula-library',
  'method-example'
]) {
  assert.ok(css.includes(token), `css token missing: ${token}`);
}

for (const file of [
  'docs/design/income-map-redesign.md',
  'docs/methodology/income-map.md',
  'docs/methodology/income-continuity.md',
  'docs/methodology/event-status.md',
  'docs/methodology/data-confidence.md',
  'docs/methodology/formulas.md',
  'docs/methodology/source-hierarchy.md',
  'docs/testing/income-map-tests.md',
  'docs/testing/methodology-tests.md'
]) {
  assert.ok(fs.existsSync(file), `${file} missing`);
}

console.log('OK: income map and methodology');
