// ==================== Clipify Video Editor ====================
// Clean & working MVP

const state = {
  clips: [],          // { id, file, url, name, duration, start, end, element }
  currentClipIndex: -1,
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,
  filter: 'none',
  brightness: 100,
  contrast: 100,
  saturate: 100,
  aspectRatio: '16:9',
  textOverlays: [],
  audioFile: null,
  audioUrl: null,
  volume: 0.8,
  selectedClipId: null
};

// DOM Elements
const videoInput = document.getElementById('videoInput');
const audioInput = document.getElementById('audioInput');
const previewVideo = document.getElementById('previewVideo');
const previewWrapper = document.getElementById('previewWrapper');
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

// ---------- Helpers ----------
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function generateId() {
  return 'clip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

// ---------- Tool Switching ----------
function switchTool(toolName) {
  // Remove active from all buttons
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  
  // Hide all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  
  // Activate the clicked button
  const activeBtn = document.querySelector(`.tool-btn[data-tool="${toolName}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Show the correct panel
  const panel = document.getElementById('panel-' + toolName);
  if (panel) {
    panel.classList.remove('hidden');
  }
}

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    if (tool) switchTool(tool);
  });
});

// Make sure Media panel is visible on start
switchTool('media');

// ---------- Upload Videos ----------
videoInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (!file.type.startsWith('video/')) continue;

    const duration = await getVideoDuration(file);
    const url = URL.createObjectURL(file);
    const id = generateId();

    const clip = {
      id,
      file,
      url,
      name: file.name,
      duration,
      start: 0,
      end: duration,
      element: null
    };

    state.clips.push(clip);
    addMediaItem(clip);
    addClipToTimeline(clip);
  }

  if (state.clips.length > 0 && state.currentClipIndex === -1) {
    selectClip(0);
  }

  updateTotalDuration();
  videoInput.value = '';
});

function addMediaItem(clip) {
  const item = document.createElement('div');
  item.className = 'media-item';
  item.innerHTML = `
    <video src="${clip.url}" muted></video>
    <div class="media-item-info">
      <div class="media-item-name">${clip.name}</div>
      <div class="media-item-duration">${formatTime(clip.duration)}</div>
    </div>
  `;
  item.addEventListener('click', () => {
    const index = state.clips.findIndex(c => c.id === clip.id);
    if (index !== -1) selectClip(index);
  });
  mediaList.appendChild(item);
}

function addClipToTimeline(clip) {
  const el = document.createElement('div');
  el.className = 'clip';
  el.dataset.id = clip.id;
  el.style.width = Math.max(80, clip.duration * 20) + 'px';
  el.innerHTML = `<span class="clip-name">${clip.name}</span>`;
  el.addEventListener('click', () => {
    const index = state.clips.findIndex(c => c.id === clip.id);
    if (index !== -1) selectClip(index);
  });
  clipsContainer.appendChild(el);
  clip.element = el;
}

// ---------- Select Clip ----------
function selectClip(index) {
  if (index < 0 || index >= state.clips.length) return;

  state.currentClipIndex = index;
  const clip = state.clips[index];
  state.selectedClipId = clip.id;

  // Update UI
  document.querySelectorAll('.clip').forEach(c => c.classList.remove('selected'));
  if (clip.element) clip.element.classList.add('selected');

  previewVideo.src = clip.url;
  previewVideo.currentTime = clip.start || 0;
  placeholder.style.display = 'none';
  previewVideo.style.display = 'block';

  applyFilters();
  updateTimeDisplay();
}

// ---------- Playback ----------
btnPlay.addEventListener('click', togglePlay);

function togglePlay() {
  if (state.currentClipIndex === -1) return;

  if (state.isPlaying) {
    previewVideo.pause();
    btnPlay.textContent = '▶';
    state.isPlaying = false;
  } else {
    previewVideo.play();
    btnPlay.textContent = '❚❚';
    state.isPlaying = true;
  }
}

previewVideo.addEventListener('timeupdate', () => {
  state.currentTime = previewVideo.currentTime;
  updateTimeDisplay();
  updatePlayhead();
  updateSeekBar();
});

previewVideo.addEventListener('ended', () => {
  // Play next clip if available
  if (state.currentClipIndex < state.clips.length - 1) {
    selectClip(state.currentClipIndex + 1);
    previewVideo.play();
    state.isPlaying = true;
    btnPlay.textContent = '❚❚';
  } else {
    state.isPlaying = false;
    btnPlay.textContent = '▶';
  }
});

function updateTimeDisplay() {
  currentTimeEl.textContent = formatTime(previewVideo.currentTime || 0);
  const clip = state.clips[state.currentClipIndex];
  totalTimeEl.textContent = formatTime(clip ? clip.duration : 0);
}

function updateSeekBar() {
  if (!previewVideo.duration) return;
  seekBar.value = (previewVideo.currentTime / previewVideo.duration) * 100;
}

seekBar.addEventListener('input', () => {
  if (!previewVideo.duration) return;
  previewVideo.currentTime = (seekBar.value / 100) * previewVideo.duration;
});

speedSelect.addEventListener('change', () => {
  previewVideo.playbackRate = parseFloat(speedSelect.value);
});

function updatePlayhead() {
  // Simple visual playhead based on current clip position
  const clip = state.clips[state.currentClipIndex];
  if (!clip || !clip.element) return;
  const clipLeft = clip.element.offsetLeft;
  const clipWidth = clip.element.offsetWidth;
  const progress = previewVideo.duration ? previewVideo.currentTime / previewVideo.duration : 0;
  playhead.style.left = (clipLeft + clipWidth * progress) + 'px';
}

function updateTotalDuration() {
  state.totalDuration = state.clips.reduce((sum, c) => sum + c.duration, 0);
}

// ---------- Filters ----------
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filter = btn.dataset.filter;
    applyFilters();
  });
});

['brightness', 'contrast', 'saturate'].forEach(id => {
  document.getElementById(id).addEventListener('input', (e) => {
    state[id] = e.target.value;
    applyFilters();
  });
});

function applyFilters() {
  let filterStr = '';

  if (state.filter === 'grayscale') filterStr += 'grayscale(100%) ';
  if (state.filter === 'sepia') filterStr += 'sepia(80%) ';
  if (state.filter === 'contrast') filterStr += 'contrast(140%) ';
  if (state.filter === 'brightness') filterStr += 'brightness(130%) ';
  if (state.filter === 'saturate') filterStr += 'saturate(180%) ';

  filterStr += `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturate}%)`;

  previewVideo.style.filter = filterStr;
}

// ---------- Text Overlay ----------
document.getElementById('btnAddText').addEventListener('click', () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;

  const size = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;

  const overlay = document.createElement('div');
  overlay.className = 'text-overlay';
  overlay.textContent = text;
  overlay.style.fontSize = size + 'px';
  overlay.style.color = color;
  overlay.style.left = '50%';
  overlay.style.top = '50%';
  overlay.style.transform = 'translate(-50%, -50%)';

  // Simple drag
  let isDragging = false;
  let startX, startY, origX, origY;

  overlay.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = overlay.getBoundingClientRect();
    const parentRect = textOverlaysEl.getBoundingClientRect();
    origX = rect.left - parentRect.left;
    origY = rect.top - parentRect.top;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    overlay.style.left = (origX + dx) + 'px';
    overlay.style.top = (origY + dy) + 'px';
    overlay.style.transform = 'none';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  textOverlaysEl.appendChild(overlay);
  state.textOverlays.push(overlay);
  document.getElementById('textInput').value = '';
});

// ---------- Aspect Ratio ----------
document.querySelectorAll('.ratio-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.aspectRatio = btn.dataset.ratio;
    applyAspectRatio();
  });
});

function applyAspectRatio() {
  const [w, h] = state.aspectRatio.split(':').map(Number);
  const ratio = w / h;
  previewWrapper.style.aspectRatio = `${w}/${h}`;
}

// ---------- Audio ----------
audioInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.audioFile = file;
  state.audioUrl = URL.createObjectURL(file);
  document.getElementById('audioInfo').textContent = 'Music: ' + file.name;
});

document.getElementById('volume').addEventListener('input', (e) => {
  state.volume = e.target.value / 100;
  previewVideo.volume = state.volume;
});

// ---------- Timeline Actions ----------
document.getElementById('btnDelete').addEventListener('click', () => {
  if (state.selectedClipId === null) return;
  const index = state.clips.findIndex(c => c.id === state.selectedClipId);
  if (index === -1) return;

  const clip = state.clips[index];
  if (clip.element) clip.element.remove();
  URL.revokeObjectURL(clip.url);
  state.clips.splice(index, 1);

  // Remove from media list (simple reload)
  mediaList.innerHTML = '';
  state.clips.forEach(c => addMediaItem(c));

  if (state.clips.length === 0) {
    state.currentClipIndex = -1;
    state.selectedClipId = null;
    previewVideo.src = '';
    previewVideo.style.display = 'none';
    placeholder.style.display = 'block';
  } else {
    selectClip(Math.min(index, state.clips.length - 1));
  }
  updateTotalDuration();
});

document.getElementById('btnSplit').addEventListener('click', () => {
  if (state.currentClipIndex === -1) return;
  const clip = state.clips[state.currentClipIndex];
  const t = previewVideo.currentTime;
  if (t <= 0.3 || t >= clip.duration - 0.3) return;

  // For MVP we just show a message (full split needs more complex timeline logic)
  alert('Split feature: Current time marked. Full multi-clip split will be improved in next version.');
});

// ---------- New Project ----------
document.getElementById('btnNew').addEventListener('click', () => {
  if (!confirm('Start a new project? All current clips will be removed.')) return;

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
  updateTotalDuration();
});

// ---------- Export ----------
const exportModal = document.getElementById('exportModal');
document.getElementById('btnExport').addEventListener('click', () => {
  if (state.clips.length === 0) {
    alert('Please upload at least one video first.');
    return;
  }
  exportModal.classList.remove('hidden');
});

document.getElementById('btnCancelExport').addEventListener('click', () => {
  exportModal.classList.add('hidden');
});

document.getElementById('btnStartExport').addEventListener('click', async () => {
  const progress = document.getElementById('exportProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  progress.classList.remove('hidden');
  progressText.textContent = 'Preparing video...';
  progressBar.style.width = '20%';

  // For this MVP we download the currently selected video
  // (Full timeline render + filters + text needs FFmpeg.wasm or server)
  const clip = state.clips[state.currentClipIndex] || state.clips[0];

  progressBar.style.width = '60%';
  progressText.textContent = 'Generating download...';

  // Create a temporary download link
  const a = document.createElement('a');
  a.href = clip.url;
  a.download = 'clipify_' + (clip.name || 'video.mp4');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  progressBar.style.width = '100%';
  progressText.textContent = 'Done! Check your downloads.';

  setTimeout(() => {
    exportModal.classList.add('hidden');
    progress.classList.add('hidden');
    progressBar.style.width = '0%';
  }, 1500);
});

// ---------- Init ----------
previewVideo.style.display = 'none';
applyAspectRatio();
console.log('Clipify Editor loaded successfully');
