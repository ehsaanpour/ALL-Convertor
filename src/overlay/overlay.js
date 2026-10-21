const { ipcRenderer } = require('electron');

// --- REA Reverse-Engineered Geometry & Math Constants ---
const m = {
  inner: 48 * 0.8 * 1.1 + 8 * 0.8, // 48.64
  outer: 166 * 0.8 * 0.9,           // 119.52
  backdrop: 166 * 0.8 * 0.9 + 6.4,  // 125.92
  gap: 5 * 0.8,                     // 4.0
  corner: 28 * 0.8 * 0.9,           // 20.16
  labelInner: 50 * 0.8              // 40.0
};

function F(index, total) {
  return (total === 3 ? Math.PI : Math.PI / 2) - (Math.PI * 2 * index) / total;
}

function be(radius, angle) {
  return [Math.cos(angle) * radius, -Math.sin(angle) * radius];
}

function we(index, total) {
  const angle = F(index, total);
  const step = (Math.PI * 2) / total;
  const startAngle = angle - step / 2;
  const endAngle = angle + step / 2;

  const r = (j) => Math.asin(Math.min(0.95, m.gap / 2 / Math.max(j, m.gap / 2 + 0.01)));
  const d = startAngle + r(m.outer);
  const i = endAngle - r(m.outer);
  const c = startAngle + r(m.inner);
  const g = endAngle - r(m.inner);

  const f = Math.min(0.15, (i - d) * 0.24);
  const u = Math.min(0.18, (g - c) * 0.18);
  const v = m.inner / Math.max(0.01, Math.cos(u));
  const y = v + m.inner * Math.tan(u);
  const outerMinusCorner = m.outer - m.corner;

  const fmt = (rad, ang) => be(rad, ang).map((b) => b.toFixed(4)).join(' ');

  return `M ${fmt(y, startAngle + r(y))} L ${fmt(outerMinusCorner, startAngle + r(outerMinusCorner))} Q ${fmt(m.outer, d)} ${fmt(m.outer, d + f)} A ${m.outer} ${m.outer} 0 ${i - f - d - f > Math.PI ? 1 : 0} 0 ${fmt(m.outer, i - f)} Q ${fmt(m.outer, i)} ${fmt(outerMinusCorner, endAngle - r(outerMinusCorner))} L ${fmt(y, endAngle - r(y))} Q ${fmt(v, endAngle - r(v))} ${fmt(m.inner, g - u)} A ${m.inner} ${m.inner} 0 ${g - u - c - u > Math.PI ? 1 : 0} 1 ${fmt(m.inner, c + u)} Q ${fmt(v, startAngle + r(v))} ${fmt(y, startAngle + r(y))} Z`;
}

function Ke(x, y, total) {
  const dist = Math.hypot(x, y);
  if (!total || dist < m.inner || dist > m.outer) return null;

  const angle = Math.atan2(-y, x);
  const step = (Math.PI * 2) / total;
  const rawIdx = (((F(0, total) - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const candidate = Math.round(rawIdx / step) % total;

  const diff = Math.abs(Math.atan2(Math.sin(angle - F(candidate, total)), Math.cos(angle - F(candidate, total))));
  return diff > step / 2 - Math.asin(m.gap / 2 / dist) ? null : candidate;
}

// --- DOM References ---
const radialWrapper = document.getElementById('radial-wrapper');
const petalsGroup = document.getElementById('petals-group');
const centerLabel = document.getElementById('center-label');
const promptBanner = document.getElementById('prompt-banner');

let currentMode = 'conversions';
let currentTargets = [];
let currentFiles = [];
let selectedIndex = null;
let soundEnabled = true;
let isRtl = false;

// --- IPC Communication with Electron Main Process ---
ipcRenderer.on('render-wheel', (event, data) => {
  currentMode = data.mode || 'conversions';
  currentTargets = data.targets || [];
  currentFiles = data.files || [];
  soundEnabled = data.soundEnabled !== false;
  isRtl = !!data.isRtl;

  document.body.classList.toggle('rtl', isRtl);
  document.body.classList.toggle('theme-dark', data.theme === 'dark');

  // Position wheel at cursor (clamped within window boundaries)
  const pad = 160;
  const clampedX = Math.max(pad, Math.min(window.innerWidth - pad, data.x));
  const clampedY = Math.max(pad, Math.min(window.innerHeight - pad, data.y));

  radialWrapper.style.left = `${clampedX}px`;
  radialWrapper.style.top = `${clampedY}px`;

  renderPetals(currentTargets, data.labels || []);
  radialWrapper.classList.remove('hidden');
});

ipcRenderer.on('hide-wheel', () => {
  radialWrapper.classList.add('hidden');
  selectedIndex = null;
});

function renderPetals(targets, labels) {
  petalsGroup.innerHTML = '';
  selectedIndex = null;
  centerLabel.textContent = currentMode.toUpperCase();

  const total = targets.length;
  if (total === 0) {
    centerLabel.textContent = isRtl ? 'بدون گزینه' : 'EMPTY';
    return;
  }

  targets.forEach((targetKey, idx) => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('fan-target');
    g.dataset.index = idx;

    // Create Path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', we(idx, total));
    path.classList.add('petal');
    g.appendChild(path);

    // Create Label
    const labelPos = be(m.labelInner + (m.outer - m.labelInner) * 0.56, F(idx, total));
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('petal-label');
    text.setAttribute('x', labelPos[0].toFixed(2));
    text.setAttribute('y', labelPos[1].toFixed(2));

    const displayLabel = labels[idx] || targetKey.toUpperCase();
    text.textContent = displayLabel;
    g.appendChild(text);

    // Event Listeners
    g.addEventListener('mouseenter', () => highlightPetal(idx));
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      executeTarget(idx);
    });

    petalsGroup.appendChild(g);
  });
}

function highlightPetal(idx) {
  if (selectedIndex === idx) return;
  selectedIndex = idx;

  const targets = petalsGroup.querySelectorAll('.fan-target');
  targets.forEach((t, i) => {
    t.classList.toggle('is-highlighted', i === idx);
  });

  if (idx !== null && currentTargets[idx]) {
    centerLabel.textContent = currentTargets[idx].toUpperCase();
    if (soundEnabled && window.audioTicks) {
      window.audioTicks.playTick();
    }
  } else {
    centerLabel.textContent = currentMode.toUpperCase();
  }
}

function executeTarget(idx) {
  if (idx === null || !currentTargets[idx]) return;

  const selectedTarget = currentTargets[idx];
  radialWrapper.classList.add('hidden');

  ipcRenderer.send('execute-wheel-action', {
    mode: currentMode,
    target: selectedTarget,
    files: currentFiles
  });
}

// Window mousemove / mouseup tracking
window.addEventListener('mousemove', (e) => {
  if (radialWrapper.classList.contains('hidden')) return;

  const rect = radialWrapper.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = e.clientX - centerX;
  const dy = e.clientY - centerY;

  const hitIdx = Ke(dx, dy, currentTargets.length);
  highlightPetal(hitIdx);
});

window.addEventListener('mouseup', () => {
  if (!radialWrapper.classList.contains('hidden') && selectedIndex !== null) {
    executeTarget(selectedIndex);
  }
});

// HTML5 Native Drag & Drop support
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  if (radialWrapper.classList.contains('hidden')) return;

  const rect = radialWrapper.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const dx = e.clientX - centerX;
  const dy = e.clientY - centerY;

  const hitIdx = Ke(dx, dy, currentTargets.length);
  highlightPetal(hitIdx);
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const dropped = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean);
    if (dropped.length > 0) {
      currentFiles = dropped;
    }
  }

  if (!radialWrapper.classList.contains('hidden') && selectedIndex !== null) {
    executeTarget(selectedIndex);
  }
});

promptBanner.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const mode = btn.dataset.mode;
    ipcRenderer.send('switch-wheel-mode', mode);
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    radialWrapper.classList.add('hidden');
    ipcRenderer.send('hide-overlay-window');
  } else if (e.key === 'Shift') {
    ipcRenderer.send('switch-wheel-mode', 'conversions');
  } else if (e.key === 'Alt') {
    ipcRenderer.send('switch-wheel-mode', 'tools');
  } else if (e.key === 'Control') {
    ipcRenderer.send('switch-wheel-mode', 'actions');
  }
});
