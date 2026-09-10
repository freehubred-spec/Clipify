// ==================== Clipify v4 - Improved ====================
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
  textStyle: 'normal',
  undoStack: []
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
const livePreview = document.getElementById('liveTextPreview');

function pushUndo(action) {
  state.undoStack.push(action);
  if (state.undoStack.length > 20) state.undoStack.shift();
}

function undoLast() {
  const action = state.undoStack.pop();
  if (!action) {
    alert('Nothing to undo');
    return;
  }
  if (action.type === 'deleteClip') {
    state.clips.splice(action.index, 0, action.clip);
    addMediaItem(action.clip);
    addClipToTimeline(action.clip);
    selectClip(action.index);
  } else if (action.type === 'deleteText') {
    textOverlaysEl.appendChild(action.el);
    state.textOverlays.push(action.el);
  }
}

const btnUndo = document.getElementById('btnUndo');
if (btnUndo) btnUndo.onclick = function() { undoLast(); };

document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLast();
  }
});


const FILTER_MAP = {
  none: '',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(70%)',
  vintage: 'sepia(45%) contrast(110%) brightness(92%)',
  cool: 'saturate(75%) hue-rotate(180deg) brightness(105%)',
  warm: 'sepia(35%) saturate(145%) brightness(105%)',
  contrast: 'contrast(145%)',
  fade: 'brightness(112%) contrast(88%) saturate(75%)',
  vivid: 'saturate(185%) contrast(125%)',
  mono: 'grayscale(100%) contrast(125%)',
  cinema: 'contrast(118%) saturate(88%) brightness(94%)',
  bright: 'brightness(135%) saturate(115%)',
  dramatic: 'contrast(150%) brightness(90%) saturate(120%)',
  soft: 'brightness(110%) contrast(90%) saturate(90%) blur(0.3px)',
  noir: 'grayscale(100%) contrast(140%) brightness(90%)',
  sunset: 'sepia(50%) saturate(160%) hue-rotate(-15deg) brightness(105%)'
};

function formatTime(s) {
  if (!s || isNaN(s)) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
}

function generateId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2,6);
}

function getVideoDuration(file) {
  return new Promise(resolve => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { resolve(v.duration); URL.revokeObjectURL(v.src); };
    v.src = URL.createObjectURL(file);
  });
}

// Tools
function switchTool(name) {
  document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.add('hidden'));
  const btn = document.querySelector('.tool[data-tool="' + name + '"]');
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.remove('hidden');
  if (name === 'text') updateLivePreview();
  else livePreview.style.display = 'none';
}

document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    const panel = document.getElementById('panel-' + tool);
    if (panel && !panel.classList.contains('hidden') && btn.classList.contains('active')) {
      panel.classList.add('hidden');
      btn.classList.remove('active');
      livePreview.style.display = 'none';
    } else {
      switchTool(tool);
    }
  });
});

// Upload
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
  el.innerHTML = '<video src="' + clip.url + '" muted></video><div class="media-item-name">' + clip.name + '</div>';
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
  if (previewVideo.duration) seekBar.value = (previewVideo.currentTime / previewVideo.duration) * 100;
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
  if (previewVideo.duration) previewVideo.currentTime = (seekBar.value / 100) * previewVideo.duration;
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
  document.getElementById(id).oninput = e => {
    state[id] = e.target.value;
    applyFilters();
  };
});

function applyFilters() {
  const base = FILTER_MAP[state.filter] || '';
  const extra = 'brightness(' + state.brightness + '%) contrast(' + state.contrast + '%) saturate(' + state.saturate + '%)';
  previewVideo.style.filter = (base + ' ' + extra).trim();
}

// Text - Live Preview
function updateLivePreview() {
  const text = document.getElementById('textInput').value.trim();
  if (!text) {
    livePreview.style.display = 'none';
    return;
  }
  livePreview.style.display = 'block';
  livePreview.textContent = text;
  livePreview.style.fontSize = document.getElementById('fontSize').value + 'px';
  livePreview.style.color = document.getElementById('textColor').value;
  livePreview.style.fontFamily = state.fontFamily + ', sans-serif';
  livePreview.className = 'text-overlay live-preview style-' + state.textStyle;
  livePreview.style.left = '50%';
  livePreview.style.top = '40%';
  livePreview.style.transform = 'translate(-50%, -50%)';
}

document.getElementById('textInput').oninput = updateLivePreview;
document.getElementById('fontSize').oninput = updateLivePreview;
document.getElementById('textColor').oninput = updateLivePreview;

document.querySelectorAll('#fontStyleRow .chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#fontStyleRow .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.fontFamily = btn.dataset.font;
    updateLivePreview();
  };
});

document.querySelectorAll('#textStyleRow .chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#textStyleRow .chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.textStyle = btn.dataset.style;
    updateLivePreview();
  };
});

document.getElementById('btnAddText').onclick = () => {
  const text = document.getElementById('textInput').value.trim();
  if (!text) return;
  const el = document.createElement('div');
  el.className = 'text-overlay style-' + state.textStyle;
  el.textContent = text;
  el.style.fontSize = document.getElementById('fontSize').value + 'px';
  el.style.color = document.getElementById('textColor').value;
  el.style.fontFamily = state.fontFamily + ', sans-serif';
  el.style.left = '50%';
  el.style.top = '40%';
  el.style.transform = 'translate(-50%, -50%)';
  makeDraggable(el);
  textOverlaysEl.appendChild(el);
  state.textOverlays.push(el);
  document.getElementById('textInput').value = '';
  livePreview.style.display = 'none';
};

function makeDraggable(el) {
  let startX, startY, origX, origY, dragging = false;
  let initialDistance = 0, initialFontSize = 36;

  function getPoint(e) {
    if (e.touches && e.touches.length > 0) return e.touches[0];
    return e;
  }

  function getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function selectText(target) {
    document.querySelectorAll('.text-overlay').forEach(function(t) {
      t.classList.remove('selected-text');
    });
    target.classList.add('selected-text');
    state.selectedTextEl = target;
    var bar = document.getElementById('textEditBar');
    if (bar) bar.classList.remove('hidden');
  }

  function onStart(e) {
    if (e.touches && e.touches.length === 2) {
      // Pinch start
      initialDistance = getDistance(e.touches[0], e.touches[1]);
      initialFontSize = parseFloat(el.style.fontSize) || 36;
      e.preventDefault();
      return;
    }
    dragging = true;
    var pt = getPoint(e);
    startX = pt.clientX; startY = pt.clientY;
    var parentRect = textOverlaysEl.getBoundingClientRect();
    var rect = el.getBoundingClientRect();
    origX = rect.left - parentRect.left;
    origY = rect.top - parentRect.top;
    el.style.left = origX + 'px';
    el.style.top = origY + 'px';
    el.style.transform = 'none';
    selectText(el);
    e.preventDefault();
  }

  function onMove(e) {
    if (e.touches && e.touches.length === 2) {
      // Pinch resize
      var dist = getDistance(e.touches[0], e.touches[1]);
      if (initialDistance > 0) {
        var scale = dist / initialDistance;
        var newSize = Math.max(10, Math.min(120, initialFontSize * scale));
        el.style.fontSize = newSize + 'px';
      }
      e.preventDefault();
      return;
    }
    if (!dragging) return;
    var pt = getPoint(e);
    el.style.left = (origX + pt.clientX - startX) + 'px';
    el.style.top = (origY + pt.clientY - startY) + 'px';
  }

  function onEnd() {
    dragging = false;
    initialDistance = 0;
  }

  el.addEventListener('mousedown', onStart);
  el.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);

  // Double tap to delete
  var lastTap = 0;
  el.addEventListener('click', function() {
    var now = Date.now();
    if (now - lastTap < 300) {
      if (confirm('Delete this text?')) {
        pushUndo({ type: 'deleteText', el: el });
        el.remove();
        state.textOverlays = state.textOverlays.filter(function(t) { return t !== el; });
        var bar = document.getElementById('textEditBar');
        if (bar) bar.classList.add('hidden');
        state.selectedTextEl = null;
      }
    }
    lastTap = now;
  });
}

// Aspect Ratio
function applyAspectRatio() {
  const parts = state.aspectRatio.split(':');
  const rw = parseFloat(parts[0]);
  const rh = parseFloat(parts[1]);
  videoContainer.style.aspectRatio = rw + ' / ' + rh;
  videoContainer.style.width = 'auto';
  videoContainer.style.height = 'auto';
  videoContainer.style.maxWidth = '100%';
  videoContainer.style.maxHeight = '100%';

  // Force layout recalculation
  const box = document.getElementById('previewWrapper');
  if (box) {
    const boxW = box.clientWidth;
    const boxH = box.clientHeight;
    if (boxW && boxH) {
      const boxRatio = boxW / boxH;
      const targetRatio = rw / rh;
      if (targetRatio > boxRatio) {
        videoContainer.style.width = '100%';
        videoContainer.style.height = 'auto';
      } else {
        videoContainer.style.height = '100%';
        videoContainer.style.width = 'auto';
      }
    }
  }
}

document.querySelectorAll('.ratio-chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.ratio-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.aspectRatio = btn.dataset.ratio;
    applyAspectRatio();
  };
});

// Built-in SFX (Web Audio)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSfx(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'click') {
    osc.type = 'square';
    osc.frequency.value = 900;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
    osc.start(now); osc.stop(now + 0.07);
  } else if (type === 'whoosh') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'pop') {
    osc.type = 'sine';
    osc.frequency.value = 280;
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.start(now); osc.stop(now + 0.12);
  } else if (type === 'beep') {
    osc.type = 'sine';
    osc.frequency.value = 700;
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
    osc.start(now); osc.stop(now + 0.14);
  } else if (type === 'bird') {
    // Simple bird-like chirp
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now); osc.stop(now + 0.2);
  } else if (type === 'dog') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } else if (type === 'cat') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.15);
    osc.frequency.linearRampToValueAtTime(700, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'notify') {
    osc.type = 'sine';
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
    // second tone
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2); gain2.connect(audioCtx.destination);
    osc2.frequency.value = 680;
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.start(now + 0.12); osc2.stop(now + 0.25);
  }
}

document.querySelectorAll('.sfx-btn').forEach(btn => {
  btn.onclick = () => playSfx(btn.dataset.sfx);
});

document.getElementById('audioInput').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('audioInfo').textContent = '♪ ' + file.name;
};

document.getElementById('volume').oninput = e => {
  state.volume = e.target.value / 100;
  previewVideo.volume = state.volume;
};

// Delete / New / Split
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
  } else selectClip(Math.min(idx, state.clips.length - 1));
};

document.getElementById('btnSplit').onclick = () => alert('Split coming soon');

document.getElementById('btnBack').onclick = () => {
  if (!confirm('Start new project?')) return;
  state.clips.forEach(c => { URL.revokeObjectURL(c.url); if (c.element) c.element.remove(); });
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
  livePreview.style.display = 'none';
};


// Text Edit / Delete buttons
document.getElementById('btnDeleteText') && document.getElementById('btnDeleteText').addEventListener('click', function() {
  if (!state.selectedTextEl) return;
  if (confirm('Delete selected text?')) {
    pushUndo({ type: 'deleteText', el: state.selectedTextEl });
    state.selectedTextEl.remove();
    state.textOverlays = state.textOverlays.filter(function(t) { return t !== state.selectedTextEl; });
    state.selectedTextEl = null;
    var bar = document.getElementById('textEditBar');
    if (bar) bar.classList.add('hidden');
  }
});

document.getElementById('btnEditText') && document.getElementById('btnEditText').addEventListener('click', function() {
  if (!state.selectedTextEl) return;
  var current = state.selectedTextEl.textContent || '';
  var newText = prompt('Edit text:', current);
  if (newText !== null && newText.trim() !== '') {
    state.selectedTextEl.textContent = newText.trim();
  }
});

// ========== EXPORT (with Audio) ==========
const modal = document.getElementById('exportModal');
const exportStatus = document.getElementById('exportStatus');
const progressWrap = document.getElementById('progressWrap');
const progressBar = document.getElementById('progressBar');

document.getElementById('btnExport').onclick = () => {
  if (!state.clips.length) {
    alert('Please add a video first');
    return;
  }
  exportStatus.textContent = 'Ready to export video with audio';
  progressWrap.classList.add('hidden');
  progressBar.style.width = '0%';
  document.getElementById('btnStartExport').disabled = false;
  document.getElementById('btnStartExport').textContent = 'Start Export';
  modal.classList.remove('hidden');
};

document.getElementById('btnCancelExport').onclick = () => {
  modal.classList.add('hidden');
};

document.getElementById('btnStartExport').onclick = async () => {
  const clip = state.clips[state.currentClipIndex] || state.clips[0];
  if (!clip) return;

  const btn = document.getElementById('btnStartExport');
  btn.disabled = true;
  btn.textContent = 'Exporting...';
  exportStatus.textContent = 'Preparing video + audio...';
  progressWrap.classList.remove('hidden');
  progressBar.style.width = '5%';

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = previewVideo.videoWidth || 720;
    const h = previewVideo.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;

    const baseFilter = FILTER_MAP[state.filter] || '';
    const extraFilter = 'brightness(' + state.brightness + '%) contrast(' + state.contrast + '%) saturate(' + state.saturate + '%)';
    const fullFilter = (baseFilter + ' ' + extraFilter).trim();

    // Reset video
    previewVideo.pause();
    previewVideo.currentTime = 0;
    await new Promise(function(r) {
      previewVideo.onseeked = function() { r(); };
      setTimeout(r, 400);
    });

    progressBar.style.width = '15%';

    // Get video track from canvas (edited frames)
    const canvasStream = canvas.captureStream(25);
    const videoTrack = canvasStream.getVideoTracks()[0];

    // Get audio track from original video
    let audioTrack = null;
    try {
      if (typeof previewVideo.captureStream === 'function') {
        const videoStream = previewVideo.captureStream();
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTrack = audioTracks[0];
        }
      }
    } catch (e) {
      console.log('Audio capture not available', e);
    }

    // Combine tracks
    const tracks = [videoTrack];
    if (audioTrack) tracks.push(audioTrack);
    const combinedStream = new MediaStream(tracks);

    // Choose supported mime
    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error('MediaRecorder not supported on this browser');
    }

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 2500000
    });

    const chunks = [];
    recorder.ondataavailable = function(e) {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise(function(resolve) {
      recorder.onstop = resolve;
      recorder.onerror = function() { resolve(); };
    });

    recorder.start(250);
    progressBar.style.width = '25%';

    // Play video and draw frames
    const duration = clip.duration || 30;  // no artificial limit
    let startTime = null;
    let finished = false;

    function draw(now) {
      if (finished) return;
      if (!startTime) startTime = now;
      const elapsed = (now - startTime) / 1000;

      if (elapsed >= duration || previewVideo.ended || previewVideo.paused && elapsed > 1) {
        finished = true;
        try { recorder.stop(); } catch (e) {}
        previewVideo.pause();
        return;
      }

      // Draw black background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Draw video with filter
      ctx.filter = fullFilter || 'none';
      try {
        ctx.drawImage(previewVideo, 0, 0, w, h);
      } catch (e) {}
      ctx.filter = 'none';

      // Draw text overlays
      state.textOverlays.forEach(function(el) {
        try {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize) || 36;
          const scaleX = w / (videoContainer.clientWidth || 360);
          const scaleY = h / (videoContainer.clientHeight || 640);
          const scale = Math.min(scaleX, scaleY);

          ctx.font = 'bold ' + Math.round(fontSize * scale) + 'px ' + (style.fontFamily || 'Inter, sans-serif');
          ctx.fillStyle = style.color || '#ffffff';
          ctx.textBaseline = 'top';
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          let left = parseFloat(el.style.left) || 0;
          let top = parseFloat(el.style.top) || 0;
          let align = 'left';

          if (el.style.transform && el.style.transform.indexOf('translate') !== -1) {
            left = w / 2;
            top = h * 0.4;
            align = 'center';
          } else {
            left = left * scaleX;
            top = top * scaleY;
          }

          ctx.textAlign = align;
          ctx.fillText(el.textContent || '', left, top);
          ctx.shadowColor = 'transparent';
        } catch (err) {}
      });

      const pct = 25 + Math.min(65, (elapsed / duration) * 65);
      progressBar.style.width = pct + '%';

      requestAnimationFrame(draw);
    }

    previewVideo.muted = true;  // silent export - no sound while recording
    previewVideo.volume = 0;
    previewVideo.playbackRate = 1;

    await previewVideo.play();
    requestAnimationFrame(draw);

    // Safety timeout
    setTimeout(function() {
      if (!finished) {
        finished = true;
        try { recorder.stop(); } catch (e) {}
        previewVideo.pause();
      }
    }, (duration + 3) * 1000);

    await stopped;
    progressBar.style.width = '95%';

    if (chunks.length === 0) {
      throw new Error('No video data recorded');
    }

    const blob = new Blob(chunks, { type: 'video/webm' });
    if (blob.size < 2000) {
      throw new Error('Recorded file too small');
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clipify_edited.webm';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 8000);

    exportStatus.textContent = audioTrack ? 'Video + Audio downloaded!' : 'Video downloaded (audio not available on this device)';
    progressBar.style.width = '100%';
    btn.disabled = false;
    btn.textContent = 'Start Export';
    setTimeout(function() { modal.classList.add('hidden'); }, 2200);

  } catch (err) {
    console.error('Export error:', err);
    exportStatus.textContent = 'Downloading original video...';
    progressBar.style.width = '100%';

    const a = document.createElement('a');
    a.href = clip.url;
    a.download = 'clipify_' + (clip.name || 'video.mp4');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    btn.disabled = false;
    btn.textContent = 'Start Export';
    setTimeout(function() {
      exportStatus.textContent = 'Note: Best results on desktop Chrome';
      setTimeout(function() { modal.classList.add('hidden'); }, 2500);
    }, 900);
  }
};

// Init
switchTool('media');
applyAspectRatio();
console.log('Clipify v4 loaded');
