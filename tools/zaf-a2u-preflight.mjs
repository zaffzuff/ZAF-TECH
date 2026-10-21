// Read-only preflight: never creates a payment, signs, or submits a transaction.
import postgres from "postgres";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

const directDatabaseUrl = process.env.PI_TESTNET_DATABASE_URL_UNPOOLED || process.env.PI_TESTNET_DATABASE_URL;
const required = ["PI_TESTNET_API_KEY","PI_TESTNET_WALLET_SECRET","PI_TESTNET_A2U_WALLETS"];
const missing=required.filter(key=>!process.env[key]);
if(!directDatabaseUrl)missing.push("PI_TESTNET_DATABASE_URL_UNPOOLED");
if(missing.length){console.error("Missing settings: "+missing.join(", "));process.exit(1);}
if(process.env.PI_NETWORK!=="testnet")throw new Error("This preflight only supports PI_NETWORK=testnet.");
if(!StrKey.isValidEd25519SecretSeed(process.env.PI_TESTNET_WALLET_SECRET))throw new Error("Invalid app-wallet seed format.");
const wallets=[...new Set(process.env.PI_TESTNET_A2U_WALLETS.split(/[\s,]+/).filter(Boolean))];
if(!wallets.length||wallets.length>5||wallets.some(w=>!StrKey.isValidEd25519PublicKey(w)))throw new Error("Configure one to five valid recipient wallets.");
const databaseUrl=new URL(directDatabaseUrl);
if(!["postgres:","postgresql:"].includes(databaseUrl.protocol)||/pooler|pgbouncer/i.test(databaseUrl.hostname))throw new Error("Use a direct PostgreSQL connection, not a transaction pooler.");
const source=Keypair.fromSecret(process.env.PI_TESTNET_WALLET_SECRET).publicKey();
async function read(url,headers={}){
  const response=await fetch(url,{headers,redirect:"error",signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error("Read-only preflight could not confirm a required Pi service.");
  return response.json();
}
const root=await read("https://api.testnet.minepi.com");
if(root.network_passphrase!=="Pi Testnet")throw new Error("The network did not identify itself as Pi Testnet.");
const account=await read("https://api.testnet.minepi.com/accounts/"+source);
if(account.account_id!==source)throw new Error("Could not confirm the app wallet on Testnet.");
const native=account.balances.find(balance=>balance.asset_type==="native");
console.log("Testnet app wallet exists. Native Test-Pi balance: "+(native?.balance||"unknown"));
for(const destination of wallets){
  const recipient=await read("https://api.testnet.minepi.com/accounts/"+destination);
  if(recipient.account_id!==destination)throw new Error("A recipient wallet is not active on Testnet.");
}
console.log("Recipient Testnet accounts confirmed: "+wallets.length);
const pending=await read("https://api.minepi.com/v2/payments/incomplete_server_payments",{Authorization:"Key "+process.env.PI_TESTNET_API_KEY});
if(!Array.isArray(pending.incomplete_server_payments))throw new Error("Unexpected Pi API response.");
if(pending.incomplete_server_payments.some(p=>p.network!=="Pi Testnet"||p.from_address!==source))throw new Error("The API key and Testnet source wallet do not match the pending payments.");
console.log("Pi server API key accepted. Incomplete payments: "+pending.incomplete_server_payments.length);
const sql=postgres(directDatabaseUrl,{max:1,prepare:false,connect_timeout:5});
try{
  const [permissions]=await sql`SELECT has_schema_privilege(current_schema(), 'CREATE') AS can_create`;
  if(!permissions.can_create)throw new Error("The separate Testnet database does not allow creating the claim table.");
  console.log("Separate Testnet record store reachable. No payments were made.");
}finally{await sql.end();}
