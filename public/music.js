const PLAYLISTS_KEY = 'jarvis_playlists';

function readPlaylists() {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writePlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function ensurePlaylist(playlists, id, name) {
  if (Array.isArray(playlists)) {
    let p = playlists.find(x => x.id === id || x.name === id);
    if (!p) {
      p = { id, name: name || id, songs: [] };
      playlists.push(p);
    }
    return p;
  } else {
    if (!playlists[id]) playlists[id] = { id, name: name || id, songs: [] };
    return playlists[id];
  }
}

function findPlaylist(playlists, id) {
  if (Array.isArray(playlists)) {
    return playlists.find(x => x.id === id || x.name === id) || null;
  }
  return playlists[id] || null;
}

function extractSongFromCard(card) {
  return {
    id: card.dataset.songId || card.querySelector('[data-song-id]')?.getAttribute('data-song-id') || '',
    title: card.querySelector('.song-title')?.textContent?.trim() || '',
    artist: card.querySelector('.song-artist')?.textContent?.trim() || '',
    duration: card.querySelector('.song-duration')?.textContent?.trim() || '',
    source: card.dataset.source || '',
    url: card.dataset.url || card.querySelector('[data-url]')?.getAttribute('data-url') || ''
  };
}

function addSongToPlaylist(playlistId, songOrCard) {
  const playlists = readPlaylists();
  let playlist = findPlaylist(playlists, playlistId);
  if (!playlist) playlist = ensurePlaylist(playlists, playlistId);

  const song = songOrCard instanceof Element ? extractSongFromCard(songOrCard) : songOrCard;
  if (!song || !song.title) return;

  const exists = (playlist.songs || []).some(s => (s.id && s.id === song.id) || (s.url && s.url === song.url));
  if (exists) return;

  if (!playlist.songs) playlist.songs = [];
  playlist.songs.push(song);

  writePlaylists(playlists);

  window.dispatchEvent(new CustomEvent('playlist:updated', { detail: { playlistId, song } }));
}

function openPlaylistChooserForCard(card) {
  const song = extractSongFromCard(card);
  const playlists = readPlaylists();

  const menu = document.getElementById('playlist-chooser');
  menu.innerHTML = '';

  const list = Array.isArray(playlists)
    ? playlists.map(p => ({ id: p.id || p.name, name: p.name || p.id }))
    : Object.keys(playlists).map(id => ({ id, name: playlists[id].name || id }));

  list.forEach(p => {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = p.name;
    item.dataset.playlistId = p.id;
    item.addEventListener('click', () => {
      addSongToPlaylist(p.id, song);
    });
    menu.appendChild(item);
  });

  menu.style.display = 'block';
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add-to-playlist]');
  if (!btn) return;
  const card = btn.closest('.song-card');
  if (!card) return;
  openPlaylistChooserForCard(card);
});
