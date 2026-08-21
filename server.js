/**
 * 서울 문화행사 안내 로컬 서버
 * 실행: node server.js  →  http://localhost:5500
 *
 * 서울시 OpenAPI는 브라우저 CORS를 허용하지 않아
 * 이 서버가 정적 파일과 API 프록시를 함께 제공합니다.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { fetchCulturalEvents } = require("./lib/seoul-api");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
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

loadEnv();

const PORT = Number(process.env.PORT) || 5500;
const ROOT = path.resolve(__dirname);

if (!process.env.SEOUL_API_KEY) {
  console.error("SEOUL_API_KEY가 없습니다. .env.example을 참고해 .env 파일을 만들어 주세요.");
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-cache", ...headers });
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";

  const absolute = path.resolve(path.join(ROOT, filePath));
  if (!absolute.startsWith(ROOT)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.readFile(absolute, (err, data) => {
    if (err) {
      send(res, 404, "Not Found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const ext = path.extname(absolute).toLowerCase();
    send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream" });
  });
}

async function proxyEvents(req, res) {
  const url = new URL(req.url, "http://localhost");
  try {
    const body = await fetchCulturalEvents({
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
      code: url.searchParams.get("code"),
      title: url.searchParams.get("title"),
      date: url.searchParams.get("date"),
    });
    send(res, 200, body, { "Content-Type": "application/json; charset=utf-8" });
  } catch (err) {
    send(
      res,
      err.statusCode || 502,
      JSON.stringify({
        error: "서울시 공공API에 연결하지 못했습니다.",
        detail: err.message,
      }),
      { "Content-Type": "application/json; charset=utf-8" }
    );
  }
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/api/events") {
    proxyEvents(req, res);
    return;
  }
  serveStatic(req, res);
});

function start(port) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && port < PORT + 10) {
      start(port + 1);
      return;
    }
    throw err;
  });
  server.listen(port, () => {
    console.log(`서울 문화행사 안내  http://localhost:${port}`);
  });
}

start(PORT);
