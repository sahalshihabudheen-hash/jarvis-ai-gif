const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "audioPlayerIframe";
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

/* util to extract youtube id */
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

/* play audio by ID */
function setVideoById(vid) {
  if (!vid) return;
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!player) return;

  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${vid}`;
  currentVideoId = vid;
  isPlaying = true;

  const idx = currentQueue.indexOf(vid);
  if (idx !== -1) currentIndex = idx;
  else { currentQueue = [vid]; currentIndex = 0; }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

/* play/pause toggle */
function togglePlay() {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    player.src = "";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    player.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=0&rel=0&modestbranding=1&loop=1&playlist=${currentVideoId}`;
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}
function updatePlayButton() { const el = document.getElementById("playBtn"); if(el) el.textContent = isPlaying?"⏸":"▶"; }

/* progress simulation */
function setProgress(p) { const fill = document.getElementById(PROGRESS_FILL_ID); if(fill) fill.style.width = Math.max(0,Math.min(100,p))+"%"; }
function startProgressSimulation() { clearInterval(progressInterval); let val=0; progressInterval=setInterval(()=>{if(!isPlaying)return; val+=0.7;if(val>100)val=0;setProgress(val);},500); }
function stopProgressSimulation() { clearInterval(progressInterval); }

/* waves */
function initWaveBars() { const c=document.getElementById(WAVE_CONTAINER_ID); if(!c)return;c.innerHTML="";waveBars=[];for(let i=0;i<NUM_BARS;i++){const b=document.createElement("div");b.className="wave-bar";b.style.setProperty("--scale",Math.random().toString());c.appendChild(b);waveBars.push(b);} }
function startWaveAnimation() { waveBars.forEach(b=>b.style.animationPlayState="running"); }
function stopWaveAnimation() { waveBars.forEach(b=>b.style.animationPlayState="paused"); }

/* queue next/prev */
function next() { if(!currentQueue.length) return alert("Queue empty"); currentIndex=(currentIndex+1)%currentQueue.length; setVideoById(currentQueue[currentIndex]); }
function prev() { if(!currentQueue.length) return alert("Queue empty"); currentIndex=(currentIndex-1+currentQueue.length)%currentQueue.length; setVideoById(currentQueue[currentIndex]); }

/* playlists */
function loadPlaylistsFromStorage(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):[];}catch(e){console.error(e);return[];} }
function savePlaylistsToStorage(list){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(list||[])); }catch(e){console.error(e);} }
function createEmptyPlaylist(name){ return { id:`pl_${Date.now()}`, name:name||"New Playlist", songs:[] }; }

/* render playlists (right panel + sidebar) */
function renderPlaylists(){ const area=document.getElementById("playlistArea"); const sidebarList=document.getElementById("sidebarPlaylists"); const playlists=loadPlaylistsFromStorage();

if(area){ area.innerHTML=""; if(playlists.length===0){ const note=document.createElement("div"); note.style.color="var(--muted)"; note.textContent="No playlists yet."; area.appendChild(note);} else { playlists.forEach(pl=>{ const plWrap=document.createElement("div"); plWrap.style.background="var(--glass)"; plWrap.style.padding="10px"; plWrap.style.borderRadius="10px"; plWrap.style.marginBottom="10px"; const header=document.createElement("div"); header.style.display="flex"; header.style.justifyContent="space-between"; header.style.alignItems="center"; const title=document.createElement("div"); title.textContent=`${pl.name} (${pl.songs.length})`; title.style.fontWeight="700"; const controls=document.createElement("div"); const playAllBtn=document.createElement("button"); playAllBtn.textContent="▶"; playAllBtn.className="btn"; playAllBtn.style.marginRight="8px"; playAllBtn.onclick=(e)=>{e.stopPropagation(); if(pl.songs.length===0)return alert("Playlist empty"); currentQueue=pl.songs.map(s=>s.videoId); currentIndex=0; setVideoById(currentQueue[0]); }; const delBtn=document.createElement("button"); delBtn.textContent="🗑"; delBtn.className="btn"; delBtn.onclick=(e)=>{e.stopPropagation(); if(!confirm(`Delete playlist "${pl.name}"?`))return; const all=loadPlaylistsFromStorage(); savePlaylistsToStorage(all.filter(x=>x.id!==pl.id)); renderPlaylists(); }; controls.appendChild(playAllBtn); controls.appendChild(delBtn); header.appendChild(title); header.appendChild(controls); plWrap.appendChild(header);

if(pl.songs.length>0){ pl.songs.forEach(s=>{ const row=document.createElement("div"); row.style.display="flex"; row.style.justifyContent="space-between"; row.style.alignItems="center"; row.style.gap="8px"; const left=document.createElement("div"); left.style.display="flex"; left.style.alignItems="center"; left.style.gap="10px"; left.style.cursor="pointer"; const thumb=document.createElement("img"); thumb.src=s.cover||`https://i.ytimg.com/vi/${s.videoId}/default.jpg`; thumb.style.width="46px"; thumb.style.height="46px"; thumb.style.objectFit="cover"; thumb.style.borderRadius="6px"; const meta=document.createElement("div"); const t=document.createElement("div"); t.textContent=s.title||"Unknown"; t.style.fontWeight="600"; const a=document.createElement("div"); a.textContent=s.artist||"Unknown"; a.style.fontSize="12px"; a.style.color="var(--muted)"; meta.appendChild(t); meta.appendChild(a); left.appendChild(thumb); left.appendChild(meta); left.onclick=()=>setVideoById(s.videoId); const right=document.createElement("div"); right.style.display="flex"; right.style.gap="8px"; const removeBtn=document.createElement("button"); removeBtn.textContent="✖"; removeBtn.className="btn"; removeBtn.onclick=(e)=>{ e.stopPropagation(); if(!confirm(`Remove "${s.title}"?`))return; const all=loadPlaylistsFromStorage(); const target=all.find(x=>x.id===pl.id); if(!target)return; target.songs=target.songs.filter(x=>x.videoId!==s.videoId); savePlaylistsToStorage(all); renderPlaylists(); }; right.appendChild(removeBtn); row.appendChild(left); row.appendChild(right); plWrap.appendChild(row); }); } area.appendChild(plWrap); }); } }

if(sidebarList){ sidebarList.innerHTML=""; playlists.forEach(pl=>{ const btn=document.createElement("button"); btn.className="pl-btn"; btn.textContent=`${pl.name} (${pl.songs.length})`; btn.onclick=()=>{ if(pl.songs.length===0)return alert("Playlist empty"); currentQueue=pl.songs.map(s=>s.videoId); currentIndex=0; setVideoById(currentQueue[0]); }; sidebarList.appendChild(btn); }); } }

/* add song to playlist */
function addSongToPlaylist(playlistId, songObj){ const all=loadPlaylistsFromStorage(); const pl=all.find(x=>x.id===playlistId); if(!pl)return alert("Playlist not found"); if(pl.songs.some(s=>s.videoId===songObj.videoId)) return alert("Song already in playlist"); pl.songs.push(songObj); savePlaylistsToStorage(all); renderPlaylists(); alert(`Added "${songObj.title}" to "${pl.name}"`); }

/* song grid wiring */
function wireSongGrid(){ const grid=document.getElementById("songGrid"); if(!grid)return; const cards=Array.from(grid.querySelectorAll(".song-card")); cards.forEach(card=>{ if(!card.style.position)card.style.position="relative";

card.addEventListener("click", ev=>{ if(ev.target.classList?.contains("add-to-pl-btn")) return; const raw=card.getAttribute("data-id")||card.dataset.id||""; const vid=extractVideoId(raw)||raw; if(!vid)return alert("Cannot play"); const allIds=cards.map(c=>extractVideoId(c.getAttribute("data-id")||c.dataset.id)||c.getAttribute("data-id")||c.dataset.id); currentQueue=allIds.filter(x=>!!x); currentIndex=currentQueue.indexOf(vid); if(currentIndex===-1){currentQueue=[vid]; currentIndex=0;} setVideoById(vid); });

const addBtn=card.querySelector(".add-to-pl-btn"); if(addBtn){ addBtn.addEventListener("click", e=>{ e.stopPropagation(); openPlaylistChooserForCard(card, addBtn); }); }else{ const btn=document.createElement("button"); btn.className="add-to-pl-btn"; btn.textContent="+"; btn.title="Add to playlist"; card.appendChild(btn); btn.addEventListener("click", e=>{ e.stopPropagation(); openPlaylistChooserForCard(card, btn); }); } }); }

/* chooser */
function openPlaylistChooserForCard(card, anchorBtn){ const existing=document.getElementById("playlistChooserPopover"); if(existing)existing.remove(); const playlists=loadPlaylistsFromStorage(); const pop=document.createElement("div"); pop.id="playlistChooserPopover"; pop.style.position="absolute"; pop.style.top=(anchorBtn.offsetTop+anchorBtn.offsetHeight+6)+"px"; pop.style.right="8px"; pop.style.background="var(--card)"; pop.style.color="#e9f2ef"; pop.style.padding="10px"; pop.style.borderRadius="8px"; pop.style.zIndex=9999; pop.style.minWidth="180px"; const title=document.createElement("div"); title.textContent="Add to playlist"; title.style.fontWeight="700"; title.style.marginBottom="8px"; pop.appendChild(title);

if(playlists.length===0){ const no=document.createElement("div"); no.textContent="No playlists yet."; no.style.color="var(--muted)"; no.style.marginBottom="8px"; pop.appendChild(no); const createNow=document.createElement("button"); createNow.textContent="+ Create"; createNow.style.background="var(--accent)"; createNow.style.border="none"; createNow.style.padding="8px 10px"; createNow.style.borderRadius="8px"; createNow.style.cursor="pointer"; createNow.onclick=()=>{ const name=prompt("Playlist name:"); if(!name)return; const all=loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists(); pop.remove(); }; pop.appendChild(createNow); }else{ playlists.forEach(pl=>{ const r=document.createElement("div"); r.style.display="flex"; r.style.justifyContent="space-between"; r.style.alignItems="center"; r.style.marginBottom="6px"; r.style.cursor="pointer"; const left=document.createElement("div"); left.textContent=pl.name; left.style.color="#e9f2ef"; left.onclick=()=>{ const raw=card.getAttribute("data-id")||card.dataset.id||""; const vid=extractVideoId(raw)||raw; if(!vid)return alert("Invalid video id"); const songObj={ videoId:vid, title: card.getAttribute("data-title")||card.dataset.title||card.querySelector(".title")?.textContent||card.querySelector("h4")?.textContent||"Unknown", artist:card.getAttribute("data-artist")||card.dataset.artist||card.querySelector(".artist")?.textContent||"", cover:card.getAttribute("data-cover")||card.dataset.cover||card.querySelector("img")?.src||"" }; addSongToPlaylist(pl.id,songObj); pop.remove(); }; const cnt=document.createElement("div"); cnt.textContent=pl.songs.length; cnt.style.color="var(--muted)"; r.appendChild(left); r.appendChild(cnt); pop.appendChild(r); }); }

card.appendChild(pop); setTimeout(()=>{ document.addEventListener("click", e=>{ if(!pop.contains(e.target)&&e.target!==anchorBtn) pop.remove(); }, {once:true}); },100); }

/* init */
document.addEventListener("DOMContentLoaded",()=>{
  initWaveBars();
  renderPlaylists();
  wireSongGrid();

  document.getElementById(LOAD_BTN_ID)?.addEventListener("click",()=>{
    const val=document.getElementById(INPUT_ID).value;
    const vid=extractVideoId(val)||val;
    if(!vid)return alert("Invalid YouTube ID or URL");
    currentQueue=[vid]; currentIndex=0; setVideoById(vid);
  });

  document.getElementById("playBtn")?.addEventListener("click",togglePlay);
  document.getElementById("nextBtn")?.addEventListener("click",next);
  document.getElementById("prevBtn")?.addEventListener("click",prev);
  document.getElementById("createPlaylistBtn")?.addEventListener("click",()=>{
    const name=prompt("Playlist name:");
    if(!name)return;
    const all=loadPlaylistsFromStorage();
    all.push(createEmptyPlaylist(name));
    savePlaylistsToStorage(all);
    renderPlaylists();
  });
});
