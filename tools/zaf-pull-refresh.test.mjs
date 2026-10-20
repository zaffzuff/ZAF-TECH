import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
function fixture({mobile=true,scroll=0,dialog=false}={}){
 const handlers={},states=[];let cleanup,refreshes=0;
 const element={addEventListener:(k,v)=>handlers[k]=v,removeEventListener:k=>delete handlers[k]};
 const react={useRef:()=>({current:element}),useState:v=>{const i=states.length;states.push(v);return[v,n=>states[i]=n]},useEffect:fn=>cleanup=fn()};
 const exports={};const source=ts.transpileModule(fs.readFileSync('lib/zaf/use-mobile-pull-refresh.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext('(function(require,exports){'+source+'})',{window:{matchMedia:()=>({matches:mobile}),scrollY:scroll},document:{querySelector:()=>dialog?{}:null}})(()=>react,exports);
 exports.useMobilePullRefresh(async()=>{refreshes++});
 const evt=(x,y,interactive=false)=>({touches:[{clientX:x,clientY:y}],target:{closest:()=>interactive?{}:null},cancelable:true,preventDefault(){}});
 return{pull(dy=160,interactive=false,dx=0){handlers.touchstart(evt(20,20,interactive));handlers.touchmove(evt(20+dx,20+dy));handlers.touchend()},get count(){return refreshes},cleanup,handlers};
}
test('a full mobile pull refreshes once while request is pending',async()=>{const f=fixture();f.pull();f.pull();assert.equal(f.count,1);await new Promise(r=>setImmediate(r));f.pull();assert.equal(f.count,2);f.cleanup();assert.equal(Object.keys(f.handlers).length,0)});
test('short and horizontal gestures do not refresh',()=>{const f=fixture();f.pull(47);f.pull(100);f.pull(146);f.pull(90,false,150);assert.equal(f.count,0)});
for(const [name,options]of [['desktop',{mobile:false}],['scrolled page',{scroll:20}],['open dialog',{dialog:true}]])test(name+' does not refresh',()=>{const f=fixture(options);f.pull();assert.equal(f.count,0)});
test('touching a control does not start a pull refresh',()=>{const f=fixture();f.pull(100,true);assert.equal(f.count,0)});

test('an intentional 148px pull starts refresh on release',()=>{const f=fixture();f.pull(148);assert.equal(f.count,1)});
