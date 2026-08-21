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

function fetchCulturalEvents(query = {}) {
  const apiKey = process.env.SEOUL_API_KEY;
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
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

module.exports = { fetchCulturalEvents };
