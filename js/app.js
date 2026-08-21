const PAGE_SIZE = 12;
const WIDE_FETCH = 100;

const CATEGORIES = [
  "문화교양/강좌",
  "전시/미술",
  "뮤지컬/오페라",
  "연극",
  "무용",
  "영화",
  "국악",
  "클래식",
  "콘서트",
  "독주/독창회",
  "축제-문화/예술",
  "축제-전통/역사",
  "축제-시민화합",
  "축제-자연/경관",
  "축제-기타",
  "기타",
];

const DISTRICTS = [
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "금천구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구",
];

const form = document.querySelector("#searchForm");
const titleInput = document.querySelector("#titleInput");
const codeSelect = document.querySelector("#codeSelect");
const districtSelect = document.querySelector("#districtSelect");
const dateInput = document.querySelector("#dateInput");
const feeSelect = document.querySelector("#feeSelect");
const resetBtn = document.querySelector("#resetBtn");
const resultMeta = document.querySelector("#resultMeta");
const statusArea = document.querySelector("#statusArea");
const eventGrid = document.querySelector("#eventGrid");
const pagination = document.querySelector("#pagination");
const detailDialog = document.querySelector("#detailDialog");
const detailContent = document.querySelector("#detailContent");
const todayLabel = document.querySelector("#todayLabel");

const USE_LIVE_API = ["localhost", "127.0.0.1"].includes(location.hostname);

let currentPage = 1;
let searchTimer = 0;
let staticCache = null;

function fillSelect(select, values) {
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function parseDate(value) {
  const matched = cleanText(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matched)) return null;
  return matched;
}

function eventStatus(event) {
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  const start = parseDate(event.STRTDATE);
  const end = parseDate(event.END_DATE) || start;
  if (start && today < start) return "예정";
  if (end && today > end) return "종료";
  return "진행중";
}

function parseCoord(value) {
  const matched = cleanText(value).match(/-?\d+(\.\d+)?/);
  if (!matched) return null;
  const number = Number(matched[0]);
  return Number.isFinite(number) ? number : null;
}

function hasClientFilter() {
  return Boolean(districtSelect.value || feeSelect.value);
}

function applyClientFilter(rows) {
  return rows.filter((row) => {
    if (districtSelect.value && cleanText(row.GUNAME) !== districtSelect.value) return false;
    if (feeSelect.value && cleanText(row.IS_FREE) !== feeSelect.value) return false;
    return true;
  });
}

function showStatus(message) {
  statusArea.hidden = false;
  statusArea.innerHTML = `<p>${message}</p>`;
  eventGrid.innerHTML = "";
  pagination.innerHTML = "";
}

function showSkeletons() {
  statusArea.hidden = true;
  eventGrid.innerHTML = Array.from({ length: 6 }, () => `<article class="event-card skeleton"></article>`).join("");
  pagination.innerHTML = "";
}

async function fetchLiveEvents(start, end) {
  const params = new URLSearchParams({
    start: String(start),
    end: String(end),
    code: codeSelect.value,
    title: titleInput.value.trim(),
    date: dateInput.value,
  });
  const response = await fetch(`/api/events?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "행사를 불러오지 못했습니다.");
  }

  const payload = data.culturalEventInfo;
  const result = payload?.RESULT || data.RESULT;
  if (result?.CODE === "INFO-200") {
    return { total: 0, rows: [] };
  }
  if (!payload) {
    throw new Error(result?.MESSAGE || "검색 결과가 없습니다.");
  }
  if (result?.CODE && result.CODE !== "INFO-000") {
    throw new Error(result.MESSAGE || "API 오류가 발생했습니다.");
  }

  const rows = Array.isArray(payload.row) ? payload.row : payload.row ? [payload.row] : [];
  return {
    total: Number(payload.list_total_count) || rows.length,
    rows,
  };
}

async function loadStaticEvents() {
  if (staticCache) return staticCache;
  const response = await fetch("data/events.json");
  if (!response.ok) {
    throw new Error("GitHub Pages에서는 미리 저장한 행사 목록이 필요합니다.");
  }
  staticCache = await response.json();
  return staticCache;
}

function matchesDate(event, date) {
  if (!date) return true;
  const start = parseDate(event.STRTDATE);
  const end = parseDate(event.END_DATE) || start;
  if (start && end) return date >= start && date <= end;
  return cleanText(event.DATE).includes(date);
}

function filterStaticRows(rows) {
  const title = titleInput.value.trim().toLowerCase();
  const code = codeSelect.value;
  const date = dateInput.value;
  return rows.filter((row) => {
    if (title && !cleanText(row.TITLE).toLowerCase().includes(title)) return false;
    if (code && cleanText(row.CODENAME) !== code) return false;
    if (!matchesDate(row, date)) return false;
    if (districtSelect.value && cleanText(row.GUNAME) !== districtSelect.value) return false;
    if (feeSelect.value && cleanText(row.IS_FREE) !== feeSelect.value) return false;
    return true;
  });
}

function renderCards(rows) {
  if (!rows.length) {
    showStatus("조건에 맞는 문화행사가 없습니다. 검색어나 필터를 바꿔 보세요.");
    return;
  }

  statusArea.hidden = true;
  eventGrid.innerHTML = rows
    .map((event, index) => {
      const title = escapeHtml(event.TITLE || "제목 없는 행사");
      const image = cleanText(event.MAIN_IMG);
      const code = escapeHtml(event.CODENAME || "기타");
      const district = escapeHtml(event.GUNAME || "지역 미정");
      const date = escapeHtml(event.DATE || "-");
      const time = cleanText(event.PRO_TIME) ? ` · ${escapeHtml(event.PRO_TIME)}` : "";
      const place = escapeHtml(event.PLACE || "장소 미정");
      const fee = cleanText(event.IS_FREE) === "무료";
      const status = eventStatus(event);

      return `
        <article class="event-card" role="button" tabindex="0" data-index="${index}">
          <div class="card-thumb">
            ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : ""}
            <span class="card-stamp ${fee ? "free" : ""}">${fee ? "무료" : "유료"}</span>
          </div>
          <div class="card-body">
            <div class="card-tags">
              <span>${code}</span>
              <span>${district}</span>
              <span>${status}</span>
            </div>
            <h2>${title}</h2>
            <p class="card-meta">${date}${time}</p>
            <p class="card-place">${place}</p>
          </div>
        </article>
      `;
    })
    .join("");

  eventGrid.querySelectorAll(".event-card").forEach((card) => {
    const open = () => openDetail(rows[Number(card.dataset.index)]);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function renderPagination(total, page, pageSize) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const start = Math.max(1, page - 2);
  const end = Math.min(pageCount, start + 4);
  const buttons = [];

  buttons.push(`<button class="page-btn" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>이전</button>`);
  for (let number = start; number <= end; number += 1) {
    buttons.push(
      `<button class="page-btn ${number === page ? "active" : ""}" data-page="${number}">${number}</button>`
    );
  }
  buttons.push(
    `<button class="page-btn" data-page="${page + 1}" ${page === pageCount ? "disabled" : ""}>다음</button>`
  );

  pagination.innerHTML = buttons.join("");
  pagination.querySelectorAll(".page-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const nextPage = Number(button.dataset.page);
      if (!nextPage || nextPage === currentPage) return;
      currentPage = nextPage;
      loadEvents();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function detailItem(label, value, wide = false) {
  const text = cleanText(value);
  if (!text) return "";
  return `
    <div class="detail-item${wide ? " wide" : ""}">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(text)}</dd>
    </div>
  `;
}

function openDetail(event) {
  const image = cleanText(event.MAIN_IMG);
  const lat = parseCoord(event.LAT);
  const lot = parseCoord(event.LOT);
  const inSeoul = lat !== null && lot !== null && lat > 33 && lat < 39 && lot > 124 && lot < 132;
  const homepage = cleanText(event.HMPG_ADDR);
  const orgLink = cleanText(event.ORG_LINK);
  const mapUrl =
    inSeoul && lat !== null && lot !== null
      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lot}#map=16/${lat}/${lot}`
      : "";
  const mapEmbed =
    inSeoul && lat !== null && lot !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lot - 0.01}%2C${lat - 0.01}%2C${lot + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lot}`
      : "";

  detailContent.innerHTML = `
    <div class="detail-hero">
      ${image ? `<img src="${escapeHtml(image)}" alt="">` : ""}
      <button type="button" class="detail-close" aria-label="닫기">×</button>
    </div>
    <div class="detail-body">
      <div class="detail-chips">
        <span class="chip">${escapeHtml(event.CODENAME || "기타")}</span>
        <span class="chip">${escapeHtml(event.GUNAME || "지역 미정")}</span>
        <span class="chip">${escapeHtml(event.IS_FREE || "요금 정보 없음")}</span>
        <span class="chip">${eventStatus(event)}</span>
      </div>
      <h2>${escapeHtml(event.TITLE || "제목 없는 행사")}</h2>
      <dl class="detail-grid">
        ${detailItem("기간", event.DATE)}
        ${detailItem("시간", event.PRO_TIME)}
        ${detailItem("장소", event.PLACE)}
        ${detailItem("기관", event.ORG_NAME)}
        ${detailItem("이용대상", event.USE_TRGT)}
        ${detailItem("이용요금", event.USE_FEE)}
        ${detailItem("문의", event.INQUIRY)}
        ${detailItem("출연", event.PLAYER, true)}
        ${detailItem("프로그램", event.PROGRAM, true)}
        ${detailItem("기타", event.ETC_DESC, true)}
      </dl>
      ${mapEmbed ? `<iframe class="map-frame" title="행사 위치" src="${mapEmbed}"></iframe>` : ""}
      <div class="detail-actions">
        ${homepage ? `<a class="btn-link primary" href="${escapeHtml(homepage)}" target="_blank" rel="noopener noreferrer">문화포털 자세히 보기</a>` : ""}
        ${orgLink ? `<a class="btn-link" href="${escapeHtml(orgLink)}" target="_blank" rel="noopener noreferrer">예매·공식 페이지</a>` : ""}
        ${mapUrl ? `<a class="btn-link" href="${mapUrl}" target="_blank" rel="noopener noreferrer">지도에서 보기</a>` : ""}
        <button type="button" class="btn-ghost" data-close>닫기</button>
      </div>
    </div>
  `;

  detailContent.querySelectorAll("[data-close], .detail-close").forEach((button) => {
    button.addEventListener("click", () => detailDialog.close());
  });
  detailDialog.showModal();
}

async function loadEvents() {
  showSkeletons();
  resultMeta.textContent = "서울시 문화행사 정보를 불러오는 중입니다.";

  try {
    if (!USE_LIVE_API) {
      const cache = await loadStaticEvents();
      const filtered = filterStaticRows(cache.rows || []);
      const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
      renderCards(visible);
      renderPagination(filtered.length, currentPage, PAGE_SIZE);
      const updated = cache.updatedAt
        ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(
            new Date(cache.updatedAt)
          )
        : "";
      resultMeta.innerHTML = `저장된 ${Number(cache.rows?.length || 0).toLocaleString("ko-KR")}건 중 <strong>${filtered.length.toLocaleString("ko-KR")}</strong>건을 보여줍니다.${updated ? ` 업데이트: ${updated}` : ""}`;
      return;
    }

    const clientFilterOn = hasClientFilter();
    const start = clientFilterOn ? 1 : (currentPage - 1) * PAGE_SIZE + 1;
    const end = clientFilterOn ? WIDE_FETCH : currentPage * PAGE_SIZE;
    const data = await fetchLiveEvents(start, end);
    const filtered = applyClientFilter(data.rows);
    const visible = clientFilterOn
      ? filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
      : filtered;
    const totalForPager = clientFilterOn ? filtered.length : data.total;

    renderCards(visible);
    renderPagination(totalForPager, currentPage, PAGE_SIZE);

    if (clientFilterOn) {
      resultMeta.innerHTML = `최근 ${data.rows.length}건 가운데 <strong>${filtered.length}</strong>건이 조건에 맞습니다. 전체 등록 행사는 ${data.total.toLocaleString("ko-KR")}건입니다.`;
    } else {
      resultMeta.innerHTML = `전체 <strong>${data.total.toLocaleString("ko-KR")}</strong>건 중 ${start.toLocaleString("ko-KR")}–${Math.min(end, data.total).toLocaleString("ko-KR")}번째 행사를 보고 있습니다.`;
    }
  } catch (error) {
    resultMeta.textContent = "행사 정보를 가져오지 못했습니다.";
    showStatus(escapeHtml(error.message));
  }
}

fillSelect(codeSelect, CATEGORIES);
fillSelect(districtSelect, DISTRICTS);
todayLabel.textContent = formatToday();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  loadEvents();
});

resetBtn.addEventListener("click", () => {
  form.reset();
  currentPage = 1;
  loadEvents();
});

titleInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    currentPage = 1;
    loadEvents();
  }, 400);
});

[codeSelect, districtSelect, dateInput, feeSelect].forEach((element) => {
  element.addEventListener("change", () => {
    currentPage = 1;
    loadEvents();
  });
});

detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) detailDialog.close();
});

loadEvents();
