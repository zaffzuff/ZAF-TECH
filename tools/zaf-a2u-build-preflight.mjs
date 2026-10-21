// Credentials stay inside the deployment environment; never print exception objects.
if (process.env.PI_TESTNET_A2U_ENABLED === "true") {
  try {
    await import("./zaf-a2u-preflight.mjs");
  } catch {
    console.error("A2U preflight failed. Check the Testnet credentials, funded source wallet, recipients and direct database connection. No payment was made.");
    process.exitCode = 1;
  }
}
