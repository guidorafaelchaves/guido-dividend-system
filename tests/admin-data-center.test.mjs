import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('workers/platform-api/src/index.js', 'utf8');
const migration = fs.readFileSync('workers/platform-api/migrations/0003_admin_data_center.sql', 'utf8');
const portal = fs.readFileSync('public/platform/portal.js', 'utf8');
const admin = fs.readFileSync('public/admin.html', 'utf8');
const domain = fs.readFileSync('public/platform/domain.js', 'utf8');

for (const table of [
  'admin_import_files',
  'raw_import_rows',
  'canonical_financial_events',
  'financial_event_sources',
  'brapi_responses',
  'event_reconciliation_cases',
  'publication_batches',
  'published_event_cache',
  'captured_events'
]) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}

for (const route of [
  '/admin/data-center',
  '/admin/imports/b3/detect',
  '/admin/imports/b3',
  '/admin/brapi/plan',
  '/admin/events',
  '/admin/publication/prepare',
  '/admin/publication/publish',
  '/public/events'
]) {
  assert.ok(api.includes(route), `${route} missing`);
}

assert.ok(api.includes('B3_RADAR_ALIASES'));
assert.ok(api.includes('sync_brapi_fii_events'));
assert.ok(api.includes('BRAPI_TOKEN'));
assert.ok(!portal.includes('cfgBrapiToken'));
assert.ok(!admin.includes('cfgBrapiToken'));
assert.ok(!admin.includes('localStorage'));
assert.ok(!admin.includes('IndexedDB'));
assert.ok(admin.includes('credenciais e tokens nao sao mais salvos'));
assert.ok(portal.includes('Central Administrativa de Proventos'));
assert.ok(portal.includes('Importar arquivo B3'));
assert.ok(portal.includes('Sincronizacao Brapi'));
assert.ok(portal.includes('adminSavePublishedEvents'));
assert.ok(portal.includes('adminParseXlsx'));
assert.ok(portal.includes('DecompressionStream'));
assert.ok(portal.includes('gds_published_events_v1'));
assert.ok(portal.includes('Eventos publicados'));
assert.ok(domain.includes('publishedEventRepository'));

console.log('OK: admin data center');
