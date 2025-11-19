/* music.js — fully fixed version
   - Play YouTube videos by URL or ID
   - Queue support, next/prev
   - Playlists create/add/remove + persistence
   - Wave & progress simulation
   - Add currently playing video to playlist
*/

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

/* --- Utils --- */
function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url; // raw ID
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  if (m) return m[1];
  return null;
}

/* --- Set Video --- */
function setVideoById(vid) {
  if (!vid) return;
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  if (player) player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  currentVideoId = vid;
  isPlaying = true;

  if (cover) cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  if (titleEl || artistEl) {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
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
  else { currentQueue = [vid]; currentIndex = 0; }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

/* --- Play/Pause --- */
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

/* --- Progress Simulation --- */
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
function stopProgressSimulation() { clearInterval(progressInterval); }

/* --- Wave Animation --- */
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
function startWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "running"); }
function stopWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "paused"); }

/* --- Queue Next/Prev --- */
function next() {
  if (!currentQueue || currentQueue.length === 0) return alert("Queue is empty.");
  currentIndex = (currentIndex + 1) % currentQueue.length;
  setVideoById(currentQueue[currentIndex]);
}
function prev() {
  if (!currentQueue || currentQueue.length === 0) return alert("Queue is empty.");
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  setVideoById(currentQueue[currentIndex]);
}

/* --- Playlists --- */
function loadPlaylistsFromStorage() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
}
function savePlaylistsToStorage(list) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list || [])); } catch (e) {} }
function createEmptyPlaylist(name) { return { id: `pl_${Date.now()}`, name: name || "New Playlist", songs: [] }; }

/* --- Render Playlists --- */
function renderPlaylists() {
  const area = document.getElementById("playlistArea");
  const sidebarList = document.getElementById("sidebarPlaylists");
  const playlists = loadPlaylistsFromStorage();

  if (area) {
    area.innerHTML = "";
    if (!playlists.length) {
      const note = document.createElement("div");
      note.style.color = "var(--muted)";
      note.textContent = "No playlists yet.";
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
        plWrap.style.gap = "8px";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";

        const title = document.createElement("div");
        title.textContent = `${pl.name} (${pl.songs.length})`;
        title.style.fontWeight = "700";

        const controls = document.createElement("div");
        const playAllBtn = document.createElement("button");
        playAllBtn.textContent = "▶";
        playAllBtn.className = "btn";
        playAllBtn.onclick = (e) => {
          e.stopPropagation();
          if (!pl.songs.length) return alert("Playlist empty.");
          currentQueue = pl.songs.map(s => s.videoId);
          currentIndex = 0;
          setVideoById(currentQueue[0]);
        };

        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑";
        delBtn.className = "btn";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (!confirm(`Delete playlist "${pl.name}" ?`)) return;
          const all = loadPlaylistsFromStorage();
          const filtered = all.filter(x => x.id !== pl.id);
          savePlaylistsToStorage(filtered);
          renderPlaylists();
        };

        controls.appendChild(playAllBtn);
        controls.appendChild(delBtn);
        header.appendChild(title);
        header.appendChild(controls);
        plWrap.appendChild(header);

        if (!pl.songs.length) {
          const empty = document.createElement("div");
          empty.style.color = "var(--muted)";
          empty.textContent = "No songs yet.";
          plWrap.appendChild(empty);
        } else {
          pl.songs.forEach(s => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.gap = "8px";

            const left = document.createElement("div");
            left.style.display = "flex";
            left.style.alignItems = "center";
            left.style.gap = "10px";
            left.style.cursor = "pointer";

            const thumb = document.createElement("img");
            thumb.src = s.cover || `https://i.ytimg.com/vi/${s.videoId}/default.jpg`;
            thumb.style.width = "46px";
            thumb.style.height = "46px";
            thumb.style.objectFit = "cover";
            thumb.style.borderRadius = "6px";

            const meta = document.createElement("div");
            const t = document.createElement("div");
            t.textContent = s.title || "Unknown";
            t.style.fontWeight = "600";
            const a = document.createElement("div");
            a.textContent = s.artist || "Unknown";
            a.style.fontSize = "12px";
            a.style.color = "var(--muted)";
            meta.appendChild(t);
            meta.appendChild(a);

            left.appendChild(thumb);
            left.appendChild(meta);
            left.onclick = () => setVideoById(s.videoId);

            const right = document.createElement("div");
            right.style.display = "flex";
            right.style.gap = "8px";

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✖";
            removeBtn.className = "btn";
            removeBtn.onclick = (e) => {
              e.stopPropagation();
              if (!confirm(`Remove "${s.title}"?`)) return;
              const all = loadPlaylistsFromStorage();
              const target = all.find(x => x.id === pl.id);
              if (!target) return;
              target.songs = target.songs.filter(x => x.videoId !== s.videoId);
              savePlaylistsToStorage(all);
              renderPlaylists();
            };

            right.appendChild(removeBtn);
            row.appendChild(left);
            row.appendChild(right);
            plWrap.appendChild(row);
          });
        }

        area.appendChild(plWrap);
      });
    }
  }

  if (sidebarList) {
    sidebarList.innerHTML = "";
    playlists.forEach(pl => {
      const btn = document.createElement("button");
      btn.className = "pl-btn";
      btn.textContent = `${pl.name} (${pl.songs.length})`;
      btn.onclick = () => {
        if (!pl.songs.length) return alert("Playlist empty.");
        currentQueue = pl.songs.map(s => s.videoId);
        currentIndex = 0;
        setVideoById(currentQueue[0]);
      };
      sidebarList.appendChild(btn);
    });
  }
}

/* --- Add current to playlist --- */
function wireAddCurrentToPlaylistBtn() {
  const btn = document.getElementById("addCurrentToPlaylistBtn");
  if (!btn) return;
  btn.onclick = () => {
    if (!currentVideoId) return alert("No video playing.");
    const playlists = loadPlaylistsFromStorage();
    if (!playlists.length) return alert("No playlists available.");
    const choice = prompt(`Add to which playlist?\n${playlists.map((p,i)=>`${i+1}: ${p.name}`).join("\n")}`);
    if (!choice) return;
    const idx = parseInt(choice)-1;
    if (idx < 0 || idx >= playlists.length) return alert("Invalid choice");
    const songObj = {
      videoId: currentVideoId,
      title: document.getElementById(TITLE_ID)?.textContent || "Unknown",
      artist: document.getElementById(ARTIST_ID)?.textContent || "",
      cover: document.getElementById(COVER_IMG_ID)?.src || ""
    };
    addSongToPlaylist(playlists[idx].id, songObj);
  };
}

/* --- Highlight current --- */
function highlightCurrentPlayingInGrid(vid) {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  grid.querySelectorAll(".song-card").forEach(c => { c.style.border = ""; });
  const current = Array.from(grid.querySelectorAll(".song-card")).find(c => (extractVideoId(c.dataset.id) || c.dataset.id) === vid);
  if (current) current.style.border = "2px solid var(--accent)";
}

/* --- Init --- */
function initMusic() {
  initWaveBars();
  renderPlaylists();
  wireAddCurrentToPlaylistBtn();

  const loadBtn = document.getElementById(LOAD_BTN_ID);
  const input = document.getElementById(INPUT_ID);
  if (loadBtn && input) {
    loadBtn.onclick = () => {
      const vid = extractVideoId(input.value);
      if (!vid) return alert("Invalid YouTube URL/ID");
      setVideoById(vid);
    };
  }

  document.getElementById(PLAY_BTN_ID)?.addEventListener("click", togglePlay);
  document.getElementById("nextBtn")?.addEventListener("click", next);
  document.getElementById("prevBtn")?.addEventListener("click", prev);
}

document.addEventListener("DOMContentLoaded", initMusic);
