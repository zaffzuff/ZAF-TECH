import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function load(name, globals={}) {
  const file=path.resolve(name), module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const context=vm.createContext({module,exports:module.exports,require,Error,fetch:globalThis.fetch,AbortController,Date,URLSearchParams,setTimeout,clearTimeout,...globals});
  vm.runInContext(code,context,{filename:file});return module.exports;
}

test('uniform ledger activity has identical rates across partial buckets and no artificial decline',async()=>{
  const records=Array.from({length:100},(_,i)=>({sequence:i+1,closed_at:new Date(Date.UTC(2026,9,19)+i*5000).toISOString(),successful_transaction_count:1,failed_transaction_count:0,operation_count:1})).reverse();
  const api=load('lib/zaf/history-client.ts',{fetch:async()=>({ok:true,json:async()=>({_embedded:{records}})})});
  const result=await api.getZafHistoricalActivity();assert.equal(result.error,null);
  assert.equal(result.points.reduce((sum,p)=>sum+p.transactions,0),99);
  for(const point of result.points){assert.equal(point.transactionsPerHour,720);assert.equal(point.operationsPerHour,720);}
  assert.equal(result.change.transactionsPerHourPercent,0);assert.equal(result.change.operationsPerHourPercent,0);
});

test('historical success rate stays unknown when upstream omits counts',async()=>{
  const records=Array.from({length:3},(_,i)=>({sequence:i+1,closed_at:new Date(Date.UTC(2026,9,19)+i*5000).toISOString(),transaction_count:2,operation_count:2}));
  const api=load('lib/zaf/history-client.ts',{fetch:async()=>({ok:true,json:async()=>({_embedded:{records}})})});
  const result=await api.getZafHistoricalActivity();assert.equal(result.error,null);
  for(const point of result.points){assert.equal(point.successRate,null);assert.equal(point.transactionsPerHour,1440);}
});

for(const file of ['lib/zaf/history-client.ts','lib/zaf/historical-engine.ts']) test(`${file} deadline remains active until the response body resolves`,async()=>{
  let expire,cleared=false,signal;
  const api=load(file,{
    setTimeout:callback=>{expire=callback;return 1;},clearTimeout:()=>{cleared=true;},
    fetch:async(_url,options)=>{signal=options.signal;return {ok:true,json:()=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>{const error=new Error('aborted');error.name='AbortError';reject(error);},{once:true});})};},
  });
  const pending=file.includes('history-client')?api.getZafHistoricalActivity():api.getHistoricalLedgerPage();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(cleared,false);expire();
  if(file.includes('history-client'))assert.match((await pending).error,/timed out/);else await assert.rejects(pending,/aborted/);
  assert.equal(signal.aborted,true);assert.equal(cleared,true);
});

test('historical API never caches an upstream failure as a successful response',async()=>{
  for(const error of [null,'Source unavailable']) {
    const route=load('app/api/zaf/history/route.ts',{require:name=>name==='next/server'?{NextResponse:{json:(body,options)=>({body,...options})}}:{getZafHistoricalActivity:async()=>({error,points:[]})}});
    const response=await route.GET();assert.equal(response.status,error?502:200);
    if(error)assert.equal(response.headers['Cache-Control'],'no-store');else assert.match(response.headers['Cache-Control'],/max-age=900/);
  }
});
