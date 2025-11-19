const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";
const WAVE_CONTAINER_ID = "waveContainer";
const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

let currentVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = [];
let currentIndex = -1;

const PIPED_INSTANCES = [
  "https://piped.video",
  "https://pipedapi.kavin.rocks",
  "https://piped.projectsegfau.lt",
  "https://piped.mha.fi"
];

function extractVideoId(url) {
  if (!url) return null;
  try {
    url = url.trim();
    if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
    if (m) return m[1];
  } catch (e) {}
  return null;
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function fetchJSON(url) {
  const controller = new AbortController();
  try {
    const res = await Promise.race([
      fetch(url, { mode: "cors", signal: controller.signal }),
      timeout(5000)
    ]);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    controller.abort();
  }
}

async function searchYouTube(query) {
  if (!query || !query.trim()) return null;
  const q = encodeURIComponent(query.trim());
  for (const base of PIPED_INSTANCES) {
    const data = await fetchJSON(`${base}/api/v1/search?q=${q}&filter=videos`);
    if (Array.isArray(data) && data.length > 0) {
      const v = data[0];
      const id = v.id || (v.url ? extractVideoId(v.url) : null);
      if (!id) continue;
      return {
        id,
        title: v.title || `Video: ${id}`,
        author: v.uploaderName || v.uploader || "YouTube",
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`
      };
    }
  }
  return null;
}

function setVideoById(vid) {
  if (!vid) return;
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);
  const miniCover = document.getElementById("miniCover");

  if (player) player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  currentVideoId = vid;
  isPlaying = true;
  if (cover) cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  if (miniCover) miniCover.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;

  if (titleEl || artistEl) {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (titleEl) titleEl.textContent = data?.title || `Video: ${vid}`;
        if (artistEl) artistEl.textContent = data?.author_name || "YouTube";
        highlightCurrentPlayingInGrid(vid);
      })
      .catch(() => {
        if (titleEl) titleEl.textContent = `Video: ${vid}`;
        if (artistEl) artistEl.textContent = "YouTube";
        highlightCurrentPlayingInGrid(vid);
      });
  }

  const idx = currentQueue.indexOf(vid);
  if (idx !== -1) currentIndex = idx;
  else {
    currentQueue = [vid];
    currentIndex = 0;
  }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

function togglePlay() {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    if (player) player.src = "";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    if (player) player.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}

function updatePlayButton() {
  const el = document.getElementById(PLAY_BTN_ID);
  if (!el) return;
  el.textContent = isPlaying ? "⏸" : "▶";
}

function setProgress(p) {
  const fill = document.getElementById(PROGRESS_FILL_ID);
  if (!fill) return;
  fill.style.width = `${Math.max(0, Math.min(100, p))}%`;
}

function startProgressSimulation() {
  clearInterval(progressInterval);
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7;
    if (val > 100) val = 0;
    setProgress(val);
  }, 500);
}

function stopProgressSimulation() {
  clearInterval(progressInterval);
}

function initWaveBars() {
  const container = document.getElementById(WAVE_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = "";
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    bar.style.setProperty("--scale", Math.random().toString());
    container.appendChild(bar);
    waveBars.push(bar);
  }
}

function startWaveAnimation() {
  waveBars.forEach(b => (b.style.animationPlayState = "running"));
}

function stopWaveAnimation() {
  waveBars.forEach(b => (b.style.animationPlayState = "paused"));
}

function next() {
  if (!currentQueue || currentQueue.length === 0) {
    alert("Queue is empty.");
    return;
  }
  currentIndex = (currentIndex + 1) % currentQueue.length;
  setVideoById(currentQueue[currentIndex]);
}

function prev() {
  if (!currentQueue || currentQueue.length === 0) {
    alert("Queue is empty.");
    return;
  }
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  setVideoById(currentQueue[currentIndex]);
}

function loadPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function savePlaylistsToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) {}
}

function createEmptyPlaylist(name) {
  return { id: `pl_${Date.now()}`, name: name || "New Playlist", songs: [] };
}

function renderPlaylists() {
  const area = document.getElementById("playlistArea");
  const sidebarList = document.getElementById("sidebarPlaylists") || document.querySelector(".playlist-list");
  const playlists = loadPlaylistsFromStorage();

  if (area) {
    area.innerHTML = "";
    if (playlists.length === 0) {
      const note = document.createElement("div");
      note.style.color = "var(--muted)";
      note.style.fontSize = "14px";
      note.textContent = "No playlists yet — create one with the + Create Playlist button.";
      area.appendChild(note);
    } else {
      playlists.forEach(pl => {
        const plWrap = document.createElement("div");
        plWrap.style.background = "var(--glass)";
        plWrap.style.padding = "10px";
        plWrap.style.borderRadius = "10px";
        plWrap.style.marginBottom = "10px";
        plWrap.style.display = "flex";
        plWrap.style.flexDirection = "column";
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.justifyContent = "space-between";
        const title = document.createElement("div");
        title.textContent = pl.name;
        title.style.fontWeight = "600";
        const actions = document.createElement("div");
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Delete";
        removeBtn.addEventListener("click", () => {
          const updated = loadPlaylistsFromStorage().filter(x => x.id !== pl.id);
          savePlaylistsToStorage(updated);
          renderPlaylists();
        });
        actions.appendChild(removeBtn);
        header.appendChild(title);
        header.appendChild(actions);
        plWrap.appendChild(header);

        const songsList = document.createElement("div");
        (pl.songs || []).forEach(song => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.gap = "8px";
          const img = document.createElement("img");
          img.src = song.cover || (song.id ? `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg` : "");
          img.width = 40;
          img.height = 40;
          img.style.borderRadius = "6px";
          const t = document.createElement("div");
          t.textContent = `${song.title || "Untitled"} — ${song.artist || ""}`;
          const playBtn = document.createElement("button");
          playBtn.textContent = "Play";
          playBtn.addEventListener("click", () => {
            if (song.id) setVideoById(song.id);
            else if (song.url) {
              const vid = extractVideoId(song.url);
              if (vid) setVideoById(vid);
            }
          });
          const delBtn = document.createElement("button");
          delBtn.textContent = "Remove";
          delBtn.addEventListener("click", () => {
            const updated = loadPlaylistsFromStorage();
            const p = updated.find(x => x.id === pl.id);
            if (p) {
              p.songs = (p.songs || []).filter(s => !(s.id && s.id === song.id) && !(s.url && s.url === song.url));
              savePlaylistsToStorage(updated);
              renderPlaylists();
            }
          });
          row.appendChild(img);
          row.appendChild(t);
          row.appendChild(playBtn);
          row.appendChild(delBtn);
          songsList.appendChild(row);
        });
        plWrap.appendChild(songsList);
        area.appendChild(plWrap);
      });
    }
  }

  if (sidebarList) {
    sidebarList.innerHTML = "";
    playlists.forEach(pl => {
      const li = document.createElement("div");
      li.textContent = pl.name;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => {
        const areaEl = document.getElementById("playlistArea");
        if (areaEl) {
          areaEl.scrollIntoView({ behavior: "smooth" });
        }
      });
      sidebarList.appendChild(li);
    });
  }
}

function readOrCreateDefaultPlaylists() {
  let playlists = loadPlaylistsFromStorage();
  if (playlists.length === 0) {
    playlists = [createEmptyPlaylist("Favorites")];
    savePlaylistsToStorage(playlists);
  }
  return playlists;
}

function extractIdFromCover(src) {
  const m = src ? src.match(/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]+)/) : null;
  return m ? m[1] : "";
}

function extractSongFromCard(card) {
  const coverEl = card.querySelector(".song-cover") || card.querySelector("img");
  const coverSrc = coverEl?.src || "";
  const id =
    card.dataset.songId ||
    card.querySelector("[data-song-id]")?.getAttribute("data-song-id") ||
    extractVideoId(card.dataset.url || card.querySelector("[data-url]")?.getAttribute("data-url") || "") ||
    extractIdFromCover(coverSrc) ||
    "";
  const title =
    card.dataset.title ||
    card.querySelector(".song-title")?.textContent?.trim() ||
    card.querySelector(".song-meta .title")?.textContent?.trim() ||
    "";
  const artist =
    card.dataset.artist ||
    card.querySelector(".song-artist")?.textContent?.trim() ||
    card.querySelector(".song-meta .artist")?.textContent?.trim() ||
    "";
  const url =
    card.dataset.url ||
    card.querySelector("[data-url]")?.getAttribute("data-url") ||
    (id ? `https://www.youtube.com/watch?v=${id}` : "");
  const cover =
    card.dataset.cover ||
    coverSrc ||
    (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "");
  const source = card.dataset.source || "youtube";
  return { id, title, artist, url, cover, source };
}

function addSongToPlaylist(playlistId, songOrCard) {
  const playlists = readOrCreateDefaultPlaylists();
  const playlist = playlists.find(p => p.id === playlistId || p.name === playlistId);
  const song = songOrCard instanceof Element ? extractSongFromCard(songOrCard) : songOrCard;
  if (!playlist || !song || (!song.id && !song.url)) return;

  const exists = (playlist.songs || []).some(s => (s.id && s.id === song.id) || (s.url && s.url === song.url));
  if (exists) return;

  if (!playlist.songs) playlist.songs = [];
  playlist.songs.push(song);
  savePlaylistsToStorage(playlists);
  window.dispatchEvent(new CustomEvent("playlist:updated", { detail: { playlistId, song } }));
}

function ensureChooser() {
  let chooser = document.getElementById("playlistChooser");
  if (!chooser) {
    chooser = document.createElement("div");
    chooser.id = "playlistChooser";
    chooser.style.position = "absolute";
    chooser.style.background = "var(--glass, rgba(0,0,0,0.7))";
    chooser.style.backdropFilter = "blur(6px)";
    chooser.style.borderRadius = "10px";
    chooser.style.padding = "8px";
    chooser.style.zIndex = "1000";
    chooser.style.display = "none";
    chooser.style.minWidth = "180px";
    document.body.appendChild(chooser);
  }
  return chooser;
}

function openPlaylistChooserForCard(card) {
  const playlists = readOrCreateDefaultPlaylists();
  const chooser = ensureChooser();
  chooser.innerHTML = "";
  const list = playlists.map(p => ({ id: p.id, name: p.name }));
  list.forEach(p => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = p.name;
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.margin = "4px 0";
    btn.addEventListener("click", () => {
      addSongToPlaylist(p.id, card);
      chooser.style.display = "none";
      renderPlaylists();
    });
    chooser.appendChild(btn);
  });
  const rect = card.getBoundingClientRect();
  const top = window.scrollY + rect.top + 10;
  const left = window.scrollX + rect.left + rect.width + 10;
  chooser.style.top = `${top}px`;
  chooser.style.left = `${left}px`;
  chooser.style.display = "block";
}

function buildCurrentSong() {
  const id = currentVideoId || extractVideoId(document.getElementById(PLAYER_IFRAME_ID)?.src || "");
  const cover = document.getElementById("miniCover")?.src || (id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "");
  const title = document.getElementById(TITLE_ID)?.textContent?.trim() || (id ? `Video: ${id}` : "");
  const artist = document.getElementById(ARTIST_ID)?.textContent?.trim() || "YouTube";
  const url = id ? `https://www.youtube.com/watch?v=${id}` : "";
  return { id, title, artist, url, cover, source: "youtube" };
}

function openPlaylistChooserForCurrent(anchorEl) {
  const playlists = readOrCreateDefaultPlaylists();
  const chooser = ensureChooser();
  chooser.innerHTML = "";
  const song = buildCurrentSong();
  playlists.forEach(p => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = p.name;
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.margin = "4px 0";
    btn.addEventListener("click", () => {
      addSongToPlaylist(p.id, song);
      chooser.style.display = "none";
      renderPlaylists();
    });
    chooser.appendChild(btn);
  });
  const rect = anchorEl.getBoundingClientRect();
  const top = window.scrollY + rect.top - (chooser.offsetHeight || 0) - 10;
  const left = window.scrollX + rect.left;
  chooser.style.top = `${top}px`;
  chooser.style.left = `${left}px`;
  chooser.style.display = "block";
}

document.addEventListener("click", e => {
  const playerBtn = e.target.closest("#playerAddBtn, [data-add-current-to-playlist]");
  if (playerBtn) {
    openPlaylistChooserForCurrent(playerBtn);
    return;
  }
  const btn = e.target.closest("[data-add-to-playlist], .add-to-pl-btn");
  if (!btn) return;
  const card = btn.closest(".song-card");
  if (!card) return;
  openPlaylistChooserForCard(card);
});

window.addEventListener("playlist:updated", () => {
  renderPlaylists();
});

function highlightCurrentPlayingInGrid(vid) {
  const cards = document.querySelectorAll(".song-card");
  cards.forEach(c => {
    const coverEl = c.querySelector(".song-cover") || c.querySelector("img");
    const coverSrc = coverEl?.src || "";
    const sid =
      c.dataset.songId ||
      c.querySelector("[data-song-id]")?.getAttribute("data-song-id") ||
      extractVideoId(c.dataset.url || c.querySelector("[data-url]")?.getAttribute("data-url") || "") ||
      extractIdFromCover(coverSrc);
    if (sid && sid === vid) {
      c.classList.add("playing");
    } else {
      c.classList.remove("playing");
    }
  });
}

function bindCoreUI() {
  const input = document.getElementById(INPUT_ID);
  const loadBtn = document.getElementById(LOAD_BTN_ID);
  if (loadBtn && input) {
    const handleLoad = async () => {
      const raw = input.value;
      if (!raw || !raw.trim()) {
        alert("Enter a YouTube URL/ID or a search query.");
        return;
      }
      const vid = extractVideoId(raw);
      if (vid) {
        setVideoById(vid);
        return;
      }
      const result = await searchYouTube(raw);
      if (result?.id) {
        setVideoById(result.id);
        const titleEl = document.getElementById(TITLE_ID);
        const artistEl = document.getElementById(ARTIST_ID);
        const miniCover = document.getElementById("miniCover");
        if (titleEl) titleEl.textContent = result.title;
        if (artistEl) artistEl.textContent = result.author;
        if (miniCover && result.thumbnail) miniCover.src = result.thumbnail;
      } else {
        alert("No results found or search unavailable. Try another query.");
      }
    };
    loadBtn.addEventListener("click", handleLoad);
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") handleLoad();
    });
  }

  const playBtn = document.getElementById(PLAY_BTN_ID);
  if (playBtn) playBtn.addEventListener("click", togglePlay);

  const createBtn = document.getElementById("createPlaylistBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const name = prompt("Playlist name");
      if (!name) return;
      const playlists = loadPlaylistsFromStorage();
      const p = createEmptyPlaylist(name);
      playlists.push(p);
      savePlaylistsToStorage(playlists);
      renderPlaylists();
    });
  }

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.addEventListener("click", next);
  const prevBtn = document.getElementById("prevBtn");
  if (prevBtn) prevBtn.addEventListener("click", prev);
}

document.addEventListener("DOMContentLoaded", () => {
  bindCoreUI();
  initWaveBars();
  renderPlaylists();
});
