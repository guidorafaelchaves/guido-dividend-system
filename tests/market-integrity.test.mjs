import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const dashboard=read('public/dashboard.html');
const archived=read('docs/dashboard.html');
assert.equal(dashboard,archived,'Docs mirror and primary dashboard must agree');
assert.match(dashboard,/id="marketRefreshAllBtn"/);
assert.match(dashboard,/function updateAllMarketData\(/);
assert.match(dashboard,/function importMarketSourceFiles\(/);
assert.match(dashboard,/platform\/marketHub\.js/);
assert.ok(!dashboard.includes('id="marketToken"'),'Old paid credential form must be removed');
assert.ok(!dashboard.includes('https://brapi.dev/'),'Old provider network requests must be removed');
assert.ok(!dashboard.includes('\/api\/market\/quote\/'),'Deprecated tokenized single-symbol quote URL must be removed');
const inline=[...dashboard.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).filter(Boolean);
assert.ok(inline.length>0);
for(let i=0;i<inline.length;i++){
  try{new Function(inline[i]);}catch(err){throw new Error('Inline dashboard script '+i+': '+err.message);}
}
for(const path of ['workers/saas-gateway/src/index.js','workers/platform-api/src/index.js']){
  execFileSync(process.execPath,['--check',path],{encoding:'utf8'});
}
assert.ok(read('workers/platform-api/src/index.js').includes('/me/market/refresh'));
assert.ok(read('workers/saas-gateway/src/index.js').includes('/api/market/sources'));
assert.ok(!read('workers/saas-gateway/src/index.js').includes('BRAPI_TOKEN'));
console.log('OK: inline scripts, mirrored dashboard, multi-source gateway and server module syntax');
