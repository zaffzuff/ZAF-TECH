import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { webcrypto } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();

test("Testnet SDK verifies with Pi Platform and never sends its token to App Studio", async () => {
  const priorFetch = globalThis.fetch, priorNetwork = process.env.PI_NETWORK, priorSecret = process.env.ZAF_PI_SESSION_SECRET;
  process.env.PI_NETWORK = "testnet";
  process.env.ZAF_PI_SESSION_SECRET = "ab".repeat(32);
  try {
    const route = loader({"next/server":responseMock,"@/lib/zaf/rate-limit":{enforceRateLimit:async()=>null}})('@/app/api/zaf/pi/auth/route');
    for (const [status, profile, expected] of [[200,{uid:"testnet-uid",username:"test-pioneer"},200],[401,{},401],[403,{},401],[500,{},502],[200,{username:"incomplete"},502]]) {
      globalThis.fetch = async (url, options) => {
        assert.equal(url,"https://api.minepi.com/v2/me");
        assert.equal(options.method,"GET");
        assert.equal(options.headers.Authorization,"Bearer testnet-fixture");
        assert.equal(options.body,undefined);
        return new Response(JSON.stringify(profile),{status});
      };
      const result = await route.POST(new Request('https://zaf-tech.invalid/api/zaf/pi/auth',{method:'POST',headers:{origin:'https://zaf-tech.invalid','content-type':'application/json'},body:JSON.stringify({accessToken:'testnet-fixture',username:'attacker'})}));
      assert.equal(result.status,expected);
      if (expected === 200) assert.equal(result.body.user.username,"test-pioneer");
      assert.ok(!JSON.stringify(result).includes("testnet-fixture"));
    }
  } finally {
    globalThis.fetch=priorFetch;
    if(priorNetwork===undefined)delete process.env.PI_NETWORK;else process.env.PI_NETWORK=priorNetwork;
    if(priorSecret===undefined)delete process.env.ZAF_PI_SESSION_SECRET;else process.env.ZAF_PI_SESSION_SECRET=priorSecret;
  }
});

test("only the enabled Testnet sandbox route initializes the Sandbox SDK", async () => {
  const prior=process.env.NEXT_PUBLIC_PI_SANDBOX_ROUTE;
  try {
    for (const [enabled, route, expected] of [["enabled","/sandbox",true],["enabled","/",false],["disabled","/sandbox",false]]) {
      const browser=mockBrowser();
      try {
        process.env.NEXT_PUBLIC_PI_SANDBOX_ROUTE=enabled;
        browser.fakeWindow.location.pathname=route;
        let options;
        browser.fakeWindow.Pi={init:async value=>{options=value;}};
        await browser.load('@/lib/zaf/pi/sdk').initializePiSdk();
        assert.equal(options.sandbox===true,expected);
      } finally {browser.restore();}
    }
  } finally {if(prior===undefined)delete process.env.NEXT_PUBLIC_PI_SANDBOX_ROUTE;else process.env.NEXT_PUBLIC_PI_SANDBOX_ROUTE=prior;}
});

test("Pi identity API destination rejects every nonofficial endpoint", () => {
  const prior=process.env.PI_PLATFORM_API_BASE_URL;
  try {
    const {getPiRuntimeConfig}=loader()('@/lib/zaf/pi/runtime');
    for(const url of ['http://api.minepi.com/v2','https://evil.example/v2','https://api.minepi.com/v2?x=1','https://api.minepi.com/v2#x','https://user@api.minepi.com/v2','https://api.minepi.com:444/v2']) {
      process.env.PI_PLATFORM_API_BASE_URL=url; assert.equal(getPiRuntimeConfig().compatible,false,url);
    }
    process.env.PI_PLATFORM_API_BASE_URL='https://api.minepi.com/v2/';
    assert.equal(getPiRuntimeConfig().platformApiBaseUrl,'https://api.minepi.com/v2');
  } finally {if(prior===undefined)delete process.env.PI_PLATFORM_API_BASE_URL;else process.env.PI_PLATFORM_API_BASE_URL=prior;}
});

test("App Studio exchange trusts only server identity and issues a secure session", async () => {
  const prior=globalThis.fetch, priorSecret=process.env.ZAF_PI_SESSION_SECRET;
  process.env.ZAF_PI_SESSION_SECRET='ab'.repeat(32);
  const route=loader({'next/server':responseMock,'@/lib/zaf/rate-limit':{enforceRateLimit:async()=>null}})('@/app/api/zaf/pi/auth/route');
  const request=()=>new Request('https://zaf-tech.invalid/api/zaf/pi/auth',{method:'POST',headers:{origin:'https://zaf-tech.invalid','content-type':'application/json'},body:JSON.stringify({accessToken:'fixture-token',uid:'attacker',username:'attacker'})});
  try {
    for(const [status,profile,expected] of [[200,{sessionToken:'upstream-session',user:{uid:'fixture-uid',username:'pioneer'}},200],[401,{},401],[403,{},401],[429,{},429],[500,{},502],[200,{user:{uid:'x',username:'pioneer'}},502],[200,null,502],[200,{sessionToken:'x',user:{uid:'x',username:'a'.repeat(101)}},502]]) {
      let calls=0;
      globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com/pi/auth/v1/login');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{accessToken:'fixture-token'});assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return new Response(JSON.stringify(profile),{status,headers:{'retry-after':'99999'}});};
      const result=await route.POST(request());assert.equal(result.status,expected);assert.equal(calls,1);
      assert.match(result.headers['Cache-Control'],/no-store/);
      assert.equal(JSON.stringify(result.body).includes('fixture-token'),false);assert.equal(JSON.stringify(result.body).includes('fixture-uid'),false);
      assert.equal(JSON.stringify(result).includes('upstream-session'),false);
      if(expected===200){assert.equal(result.body.user.username,'pioneer');const cookie=result.cookies.values[0];assert.equal(cookie[0],'__Host-zaf-pi-session-v2');assert.deepEqual(cookie[2],{httpOnly:true,secure:true,sameSite:'none',path:'/',maxAge:1800,partitioned:true});const session=loader()('@/lib/zaf/pi/session');assert.deepEqual(session.readPiSession(cookie[1]),{uid:'fixture-uid',username:'pioneer'});assert.equal(result.cookies.values[1][0],session.PI_LEGACY_SESSION_COOKIE);assert.equal(result.cookies.values[1][2].maxAge,0);}
      else assert.equal(result.cookies.values.length,0);
      if(status===429)assert.equal(result.headers['Retry-After'],'300');
    }
    globalThis.fetch=async()=>{throw new TypeError('fixture');};assert.equal((await route.POST(request())).status,502);
    globalThis.fetch=async()=>new Response('not json');assert.equal((await route.POST(request())).status,502);
  } finally {globalThis.fetch=prior;if(priorSecret===undefined)delete process.env.ZAF_PI_SESSION_SECRET;else process.env.ZAF_PI_SESSION_SECRET=priorSecret;}
});

test("web OAuth verifies with Pi Platform only and isolates its identity from App Studio", async () => {
  const prior = globalThis.fetch, secret = process.env.ZAF_PI_SESSION_SECRET;
  process.env.ZAF_PI_SESSION_SECRET = 'ab'.repeat(32);
  const route = loader({'next/server':responseMock,'@/lib/zaf/rate-limit':{enforceRateLimit:async()=>null}})('@/app/api/zaf/pi/oauth/route');
  const request = (origin='https://zaf-tech.invalid') => new Request('https://zaf-tech.invalid/api/zaf/pi/oauth', {method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({accessToken:'oauth-fixture',uid:'attacker',username:'attacker'})});
  try {
    for (const [status, profile, expected] of [[200,{uid:'fixture-uid',username:'pioneer'},200],[401,{},401],[403,{},401],[404,{},502],[429,{},429],[500,{},502],[200,{user:{uid:'fixture-uid',username:'pioneer'}},502],[200,{uid:'fixture-uid'},502],[200,null,502]]) {
      let calls=0;
      globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.minepi.com/v2/me');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer oauth-fixture');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.body,undefined);return new Response(JSON.stringify(profile),{status,headers:{'retry-after':'9999'}});};
      const result=await route.POST(request());assert.equal(result.status,expected);assert.equal(calls,1);assert.match(result.headers['Cache-Control'],/no-store/);
      assert.ok(!JSON.stringify(result).includes('oauth-fixture'));
      if(expected===200){const session=loader()('@/lib/zaf/pi/session').readPiSession(result.cookies.values[0][1]);assert.equal(session.username,'pioneer');assert.match(session.uid,/^pi-oauth:[a-f0-9]{64}$/);assert.notEqual(session.uid,'fixture-uid');assert.equal(result.cookies.values[0][2].httpOnly,true);}
      else assert.equal(result.cookies.values.length,0);
      if(status===429)assert.equal(result.headers['Retry-After'],'300');
    }
    let calls=0;globalThis.fetch=async()=>{calls++;throw new TypeError('private token must not leak');};
    assert.equal((await route.POST(request('https://evil.invalid'))).status,403);assert.equal(calls,0);
    assert.equal((await route.POST(request())).status,502);
    globalThis.fetch=async()=>new Response('not-json');assert.equal((await route.POST(request())).status,502);
  } finally {globalThis.fetch=prior;if(secret===undefined)delete process.env.ZAF_PI_SESSION_SECRET;else process.env.ZAF_PI_SESSION_SECRET=secret;}
});

test("OAuth callback sends credentials only to the web verifier and reports safe failure codes", async () => {
  for (const status of [200,401,429,502]) {
    const browser=mockBrowser();
    try {
      const keys=browser.load('@/lib/zaf/pi/oauth');browser.storage.set(keys.PI_SIGNIN_STATE_KEY,'fixture-state');browser.storage.set(keys.PI_SIGNIN_STARTED_KEY,String(Date.now()));browser.fakeWindow.location.hash='#access_token=oauth-fixture&state=fixture-state';
      globalThis.fetch=async(url,options)=>{if(url==='/api/zaf/pi/session'){assert.equal(options.credentials,'same-origin');return new Response(JSON.stringify({user:{username:'pioneer'}}));}assert.equal(url,'/api/zaf/pi/oauth');assert.deepEqual(JSON.parse(options.body),{accessToken:'oauth-fixture'});return new Response(JSON.stringify(status===200?{user:{username:'pioneer'}}:{error:'private provider detail'}),{status});};
      browser.load('@/app/signin/callback/page').default();browser.effects[0]();await new Promise(resolve=>setImmediate(resolve));
      if(status===200)assert.equal(keys.readPiDisplay().username,'pioneer');
      else {assert.equal(keys.readPiDisplay(),null);assert.ok(browser.messages.some(message=>typeof message==='string'&&message.includes(`ZAF-PI-OAUTH-${status}`)));}
      assert.ok(!JSON.stringify(browser.messages).includes('private provider detail'));assert.ok(!JSON.stringify([...browser.storage.values()]).includes('oauth-fixture'));
    } finally {browser.restore();}
  }
});

test("own sessions reject tampering, expiry, future issuance and key rotation",()=>{
  const prior=process.env.ZAF_PI_SESSION_SECRET;
  try {process.env.ZAF_PI_SESSION_SECRET='ab'.repeat(32);const api=loader()('@/lib/zaf/pi/session');const now=Date.now();const token=api.sealPiSession({uid:'uid',username:'pioneer'},now);assert.deepEqual(api.readPiSession(token,now),{uid:'uid',username:'pioneer'});assert.equal(api.readPiSession(token,now+1800000),null);assert.equal(api.readPiSession(token,now-1),null);assert.equal(api.readPiSession('X'+token.slice(1),now),null);process.env.ZAF_PI_SESSION_SECRET='cd'.repeat(32);assert.equal(api.readPiSession(token,now),null);delete process.env.ZAF_PI_SESSION_SECRET;assert.throws(()=>api.sealPiSession({uid:'x',username:'pioneer'}));}
  finally{if(prior===undefined)delete process.env.ZAF_PI_SESSION_SECRET;else process.env.ZAF_PI_SESSION_SECRET=prior;}
});

test("Pi input rejects foreign/missing origin, non-JSON, bad tokens and oversized streams", async () => {
  const {readPiAuthInput}=loader()('@/lib/zaf/pi/auth-input');
  const make=(body,headers={})=>new Request('https://zaf-tech.invalid/api',{method:'POST',headers:{'content-type':'application/json',origin:'https://zaf-tech.invalid',...headers},body});
  for(const [request,status] of [[make('{}',{origin:'https://evil.example'}),403],[make('{}',{origin:''}),403],[make('{}',{'content-type':'text/plain'}),415],[make('{'),400],[make('[]'),400],[make(JSON.stringify({accessToken:'bad\r\nvalue'})),400],[make(JSON.stringify({accessToken:'a'.repeat(4097)})),400],[make('{}',{'content-length':'8193'}),413],[make(' '.repeat(8193)),413]]) {
    await assert.rejects(readPiAuthInput(request),error=>error.status===status);
  }
  const data=new TextEncoder().encode(' '.repeat(9000));
  const stream=new ReadableStream({start(c){c.enqueue(data.subarray(0,5000));c.enqueue(data.subarray(5000));c.close();}});
  const streamed=new Request('https://zaf-tech.invalid/api',{method:'POST',headers:{origin:'https://zaf-tech.invalid','content-type':'application/json'},body:stream,duplex:'half'});
  await assert.rejects(readPiAuthInput(streamed),error=>error.status===413);
  assert.equal(await readPiAuthInput(make(JSON.stringify({accessToken:'fixture-token'}))),'fixture-token');
  const internal=new Request('http://localhost:3100/api',{method:'POST',headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100','content-type':'application/json'},body:JSON.stringify({accessToken:'fixture-token'})});
  assert.equal(await readPiAuthInput(internal),'fixture-token');
  await assert.rejects(readPiAuthInput(make('{}',{'x-forwarded-host':'evil.example',origin:'https://evil.example'})),error=>error.status===403);
});

test("Pi upstream Retry-After is bounded and handles date/invalid values",()=>{
  const {piRetryAfter}=loader()('@/lib/zaf/pi/auth-input');const now=Date.parse('2026-10-16T00:00:00Z');
  assert.equal(piRetryAfter('45'),45);assert.equal(piRetryAfter('0'),1);assert.equal(piRetryAfter('9999'),300);assert.equal(piRetryAfter('invalid'),60);assert.equal(piRetryAfter(null),60);assert.equal(piRetryAfter('Fri, 16 Oct 2026 00:01:00 GMT',now),60);
});

test("Pi display distinguishes current from restored verification and expires without storing tokens",()=>{
  const browser=mockBrowser();
  try {
    const api=browser.load('@/lib/zaf/pi/oauth');api.savePiDisplay('pioneer');assert.equal(api.readPiDisplay().current,true);
    const saved=browser.storage.get(api.PI_SIGNIN_VERIFIED_USERNAME_KEY);assert.deepEqual(Object.keys(JSON.parse(saved)).sort(),['username','verifiedAt']);
    const restored=loader()('@/lib/zaf/pi/oauth');assert.equal(restored.readPiDisplay().current,false);
    const at=JSON.parse(saved).verifiedAt;assert.equal(restored.readPiDisplay(at+api.PI_DISPLAY_MAX_AGE_MS),null);
    browser.storage.set(api.PI_SIGNIN_VERIFIED_USERNAME_KEY,'legacy-username');assert.equal(restored.readPiDisplay(),null);
    browser.storage.set(api.PI_SIGNIN_VERIFIED_USERNAME_KEY,JSON.stringify({username:'pioneer',verifiedAt:Date.now()+60000}));assert.equal(restored.readPiDisplay(),null);
    api.clearPiDisplay();assert.equal(api.readPiDisplay(),null);
  } finally {browser.restore();}
});

test("both header instances share a synchronous sign-in lock",()=>{
  const browser=mockBrowser();try {const api=browser.load('@/lib/zaf/pi/oauth');assert.equal(api.acquirePiSignIn(),true);assert.equal(api.acquirePiSignIn(),false);assert.equal(api.isPiSignInBusy(),true);api.releasePiSignIn();assert.equal(api.acquirePiSignIn(),true);api.releasePiSignIn();}finally{browser.restore();}
});

test("SDK init timeout requires a fresh document and ignores late completion",async()=>{
  const browser=mockBrowser('PiBrowser');let finish,calls=0;
  try {
    browser.fakeWindow.setTimeout=cb=>setTimeout(cb,1);
    browser.fakeWindow.Pi={init:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}};
    const sdk=browser.load('@/lib/zaf/pi/sdk');
    await assert.rejects(sdk.initializePiSdk(),/timed out/);assert.equal(sdk.piReloadRequired(),true);
    await assert.rejects(sdk.initializePiSdk(),/Reload/);assert.equal(calls,1);
    finish();await new Promise(resolve=>setImmediate(resolve));await assert.rejects(sdk.initializePiSdk(),/Reload/);
  }finally{browser.restore();}
});

test("a rejected SDK init can retry and concurrent callers share one attempt",async()=>{
  const browser=mockBrowser('PiBrowser');let calls=0;
  try {browser.fakeWindow.Pi={init:async()=>{if(++calls===1)throw Error('fixture');}};const sdk=browser.load('@/lib/zaf/pi/sdk');await assert.rejects(sdk.initializePiSdk());const [a,b]=await Promise.all([sdk.initializePiSdk(),sdk.initializePiSdk()]);assert.equal(a,b);assert.equal(calls,2);assert.equal(sdk.piReloadRequired(),false);}finally{browser.restore();}
});

test("SDK script timeout removes the loader and marks reload, not a parallel injection",async()=>{
  const browser=mockBrowser();const prior=globalThis.document;let removed=false,appended=0;
  try {browser.fakeWindow.setTimeout=cb=>setTimeout(cb,1);globalThis.document={createElement:()=>({remove(){removed=true;}}),head:{appendChild(){appended++;}}};const sdk=browser.load('@/lib/zaf/pi/sdk');const first=sdk.loadPiSdk();assert.equal(first,sdk.loadPiSdk());await assert.rejects(first,/timed out/);assert.equal(removed,true);assert.equal(appended,1);assert.equal(sdk.piReloadRequired(),true);}finally{globalThis.document=prior;browser.restore();}
});

test("late native credentials after timeout cannot be used by the caller",async()=>{
  const browser=mockBrowser('PiBrowser');let finish;
  try {browser.fakeWindow.setTimeout=cb=>setTimeout(cb,1);const sdk=browser.load('@/lib/zaf/pi/sdk');let delivered=false;const pending=sdk.authenticatePi({authenticate:()=>new Promise(resolve=>{finish=resolve;})}).then(()=>{delivered=true;});await assert.rejects(pending,/did not respond/);finish({accessToken:'late-token'});await new Promise(resolve=>setImmediate(resolve));assert.equal(delivered,false);assert.equal(sdk.piReloadRequired(),true);}finally{browser.restore();}
});

test("OAuth callback rejects expired, future, missing, mismatched and duplicate states",async()=>{
  for(const mode of ['expired','future','missing','mismatch','duplicate','replay']) {
    const browser=mockBrowser();let calls=0;
    try {const keys=browser.load('@/lib/zaf/pi/oauth');browser.storage.set(keys.PI_SIGNIN_STATE_KEY,'fixture-state');if(mode!=='missing')browser.storage.set(keys.PI_SIGNIN_STARTED_KEY,String(Date.now()+(mode==='future'?60000:mode==='expired'?-keys.PI_OAUTH_MAX_AGE_MS-1:0)));if(mode==='replay')browser.storage.delete(keys.PI_SIGNIN_STATE_KEY);browser.fakeWindow.location.hash='#access_token=fixture-token&state='+(mode==='mismatch'?'other':'fixture-state')+(mode==='duplicate'?'&state=fixture-state':'');globalThis.fetch=async()=>{calls++;throw Error('unexpected');};browser.load('@/app/signin/callback/page').default();browser.effects[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0,mode);assert.equal(browser.storage.has(keys.PI_SIGNIN_STATE_KEY),false);assert.equal(browser.storage.has(keys.PI_SIGNIN_STARTED_KEY),false);assert.equal(browser.navigations[0],'/');}finally{browser.restore();}
  }
});

test("fresh OAuth callback verifies once, consumes state and saves display only",async()=>{
  const browser=mockBrowser();let calls=0;
  try {const keys=browser.load('@/lib/zaf/pi/oauth');browser.storage.set(keys.PI_SIGNIN_STATE_KEY,'fixture-state');browser.storage.set(keys.PI_SIGNIN_STARTED_KEY,String(Date.now()));browser.storage.set(keys.PI_SIGNIN_RETURN_TO_KEY,'/?section=network');browser.fakeWindow.location.hash='#access_token=fixture-token&state=fixture-state';globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({user:{username:'pioneer'}}));};browser.load('@/app/signin/callback/page').default();browser.effects[0]();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,2);assert.equal(keys.readPiDisplay().username,'pioneer');assert.equal(browser.storage.has(keys.PI_SIGNIN_STATE_KEY),false);assert.equal(browser.navigations.at(-1),'/?section=network');assert.equal(JSON.stringify([...browser.storage.values()]).includes('fixture-token'),false);}finally{browser.restore();}
});

test("unmounted Pi header ignores an eventual authentication result and releases the shared lock",async()=>{
  const browser=mockBrowser('PiBrowser');let complete,calls=0;
  try {
    browser.fakeWindow.Pi={init:async()=>{},getPiHostAppInfo:async()=>({hostApp:'pi-browser'}),authenticate:()=>new Promise(resolve=>{complete=resolve;})};
    globalThis.fetch=async(url,options)=>{
      if(url==='/api/zaf/pi/session'){assert.equal(options.method,'GET');return new Response(JSON.stringify({user:null}));}
      assert.equal(url,'/api/zaf/pi/auth');calls++;throw Error('must not verify after unmount');
    };
    const component=browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({locale:'en'});
    const cleanup=browser.effects[0]();component.props.children[0].props.onClick();await new Promise(resolve=>setImmediate(resolve));cleanup();
    complete({accessToken:'late-unmounted-token'});await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);assert.equal(browser.load('@/lib/zaf/pi/oauth').isPiSignInBusy(),false);
  }finally{browser.restore();}
});

test("two rendered headers cannot start concurrent native authentication",async()=>{
  const browser=mockBrowser('PiBrowser');let calls=0,finish;
  try {
    browser.fakeWindow.Pi={init:async()=>{},getPiHostAppInfo:async()=>({hostApp:'pi-browser'}),authenticate:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}};
    globalThis.fetch=async()=>new Response(JSON.stringify({user:{username:'pioneer'}}));
    const Component=browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn;
    const first=Component({locale:'en'}),second=Component({locale:'en'});
    first.props.children[0].props.onClick();second.props.children[0].props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
    finish({accessToken:'fixture-token'});await new Promise(resolve=>setImmediate(resolve));assert.equal(browser.load('@/lib/zaf/pi/oauth').isPiSignInBusy(),false);
  }finally{browser.restore();}
});

test("Pi route stops before upstream on local rate limiting or missing session secret",async()=>{
  const prior=globalThis.fetch;let calls=0;
  const request=()=>new Request('https://zaf-tech.invalid/api',{method:'POST',headers:{origin:'https://zaf-tech.invalid','content-type':'application/json'},body:JSON.stringify({accessToken:'fixture'})});
  try {
    globalThis.fetch=async()=>{calls++;throw Error('unexpected');};
    for(const blocked of [true,false]) {
      const route=loader({'next/server':responseMock,'@/lib/zaf/rate-limit':{enforceRateLimit:async()=>blocked?{status:429}:null},'@/lib/zaf/pi/runtime':{getPiRuntimeConfig:()=>({compatible:false})}})('@/app/api/zaf/pi/auth/route');
      assert.equal((await route.POST(request())).status,blocked?429:503);
    }
    assert.equal(calls,0);
  }finally{globalThis.fetch=prior;}
});

test("stalled auth request body is cancelled and returns a bounded timeout",async()=>{
  const prior=globalThis.setTimeout;
  try {
    globalThis.setTimeout=cb=>prior(cb,1);
    const {readPiAuthInput}=loader()('@/lib/zaf/pi/auth-input');let cancelled=false;
    const request=new Request('https://zaf-tech.invalid/api',{method:'POST',headers:{origin:'https://zaf-tech.invalid','content-type':'application/json'},body:new ReadableStream({cancel(){cancelled=true;}}),duplex:'half'});
    await assert.rejects(readPiAuthInput(request),error=>error.status===408);assert.equal(cancelled,true);
  }finally{globalThis.setTimeout=prior;}
});

test("ledger freshness ages without a new request and rejects invalid or future timestamps", () => {
  const { observationFreshness } = loader()("@/lib/zaf/freshness");
  const time = Date.parse("2026-10-16T09:00:00Z");
  const stamp = new Date(time).toISOString();
  assert.equal(observationFreshness(stamp, time).state, "fresh");
  assert.equal(observationFreshness(stamp, time + 31_000).state, "aging");
  assert.equal(observationFreshness(stamp, time + 121_000).state, "stale");
  assert.equal(observationFreshness("invalid", time).state, "unknown");
  assert.equal(observationFreshness(new Date(time + 60_000).toISOString(), time).state, "unknown");
});

test("a successful request for an old ledger is stale and never stored as a new measurement", async () => {
  let writes = 0;
  const snapshot = {generatedAt:new Date().toISOString(),latestLedger:{sequence:"42",closedAt:"2020-01-01T00:00:00Z"},recentLedgers:[],metrics:{latestProtocolVersion:28},error:null};
  const {getUnifiedObservation} = loader({
    "@/lib/zaf/horizon-client":{getZafSnapshot:async()=>snapshot},
    "@/lib/zaf/ecosystem":{getEcosystemSnapshot:async()=>null},
    "@/lib/zaf/observation-history":{saveObservationSnapshot:async()=>{writes++;return true;}},
  })("@/lib/zaf/observation-engine");
  const result = await getUnifiedObservation({force:true});
  assert.equal(result.freshness.state,"stale");
  assert.equal(result.historyStored,false);
  assert.equal(writes,0);
});

test("monitor status distinguishes a fresh collection then from current stored data age", async () => {
  const route=loader({
    "next/server":responseMock,
    "@/lib/zaf/monitor-status":{readMonitorStatus:async()=>({storage:"available",latestScheduledRun:null})},
    "@/lib/zaf/observation-history":{getObservationHistory:async()=>[{generatedAt:"2020-01-01T00:00:00Z",freshnessState:"fresh"}]},
  })("@/app/api/zaf/status/route");
  const result=await route.GET();
  assert.equal(result.body.latestObservation.freshnessAtCollection,"fresh");
  assert.equal(result.body.latestObservation.freshness,"stale");
});

test("public address checksum rejects a same-length corruption", () => {
  const { isValidPublicAddress } = loader()("@/lib/zaf/public-address");
  const address = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  assert.equal(isValidPublicAddress(address), true);
  assert.equal(isValidPublicAddress(address.slice(0, -1) + "A"), false);
  assert.equal(isValidPublicAddress("S" + address.slice(1)), false);
});

test("transaction lookup distinguishes missing records, throttling and source failures", async () => {
  const original = globalThis.fetch;
  const id = "a".repeat(64);
  const route = loader({ "next/server": responseMock, "@/lib/zaf/rate-limit": { enforceRateLimit: async () => null } })("@/app/api/tools/transaction/route");
  try {
    for (const [sourceStatus, expected] of [[404,404],[429,429],[500,502],[403,502]]) {
      globalThis.fetch = async () => new Response(JSON.stringify({title:"Source error"}), {status:sourceStatus});
      assert.equal((await route.GET(new Request(`https://example.com/api?id=${id}`))).status, expected);
    }
    globalThis.fetch = async () => new Response(JSON.stringify({hash:id}));
    const result = await route.GET(new Request(`https://example.com/api?id=${id}`));
    assert.equal(result.body.found, true);
    assert.ok(result.body.checkedAt);
    assert.equal(result.body.sourceUrl, `https://api.mainnet.minepi.com/transactions/${id}`);
    globalThis.fetch = async () => new Response('{}');
    assert.equal((await route.GET(new Request(`https://example.com/api?id=${id}`))).status, 502);
  } finally { globalThis.fetch = original; }
});

test("Connector distinguishes active ledger protocol from binary support and handles v28 image tags", () => {
  const connector = require("./zaf-node-connector.cjs");
  assert.equal(connector.observedProtocol({ protocol_version: 28, ledger: { version: 27 } }, ""), 27);
  assert.equal(connector.parseProtocol("pinetwork/pi-node-docker:organization-mainnet-v1.0-p28.0.1"), 28);
  assert.equal(connector.protocolSupport("v28.0.1"), "supported");
  for (const value of [null, undefined, "", "not-a-version", 0, -1]) assert.equal(connector.protocolSupport(value), "unknown");
  assert.equal(connector.protocolSupport(29), "newer_or_unsupported");
});

test("iOS and Android local diagnostics do not try to contact a desktop on phone localhost", () => {
  const { isMobileConnectorUnavailable } = loader()("@/lib/zaf/local-connector-client");
  assert.equal(isMobileConnectorUnavailable("iPhone PiBrowser/1.17.1", "iPhone", 5), true);
  assert.equal(isMobileConnectorUnavailable("Android Chrome", "Linux arm", 5), true);
  assert.equal(isMobileConnectorUnavailable("Macintosh Safari", "MacIntel", 5), true);
  assert.equal(isMobileConnectorUnavailable("Windows Chrome", "Win32", 0), false);
});

test("protocol 27/28 transition and unfamiliar operations remain observable without inventing activation", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(JSON.stringify(url.endsWith("minepi.com/") ? { current_protocol_version: 27, supported_protocol_version: 28, core_supported_protocol_version: 28 } : { _embedded: { records: url.includes("/ledgers?") ? [28,27].map((version,index)=>({sequence:100-index,hash:"fixture",protocol_version:version,closed_at:`2026-10-14T10:00:0${5-index}Z`,successful_transaction_count:2,failed_transaction_count:0,operation_count:2})) : url.includes("/operations?") ? [{id:"1",type:"future_protocol_operation",transaction_successful:true}] : [] } }));
  try {
    const snapshot = await loader()("@/lib/zaf/horizon-client").getZafSnapshot();
    assert.equal(snapshot.protocol.current, 27);
    assert.equal(snapshot.protocol.horizonSupported, 28);
    assert.deepEqual(snapshot.metrics.protocolVersionDistribution.map(item=>item.version).sort(), [27,28]);
    assert.equal(snapshot.metrics.latestProtocolVersion, 28);
    assert.equal(snapshot.operations[0].type, "future_protocol_operation");
  } finally { globalThis.fetch = previousFetch; }
});

test("source failure retains an explicitly stale sample without recording a new historical measurement", async () => {
  let reads = 0, writes = 0;
  const now = new Date().toISOString();
  const snapshot = { generatedAt: now, latestLedger:{sequence:"42",closedAt:now}, recentLedgers:[], metrics:{ latestProtocolVersion:28 }, error:null };
  const load=loader({
    "@/lib/zaf/horizon-client":{getZafSnapshot:async()=>{reads++;return reads===1?snapshot:{...snapshot,latestLedger:null,error:"Source timed out"};}},
    "@/lib/zaf/ecosystem":{getEcosystemSnapshot:async()=>({generatedAt:now,apps:{items:[],totalCount:null},sources:[]})},
    "@/lib/zaf/observation-history":{saveObservationSnapshot:async()=>{writes++;return true;}},
  });
  const {getUnifiedObservation}=load("@/lib/zaf/observation-engine");
  const first=await Promise.all([getUnifiedObservation({force:true}),getUnifiedObservation({force:true})]);
  assert.equal(reads,1);assert.equal(first[0],first[1]);
  const failed=await getUnifiedObservation({force:true});
  assert.equal(failed.network.latestLedger.sequence,"42");
  assert.equal(failed.freshness.state,"stale");
  assert.equal(failed.historyStored,false);assert.equal(writes,1);
  assert.ok(failed.errors.includes("Source timed out"));
});

test("public monitor status reports unknown scheduled evidence rather than success", async () => {
  const route=loader({
    "next/server":responseMock,
    "@/lib/zaf/monitor-status":{readMonitorStatus:async()=>({storage:"available",latestScheduledRun:null})},
    "@/lib/zaf/observation-history":{getObservationHistory:async()=>[]},
  })("@/app/api/zaf/status/route");
  const result=await route.GET();
  assert.equal(result.body.access,"free_public");assert.equal(result.body.paymentsEnabled,false);
  assert.equal(result.body.monitoring.overdue,null);assert.equal(result.body.latestObservation,null);
});

test("Horizon mapping preserves native amounts and derives ledger transaction totals", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(JSON.stringify({ _embedded: { records: url.includes("/ledgers?") ? [{ sequence: 42, closed_at: "2026-10-14T10:00:00Z", successful_transaction_count: 2, failed_transaction_count: 3, operation_count: 2, protocol_version: null }] : url.includes("/operations?") ? [{ id: "1", type: "payment", asset_type: "native", amount: "12.5000000" }, { id: "2", type: "payment", asset_type: "credit_alphanum4", amount: "50.0000000" }] : [{ hash: "fixture", fee_charged: "100000", operation_count: null }] } }));
  try {
    const result = await loader()("@/lib/zaf/horizon-client").getZafSnapshot();
    assert.equal(result.latestLedger.transactionCount, 5);
    assert.equal(result.latestLedger.protocolVersion, null);
    assert.equal(result.operations[0].amountPi, 12.5);
    assert.equal(result.operations[1].amountPi, null);
    assert.equal(result.transactions[0].feePi, 0.01);
    assert.equal(result.transactions[0].operationCount, null);
  } finally { globalThis.fetch = previousFetch; }
});

test("Pi runtime rejects Mainnet Sandbox and inconsistent client/server settings", () => {
  const keys = ["PI_NETWORK", "PI_SDK_MODE", "NEXT_PUBLIC_PI_SDK_MODE"];
  const previous = keys.map(key => process.env[key]);
  const { getPiRuntimeConfig } = loader()("@/lib/zaf/pi/runtime");
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(getPiRuntimeConfig().compatible, true);
    process.env.PI_NETWORK = "mainnet";
    process.env.NEXT_PUBLIC_PI_SDK_MODE = "sandbox";
    assert.equal(getPiRuntimeConfig().compatible, false);
    process.env.PI_SDK_MODE = "hosted";
    assert.equal(getPiRuntimeConfig().compatible, false);
    process.env.NEXT_PUBLIC_PI_SDK_MODE = "hosted";
    assert.equal(getPiRuntimeConfig().compatible, true);
    process.env.PI_NETWORK = "invalid";
    assert.equal(getPiRuntimeConfig().compatible, false);
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});

test("verified Pi Browser shell is allowed while Sandbox requires explicit Testnet mode", async () => {
  const keys = ["PI_NETWORK", "PI_SDK_MODE", "NEXT_PUBLIC_PI_SDK_MODE"];
  const previous = keys.map(key => process.env[key]);
  const { default: config } = await import("../next.config.mjs");
  try {
    process.env.PI_NETWORK = "mainnet"; process.env.PI_SDK_MODE = "hosted";
    const rules = await config.headers();
    const hosted = rules[1].headers;
    const frameMatcher = new RegExp('^' + rules[1].source + '$');
    assert.equal(frameMatcher.test('/about'), true);
    assert.equal(frameMatcher.test('/signin/callback'), true);
    assert.equal(frameMatcher.test('/browser-check.html'), false);
    const diagnostic = rules.find(rule => rule.source === '/browser-check.html').headers;
    assert.equal(diagnostic.some(header => header.key === 'X-Frame-Options'), false);
    assert.equal(diagnostic.find(header => header.key === 'Content-Security-Policy').value.includes('frame-ancestors'), false);
    assert.equal(diagnostic.find(header => header.key === 'Cache-Control').value.includes('no-store'), true);
    assert.equal(hosted.some(header => header.key === "X-Frame-Options"), false);
    assert.equal(hosted.find(header => header.key === "Content-Security-Policy").value, "connect-src 'self' https://socialchain.app http://127.0.0.1:39100; frame-ancestors 'self' https://app-cdn.minepi.com https://*.pinet.com https://*.minepi.com https://appstudio-u7cm9zhmha0ruwv8.piappengine.com;");
    process.env.PI_NETWORK = "testnet"; process.env.PI_SDK_MODE = "sandbox";
    const sandbox = (await config.headers())[1].headers;
    assert.equal(sandbox.some(header => header.key === "X-Frame-Options"), false);
    assert.equal(sandbox.find(header => header.key === "Content-Security-Policy").value, "connect-src 'self' https://socialchain.app http://127.0.0.1:39100; frame-ancestors 'self' https://app-cdn.minepi.com https://*.pinet.com https://*.minepi.com https://appstudio-u7cm9zhmha0ruwv8.piappengine.com https://sandbox.minepi.com;");
    process.env.PI_NETWORK = "mainnet";
    assert.equal((await config.headers())[1].headers.find(header => header.key === "Content-Security-Policy").value, "connect-src 'self' https://socialchain.app http://127.0.0.1:39100; frame-ancestors 'self' https://app-cdn.minepi.com https://*.pinet.com https://*.minepi.com https://appstudio-u7cm9zhmha0ruwv8.piappengine.com;");
  } finally {
    keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
  }
});
test("standalone browser check reports frame origins even when iOS storage is blocked", () => {
  const html = fs.readFileSync(path.join(root, "public/browser-check.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const result = { textContent: "" };
  const fakeWindow = { top: {}, self: {}, location: { ancestorOrigins: ["https://wrapper.example/private?token=hidden"] }, fetch() {}, isSecureContext: true };
  for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(fakeWindow, key, { get() { throw new Error("Blocked"); } });
  vm.runInNewContext(script, { window: fakeWindow, document: { referrer: "https://wrapper.example/private?token=hidden", getElementById: () => result }, navigator: { userAgent: "PiBrowser fixture" }, URL });
  assert.match(result.textContent, /JavaScript: OK/);
  assert.match(result.textContent, /Frame: embedded/);
  assert.match(result.textContent, /Local storage: blocked/);
  assert.match(result.textContent, /Session storage: blocked/);
  assert.match(result.textContent, /Ancestor origins: https:\/\/wrapper.example/);
  assert.equal(result.textContent.includes("hidden"), false);
  assert.equal(html.includes("sdk.minepi.com"), false);
});

function loader(mocks = {}) {
  const cache = new Map();
  return function load(name, parent = root) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
    const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(parent, name);
    const file = [base, base + ".ts", base + ".tsx"].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    if (!file) throw new Error("Missing test module " + name);
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file, "utf8");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
    const module = { exports: {} }; cache.set(file, module);
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(dependency => load(dependency, path.dirname(file)), module, module.exports);
    return module.exports;
  };
}

test("URL checks reject private, shared, documentation, mapped and reserved addresses", () => {
  const { isSafeHttpUrl, isPublicIp } = loader()('@/lib/zaf/app-health');
  for (const ip of ["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.31.1.1", "192.168.1.1", "192.0.2.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::1", "::", "::ffff:127.0.0.1", "::ffff:c0a8:101", "fd00::1", "fe80::1", "ff02::1", "2001:db8::1", "2002:7f00:1::1"]) {
    assert.equal(isPublicIp(ip), false, ip);
    assert.equal(isSafeHttpUrl(`http://${ip.includes(":") ? `[${ip}]` : ip}/`), false, ip);
  }
  for (const url of ["http://localhost./", "http://service.local/", "http://service.home.arpa/", "https://user:password@example.com/", "https://example.com:8443/", "file:///etc/passwd", "http://2130706433/", "http://0x7f000001/"]) assert.equal(isSafeHttpUrl(url), false, url);
  assert.equal(isSafeHttpUrl("https://example.com/"), true);
  assert.equal(isPublicIp("8.8.8.8"), true);
  assert.equal(isPublicIp("2606:4700:4700::1111"), true);
});

test("a validated DNS address is pinned to the actual connection and redirects are not followed", async () => {
  let dnsCalls = 0, requestCalls = 0, pinned;
  const request = (_url, options, callback) => {
    requestCalls++;
    options.lookup("example.com", {}, (_error, address, family) => { pinned = { address, family }; });
    const req = new EventEmitter();
    req.end = () => callback({ statusCode: 302, destroy() {} });
    return req;
  };
  const load = loader({
    "node:dns/promises": { lookup: async () => { dnsCalls++; return [{ address: "93.184.215.14", family: 4 }]; } },
    "node:http": { request }, "node:https": { request },
  });
  const result = await load('@/lib/zaf/app-health').checkAppHealth("https://example.com/");
  assert.equal(dnsCalls, 1);
  assert.equal(requestCalls, 1);
  assert.deepEqual(pinned, { address: "93.184.215.14", family: 4 });
  assert.equal(result.redirect, true);
  assert.equal(result.reachable, true);
  assert.equal(result.ok, false);
});

test("mixed public/private DNS answers are rejected before connecting", async () => {
  let connected = false;
  const load = loader({
    "node:dns/promises": { lookup: async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }] },
    "node:https": { request: () => { connected = true; throw new Error("Unexpected connection"); } },
  });
  const result = await load('@/lib/zaf/app-health').checkAppHealth("https://example.com/");
  assert.equal(connected, false);
  assert.equal(result.reachable, false);
  assert.equal(result.status, null);
});

const responseMock = { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200, headers: options?.headers, cookies: { values: [], set(...args) { this.values.push(args); } } }) } };
test("rate limits still apply without a database and cannot be reset by changing user agent", async () => {
  const load = loader({ "next/server": responseMock, "@/lib/zaf/db": { getZafDb: () => null, ensureZafSchema: async () => false } });
  const { consumeRateLimit, enforceRateLimit } = load('@/lib/zaf/rate-limit');
  const request = agent => new Request("https://example.com/api", { headers: { "x-real-ip": "203.0.113.4", "user-agent": agent } });
  assert.equal((await consumeRateLimit(request("A"), "limited", { limit: 2, windowMs: 60_000 })).allowed, true);
  assert.equal((await consumeRateLimit(request("B"), "limited", { limit: 2, windowMs: 60_000 })).allowed, true);
  const blocked = await enforceRateLimit(request("C"), "limited", { limit: 2, windowMs: 60_000 });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers["Retry-After"]) > 0);
  assert.equal((await consumeRateLimit(request("A"), "required-db", { limit: 2, windowMs: 60_000, failClosed: true })).allowed, false);
});

test("fallback rate-limit windows expire independently across scopes", async () => {
  const load = loader({ "next/server": responseMock, "@/lib/zaf/db": { getZafDb: () => null, ensureZafSchema: async () => false } });
  const { consumeRateLimit } = load('@/lib/zaf/rate-limit');
  const originalNow = Date.now; let time = 0; Date.now = () => time;
  try {
    const request = new Request("https://example.com");
    await consumeRateLimit(request, "long", { limit: 1, windowMs: 600_000 });
    time = 61_000;
    await consumeRateLimit(request, "short", { limit: 1, windowMs: 60_000 });
    assert.equal((await consumeRateLimit(request, "long", { limit: 1, windowMs: 600_000 })).allowed, false);
    time = 600_000;
    assert.equal((await consumeRateLimit(request, "long", { limit: 1, windowMs: 600_000 })).allowed, true);
  } finally { Date.now = originalNow; }
});

test("OAuth return paths cannot escape the app or loop into its callback", () => {
  const { getSafePiSignInReturnPath } = loader()('@/lib/zaf/pi/oauth');
  const fallback = "/?section=overview&subtab=Pulse";
  for (const target of ["https://evil.example/", "//evil.example/", "/\\evil.example/", "/%5cevil.example/", "/%2f%2fevil.example/", "/signin/callback", "/signin/%63allback", "/signin/../signin/callback", "/\nevil.example", "/%ZZ", null]) assert.equal(getSafePiSignInReturnPath(target), fallback, String(target));
  assert.equal(getSafePiSignInReturnPath("/?section=network&subtab=Network"), "/?section=network&subtab=Network");
});

function mockBrowser(userAgent = "Chrome") {
  const storage = new Map(), navigations = [], effects = [], messages = [];
  const values = { window: globalThis.window, navigator: globalThis.navigator, sessionStorage: globalThis.sessionStorage, fetch: globalThis.fetch };
  const fakeWindow = { parent: {}, location: { origin: "https://zaf-tech.invalid", pathname: "/", search: "", hostname: "zaf-tech.invalid", hash: "", assign: value => navigations.push(value), replace: value => navigations.push(value) }, history: { replaceState: (...args) => navigations.push(args[2]) }, crypto: webcrypto, setTimeout, clearTimeout, setInterval, clearInterval, addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(globalThis, "window", { configurable: true, value: fakeWindow, writable: true });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent }, writable: true });
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const react = { useEffect: callback => effects.push(callback), useRef: value => ({ current: value }), useState: value => [value, next => messages.push(next)] };
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const load = loader({ react, "react/jsx-runtime": jsx, "@/lib/zaf/i18n": { translate: (_locale, en) => en } });
  return { storage, navigations, effects, messages, fakeWindow, load, restore() { for (const [key, value] of Object.entries(values)) { if (value === undefined) delete globalThis[key]; else Object.defineProperty(globalThis, key, { configurable: true, value, writable: true }); } } };
}

test("callback credentials are cleared even if browser storage throws", async () => {
  const browser = mockBrowser();
  try {
    browser.fakeWindow.location.pathname = "/signin/callback";
    browser.fakeWindow.location.hash = "#access_token=test-fixture&state=test-state";
    sessionStorage.getItem = () => { throw new Error("Storage blocked"); };
    browser.load('@/app/signin/callback/page').default();
    browser.effects[0]();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(browser.navigations, ["/signin/callback"]);
    assert.ok(browser.messages.some(value => typeof value === "string" && value.includes("storage is unavailable")));
  } finally { browser.restore(); }
});

for (const hostApp of ["pi-browser", "pi-node"]) test(`Pi host ${hostApp} initializes before native auth and trusts server identity`, async () => {
  const browser = mockBrowser("PiBrowser"); const calls = [];
  try {
    browser.fakeWindow.Pi = {
      init: async () => calls.push("init"),
      getPiHostAppInfo: async () => { calls.push("host"); return { hostApp }; },
      authenticate: async scopes => { assert.deepEqual(scopes, ["username"]); calls.push("authenticate"); return { accessToken: "test-fixture-token", user: { username: "untrusted-display" } }; },
    };
    globalThis.fetch = async (url, options) => { if(url==='/api/zaf/pi/session'){assert.equal(options.method,'GET');calls.push('confirm-session');return new Response(JSON.stringify({user:{username:'verified-display'}}));} assert.equal(url, "/api/zaf/pi/auth"); assert.equal(JSON.parse(options.body).accessToken, "test-fixture-token"); calls.push("verify"); return new Response(JSON.stringify({ user: { username: "verified-display" } })); };
    const component = browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({ locale: "en" });
    component.props.children[0].props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ["init", "host", "authenticate", "verify", "confirm-session"]);
    assert.ok([...browser.storage.values()].some(value => value.includes("verified-display")));
    assert.ok(![...browser.storage.values()].includes("test-fixture-token"));
    assert.ok(![...browser.storage.values()].includes("untrusted-display"));
  } finally { browser.restore(); }
});

test("ordinary browsers can enter OAuth if native SDK initialization fails", async () => {
  const browser = mockBrowser("Chrome"); const previousId = process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID;
  try {
    process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID = "test-fixture-client";
    browser.fakeWindow.Pi = { init: async () => { throw new Error("SDK fixture failure"); } };
    const component = browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({ locale: "en" });
    component.props.children[0].props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(browser.navigations.length, 1);
    const url = new URL(browser.navigations[0]);
    assert.equal(url.origin, "https://accounts.pinet.com");
    assert.equal(url.searchParams.get("scope"), "username");
    assert.equal(url.searchParams.get("redirect_uri"), "https://zaf-tech.invalid/signin/callback");
    assert.equal(url.searchParams.get("state").length, 48);
  } finally { if (previousId === undefined) delete process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID; else process.env.NEXT_PUBLIC_PI_SIGNIN_CLIENT_ID = previousId; browser.restore(); }
});

test("cancelled native sign-in clears the old display and a retry can verify again", async () => {
  const browser=mockBrowser("PiBrowser"); let attempts=0, verifications=0;
  try {
    const keys=browser.load('@/lib/zaf/pi/oauth');
    browser.storage.set(keys.PI_SIGNIN_VERIFIED_USERNAME_KEY,"previous-account");
    browser.fakeWindow.Pi={init:async()=>{},getPiHostAppInfo:async()=>({hostApp:"pi-browser"}),authenticate:async()=>{if(++attempts===1)throw new Error("cancelled");return {accessToken:"retry-fixture-token"};}};
    globalThis.fetch=async()=>{verifications++;return new Response(JSON.stringify({user:{username:"retry-account"}}));};
    const component=browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({locale:"en"});
    component.props.children[0].props.onClick(); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(verifications,0); assert.equal(browser.storage.has(keys.PI_SIGNIN_VERIFIED_USERNAME_KEY),false);
    component.props.children[0].props.onClick(); await new Promise(resolve=>setImmediate(resolve));
    assert.equal(verifications,2); assert.equal(JSON.parse(browser.storage.get(keys.PI_SIGNIN_VERIFIED_USERNAME_KEY)).username,"retry-account");
    keys.clearPiDisplay(); assert.equal(browser.storage.has(keys.PI_SIGNIN_VERIFIED_USERNAME_KEY),false);
    assert.ok(![...browser.storage.values()].includes("retry-fixture-token"));
  } finally {browser.restore();}
});

test("OAuth denial consumes state and clears the URL without verifying an identity", async () => {
  const browser=mockBrowser(); let calls=0;
  try {
    const keys=browser.load('@/lib/zaf/pi/oauth');
    browser.storage.set(keys.PI_SIGNIN_STATE_KEY,"cancel-fixture");
    browser.storage.set(keys.PI_SIGNIN_STARTED_KEY,String(Date.now()));
    browser.fakeWindow.location.pathname="/signin/callback";
    browser.fakeWindow.location.hash="#error=access_denied&state=cancel-fixture";
    globalThis.fetch=async()=>{calls++;throw new Error("Must not fetch");};
    browser.load('@/app/signin/callback/page').default(); browser.effects[0]();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls,0); assert.equal(browser.storage.has(keys.PI_SIGNIN_STATE_KEY),false);
    assert.deepEqual(browser.navigations,["/signin/callback"]);
    assert.ok(browser.messages.some(value=>typeof value==="string"&&value.includes("cancelled")));
  } finally {browser.restore();}
});

test("JSON request deadlines cover stalled response bodies and support cancellation", async () => {
  const { requestJson } = loader()('@/lib/zaf/client-request'); const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => ({ json: () => new Promise((_resolve, reject) => { if (options.signal.aborted) reject(new Error("aborted")); else options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }); }) });
    await assert.rejects(requestJson("/fixture", {}, 20), /aborted/);
    const controller = new AbortController();
    const result = requestJson("/fixture", { signal: controller.signal }, 1000); controller.abort();
    await assert.rejects(result, /aborted/);
  } finally { globalThis.fetch = originalFetch; }
});

test("observations return Radar and change data from the same collected snapshot", async () => {
  const ecosystem = { generatedAt: "2026-10-14T03:00:00Z" };
  const observation = { generatedAt: ecosystem.generatedAt, ecosystem, network: { latestLedger: { sequence: "100" } } };
  const load = loader({
    "next/server": responseMock,
    "@/lib/zaf/rate-limit": { enforceRateLimit: async () => null },
    "@/lib/zaf/observation-engine": { getUnifiedObservation: async () => observation },
    "@/lib/zaf/radar": { getRadarObservation: async value => { assert.equal(value, observation); return { generatedAt: value.generatedAt }; } },
    "@/lib/zaf/ecosystem-changes": { getEcosystemChanges: async value => { assert.equal(value, ecosystem); return { generatedAt: value.generatedAt }; } },
  });
  const result = await load('@/app/api/zaf/observations/route').GET({ nextUrl: new URL("https://example.com/api") });
  assert.equal(result.body.radar.generatedAt, result.body.generatedAt);
  assert.equal(result.body.ecosystemChanges.generatedAt, result.body.ecosystem.generatedAt);
});

test("change comparison skips a newly saved current snapshot", async () => {
  const current = { generatedAt: "2026-10-14T03:05:00Z", apps: { totalCount: 1 }, sources: [], signals: [], defi: { launchpad: { status: "testnet" }, dex: { status: "testnet" }, amm: { status: "testnet" }, mainnetTrading: { status: "restricted" } } };
  const previous = { ...current, generatedAt: "2026-10-14T03:00:00Z", apps: { totalCount: 0 } };
  const load = loader({
    "@/lib/zaf/observation-engine": { getUnifiedObservation: async () => { throw new Error("Should reuse observation"); } },
    "@/lib/zaf/ecosystem-history": { isEcosystemHistoryConfigured: () => true, getEcosystemSnapshotHistory: async () => [{ generatedAt: current.generatedAt, payload: current }, { generatedAt: previous.generatedAt, payload: previous }] },
  });
  const result = await load('@/lib/zaf/ecosystem-changes').getEcosystemChanges(current);
  assert.equal(result.comparedAt, previous.generatedAt);
  assert.equal(result.changes[0].type, "app_count");
  assert.equal(result.changes[0].previous, 0);
  assert.equal(result.changes[0].current, 1);
});

test("session API reads encrypted identity, forbids foreign logout and clears the cookie", async()=>{
  const prior=process.env.ZAF_PI_SESSION_SECRET;
  try {
    process.env.ZAF_PI_SESSION_SECRET='ab'.repeat(32);
    const {NextRequest}=require('next/server');
    const load=loader();const api=load('@/lib/zaf/pi/session'),route=load('@/app/api/zaf/pi/session/route');
    const cookie=api.sealPiSession({uid:'fixture-uid',username:'pioneer'});
    const req=(method='GET',origin='https://zaf-tech.invalid',value=cookie)=>new NextRequest('https://zaf-tech.invalid/api/zaf/pi/session',{method,headers:{origin,cookie:`${api.PI_SESSION_COOKIE}=${value}`}});
    const response=await route.GET(req());assert.deepEqual(await response.json(),{user:{username:'pioneer'}});assert.match(response.headers.get('cache-control'),/no-store/);
    assert.deepEqual(await (await route.GET(req('GET',undefined,'bad'))).json(),{user:null});
    assert.equal((await route.DELETE(req('DELETE','https://evil.example'))).status,403);
    const cleared=await route.DELETE(req('DELETE'));assert.equal(cleared.status,200);assert.match(cleared.headers.get('set-cookie'),/Max-Age=0/);assert.match(cleared.headers.get('set-cookie'),/HttpOnly/);
  } finally {if(prior===undefined)delete process.env.ZAF_PI_SESSION_SECRET;else process.env.ZAF_PI_SESSION_SECRET=prior;}
});

test("App Studio SDK awaits v2 initialization without a sandbox option and requests username only",async()=>{
  const browser=mockBrowser('PiBrowser');const calls=[];let finish;
  try {
    browser.fakeWindow.Pi={init:options=>{calls.push(options);return new Promise(resolve=>{finish=resolve;});},authenticate:async(scopes,callback)=>{assert.deepEqual(scopes,['username']);assert.equal(typeof callback,'function');return {accessToken:'fixture'};}};
    const sdk=browser.load('@/lib/zaf/pi/sdk');const pending=sdk.initializePiSdk();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[{version:'2.0'}]);finish();const pi=await pending;assert.equal((await sdk.authenticatePi(pi)).accessToken,'fixture');assert.equal(await sdk.initializePiSdk(),pi);assert.equal(calls.length,1);
  }finally{browser.restore();}
});

test("App Studio validation file contains exactly the supplied token bytes",()=>{
  assert.equal(fs.readFileSync(path.join(root,'public/pi-app-validation.txt'),'utf8'),'piappstudio-W9wJy3EZLX1ybO39fB0uKWEfYtl_N7wW');
});

test("Pi verification failures expose only a safe reference for HTTP and connection errors", async()=>{
  for(const status of [401,403,429,502,503,null]) {
    const browser=mockBrowser('PiBrowser');
    try {
      browser.fakeWindow.Pi={init:async()=>{},getPiHostAppInfo:async()=>({hostApp:'pi-browser'}),authenticate:async()=>({accessToken:'sensitive-fixture-token'})};
      globalThis.fetch=async()=>{if(status===null)throw new TypeError('private transport details');return new Response(JSON.stringify({error:'private provider details'}),{status});};
      const component=browser.load('@/components/zaf-pi-sign-in').ZafPiSignIn({locale:'en'});component.props.children[0].props.onClick();await new Promise(resolve=>setImmediate(resolve));
      const expected=status===null?'ZAF-PI-CONNECTION':`ZAF-PI-${status}`;
      assert.ok(browser.messages.some(value=>typeof value==='string'&&value.includes(expected)),expected);
      assert.ok(!browser.messages.some(value=>typeof value==='string'&&/sensitive-fixture-token|private provider details|private transport details/.test(value)));
    }finally{browser.restore();}
  }
});

test("one observation clock ages every consumer and refreshes on page resume",()=>{
  const prior={window:globalThis.window,document:globalThis.document,now:Date.now};let clock=Date.parse('2026-10-18T00:00:00Z'),state=null,effect,tick,cleared=false;const events=new Map();
  try{
    Date.now=()=>clock;globalThis.window={setInterval:cb=>{tick=cb;return 42;},clearInterval:id=>{cleared=id===42;},addEventListener:(name,cb)=>events.set(name,cb),removeEventListener:name=>events.delete(name)};
    globalThis.document={addEventListener:(name,cb)=>events.set(name,cb),removeEventListener:name=>events.delete(name)};
    const hook=loader({react:{useState:()=>[state,value=>{state=value;}],useEffect:cb=>{effect=cb;}}})('@/lib/zaf/use-observation-freshness').useObservationFreshness;
    const timestamp=new Date(clock).toISOString();assert.equal(hook(timestamp,false).ready,false);const cleanup=effect();
    assert.equal(hook(timestamp,false).state,'fresh');clock+=45000;tick();assert.equal(hook(timestamp,false).state,'aging');assert.equal(hook(timestamp,false).ageSeconds,45);
    clock+=100000;events.get('pageshow')();assert.equal(hook(timestamp,false).state,'stale');assert.equal(hook(timestamp,false).ageSeconds,145);
    clock+=15000;events.get('visibilitychange')();assert.equal(hook(timestamp,false).ageSeconds,160);assert.equal(hook(new Date(clock).toISOString(),true).state,'stale');
    cleanup();assert.equal(cleared,true);assert.equal(events.size,0);
  }finally{Date.now=prior.now;globalThis.window=prior.window;globalThis.document=prior.document;}
});
