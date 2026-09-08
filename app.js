// ==================== Clipify - InShot Style ====================

const state = {
  clips: [],
  currentClipIndex: -1,
  isPlaying: false,
  filter: 'none',
  brightness: 100,
  contrast: 100,
  saturate: 100,
  aspectRatio: '16:9',
  textOverlays: [],
  volume: 0.8,
  selectedClipId: null
};

const previewVideo = document.getElementById('previewVideo');
const placeholder = document.getElementById('placeholder');
const mediaList = document.getElementById('mediaList');
const clipsContainer = document.getElementById('clipsContainer');
const playhead = document.getElementById('playhead');
const btnPlay = document.getElementById('btnPlay');
const seekBar = document.getElementById('seekBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const speedSelect = document.getElementById('speedSelect');
const textOverlaysEl = document.getElementById('textOverlays');

function formatTime(s) {
  if (!s || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function generateId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2,6);
}

function getVideoDuration(file) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      resolve(v.duration);
      URL.revokeObjectURL(v.src);
    };
    v.src = URL.createObjectURL(file);
  });
}

// Tool switching
function switchTool(name) {
  document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));

  const btn = document.querySelector(`.tool[data-tool="${name}"]`);
  if (btn) btn.classList.add('active');

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.remove('hidden');
}

document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    // Toggle if already open
    const panel = document.getElementById('panel-' + tool);
    if (panel && !panel.classList.contains('hidden') && btn.classList.contains('active')) {
      panel.classList.add('hidden');
      btn.classList.remove('active');
    } else {
      switchTool(tool);
    }
  });
});

// Upload video
document.getElementById('videoInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (!file.type.startsWith('video/')) continue;
    const duration = await getVideoDuration(file);
    const url = URL.createObjectURL(file);
    const id = generateId();
    const clip = { id, file, url, name: file.name, duration, element: null };
    state.clips.push(clip);
    addMediaItem(clip);
    addClipToTimeline(clip);
  }
  if (state.clips.length && state.currentClipIndex === -1) selectClip(0);
  e.target.value = '';
});

function addMediaItem(clip) {
  const el = document.createElement('div');
  el.className = 'media-item';
  el.innerHTML = `<video src="${clip.url}" muted></video><div class="media-item-name">${clip.name}</div>`;
  el.onclick = () => {
    const idx = state.clips.findIndex(c => c.id === clip.id);
    if (idx >= 0) selectClip(idx);
  };
  mediaList.appendChild(el);
}

function addClipToTimeline(clip) {
  const el = document.createElement('div');
  el.className = 'clip';
  el.dataset.id = clip.id;
  el.style.width = Math.max(70, clip.duration * 18) + 'px';
  el.textContent = clip.name.length > 12 ? clip.name.slice(0,12) + '…' : clip.name;
  el.onclick = () => {
    const idx = state.clips.findIndex(c => c.id === clip.id);
    if (idx >= 0) selectClip(idx);
  };
  clipsContainer.appendChild(el);
  clip.element = el;
}

function selectClip(index) {
  if (index < 0 || index >= state.clips.length) return;
  state.currentClipIndex = index;
  const clip = state.clips[index];
  state.selectedClipId = clip.id;

  document.querySelectorAll('.clip').forEach(c => c.classList.remove('selected'));
  if (clip.element) clip.element.classList.add('selected');

  previewVideo.src = clip.url;
  previewVideo.style.display = 'block';
  placeholder.style.display = 'none';
  applyFilters();
  updateTime();
}

// Playback
btnPlay.onclick = () => {
  if (state.currentClipIndex < 0) return;
  if (state.isPlaying) {
    previewVideo.pause();
    btnPlay.textContent = '▶';
    state.isPlaying = false;
  } else {
    previewVideo.play();
    btnPlay.textContent = '❚❚';
    state.isPlaying = true;
  }
};

previewVideo.ontimeupdate = () => {
  updateTime();
  updatePlayhead();
  if (previewVideo.duration) {
    seekBar.value = (previewVideo.currentTime / previewVideo.duration) * 100;
  }
};

previewVideo.onended = () => {
  if (state.currentClipIndex < state.clips.length - 1) {
    selectClip(state.currentClipIndex + 1);
    previewVideo.play();
    state.isPlaying = true;
    btnPlay.textContent = '❚❚';
  } else {
    state.isPlaying = false;
    btnPlay.textContent = '▶';
  }
};

function updateTime() {
  currentTimeEl.textContent = formatTime(previewVideo.currentTime);
  const clip = state.clips[state.currentClipIndex];
  totalTimeEl.textContent = formatTime(clip ? clip.duration : 0);
}

function updatePlayhead() {
  const clip = state.clips[state.currentClipIndex];
  if (!clip || !clip.element) return;
  const left = clip.element.offsetLeft;
  const w = clip.element.offsetWidth;
  const p = previewVideo.duration ? previewVideo.currentTime / previewVideo.duration : 0;
  playhead.style.left = (left + w * p) + 'px';
}

seekBar.oninput = () => {
  if (previewVideo.duration) {
    previewVideo.currentTime = (seekBar.value / 100) * previewVideo.duration;
  }
};

speedSelect.onchange = () => {
  previewVideo.playbackRate = parseFloat(speedSelect.value);
};

// Filters
document.querySelectorAll('.filter-chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.filter;
    applyFilters();
  };
});

['brightness','contrast','saturate'].forEach(id => {
  document.getElementById(id).oninput = (e) => {
    state[id] = e.target.value;
    applyFilters();
  };
});

function applyFilters() {
  let f = '';
  if (state.filter === 'grayscale') f += 'grayscale(100%) ';
  if (state.filter === 'sepia') f += 'sepia(80%) ';
  if (state.filter === 'contrast') f += 'contrast(140%) ';
  if (state.filter === 'brightness') f += 'brightness(130%) ';
  if (state.filter === 'saturate') f += 'saturate(180%) ';
  f += `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturate}%)`;
  previewVideo.style.filter = f;
}

// Text
document.getElementById('btnAddText').onclick = () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;
  const size = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;

  const el = document.createElement('div');
  el.className = 'text-overlay';
  el.textContent = text;
  el.style.fontSize = size + 'px';
  el.style.color = color;
  el.style.left = '50%';
  el.style.top = '40%';
  el.style.transform = 'translate(-50%, -50%)';

  let dragging = false, sx, sy, ox, oy;
  el.onmousedown = el.ontouchstart = (e) => {
    dragging = true;
    const pt = e.touches ? e.touches[0] : e;
    sx = pt.clientX; sy = pt.clientY;
    const r = el.getBoundingClientRect();
    const pr = textOverlaysEl.getBoundingClientRect();
    ox = r.left - pr.left; oy = r.top - pr.top;
    e.preventDefault();
  };
  const move = (e) => {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    el.style.left = (ox + pt.clientX - sx) + 'px';
    el.style.top = (oy + pt.clientY - sy) + 'px';
    el.style.transform = 'none';
  };
  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move);
  document.addEventListener('mouseup', () => dragging = false);
  document.addEventListener('touchend', () => dragging = false);

  textOverlaysEl.appendChild(el);
  state.textOverlays.push(el);
  document.getElementById('textInput').value = '';
};

// Ratio
document.querySelectorAll('.ratio-chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.ratio-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.aspectRatio = btn.dataset.ratio;
    const [w,h] = state.aspectRatio.split(':').map(Number);
    document.getElementById('previewWrapper').style.aspectRatio = `${w}/${h}`;
  };
});

// Audio
document.getElementById('audioInput').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('audioInfo').textContent = '♪ ' + file.name;
};

document.getElementById('volume').oninput = (e) => {
  state.volume = e.target.value / 100;
  previewVideo.volume = state.volume;
};

// Delete
document.getElementById('btnDelete').onclick = () => {
  if (!state.selectedClipId) return;
  const idx = state.clips.findIndex(c => c.id === state.selectedClipId);
  if (idx < 0) return;
  const clip = state.clips[idx];
  if (clip.element) clip.element.remove();
  URL.revokeObjectURL(clip.url);
  state.clips.splice(idx, 1);
  mediaList.innerHTML = '';
  state.clips.forEach(c => addMediaItem(c));
  if (!state.clips.length) {
    state.currentClipIndex = -1;
    state.selectedClipId = null;
    previewVideo.src = '';
    previewVideo.style.display = 'none';
    placeholder.style.display = 'block';
  } else {
    selectClip(Math.min(idx, state.clips.length - 1));
  }
};

document.getElementById('btnSplit').onclick = () => {
  alert('Split will be improved in next version');
};

// New Project
document.getElementById('btnBack').onclick = () => {
  if (!confirm('Start new project? All clips will be removed.')) return;
  state.clips.forEach(c => {
    URL.revokeObjectURL(c.url);
    if (c.element) c.element.remove();
  });
  state.clips = [];
  state.currentClipIndex = -1;
  state.selectedClipId = null;
  state.textOverlays.forEach(el => el.remove());
  state.textOverlays = [];
  mediaList.innerHTML = '';
  previewVideo.src = '';
  previewVideo.style.display = 'none';
  placeholder.style.display = 'block';
  textOverlaysEl.innerHTML = '';
  document.getElementById('audioInfo').textContent = '';
};

// Export
const modal = document.getElementById('exportModal');
document.getElementById('btnExport').onclick = () => {
  if (!state.clips.length) {
    alert('Please add a video first');
    return;
  }
  modal.classList.remove('hidden');
};
document.getElementById('btnCancelExport').onclick = () => modal.classList.add('hidden');
document.getElementById('btnStartExport').onclick = () => {
  const clip = state.clips[state.currentClipIndex] || state.clips[0];
  const a = document.createElement('a');
  a.href = clip.url;
  a.download = 'clipify_' + (clip.name || 'video.mp4');
  a.click();
  modal.classList.add('hidden');
};

// Init
switchTool('media');
console.log('Clipify InShot UI loaded');
