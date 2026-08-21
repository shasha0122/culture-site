const http = require("http");

function pathSegment(value) {
  const text = String(value || "").trim();
  return text ? encodeURIComponent(text) : "%20";
}

function parseRange(query) {
  const start = Math.max(1, Number.parseInt(query.start || "1", 10) || 1);
  const requestedEnd = Number.parseInt(query.end || String(start + 11), 10) || start;
  const end = Math.min(Math.max(requestedEnd, start), start + 99);
  return { start, end };
}

function readApiKey() {
  let apiKey = String(process.env.SEOUL_API_KEY || "").trim();
  if (
    (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
    (apiKey.startsWith("'") && apiKey.endsWith("'"))
  ) {
    apiKey = apiKey.slice(1, -1).trim();
  }
  return apiKey.replace(/^SEOUL_API_KEY\s*=\s*/i, "").trim();
}

function parseSeoulError(body) {
  const text = String(body || "");
  if (!text.includes("<RESULT>")) return null;
  const code = (text.match(/<CODE>([^<]+)<\/CODE>/) || [])[1];
  const rawMessage = (text.match(/<MESSAGE>([\s\S]*?)<\/MESSAGE>/) || [])[1] || "";
  const message = rawMessage.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/\s+/g, " ").trim();
  return { code, message };
}

function fetchCulturalEvents(query = {}) {
  const apiKey = readApiKey();
  if (!apiKey) {
    const error = new Error("SEOUL_API_KEY가 없습니다.");
    error.statusCode = 500;
    return Promise.reject(error);
  }

  const { start, end } = parseRange(query);
  const apiPath = `/${apiKey}/json/culturalEventInfo/${start}/${end}/${pathSegment(
    query.code
  )}/${pathSegment(query.title)}/${pathSegment(query.date)}`;

  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: "openapi.seoul.go.kr",
        port: 8088,
        path: apiPath,
        timeout: 15000,
        headers: { Accept: "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          const seoulError = parseSeoulError(body);
          if (seoulError) {
            const error = new Error(
              seoulError.message || "서울시 API 인증키가 유효하지 않습니다."
            );
            error.statusCode = 502;
            reject(error);
            return;
          }
          resolve(body);
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

module.exports = { fetchCulturalEvents };
