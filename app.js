// ==================== Clipify Fixed ====================

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
  selectedClipId: null,
  fontFamily: 'Inter',
  textStyle: 'normal'
};

const previewVideo = document.getElementById('previewVideo');
const videoContainer = document.getElementById('videoContainer');
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

// ========== Tools ==========
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
    const panel = document.getElementById('panel-' + tool);
    if (panel && !panel.classList.contains('hidden') && btn.classList.contains('active')) {
      panel.classList.add('hidden');
      btn.classList.remove('active');
    } else {
      switchTool(tool);
    }
  });
});

// ========== Upload ==========
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
  applyAspectRatio();
  updateTime();
}

// ========== Playback ==========
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

// ========== Filters ==========
const FILTER_MAP = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(70%)',
  vintage: 'sepia(40%) contrast(110%) brightness(90%)',
  cool: 'saturate(80%) hue-rotate(180deg) brightness(105%)',
  warm: 'sepia(30%) saturate(140%) brightness(105%)',
  contrast: 'contrast(140%)',
  fade: 'brightness(110%) contrast(90%) saturate(80%)',
  vivid: 'saturate(180%) contrast(120%)',
  mono: 'grayscale(100%) contrast(120%)',
  cinema: 'contrast(115%) saturate(90%) brightness(95%)',
  bright: 'brightness(130%) saturate(110%)'
};

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
  const base = FILTER_MAP[state.filter] || '';
  const extra = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturate}%)`;
  previewVideo.style.filter = (base + ' ' + extra).trim();
}

// ========== Text ==========
document.querySelectorAll('#fontStyleRow .chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#fontStyleRow .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.fontFamily = btn.dataset.font;
  };
});

document.querySelectorAll('#textStyleRow .chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#textStyleRow .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.textStyle = btn.dataset.style;
  };
});

document.getElementById('btnAddText').onclick = () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;

  const size = document.getElementById('fontSize').value + 'px';
  const color = document.getElementById('textColor').value;

  const el = document.createElement('div');
  el.className = 'text-overlay style-' + state.textStyle;
  el.textContent = text;
  el.style.fontSize = size;
  el.style.color = color;
  el.style.fontFamily = state.fontFamily + ', sans-serif';
  el.style.left = '50%';
  el.style.top = '40%';
  el.style.transform = 'translate(-50%, -50%)';

  makeDraggable(el);
  textOverlaysEl.appendChild(el);
  state.textOverlays.push(el);
  document.getElementById('textInput').value = '';
};

function makeDraggable(el) {
  let startX, startY, origX, origY, dragging = false;

  function getPoint(e) {
    if (e.touches && e.touches[0]) return e.touches[0];
    return e;
  }

  function onStart(e) {
    dragging = true;
    const pt = getPoint(e);
    startX = pt.clientX;
    startY = pt.clientY;

    // Get current position without transform
    const parentRect = textOverlaysEl.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    origX = rect.left - parentRect.left;
    origY = rect.top - parentRect.top;

    el.style.left = origX + 'px';
    el.style.top = origY + 'px';
    el.style.transform = 'none';
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const pt = getPoint(e);
    const dx = pt.clientX - startX;
    const dy = pt.clientY - startY;
    el.style.left = (origX + dx) + 'px';
    el.style.top = (origY + dy) + 'px';
  }

  function onEnd() {
    dragging = false;
  }

  el.addEventListener('mousedown', onStart);
  el.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

// ========== Aspect Ratio ==========
function applyAspectRatio() {
  const [w, h] = state.aspectRatio.split(':').map(Number);
  videoContainer.style.aspectRatio = `${w} / ${h}`;
  videoContainer.style.width = '100%';
  videoContainer.style.maxHeight = '100%';
}

document.querySelectorAll('.ratio-chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.ratio-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.aspectRatio = btn.dataset.ratio;
    applyAspectRatio();
  };
});

// ========== Audio ==========
document.getElementById('audioInput').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('audioInfo').textContent = '♪ ' + file.name;
};

document.getElementById('volume').oninput = (e) => {
  state.volume = e.target.value / 100;
  previewVideo.volume = state.volume;
};

// ========== Delete / Split ==========
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
  alert('Split feature coming in next update');
};

// ========== New Project ==========
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

// ========== Export ==========
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
applyAspectRatio();
console.log('Clipify Fixed loaded');
