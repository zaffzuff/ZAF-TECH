export const A2U_CAMPAIGN = "zaf-testnet-five-wallets-v1";
export const A2U_AMOUNT = "0.0100000";
export const A2U_LIMIT = 5;

export class A2uError extends Error {
  constructor(public code: string, public status = 409) { super(code); }
}

export type A2uPayment = {
  identifier: string; user_uid: string; amount: number; memo: string;
  network: string; direction: string; from_address: string; to_address: string;
  metadata: { campaign?: string; claim?: string };
  status: { cancelled: boolean; user_cancelled: boolean; transaction_verified: boolean; developer_completed: boolean };
  transaction: null | { txid: string; verified: boolean };
};
export type A2uClaim = {
  key: string; state: "creating" | "created" | "signed" | "submitted" | "complete" | "rejected";
  paymentId: string | null; destination: string | null; xdr: string | null;
  txid: string | null; expiresAt: number | null;
};
export type A2uStore = {
  get: (key: string) => Promise<A2uClaim | null>;
  save: (claim: A2uClaim) => Promise<void>;
  count: () => Promise<number>;
  activeOther: (key: string) => Promise<boolean>;
  usedDestination: (address: string, key: string) => Promise<boolean>;
};
export type A2uGateway = {
  create: (uid: string, claim: string) => Promise<A2uPayment>;
  incomplete: () => Promise<A2uPayment[]>;
  get: (id: string) => Promise<A2uPayment>;
  cancel: (id: string) => Promise<void>;
  sign: (payment: A2uPayment) => Promise<{ xdr: string; txid: string; expiresAt: number }>;
  submit: (xdr: string) => Promise<void>;
  confirmed: (claim: A2uClaim) => Promise<boolean>;
  complete: (id: string, txid: string) => Promise<A2uPayment>;
};

export function validateA2uPayment(payment: A2uPayment, uid: string, key: string, source: string) {
  if (!payment || !/^[a-zA-Z0-9_-]{1,28}$/.test(payment.identifier) ||
      payment.user_uid !== uid || payment.network !== "Pi Testnet" ||
      payment.direction !== "app_to_user" || payment.from_address !== source ||
      !/^G[A-Z2-7]{55}$/.test(payment.to_address) || Number(payment.amount) !== Number(A2U_AMOUNT) ||
      payment.metadata?.campaign !== A2U_CAMPAIGN || payment.metadata?.claim !== key ||
      !payment.status || payment.status.cancelled !== false || payment.status.user_cancelled !== false) {
    throw new A2uError("PAYMENT_MISMATCH");
  }
}

// The adapter must hold a cross-instance database lock for this whole flow.
// Every save is committed before the next external side effect. No transaction
// rollback can erase a payment ID or a signed envelope after a process crash.
export async function runA2uClaim(input: {
  uid: string; key: string; source: string; wallets: string[];
  store: A2uStore; gateway: A2uGateway; now?: () => number;
}) {
  const { uid, key, source, wallets, store, gateway } = input;
  const now = input.now || Date.now;
  let claim = await store.get(key);
  if (claim?.state === "complete") return claim;
  if (claim?.state === "rejected") throw new A2uError("WALLET_NOT_ELIGIBLE", 403);
  if (await store.activeOther(key)) throw new A2uError("ANOTHER_TEST_PENDING");
  if (!claim) {
    if (await store.count() >= A2U_LIMIT) throw new A2uError("CAMPAIGN_FULL");
    // Never silently take over, cancel, or replace another application payment.
    if ((await gateway.incomplete()).length) throw new A2uError("ANOTHER_TEST_PENDING");
    claim = { key, state: "creating", paymentId: null, destination: null, xdr: null, txid: null, expiresAt: null };
    await store.save(claim);
    // An ambiguous create response remains "creating". A retry reconciles the
    // incomplete payment by metadata and never issues another create request.
    const created = await gateway.create(uid, key);
    validateA2uPayment(created, uid, key, source);
    claim.paymentId = created.identifier;
    claim.state = "created";
    await store.save(claim);
  } else if (!claim.paymentId) {
    const pending = (await gateway.incomplete()).filter(p => p.metadata?.campaign === A2U_CAMPAIGN && p.metadata?.claim === key);
    if (pending.length !== 1) throw new A2uError("REVIEW_REQUIRED");
    validateA2uPayment(pending[0], uid, key, source);
    claim.paymentId = pending[0].identifier;
    claim.state = "created";
    await store.save(claim);
  }
  const payment = await gateway.get(claim.paymentId!);
  validateA2uPayment(payment, uid, key, source);
  if (!wallets.includes(payment.to_address) || await store.usedDestination(payment.to_address, key)) {
    if (claim.xdr || payment.transaction) throw new A2uError("REVIEW_REQUIRED");
    await gateway.cancel(payment.identifier);
    claim.state = "rejected";
    await store.save(claim);
    throw new A2uError("WALLET_NOT_ELIGIBLE", 403);
  }
  if (claim.destination && claim.destination !== payment.to_address) throw new A2uError("PAYMENT_MISMATCH");
  claim.destination = payment.to_address;
  await store.save(claim);
  if (!claim.xdr) {
    if (payment.transaction) throw new A2uError("REVIEW_REQUIRED");
    const signed = await gateway.sign(payment);
    Object.assign(claim, signed, { state: "signed" });
    // The exact signed transaction is persisted BEFORE any chain submission.
    await store.save(claim);
  }
  let confirmed = await gateway.confirmed(claim);
  if (!confirmed) {
    if (now() >= claim.expiresAt!) throw new A2uError("REVIEW_REQUIRED");
    // Retrying can only submit the SAME envelope/hash, never a second payment.
    await gateway.submit(claim.xdr!);
    confirmed = await gateway.confirmed(claim);
  }
  if (!confirmed) throw new A2uError("CONFIRMATION_PENDING");
  claim.state = "submitted";
  await store.save(claim);
  const completed = await gateway.complete(claim.paymentId!, claim.txid!);
  validateA2uPayment(completed, uid, key, source);
  if (completed.to_address !== claim.destination || completed.status.transaction_verified !== true ||
      completed.status.developer_completed !== true || completed.transaction?.verified !== true ||
      completed.transaction.txid !== claim.txid) throw new A2uError("CONFIRMATION_PENDING");
  claim.state = "complete";
  await store.save(claim);
  return claim;
}
