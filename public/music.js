// music.js — robust search + embed loader with fallbacks and Enter support

const PLAYER_IFRAME_ID = "ytPlayer";
const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const LOADING_TEXT_ID = "__yt_search_loading_text"; // created dynamically

// List of public Piped-like search endpoints to try (fallbacks).
// If one is down or blocked, the code will try the next.
const SEARCH_ENDPOINTS = [
  "https://piped.video/api/v1/search?q=",        // primary
  "https://piped.kavin.rocks/api/v1/search?q=",  // fallback
  "https://piped.moomoo.me/api/v1/search?q="     // another fallback
];

// utility: create or return a small loading element under the input
function ensureLoadingEl() {
  let el = document.getElementById(LOADING_TEXT_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = LOADING_TEXT_ID;
    el.style.color = "#fff";
    el.style.marginTop = "8px";
    el.style.fontSize = "14px";
    el.style.opacity = "0.9";
    const inp = document.getElementById(INPUT_ID);
    inp.parentNode.insertBefore(el, inp.nextSibling);
  }
  return el;
}

function showLoading(msg = "Searching...") {
  const el = ensureLoadingEl();
  el.textContent = msg;
}

function hideLoading() {
  const el = document.getElementById(LOADING_TEXT_ID);
  if (el) el.textContent = "";
}

// extract videoId from several possible response shapes
function extractVideoIdFromResult(item) {
  if (!item) return null;
  // common fields: url, id, videoId
  if (item.id) {
    // some APIs put id object or string
    if (typeof item.id === "object" && item.id.videoId) return item.id.videoId;
    if (typeof item.id === "string") return item.id;
  }
  if (item.videoId) return item.videoId;
  if (item.video_id) return item.video_id;
  if (item.url && item.url.includes("/watch?v=")) return item.url.split("/watch?v=")[1];
  if (item.url && item.url.includes("youtu.be/")) return item.url.split("youtu.be/")[1].split(/[?&]/)[0];
  // sometimes Piped returns "url": "/watch?v=ID"
  if (item.url && item.url.startsWith("/watch?v=")) return item.url.split("watch?v=")[1].split(/[?&]/)[0];
  return null;
}

// extract video id from a normal youtube link string
function extractVideoIdFromYouTubeUrl(url) {
  try {
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    // sometimes full embed link or watch link variations
    const match = url.match(/\/watch\?v=([A-Za-z0-9_\-]+)/);
    if (match) return match[1];
    return null;
  } catch {
    return null;
  }
}

// attempt search on a single endpoint; return first videoId or null
async function trySearchEndpoint(endpointBase, query) {
  const url = endpointBase + query;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn("Search endpoint returned non-OK:", url, res.status);
      return null;
    }
    const json = await res.json();
    if (!json) return null;
    // json is usually an array of results
    if (Array.isArray(json) && json.length > 0) {
      const id = extractVideoIdFromResult(json[0]);
      if (id) return id;
      // sometimes results are nested; try to find first with id
      for (const it of json) {
        const vid = extractVideoIdFromResult(it);
        if (vid) return vid;
      }
    } else if (typeof json === "object") {
      // sometimes response is object with items
      const items = json.items || json.videos || json.results;
      if (Array.isArray(items) && items.length > 0) {
        const id = extractVideoIdFromResult(items[0]);
        if (id) return id;
      }
    }
    return null;
  } catch (err) {
    console.warn("Search endpoint failed:", endpointBase, err);
    return null;
  }
}

// Public function bound to button/onclick
async function loadMusic() {
  const inputEl = document.getElementById(INPUT_ID);
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!inputEl || !player) {
    console.error("Missing DOM elements for music player.");
    return;
  }

  const raw = inputEl.value.trim();
  if (!raw) return;

  // show loading
  showLoading("Searching...");

  // 1) If user pasted a youtube link, play it directly
  const ytLinkRegex = /(youtube\.com|youtu\.be)/i;
  if (ytLinkRegex.test(raw)) {
    const vid = extractVideoIdFromYouTubeUrl(raw);
    if (vid) {
      player.src = `https://www.youtube.com/embed/${vid}?autoplay=1`;
      hideLoading();
      return;
    }
  }

  // 2) treat input as search query -> try endpoints in order
  const query = encodeURIComponent(raw);
  let foundVid = null;

  for (const ep of SEARCH_ENDPOINTS) {
    foundVid = await trySearchEndpoint(ep, query);
    if (foundVid) break;
  }

  if (!foundVid) {
    hideLoading();
    console.error("All search endpoints failed or returned no results.");
    alert("Search failed. Try a different query or paste a YouTube link.");
    return;
  }

  // finally load the video
  player.src = `https://www.youtube.com/embed/${foundVid}?autoplay=1`;
  hideLoading();
}

// Enter key support
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById(INPUT_ID);
  const btn = document.getElementById(LOAD_BTN_ID);

  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        loadMusic();
      }
    });
  }

  if (btn && !btn.onclick) {
    btn.addEventListener("click", loadMusic);
  }
});

// Expose loadMusic to global scope in case HTML uses onclick
window.loadMusic = loadMusic;
