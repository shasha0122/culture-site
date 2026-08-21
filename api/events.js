const { fetchCulturalEvents } = require("../lib/seoul-api");

module.exports = async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "GET만 지원합니다." });
    return;
  }

  try {
    const body = await fetchCulturalEvents(req.query || {});
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).send(body);
  } catch (error) {
    res.status(error.statusCode || 502).json({
      error: "서울시 공공API에 연결하지 못했습니다.",
      detail: error.message,
    });
  }
};
