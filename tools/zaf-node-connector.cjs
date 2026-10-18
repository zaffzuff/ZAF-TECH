const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { createServer } = require("node:http");
const { Socket } = require("node:net");
const { mkdir, readFile, rename, writeFile } = require("node:fs/promises");
const path = require("node:path");

const execFileAsync = promisify(execFile);

function decodeWindowsCommandOutput(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value ?? ""), "utf8");
  if (!buffer.length) return "";

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le");
  }

  if (buffer.includes(0)) {
    const utf16 = buffer.toString("utf16le");
    const nulCount = (utf16.match(/\0/g) || []).length;
    if (nulCount < Math.max(1, Math.floor(utf16.length * 0.05))) {
      return utf16;
    }
  }

  return buffer.toString("utf8");
}

const HOST = "127.0.0.1";
const VERSION = "1.6.8";
const SUPPORTED_PROTOCOLS = new Set([27, 28]);
const PORT = Number(process.env.ZAF_NODE_CONNECTOR_PORT || 39100);
const HISTORY_INTERVAL_MS = 60_000;
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const HISTORY_DIR = path.join(process.env.APPDATA || process.env.LOCALAPPDATA || process.cwd(), "ZAF TECH", "Node Connector");
const HISTORY_FILE = path.join(HISTORY_DIR, "node-history.json");
const ALLOWED_ORIGINS = new Set(
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://zaf-tech.vercel.app",
    ...(process.env.ZAF_NODE_CONNECTOR_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]
);

function isAllowedConnectorHost(value) {
  if (typeof value !== "string") return false;
  const authority = value.toLowerCase();
  return ["127.0.0.1", "localhost", "[::1]"].some(host =>
    authority === `${host}:${PORT}` || (PORT === 80 && authority === host)
  );
}

function json(res, status, payload, origin) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(payload));
}

async function docker(args) {
  try {
    const { stdout } = await execFileAsync("docker", args, {
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 2 * 1024 * 1024,
    });
    return { ok: true, stdout: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stdout: "",
    };
  }
}


function parseByteValue(value) {
  const match = String(value || "").trim().match(/^([\d.]+)\s*([KMGTPE]?i?B)?$/i);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  const unit = String(match[2] || "B").toUpperCase();
  const multipliers = { B: 1, KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3, TB: 1000 ** 4, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };
  return Math.round(number * (multipliers[unit] || 1));
}

function parseBytePair(value) {
  const parts = String(value || "").split("/").map((part) => parseByteValue(part));
  return { first: parts[0] ?? null, second: parts[1] ?? null };
}

async function powershellJson(script) {
  try {
    const result = await execFileAsync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script,
    ], { windowsHide: true, timeout: 5000, maxBuffer: 512 * 1024 });
    return JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }
}

async function readHostResources() {
  const data = await powershellJson([
    "$os = Get-CimInstance -ClassName Win32_OperatingSystem",
    "$cpu = @(Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty LoadPercentage)",
    "$disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='C:'\"",
    "$net = @(Get-NetAdapterStatistics -ErrorAction SilentlyContinue)",
    "[pscustomobject]@{",
    "  cpuPercent = if ($cpu.Count) { [math]::Round((($cpu | Measure-Object -Average).Average), 1) } else { $null }",
    "  memoryTotalBytes = [int64]$os.TotalVisibleMemorySize * 1KB",
    "  memoryFreeBytes = [int64]$os.FreePhysicalMemory * 1KB",
    "  diskTotalBytes = if ($disk) { [int64]$disk.Size } else { $null }",
    "  diskFreeBytes = if ($disk) { [int64]$disk.FreeSpace } else { $null }",
    "  networkReceivedBytes = if ($net.Count) { [int64](($net | Measure-Object -Property ReceivedBytes -Sum).Sum) } else { $null }",
    "  networkSentBytes = if ($net.Count) { [int64](($net | Measure-Object -Property SentBytes -Sum).Sum) } else { $null }",
    "} | ConvertTo-Json -Compress",
  ].join("\n"));

  if (!data) return null;
  const memoryTotalBytes = Number(data.memoryTotalBytes) || null;
  const memoryFreeBytes = Number(data.memoryFreeBytes) || null;
  const diskTotalBytes = Number(data.diskTotalBytes) || null;
  const diskFreeBytes = Number(data.diskFreeBytes) || null;
  return {
    cpuPercent: typeof data.cpuPercent === "number" ? data.cpuPercent : null,
    memory: {
      totalBytes: memoryTotalBytes,
      freeBytes: memoryFreeBytes,
      usedBytes: memoryTotalBytes != null && memoryFreeBytes != null ? Math.max(0, memoryTotalBytes - memoryFreeBytes) : null,
      usedPercent: memoryTotalBytes && memoryFreeBytes != null ? Math.max(0, Math.min(100, ((memoryTotalBytes - memoryFreeBytes) / memoryTotalBytes) * 100)) : null,
    },
    disk: {
      drive: "C:",
      totalBytes: diskTotalBytes,
      freeBytes: diskFreeBytes,
      usedBytes: diskTotalBytes != null && diskFreeBytes != null ? Math.max(0, diskTotalBytes - diskFreeBytes) : null,
      usedPercent: diskTotalBytes && diskFreeBytes != null ? Math.max(0, Math.min(100, ((diskTotalBytes - diskFreeBytes) / diskTotalBytes) * 100)) : null,
    },
    network: {
      receivedBytes: Number(data.networkReceivedBytes) || null,
      sentBytes: Number(data.networkSentBytes) || null,
    },
  };
}

async function readWslStatus() {
  try {
    const [status, list] = await Promise.all([
      execFileAsync("wsl.exe", ["--status"], { windowsHide: true, timeout: 5000, maxBuffer: 128 * 1024, encoding: "buffer" }),
      execFileAsync("wsl.exe", ["--list", "--verbose"], { windowsHide: true, timeout: 5000, maxBuffer: 128 * 1024, encoding: "buffer" }),
    ]);
    const statusText = decodeWindowsCommandOutput(status.stdout);
    const listText = decodeWindowsCommandOutput(list.stdout);
    const lines = listText.replace(/\0/g, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const distributions = lines
      .filter((line) => !/^NAME\s+STATE\s+VERSION$/i.test(line))
      .map((line) => {
        const match = line.match(/^(.+?)\s+(Running|Stopped)\s+(\d+)$/i);
        return match ? { name: match[1].replace(/^\*\s*/, ""), state: match[2].toLowerCase(), version: Number(match[3]) || null } : null;
      })
      .filter(Boolean);
    return { available: true, distributions, status: statusText.trim().slice(0, 2000) };
  } catch {
    return { available: false, distributions: [], status: null };
  }
}

async function readDockerResources(containerId) {
  if (!containerId) return null;
  const result = await docker(["stats", "--no-stream", "--format", "{{json .}}", containerId]);
  if (!result.ok) return null;
  try {
    const raw = JSON.parse(result.stdout);
    const memory = parseBytePair(raw.MemUsage);
    const network = parseBytePair(raw.NetIO);
    const block = parseBytePair(raw.BlockIO);
    const cpuText = String(raw.CPUPerc || "").replace("%", "");
    const memoryPercentText = String(raw.MemPerc || "").replace("%", "");
    return {
      cpuPercent: Number(cpuText) || 0,
      memory: { usedBytes: memory.first, limitBytes: memory.second, usedPercent: Number(memoryPercentText) || null },
      network: { receivedBytes: network.first, sentBytes: network.second },
      blockIO: { readBytes: block.first, writeBytes: block.second },
      pids: raw.PIDs != null ? Number(raw.PIDs) || null : null,
    };
  } catch {
    return null;
  }
}

async function readResources(containerId) {
  const [host, dockerStats, wsl] = await Promise.all([
    readHostResources(),
    readDockerResources(containerId),
    readWslStatus(),
  ]);
  return { observedAt: new Date().toISOString(), host, docker: dockerStats, wsl };
}

function normalizeProtocol(value) {
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^v?(\d+)(?:\.\d+)*$/i);
  return match && Number(match[1]) > 0 ? Number(match[1]) : null;
}
function parseProtocol(image) {
  const match = String(image ?? "").match(/(?:^|[-_:])p(\d+(?:\.\d+)*)(?:$|[-_:])/i);
  return match ? normalizeProtocol(match[1]) : null;
}
function observedProtocol(coreInfo, image) {
  return normalizeProtocol(coreInfo?.ledger?.version) ?? normalizeProtocol(coreInfo?.protocol_version) ?? parseProtocol(image);
}
function protocolSupport(protocol) {
  const value = normalizeProtocol(protocol);
  return value == null ? "unknown" : SUPPORTED_PROTOCOLS.has(value) ? "supported" : "newer_or_unsupported";
}

function portCheck(port, timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;
    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, HOST);
  });
}

function inferSync(logs) {
  const text = logs.toLowerCase();
  if (/protocol synced!?|synced!/.test(text)) return "synced";
  if (/catching up|catchup/.test(text)) return "catching_up";
  if (/joining scp/.test(text)) return "joining_scp";
  if (/error|fatal|panic/.test(text)) return "error";
  return "unknown";
}

async function readCorePeers(containerId) {
  const result = await docker([
    "exec",
    containerId,
    "sh",
    "-lc",
    "stellar-core http-command peers 2>/dev/null",
  ]);

  if (!result.ok) return null;

  const start = result.stdout.indexOf("{");
  if (start < 0) return null;

  try {
    const parsed = JSON.parse(result.stdout.slice(start));
    return parsed?.peers ?? parsed;
  } catch {
    return null;
  }
}

async function readCoreInfo(containerId) {
  const result = await docker([
    "exec",
    containerId,
    "sh",
    "-lc",
    "stellar-core http-command info 2>/dev/null",
  ]);

  if (!result.ok) return null;

  const start = result.stdout.indexOf("{");
  if (start < 0) return null;

  try {
    const parsed = JSON.parse(result.stdout.slice(start));
    return parsed?.info ?? parsed;
  } catch {
    return null;
  }
}

async function readNode() {
  const list = await docker([
    "ps",
    "-a",
    "--format",
    "{{json .}}",
  ]);

  if (!list.ok) {
    return {
      connector: { connected: true, version: VERSION, docker: false },
      node: null,
      ports: [],
      error: "Docker CLI is not available or the Docker daemon cannot be reached.",
    };
  }

  const containers = list.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const candidates = containers.filter((container) => {
    const name = String(container.Names || "").toLowerCase();
    const image = String(container.Image || "").toLowerCase();
    return (
      name.includes("testnet2") ||
      name.includes("pi-consensus") ||
      image.includes("pi-node-docker") ||
      image.includes("pi-consensus")
    );
  });

  const candidate = candidates.find((item) => String(item.State).toLowerCase() === "running") || candidates[0];

  const ports = await Promise.all(
    Array.from({ length: 10 }, (_, index) => 31400 + index).map(async (port) => ({
      port,
      listeningLocally: await portCheck(port),
    }))
  );

  if (!candidate) {
    return {
      connector: { connected: true, version: VERSION, docker: true },
      node: null,
      ports,
      candidates: [],
      observedAt: new Date().toISOString(),
    };
  }

  const inspect = await docker(["inspect", candidate.ID || candidate.Names]);
  let detail = null;
  if (inspect.ok) {
    try {
      detail = JSON.parse(inspect.stdout)[0];
    } catch {
      detail = null;
    }
  }

  const logsResult = await docker(["logs", "--tail", "120", candidate.ID || candidate.Names]);
  const logs = logsResult.ok ? logsResult.stdout : "";

  const image = String(candidate.Image || detail?.Config?.Image || "");
  const startedAt = detail?.State?.StartedAt || null;
  const running = Boolean(detail?.State?.Running);
  const [coreInfo, corePeers] = running
    ? await Promise.all([
        readCoreInfo(candidate.ID || candidate.Names),
        readCorePeers(candidate.ID || candidate.Names),
      ])
    : [null, null];

  return {
    connector: { connected: true, docker: true, core: Boolean(coreInfo) },
    node: {
      containerName: String(candidate.Names || "").replace(/^\//, ""),
      containerId: String(candidate.ID || "").slice(0, 12),
      state: running ? "running" : String(detail?.State?.Status || candidate.State || "unknown"),
      image,
      protocol: observedProtocol(coreInfo, image),
      protocolSource: normalizeProtocol(coreInfo?.ledger?.version) != null ? "ledger" : normalizeProtocol(coreInfo?.protocol_version) != null ? "core" : parseProtocol(image) != null ? "image" : "unknown",
      protocolSupport: protocolSupport(observedProtocol(coreInfo, image)),
      sync: coreInfo?.state ? String(coreInfo.state).toLowerCase() : inferSync(logs),
      coreBuild: coreInfo?.build ?? null,
      network: coreInfo?.network ?? null,
      compatibility: {
        supportedProtocols: [...SUPPORTED_PROTOCOLS],
        status: protocolSupport(observedProtocol(coreInfo, image)),
      },
      ledger: coreInfo?.ledger ? {
        number: Number(coreInfo.ledger.num ?? 0) || null,
        age: Number(coreInfo.ledger.age ?? 0) || null,
        hash: coreInfo.ledger.hash ?? null,
        version: Number(coreInfo.ledger.version ?? 0) || null,
      } : null,
      peers: coreInfo?.peers ? {
        authenticated: Number(coreInfo.peers.authenticated_count ?? coreInfo.peers.authenticated ?? 0),
        pending: Number(coreInfo.peers.pending_count ?? coreInfo.peers.pending ?? 0),
        inbound: corePeers?.authenticated_peers?.inbound ? corePeers.authenticated_peers.inbound.length : null,
        outbound: corePeers?.authenticated_peers?.outbound ? corePeers.authenticated_peers.outbound.length : null,
        pendingInbound: corePeers?.pending_peers?.inbound ? corePeers.pending_peers.inbound.length : null,
        pendingOutbound: corePeers?.pending_peers?.outbound ? corePeers.pending_peers.outbound.length : null,
      } : null,
      quorum: coreInfo?.quorum ? {
        node: coreInfo.quorum.node ?? null,
        phase: coreInfo.quorum.qset?.phase ?? coreInfo.quorum.phase ?? null,
        agree: Number(coreInfo.quorum.qset?.agree ?? coreInfo.quorum.agree ?? 0),
        disagree: Number(coreInfo.quorum.qset?.disagree ?? coreInfo.quorum.disagree ?? 0),
        missing: Number(coreInfo.quorum.qset?.missing ?? coreInfo.quorum.missing ?? 0),
        lagMs: Number(coreInfo.quorum.qset?.lag_ms ?? coreInfo.quorum.qset?.lagMs ?? coreInfo.quorum.lag_ms ?? coreInfo.quorum.lagMs ?? 0),
        intersection: coreInfo.quorum.transitive?.intersection ?? coreInfo.quorum.qset?.intersection ?? coreInfo.quorum.intersection ?? null,
        nodeCount: Number(coreInfo.quorum.transitive?.node_count ?? coreInfo.quorum.qset?.nodeCount ?? coreInfo.quorum.nodeCount ?? 0) || null,
      } : null,
      startedAt,
      restartCount: Number(detail?.RestartCount ?? 0),
      health: detail?.State?.Health?.Status || null,
      publishedPorts: String(candidate.Ports || ""),
    },
    ports,
    candidates: candidates.map((item) => ({
      name: String(item.Names || "").replace(/^\//, ""),
      state: String(item.State || ""),
      image: String(item.Image || ""),
    })),
    observedAt: new Date().toISOString(),
  };
}


function historySample(snapshot) {
  const node = snapshot?.node;
  const peers = node?.peers;
  const quorum = node?.quorum;
  const resources = snapshot?.resources;
  const synced = String(node?.sync || "").toLowerCase() === "synced!";
  const ledgerAge = node?.ledger?.age ?? null;
  const available = Boolean(snapshot?.connector?.docker && snapshot?.connector?.core && node?.state === "running");
  const healthy = Boolean(
    available &&
    synced &&
    ledgerAge != null &&
    ledgerAge < 10 &&
    (peers?.authenticated ?? 0) >= 8 &&
    String(quorum?.phase || "").toUpperCase() === "EXTERNALIZE" &&
    quorum?.intersection !== false
  );
  return {
    observedAt: snapshot?.observedAt || new Date().toISOString(),
    available,
    healthy,
    sync: node?.sync ?? "unknown",
    ledgerAge,
    ledgerNumber: node?.ledger?.number ?? null,
    authenticated: peers?.authenticated ?? null,
    inbound: peers?.inbound ?? null,
    outbound: peers?.outbound ?? null,
    pending: peers?.pending ?? null,
    quorumPhase: quorum?.phase ?? null,
    quorumLagMs: quorum?.lagMs ?? null,
    intersection: quorum?.intersection ?? null,
    restarts: node?.restartCount ?? null,
    listeningPorts: Array.isArray(snapshot?.ports) ? snapshot.ports.filter((item) => item.listeningLocally).length : null,
    hostCpuPercent: resources?.host?.cpuPercent ?? null,
    hostMemoryUsedPercent: resources?.host?.memory?.usedPercent ?? null,
    hostDiskUsedPercent: resources?.host?.disk?.usedPercent ?? null,
    hostNetworkReceivedBytes: resources?.host?.network?.receivedBytes ?? null,
    hostNetworkSentBytes: resources?.host?.network?.sentBytes ?? null,
    dockerCpuPercent: resources?.docker?.cpuPercent ?? null,
    dockerMemoryUsedBytes: resources?.docker?.memory?.usedBytes ?? null,
    dockerMemoryLimitBytes: resources?.docker?.memory?.limitBytes ?? null,
    dockerMemoryUsedPercent: resources?.docker?.memory?.usedPercent ?? null,
    dockerNetworkReceivedBytes: resources?.docker?.network?.receivedBytes ?? null,
    dockerNetworkSentBytes: resources?.docker?.network?.sentBytes ?? null,
    dockerBlockReadBytes: resources?.docker?.blockIO?.readBytes ?? null,
    dockerBlockWriteBytes: resources?.docker?.blockIO?.writeBytes ?? null,
    dockerPids: resources?.docker?.pids ?? null,
    wslAvailable: resources?.wsl?.available ?? null,
    wslRunningDistros: Array.isArray(resources?.wsl?.distributions)
      ? resources.wsl.distributions.filter((item) => item?.state === "running").length
      : null,
  };
}

let history = [];
let historyWriteInFlight = Promise.resolve();

async function loadHistory() {
  try {
    const raw = await readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    history = Array.isArray(parsed) ? parsed : [];
  } catch {
    history = [];
  }
  pruneHistory();
}

function pruneHistory() {
  const cutoff = Date.now() - HISTORY_WINDOW_MS;
  history = history.filter((item) => {
    const time = Date.parse(item.observedAt);
    return Number.isFinite(time) && time >= cutoff;
  });
}

function saveHistory() {
  historyWriteInFlight = historyWriteInFlight.then(async () => {
    await mkdir(HISTORY_DIR, { recursive: true });
    const tempFile = `${HISTORY_FILE}.tmp`;
    await writeFile(tempFile, JSON.stringify(history), "utf8");
    await rename(tempFile, HISTORY_FILE);
  }).catch(() => undefined);
  return historyWriteInFlight;
}

async function recordHistory(snapshot) {
  history.push(historySample(snapshot));
  pruneHistory();
  await saveHistory();
}

function historySummary() {
  const now = Date.now();
  const windows = [24, 24 * 7, 24 * 30];
  const summary = {};
  for (const hours of windows) {
    const cutoff = now - hours * 60 * 60 * 1000;
    const samples = history.filter((item) => Date.parse(item.observedAt) >= cutoff);
    const available = samples.filter((item) => item.available);
    const healthy = samples.filter((item) => item.healthy);
    const avg = (key) => {
      const values = available.map((item) => item[key]).filter((value) => typeof value === "number" && Number.isFinite(value));
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    summary[String(hours)] = {
      samples: samples.length,
      availability: samples.length ? (available.length / samples.length) * 100 : null,
      health: samples.length ? (healthy.length / samples.length) * 100 : null,
      avgInbound: avg("inbound"),
      avgOutbound: avg("outbound"),
      maxInbound: available.reduce((max, item) => Math.max(max, item.inbound ?? 0), 0),
      maxOutbound: available.reduce((max, item) => Math.max(max, item.outbound ?? 0), 0),
    };
  }
  return summary;
}

async function recordHistorySample() {
  try {
    const snapshot = await readNode();
    snapshot.resources = await readResources(snapshot?.node?.containerId || null);
    await recordHistory(snapshot);
  } catch {
    await recordHistory({ connector: { docker: false, core: false }, node: null, ports: [], observedAt: new Date().toISOString() });
  }
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || "";

  // CORS controls browser reads, not whether a request executes. Check the
  // authority as well so a DNS-rebound domain cannot read local node details.
  if (!isAllowedConnectorHost(req.headers.host) ||
      (origin && !ALLOWED_ORIGINS.has(origin)) ||
      (!origin && req.headers["sec-fetch-site"] === "cross-site")) {
    json(res, 403, { error: "Forbidden" }, "");
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
    });
    res.end();
    return;
  }

  if (req.method !== "GET" || !["/health", "/node", "/history", "/resources"].includes(req.url)) {
    json(res, 404, { error: "Not found" }, origin);
    return;
  }

  if (req.url === "/health") {
    json(res, 200, {
      connector: "zaf-node-connector",
      version: VERSION,
      supportedProtocols: [...SUPPORTED_PROTOCOLS],
      ok: true,
      host: HOST,
      port: PORT,
      history: { endpoint: "/history", windowDays: 30, sampleIntervalSeconds: 60 },
      resources: { endpoint: "/resources", readOnly: true },
      observedAt: new Date().toISOString(),
    }, origin);
    return;
  }

  if (req.url === "/history") {
    json(res, 200, {
      connector: "zaf-node-connector",
      version: VERSION,
      windowDays: 30,
      sampleIntervalSeconds: 60,
      samples: history,
      summary: historySummary(),
      observedAt: new Date().toISOString(),
    }, origin);
    return;
  }

  if (req.url === "/resources") {
    try {
      const node = await readNode();
      const resources = await readResources(node?.node?.containerId || null);
      json(res, 200, {
        connector: "zaf-node-connector",
        version: VERSION,
        ...resources,
      }, origin);
    } catch (error) {
      json(res, 500, {
        connector: "zaf-node-connector",
        version: VERSION,
        error: error instanceof Error ? error.message : String(error),
      }, origin);
    }
    return;
  }

  try {
    const snapshot = await readNode();
    json(res, 200, snapshot, origin);
  } catch (error) {
    json(
      res,
      500,
      {
        connector: { connected: true, version: VERSION, docker: false },
        error: error instanceof Error ? error.message : String(error),
      },
      origin
    );
  }
});

async function main() {
  await loadHistory();
  void recordHistorySample();
  setInterval(() => void recordHistorySample(), HISTORY_INTERVAL_MS);

  server.listen(PORT, HOST, () => {
    console.log("ZAF TECH Node Connector Worker v" + VERSION + " listening on http://" + HOST + ":" + PORT + "/node");
    console.log("History endpoint: http://" + HOST + ":" + PORT + "/history");
    console.log("Resources endpoint: http://" + HOST + ":" + PORT + "/resources");
    console.log("Health endpoint: http://" + HOST + ":" + PORT + "/health");
    console.log("Local-only connector. It does not expose Docker outside this computer.");
    console.log("Built by zaffzuff for ZAF TECH.");
  });
}

module.exports = { start: main, normalizeProtocol, parseProtocol, observedProtocol, protocolSupport };
if (require.main === module) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
