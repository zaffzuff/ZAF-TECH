import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as stellar from "@stellar/stellar-sdk";

const require = createRequire(import.meta.url);
function loader(mocks = {}) {
  const cache = new Map();
  function load(name, parent = path.join(process.cwd(), "fixture.ts")) {
    if (name in mocks) return mocks[name];
    if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
    const base = name.startsWith("@/") ? path.join(process.cwd(),name.slice(2)) : path.resolve(path.dirname(parent),name);
    const file = [base,base+".ts",base+".tsx"].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
    if(cache.has(file))return cache.get(file);
    const output=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const exports={};cache.set(file,exports);
    new Function("require","module","exports",output)(child=>load(child,file),{exports},exports);
    return exports;
  }
  return load;
}
const flow=loader()("@/lib/zaf/pi/a2u-flow");
const source="G"+"A".repeat(55), destination="G"+"B".repeat(55);
function fixture() {
  const rows=new Map(),calls=[];
  const payment={identifier:"payment-fixture",user_uid:"trusted-user",amount:.01,memo:"test",network:"Pi Testnet",direction:"app_to_user",from_address:source,to_address:destination,metadata:{campaign:flow.A2U_CAMPAIGN,claim:"claim-key"},status:{cancelled:false,user_cancelled:false,transaction_verified:false,developer_completed:false},transaction:null};
  let landed=false, incomplete=[];
  const store={
    get:async key=>rows.has(key)?structuredClone(rows.get(key)):null,
    save:async claim=>{calls.push("save:"+claim.state);rows.set(claim.key,structuredClone(claim));},
    count:async()=>[...rows.values()].filter(r=>r.state!=="rejected").length,
    activeOther:async key=>[...rows.values()].some(r=>r.key!==key&&!["complete","rejected"].includes(r.state)),
    usedDestination:async (address,key)=>[...rows.values()].some(r=>r.destination===address&&r.key!==key),
  };
  const gateway={
    create:async()=>{calls.push("create");return structuredClone(payment);},
    incomplete:async()=>incomplete,
    get:async()=>structuredClone(payment),
    cancel:async()=>{calls.push("cancel");},
    sign:async()=>{calls.push("sign");return {xdr:"signed-exact-envelope",txid:"a".repeat(64),expiresAt:99999};},
    submit:async xdr=>{assert.equal(rows.get("claim-key").xdr,xdr);calls.push("submit:"+xdr);landed=true;},
    confirmed:async()=>landed,
    complete:async()=>{calls.push("complete");return {...structuredClone(payment),status:{...payment.status,transaction_verified:true,developer_completed:true},transaction:{txid:"a".repeat(64),verified:true}};},
  };
  return {rows,calls,payment,store,gateway,input:{uid:"trusted-user",key:"claim-key",source,wallets:[destination],store,gateway,now:()=>100},setIncomplete:values=>{incomplete=values;},setLanded:value=>{landed=value;}};
}

test("A2U is disabled without every setting, on Mainnet, and with pooled databases",()=>{
  const {a2uConfig}=loader()("@/lib/zaf/pi/a2u-config");
  const env={PI_NETWORK:"testnet",PI_TESTNET_A2U_ENABLED:"true",PI_TESTNET_API_KEY:"fixture",PI_TESTNET_WALLET_SECRET:"S"+"A".repeat(55),PI_TESTNET_DATABASE_URL:"postgres://user:pass@db.example/test",PI_TESTNET_A2U_WALLETS:destination};
  assert.equal(a2uConfig(env).ready,true);
  for(const key of Object.keys(env)){const missing={...env};delete missing[key];assert.equal(a2uConfig(missing).ready,false,key);}
  assert.equal(a2uConfig({...env,PI_NETWORK:"mainnet"}).ready,false);
  assert.equal(a2uConfig({...env,PI_TESTNET_DATABASE_URL:"postgres://user:pass@db-pooler.example/test"}).ready,false);
  assert.equal(a2uConfig({...env,PI_TESTNET_A2U_WALLETS:Array.from({length:6},(_,i)=>"G"+String.fromCharCode(65+i).repeat(55)).join(",")}).ready,false);
});

test("happy path persists the exact envelope before sending and requires Pi completion",async()=>{
  const f=fixture();const claim=await flow.runA2uClaim(f.input);
  assert.equal(claim.state,"complete");
  assert.ok(f.calls.indexOf("save:signed")<f.calls.indexOf("submit:signed-exact-envelope"));
  assert.ok(f.calls.indexOf("save:submitted")<f.calls.indexOf("complete"));
  assert.ok(f.calls.indexOf("complete")<f.calls.indexOf("save:complete"));
});
test("repeating a completed claim returns its receipt without another transfer",async()=>{
  const f=fixture();await flow.runA2uClaim(f.input);const calls=f.calls.length;
  assert.equal((await flow.runA2uClaim(f.input)).state,"complete");assert.equal(f.calls.length,calls);
});
test("wrong network, recipient identity, source, amount, direction or metadata never gets signed",async()=>{
  for(const change of [{network:"Pi Network"},{user_uid:"attacker"},{from_address:destination},{amount:1},{direction:"user_to_app"},{metadata:{campaign:"other",claim:"claim-key"}}]){
    const f=fixture();Object.assign(f.payment,change);await assert.rejects(flow.runA2uClaim(f.input),{code:"PAYMENT_MISMATCH"});
    assert.equal(f.calls.includes("sign"),false);assert.equal(f.calls.some(x=>x.startsWith("submit:")),false);
  }
});
test("a wallet outside the private allowlist is cancelled before any signing",async()=>{
  const f=fixture();f.input.wallets=[source];await assert.rejects(flow.runA2uClaim(f.input),{code:"WALLET_NOT_ELIGIBLE"});
  assert.equal(f.rows.get("claim-key").state,"rejected");assert.ok(f.calls.includes("cancel"));assert.equal(f.calls.includes("sign"),false);
});
test("a different identity cannot receive a second test at the same wallet",async()=>{
  const f=fixture();f.rows.set("other",{key:"other",state:"complete",destination});
  await assert.rejects(flow.runA2uClaim(f.input),{code:"WALLET_NOT_ELIGIBLE"});assert.equal(f.calls.includes("sign"),false);
});
test("sixth reservation is refused before creating a Pi payment",async()=>{
  const f=fixture();for(let i=0;i<5;i++)f.rows.set(String(i),{key:String(i),state:"complete"});
  await assert.rejects(flow.runA2uClaim(f.input),{code:"CAMPAIGN_FULL"});assert.equal(f.calls.includes("create"),false);
});
test("an ambiguous creation is reconciled rather than creating a second payment",async()=>{
  const f=fixture();f.gateway.create=async()=>{f.calls.push("create");throw new Error("lost response");};
  await assert.rejects(flow.runA2uClaim(f.input));assert.equal(f.rows.get("claim-key").state,"creating");
  f.setIncomplete([structuredClone(f.payment)]);assert.equal((await flow.runA2uClaim(f.input)).state,"complete");
  assert.equal(f.calls.filter(x=>x==="create").length,1);
});
test("unknown creation outcome requires review and is never blindly recreated",async()=>{
  const f=fixture();f.gateway.create=async()=>{f.calls.push("create");throw new Error("lost response");};
  await assert.rejects(flow.runA2uClaim(f.input));await assert.rejects(flow.runA2uClaim(f.input),{code:"REVIEW_REQUIRED"});
  assert.equal(f.calls.filter(x=>x==="create").length,1);
});
test("lost blockchain response resumes using the stored hash without paying again",async()=>{
  const f=fixture();f.gateway.submit=async xdr=>{f.calls.push("submit:"+xdr);f.setLanded(true);throw new Error("lost response");};
  await assert.rejects(flow.runA2uClaim(f.input));assert.equal(f.rows.get("claim-key").state,"signed");
  assert.equal((await flow.runA2uClaim(f.input)).state,"complete");assert.equal(f.calls.filter(x=>x.startsWith("submit:")).length,1);
});
test("lost completion response retries completion without another signing or transfer",async()=>{
  const f=fixture();const complete=f.gateway.complete;let calls=0;
  f.gateway.complete=async()=>{if(++calls===1)throw new Error("lost completion");return complete();};
  await assert.rejects(flow.runA2uClaim(f.input));assert.equal(f.rows.get("claim-key").state,"submitted");
  assert.equal((await flow.runA2uClaim(f.input)).state,"complete");assert.equal(f.calls.filter(x=>x==="sign").length,1);assert.equal(f.calls.filter(x=>x.startsWith("submit:")).length,1);
});
test("expired envelopes require review without rebuilding or sending a replacement",async()=>{
  const f=fixture();f.gateway.submit=async()=>{throw new Error("offline");};await assert.rejects(flow.runA2uClaim(f.input));
  f.input.now=()=>100000;await assert.rejects(flow.runA2uClaim(f.input),{code:"REVIEW_REQUIRED"});assert.equal(f.calls.filter(x=>x==="sign").length,1);
});
test("Pi's incomplete verification is never reported as completion",async()=>{
  const f=fixture();f.gateway.complete=async()=>structuredClone(f.payment);
  await assert.rejects(flow.runA2uClaim(f.input),{code:"CONFIRMATION_PENDING"});assert.equal(f.rows.get("claim-key").state,"submitted");
});
test("unconfirmed chain records cannot be completed or reported as paid",async()=>{
  const f=fixture();f.gateway.confirmed=async()=>false;await assert.rejects(flow.runA2uClaim(f.input),{code:"CONFIRMATION_PENDING"});assert.equal(f.calls.includes("complete"),false);
});
test("an interrupted payment blocks other users instead of risking source sequence races",async()=>{
  const f=fixture();f.rows.set("other",{key:"other",state:"signed"});await assert.rejects(flow.runA2uClaim(f.input),{code:"ANOTHER_TEST_PENDING"});assert.equal(f.calls.includes("create"),false);
});
test("a failed durable save prevents submission of an unrecorded envelope",async()=>{
  const f=fixture();const save=f.store.save;f.store.save=async claim=>{if(claim.state==="signed")throw new Error("database unavailable");return save(claim);};
  await assert.rejects(flow.runA2uClaim(f.input));assert.equal(f.calls.some(x=>x.startsWith("submit:")),false);
});

test("real SDK envelopes bind the exact Pi payment memo, amount, recipient and Testnet passphrase",async()=>{
  const sourceKey=stellar.Keypair.random(),recipient=stellar.Keypair.random();
  const prior=globalThis.fetch;
  const {makeTestnetGateway}=loader({"@stellar/stellar-sdk":stellar})("@/lib/zaf/pi/a2u-server");
  const urls=[];
  try {
    globalThis.fetch=async(url)=>{
      urls.push(url);assert.ok(url.startsWith("https://api.testnet.minepi.com/"));
      const data=url.endsWith("/fee_stats")?{last_ledger_base_fee:"100000"}:{account_id:url.split("/").at(-1),sequence:"123"};
      return new Response(JSON.stringify(data));
    };
    const envelope=await makeTestnetGateway(sourceKey).sign({...fixture().payment,from_address:sourceKey.publicKey(),to_address:recipient.publicKey()});
    const tx=stellar.TransactionBuilder.fromXDR(envelope.xdr,"Pi Testnet");
    assert.equal(Buffer.from(tx.memo.value).toString("utf8"),"payment-fixture");assert.equal(tx.operations.length,1);assert.equal(tx.operations[0].amount,"0.0100000");assert.equal(tx.operations[0].destination,recipient.publicKey());
    assert.equal(Buffer.from(tx.hash()).toString("hex"),envelope.txid);
    assert.equal(sourceKey.verify(tx.hash(),tx.signatures[0].signature),true);
    const wrong=stellar.TransactionBuilder.fromXDR(envelope.xdr,"Pi Network");
    assert.equal(sourceKey.verify(wrong.hash(),wrong.signatures[0].signature),false);
    assert.equal(urls.length,3);
  } finally {globalThis.fetch=prior;}
});

test("identity verification requires explicit wallet-sharing permission from Pi",async()=>{
  const prior=globalThis.fetch;
  const {verifyA2uIdentity}=loader({"@stellar/stellar-sdk":stellar})("@/lib/zaf/pi/a2u-server");
  try {
    for(const scopes of [["username"],["username","wallet_address"]]){
      globalThis.fetch=async(url,options)=>{assert.equal(url,"https://api.minepi.com/v2/me");assert.equal(options.headers.Authorization,"Bearer fixture");return new Response(JSON.stringify({uid:"trusted-user",credentials:{scopes}}));};
      if(scopes.length===1)await assert.rejects(verifyA2uIdentity("fixture"),{code:"RECEIVE_PERMISSION_REQUIRED"});else assert.equal(await verifyA2uIdentity("fixture"),"trusted-user");
    }
  } finally {globalThis.fetch=prior;}
});

test("claim endpoint rejects foreign origins and ignores caller-chosen transfer data",async()=>{
  let claimed;
  const route=loader({
    "next/server":{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    "@/lib/zaf/rate-limit":{enforceRateLimit:async()=>null},
    "@/lib/zaf/pi/a2u-config":{a2uConfig:()=>({ready:true})},
    "@/lib/zaf/pi/a2u-server":{verifyA2uIdentity:async token=>{assert.equal(token,"fixture");return "trusted-user";},claimTestPi:async uid=>{claimed=uid;return {state:"complete"};}},
  })("@/app/api/zaf/pi/a2u/route");
  const request=origin=>new Request("https://zaf-test.invalid/api/zaf/pi/a2u",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify({accessToken:"fixture",uid:"attacker",amount:100,destination:"attacker"})});
  assert.equal((await route.POST(request("https://evil.invalid"))).status,403);assert.equal(claimed,undefined);
  assert.equal((await route.POST(request("https://zaf-test.invalid"))).status,200);assert.equal(claimed,"trusted-user");
});
