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

let player;
let currentVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = [];
let currentIndex = -1;

/* utils */
function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  if (m) return m[1];
  return null;
}

/* YouTube IFrame API */
function onYouTubeIframeAPIReady() {
  player = new YT.Player(PLAYER_IFRAME_ID, {
    height: '0', width: '0',
    videoId: '',
    playerVars: { 'autoplay': 0, 'controls': 0 },
    events: { 'onStateChange': onPlayerStateChange }
  });
}
function onPlayerStateChange(event) {
  if(event.data === YT.PlayerState.PLAYING){ isPlaying=true; updatePlayButton(); startProgressSimulation(); startWaveAnimation(); }
  else { isPlaying=false; updatePlayButton(); stopProgressSimulation(); stopWaveAnimation(); }
}

/* set audio by ID */
function setVideoById(vid){
  if(!vid || !player) return;
  currentVideoId = vid;
  currentQueue[currentIndex] = vid;
  player.loadVideoById(vid);
  isPlaying = true;
  updatePlayButton();
  updateNowPlayingUI();
  startWaveAnimation();
}

/* play/pause toggle */
function togglePlay(){ 
  if(!player || !currentVideoId) return;
  if(isPlaying) player.pauseVideo();
  else player.playVideo();
}

/* progress simulation */
function setProgress(p){ const fill=document.getElementById(PROGRESS_FILL_ID); if(fill) fill.style.width=`${Math.max(0,Math.min(100,p))}%`; }
function startProgressSimulation(){ clearInterval(progressInterval); let val=0; progressInterval=setInterval(()=>{ if(!isPlaying) return; val+=0.7; if(val>100) val=0; setProgress(val); },500);}
function stopProgressSimulation(){ clearInterval(progressInterval); }

/* waves */
function initWaveBars(){ const container=document.getElementById(WAVE_CONTAINER_ID); if(!container) return; container.innerHTML=""; waveBars=[]; for(let i=0;i<NUM_BARS;i++){const bar=document.createElement("div"); bar.className="wave-bar"; bar.style.setProperty("--scale",Math.random()); container.appendChild(bar); waveBars.push(bar); } }
function startWaveAnimation(){ waveBars.forEach(b=>b.style.animationPlayState="running"); }
function stopWaveAnimation(){ waveBars.forEach(b=>b.style.animationPlayState="paused"); }

/* queue */
function next(){ if(!currentQueue.length) return alert("Queue empty"); currentIndex=(currentIndex+1)%currentQueue.length; setVideoById(currentQueue[currentIndex]); }
function prev(){ if(!currentQueue.length) return alert("Queue empty"); currentIndex=(currentIndex-1+currentQueue.length)%currentQueue.length; setVideoById(currentQueue[currentIndex]); }

/* playlists */
function loadPlaylistsFromStorage(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):[]; }catch(e){ return[]; } }
function savePlaylistsToStorage(list){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(list||[])); }catch(e){} }
function createEmptyPlaylist(name){ return { id:`pl_${Date.now()}`, name:name||"New Playlist", songs:[] }; }

function renderPlaylists(){ 
  const area=document.getElementById("playlistArea"); const playlists=loadPlaylistsFromStorage();
  if(area){ area.innerHTML=""; if(playlists.length===0){ const note=document.createElement("div"); note.textContent="No playlists yet."; area.appendChild(note); } else { playlists.forEach(pl=>{ const plWrap=document.createElement("div"); plWrap.textContent=pl.name; plWrap.style.cursor="pointer"; area.appendChild(plWrap); }); } }
}

function addSongToPlaylist(playlistId,songObj){ const all=loadPlaylistsFromStorage(); const pl=all.find(x=>x.id===playlistId); if(!pl) return alert("Playlist not found"); if(pl.songs.some(s=>s.videoId===songObj.videoId)) return alert("Song already in playlist"); pl.songs.push(songObj); savePlaylistsToStorage(all); renderPlaylists(); alert(`Added "${songObj.title}" to "${pl.name}"`); }

/* Add-to-playlist on cards */
function initAddToPlaylistButtons(){
  document.querySelectorAll(".add-to-pl-btn").forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const card = e.target.closest(".song-card");
      if(!card) return;
      currentVideoId = card.dataset.id;
      document.getElementById(TITLE_ID).textContent = card.dataset.title;
      document.getElementById(ARTIST_ID).textContent = card.dataset.artist;
      document.getElementById(COVER_IMG_ID).src = card.dataset.cover;
      openAddToPlaylistPopover(e.target);
    });
  });
}

function openAddToPlaylistPopover(btn){
  const existing=document.getElementById("addToPlaylistPopover"); if(existing) existing.remove();
  const playlists=loadPlaylistsFromStorage(); if(playlists.length===0) return alert("No playlists. Create one first.");
  const pop=document.createElement("div");
  pop.id="addToPlaylistPopover";
  const rect = btn.getBoundingClientRect();
  pop.style.position="fixed";
  pop.style.top = (rect.top - playlists.length*28 -10) + "px";
  pop.style.left = rect.left + "px";
  pop.style.background="var(--panel,#0f1416)";
  pop.style.color="#e9f2ef";
  pop.style.padding="10px"; pop.style.borderRadius="8px"; pop.style.boxShadow="0 10px 30px rgba(0,0,0,0.6)"; pop.style.zIndex=9999;
  playlists.forEach(pl=>{
    const row=document.createElement("div");
    row.textContent = pl.name;
    row.style.cursor="pointer"; row.style.marginBottom="6px";
    row.onclick = ()=>{ 
      const songObj={ videoId:currentVideoId, title:document.getElementById(TITLE_ID).textContent, artist:document.getElementById(ARTIST_ID).textContent }; 
      addSongToPlaylist(pl.id,songObj); pop.remove();
    };
    pop.appendChild(row);
  });
  document.body.appendChild(pop);
  function closeOnClickOutside(e){ if(!pop.contains(e.target) && e.target!==btn){ pop.remove(); document.removeEventListener("click",closeOnClickOutside);} }
  setTimeout(()=>document.addEventListener("click",closeOnClickOutside),50);
}

/* update bottom/right UI */
function updateNowPlayingUI(){
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);
  const coverEl = document.getElementById(COVER_IMG_ID);
  const miniTitle = document.getElementById("trackTitleMini");
  const miniArtist = document.getElementById("trackArtistMini");
  if(titleEl) titleEl.textContent = document.querySelector(`.song-card[data-id="${currentVideoId}"]`)?.dataset.title || "Unknown";
  if(artistEl) artistEl.textContent = document.querySelector(`.song-card[data-id="${currentVideoId}"]`)?.dataset.artist || "Unknown";
  if(coverEl) coverEl.src = document.querySelector(`.song-card[data-id="${currentVideoId}"]`)?.dataset.cover || "";
  if(miniTitle) miniTitle.textContent = titleEl.textContent;
  if(miniArtist) miniArtist.textContent = artistEl.textContent;
}

/* search/load music */
async function loadMusic(){ 
  const input=document.getElementById(INPUT_ID); if(!input) return alert("Search input not found");
  const raw=input.value.trim(); if(!raw) return alert("Type a song or paste a link"); 
  const vid=extractVideoId(raw); if(!vid) return alert("Invalid link"); 
  currentQueue = [vid]; currentIndex = 0; 
  setVideoById(vid);
}

/* init */
document.addEventListener("DOMContentLoaded",()=>{
  initWaveBars();
  renderPlaylists();
  initAddToPlaylistButtons();

  document.getElementById(LOAD_BTN_ID)?.addEventListener("click",loadMusic);
  document.getElementById(INPUT_ID)?.addEventListener("keydown",e=>{ if(e.key==="Enter") loadMusic(); });
  document.getElementById(PLAY_BTN_ID)?.addEventListener("click",togglePlay);
  document.getElementById("nextBtn")?.addEventListener("click",next);
  document.getElementById("prevBtn")?.addEventListener("click",prev);

  document.getElementById("createPlaylistBtn")?.addEventListener("click",()=>{
    const name = prompt("Playlist name:"); if(!name) return;
    const all = loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists();
  });

  // Load YouTube API
  const tag = document.createElement('script'); tag.src="https://www.youtube.com/iframe_api"; document.body.appendChild(tag);
});
