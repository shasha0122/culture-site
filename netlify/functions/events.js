const { fetchCulturalEvents } = require("../../lib/seoul-api");

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "GET만 지원합니다." }),
    };
  }

  try {
    const body = await fetchCulturalEvents(event.queryStringParameters || {});
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
      body,
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: "서울시 공공API에 연결하지 못했습니다.",
        detail: error.message,
      }),
    };
  }
};
