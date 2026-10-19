import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);

function connectorFixture(env = {}) {
  let handler, childProcessCalls = 0;
  const childProcess = { execFile(_file, _args, _options, callback) {
    childProcessCalls += 1;
    callback(new Error("Inert connector fixture"), "", "");
  } };
  const sandbox = {
    require: name => name === "node:http" ? { createServer: value => { handler = value; return {}; } }
      : name === "node:child_process" ? childProcess : require(name),
    module: { exports: {} }, process: { env, cwd: () => "." }, console, Buffer,
    setTimeout, clearTimeout, setInterval,
  };
  vm.runInNewContext(fs.readFileSync("tools/zaf-node-connector.cjs", "utf8"), sandbox);
  return {
    get childProcessCalls() { return childProcessCalls; },
    async request({ method = "GET", url = "/history", headers = {} } = {}) {
      let status, responseHeaders, body;
      await handler({ method, url, headers }, {
        writeHead(value, values) { status = value; responseHeaders = values; },
        end(value) { body = value ? JSON.parse(value) : null; },
      });
      return { status, headers: responseHeaders, body };
    },
  };
}

test("connector rejects DNS-rebound, missing and malformed authorities before diagnostics", async () => {
  const fixture = connectorFixture();
  for (const host of [undefined, "attacker.example:39100", "127.0.0.1.attacker.example:39100", "127.0.0.1:80", "localhost", "localhost:39100@attacker.example", "127.0.0.1:39100 ", ["127.0.0.1:39100"]]) {
    for (const url of ["/history", "/node", "/resources"]) {
      assert.equal((await fixture.request({ url, headers: { host } })).status, 403, String(host));
    }
  }
  assert.equal(fixture.childProcessCalls, 0);
});

test("connector permits local CLI and exact configured browser origins", async () => {
  const fixture = connectorFixture();
  for (const host of ["127.0.0.1:39100", "localhost:39100", "LOCALHOST:39100", "[::1]:39100"]) {
    assert.equal((await fixture.request({ headers: { host } })).status, 200);
  }
  const origin = "https://zaf-tech.vercel.app";
  const response = await fixture.request({ headers: { host: "127.0.0.1:39100", origin, "sec-fetch-site": "cross-site" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], origin);
  assert.ok(Array.isArray(response.body.samples));
  assert.equal(fixture.childProcessCalls, 0);
});

test("connector rejects foreign origins and originless cross-site requests including preflight", async () => {
  const fixture = connectorFixture();
  for (const headers of [
    { origin: "https://attacker.example" }, { origin: "null" },
    { origin: "https://zaf-tech.vercel.app.attacker.example" },
    { "sec-fetch-site": "cross-site" },
  ]) {
    for (const method of ["GET", "OPTIONS"]) {
      const response = await fixture.request({ method, url: "/resources", headers: { host: "127.0.0.1:39100", ...headers } });
      assert.equal(response.status, 403);
    }
  }
  const allowed = await fixture.request({ method: "OPTIONS", headers: { host: "127.0.0.1:39100", origin: "https://zaf-tech.vercel.app" } });
  assert.equal(allowed.status, 204);
  assert.equal(fixture.childProcessCalls, 0);
});

test("connector honors the explicit custom port and origin allowlist", async () => {
  const fixture = connectorFixture({ ZAF_NODE_CONNECTOR_PORT: "39101", ZAF_NODE_CONNECTOR_ALLOWED_ORIGINS: "https://preview.example" });
  assert.equal((await fixture.request({ headers: { host: "127.0.0.1:39100" } })).status, 403);
  const response = await fixture.request({ headers: { host: "127.0.0.1:39101", origin: "https://preview.example" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], "https://preview.example");
});
