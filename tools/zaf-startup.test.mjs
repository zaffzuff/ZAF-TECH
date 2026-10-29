import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(name) {
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(`lib/zaf/${name}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(`(function(exports){${code}\n})`)(exports);
  return exports;
}
const {startupGuardScript}=load('startup-guard');

function boot(pathname = '/') {
  const events=new Map(),attrs=new Map(),panel={hidden:true},code={textContent:''},retry={href:''};
  let tick,cleared=false;
  const document={documentElement:{getAttribute:key=>attrs.get(key)},getElementById:id=>({'zaf-startup-help':panel,'zaf-startup-code':code,'zaf-startup-retry':retry}[id]),addEventListener:(name,fn)=>events.set(name,fn)};
  const window={location:{pathname},addEventListener:(name,fn)=>events.set(name,fn),setTimeout:fn=>{tick=fn;return 1;},clearTimeout:()=>{cleared=true;}};
  vm.runInNewContext(startupGuardScript,{document,window,Date});
  return {events,attrs,panel,code,retry,tick:()=>tick(),cleared:()=>cleared};
}

test('a missing application bundle exposes storage-free recovery without logging secrets',()=>{
  const b=boot();b.events.get('error')({target:{tagName:'SCRIPT',src:'https://zaf-tech.vercel.app/_next/static/chunks/app.js'},message:'secret-fixture'});
  assert.equal(b.panel.hidden,false);assert.equal(b.code.textContent,'ZAF-BOOT-SCRIPT');assert.match(b.retry.href,/^\/\?zaf_retry=\d+$/);assert.equal(b.code.textContent.includes('secret-fixture'),false);
});
test('a stalled boot gets a manual recovery action, never an automatic reload',()=>{
  const b=boot();assert.equal(b.panel.hidden,true);b.tick();assert.equal(b.panel.hidden,false);assert.equal(b.code.textContent,'ZAF-BOOT-TIMEOUT');
});
test('policy and callback pages never get an observatory slow-start overlay',()=>{
  for(const path of ['/privacy','/terms','/about','/signin/callback','/start-with-pi']) {
    const b=boot(path);assert.equal(b.events.size,0);assert.equal(b.panel.hidden,true);
  }
});
test('successful hydration cancels recovery and an SDK error cannot cover a working app',()=>{
  const b=boot();b.events.get('error')({target:{tagName:'SCRIPT',src:'https://sdk.minepi.com/pi-sdk.js'}});assert.equal(b.panel.hidden,true);
  b.attrs.set('data-zaf-ready','true');b.events.get('zaf-app-ready')();assert.equal(b.cleared(),true);b.tick();assert.equal(b.panel.hidden,true);
});
test('late hydration dismisses an already-visible slow-start notice',()=>{
  const b=boot();b.tick();assert.equal(b.panel.hidden,false);b.attrs.set('data-zaf-ready','true');b.events.get('zaf-app-ready')();assert.equal(b.panel.hidden,true);
});
test('runtime errors during startup show a generic code rather than exception content',()=>{
  const b=boot();b.events.get('error')({message:'Bearer private-fixture'});assert.equal(b.code.textContent,'ZAF-BOOT-RUNTIME');assert.equal(b.panel.hidden,false);
});
test('theme listeners support both current and older WebKit APIs and clean up',()=>{
  const {subscribeSystemTheme}=load('theme-media');
  for(const legacy of [false,true]){
    let listener,removed=false;
    const media=legacy?{addListener:fn=>{listener=fn;},removeListener:fn=>{removed=fn===listener;}}:{addEventListener:(_name,fn)=>{listener=fn;},removeEventListener:(_name,fn)=>{removed=fn===listener;}};
    let dark=false;const cleanup=subscribeSystemTheme(media,event=>{dark=event.matches;});listener({matches:true});assert.equal(dark,true);cleanup();assert.equal(removed,true);
  }
  assert.doesNotThrow(()=>subscribeSystemTheme(null,()=>{})());assert.doesNotThrow(()=>subscribeSystemTheme({},()=>{})());
});
