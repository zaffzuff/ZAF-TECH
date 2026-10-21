import { createHash } from "node:crypto";
import postgres from "postgres";
import { Account, Asset, Keypair, Memo, Operation, StrKey, TransactionBuilder } from "@stellar/stellar-sdk";
import { A2U_AMOUNT, A2U_CAMPAIGN, A2uError, runA2uClaim, type A2uClaim, type A2uGateway, type A2uStore } from "./a2u-flow";
import { requireA2uConfig } from "./a2u-config";

// These destinations and signing passphrase are deliberately not configurable.
const HORIZON = "https://api.testnet.minepi.com";
const PLATFORM = "https://api.minepi.com/v2";
let database: ReturnType<typeof postgres> | null = null;
function db() {
  requireA2uConfig();
  return database ||= postgres(process.env.PI_TESTNET_DATABASE_URL!, { max: 2, prepare: false, connect_timeout: 5, idle_timeout: 20 });
}
async function responseJson(url: string, options: RequestInit = {}, allowMissing = false) {
  const response = await fetch(url, { ...options, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(7_000) });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new A2uError("PI_SERVICE_UNAVAILABLE", 503);
  return response.json();
}
function platform(path: string, method = "GET", body?: unknown) {
  return responseJson(PLATFORM + path, {
    method,
    headers: { Authorization: `Key ${process.env.PI_TESTNET_API_KEY!.trim()}`, "Content-Type": "application/json", Accept: "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
export function makeTestnetGateway(sourceKey: Keypair): A2uGateway {
  const source = sourceKey.publicKey();
  return {
    create: (uid, claim) => platform("/payments", "POST", { payment: {
      uid, amount: Number(A2U_AMOUNT), memo: "ZAF Tech Testnet A2U test",
      metadata: { campaign: A2U_CAMPAIGN, claim },
    } }),
    incomplete: async () => {
      const data = await platform("/payments/incomplete_server_payments");
      if (!Array.isArray(data?.incomplete_server_payments)) throw new A2uError("PI_SERVICE_UNAVAILABLE", 503);
      return data.incomplete_server_payments;
    },
    get: id => platform("/payments/" + encodeURIComponent(id)),
    cancel: async id => {
      const result = await platform("/payments/" + encodeURIComponent(id) + "/cancel", "POST", {});
      if (result?.status?.cancelled !== true) throw new A2uError("REVIEW_REQUIRED");
    },
    sign: async payment => {
      if (!StrKey.isValidEd25519PublicKey(payment.to_address) || payment.from_address !== source || payment.network !== "Pi Testnet") throw new A2uError("PAYMENT_MISMATCH");
      const [account, destination, fees] = await Promise.all([
        responseJson(HORIZON + "/accounts/" + source),
        responseJson(HORIZON + "/accounts/" + payment.to_address),
        responseJson(HORIZON + "/fee_stats"),
      ]);
      const fee = String(fees.last_ledger_base_fee);
      if (account.account_id !== source || destination.account_id !== payment.to_address ||
          !/^\d+$/.test(account.sequence) || !/^\d+$/.test(fee) || Number(fee) < 100 || Number(fee) > 1_000_000) throw new A2uError("REVIEW_REQUIRED");
      const expiresAt = Date.now() + 180_000;
      const transaction = new TransactionBuilder(new Account(source, account.sequence), { fee, networkPassphrase: "Pi Testnet" })
        .addOperation(Operation.payment({ destination: payment.to_address, asset: Asset.native(), amount: A2U_AMOUNT }))
        .addMemo(Memo.text(payment.identifier)).setTimeout(180).build();
      transaction.sign(sourceKey);
      return { xdr: transaction.toXDR(), txid: Buffer.from(transaction.hash()).toString("hex"), expiresAt };
    },
    submit: async xdr => {
      const result = await responseJson(HORIZON + "/transactions", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ tx: xdr }).toString(),
      });
      if (result?.successful !== true) throw new A2uError("CONFIRMATION_PENDING");
    },
    confirmed: async claim => {
      if (!/^[a-f0-9]{64}$/.test(claim.txid || "")) throw new A2uError("REVIEW_REQUIRED");
      const transaction = await responseJson(HORIZON + "/transactions/" + claim.txid, {}, true);
      if (!transaction) return false;
      if (transaction.hash !== claim.txid || transaction.successful !== true || transaction.source_account !== source ||
          transaction.memo_type !== "text" || transaction.memo !== claim.paymentId) throw new A2uError("CHAIN_MISMATCH");
      const operations = await responseJson(HORIZON + "/transactions/" + claim.txid + "/operations?limit=2");
      const rows = operations?._embedded?.records;
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0].type !== "payment" || rows[0].from !== source ||
          rows[0].to !== claim.destination || rows[0].asset_type !== "native" || rows[0].amount !== A2U_AMOUNT) throw new A2uError("CHAIN_MISMATCH");
      return true;
    },
    complete: (id, txid) => platform("/payments/" + encodeURIComponent(id) + "/complete", "POST", { txid }),
  };
}

// Session advisory locks span separately committed writes. Holding everything
// in one SQL transaction would roll back our recovery data after a crash.
export async function claimTestPi(uid: string) {
  const config = requireA2uConfig();
  if (uid.startsWith("pi-oauth:")) throw new A2uError("NATIVE_SIGNIN_REQUIRED", 403);
  if (!StrKey.isValidEd25519SecretSeed(process.env.PI_TESTNET_WALLET_SECRET!) || config.wallets.some(w => !StrKey.isValidEd25519PublicKey(w))) throw new A2uError("TEST_NOT_ENABLED", 503);
  const sourceKey = Keypair.fromSecret(process.env.PI_TESTNET_WALLET_SECRET!);
  const key = createHash("sha256").update(A2U_CAMPAIGN + "|" + uid).digest("hex");
  const connection = await db().reserve();
  let locked = false;
  try {
    const [result] = await connection`SELECT pg_try_advisory_lock(748316252) AS locked, pg_backend_pid() AS pid`;
    locked = result.locked === true;
    if (!locked) throw new A2uError("ANOTHER_TEST_PENDING");
    await connection`CREATE TABLE IF NOT EXISTS zaf_testnet_a2u_claims (
      claim_key TEXT PRIMARY KEY, campaign TEXT NOT NULL, state TEXT NOT NULL,
      payment_id TEXT UNIQUE, destination TEXT UNIQUE, xdr TEXT, txid TEXT UNIQUE,
      expires_at BIGINT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    const assertLock = async () => {
      const [owner] = await connection`SELECT pg_backend_pid() AS pid, EXISTS (
        SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid()
        AND objid=748316252 AND granted=true
      ) AS held`;
      if (owner.pid !== result.pid || owner.held !== true) throw new A2uError("REVIEW_REQUIRED");
    };
    const store: A2uStore = {
      get: async claimKey => {
        const [row] = await connection`SELECT claim_key AS key, state, payment_id AS "paymentId", destination, xdr, txid, expires_at AS "expiresAt"
          FROM zaf_testnet_a2u_claims WHERE claim_key = ${claimKey} AND campaign = ${A2U_CAMPAIGN}`;
        return row ? { ...row, expiresAt: row.expiresAt === null ? null : Number(row.expiresAt) } as A2uClaim : null;
      },
      save: async claim => {
        const rows = await connection`INSERT INTO zaf_testnet_a2u_claims (claim_key,campaign,state,payment_id,destination,xdr,txid,expires_at)
          SELECT ${claim.key},${A2U_CAMPAIGN},${claim.state},${claim.paymentId},${claim.destination},${claim.xdr},${claim.txid},${claim.expiresAt}
          WHERE pg_backend_pid()=${result.pid} AND EXISTS (SELECT 1 FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND objid=748316252 AND granted=true)
          ON CONFLICT (claim_key) DO UPDATE SET state=EXCLUDED.state,payment_id=EXCLUDED.payment_id,
            destination=EXCLUDED.destination,xdr=EXCLUDED.xdr,txid=EXCLUDED.txid,expires_at=EXCLUDED.expires_at,updated_at=NOW()
          RETURNING claim_key`;
        if (rows.length !== 1) throw new A2uError("REVIEW_REQUIRED");
      },
      count: async () => Number((await connection`SELECT COUNT(*) AS n FROM zaf_testnet_a2u_claims WHERE campaign=${A2U_CAMPAIGN} AND state <> 'rejected'`)[0].n),
      activeOther: async claimKey => (await connection`SELECT 1 FROM zaf_testnet_a2u_claims WHERE campaign=${A2U_CAMPAIGN} AND claim_key<>${claimKey} AND state NOT IN ('complete','rejected') LIMIT 1`).length > 0,
      usedDestination: async (address, claimKey) => (await connection`SELECT 1 FROM zaf_testnet_a2u_claims WHERE destination=${address} AND claim_key<>${claimKey} LIMIT 1`).length > 0,
    };
    const gateway = makeTestnetGateway(sourceKey);
    const guardedGateway: A2uGateway = {
      create: async (...args) => { await assertLock(); return gateway.create(...args); },
      incomplete: async () => { await assertLock(); return gateway.incomplete(); },
      get: async id => { await assertLock(); return gateway.get(id); },
      cancel: async id => { await assertLock(); return gateway.cancel(id); },
      sign: async payment => { await assertLock(); return gateway.sign(payment); },
      submit: async xdr => { await assertLock(); return gateway.submit(xdr); },
      confirmed: async claim => { await assertLock(); return gateway.confirmed(claim); },
      complete: async (...args) => { await assertLock(); return gateway.complete(...args); },
    };
    const claim = await runA2uClaim({ uid, key, source: sourceKey.publicKey(), wallets: config.wallets, store, gateway: guardedGateway });
    return { state: claim.state, paymentId: claim.paymentId, txid: claim.txid, amount: "0.01", network: "Pi Testnet" };
  } finally {
    try { if (locked) await connection`SELECT pg_advisory_unlock(748316252)`; }
    finally { connection.release(); }
  }
}

export async function verifyA2uIdentity(accessToken: string) {
  const user = await responseJson(PLATFORM + "/me", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
  if (!user || typeof user.uid !== "string" || !/^[^\s\x00-\x1f\x7f]{1,256}$/.test(user.uid) ||
      !Array.isArray(user.credentials?.scopes) || !user.credentials.scopes.includes("wallet_address")) throw new A2uError("RECEIVE_PERMISSION_REQUIRED", 403);
  return user.uid as string;
}
