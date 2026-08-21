/**
 * 서울시 문화행사 목록을 받아 data/events.json으로 저장합니다.
 * GitHub Pages는 서버가 없어 이 스냅샷을 사용합니다.
 */
const fs = require("fs");
const http = require("http");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function fetchJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: "openapi.seoul.go.kr",
        port: 8088,
        path: urlPath,
        timeout: 30000,
        headers: { Accept: "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function main() {
  loadEnv();
  const apiKey = process.env.SEOUL_API_KEY;
  if (!apiKey) {
    throw new Error("SEOUL_API_KEY가 없습니다.");
  }

  const start = 1;
  const end = 1000;
  const data = await fetchJson(
    `/${apiKey}/json/culturalEventInfo/${start}/${end}/%20/%20/%20`
  );
  const payload = data.culturalEventInfo;
  if (!payload || payload.RESULT?.CODE !== "INFO-000") {
    throw new Error(data.RESULT?.MESSAGE || payload?.RESULT?.MESSAGE || "API 오류");
  }

  const rows = Array.isArray(payload.row) ? payload.row : payload.row ? [payload.row] : [];
  const snapshot = {
    updatedAt: new Date().toISOString(),
    total: Number(payload.list_total_count) || rows.length,
    rows,
  };

  const outDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "events.json"), JSON.stringify(snapshot));
  console.log(`saved ${rows.length} events (total ${snapshot.total})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
