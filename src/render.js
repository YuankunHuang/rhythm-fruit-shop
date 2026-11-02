// Canvas rendering layer. All state is read-only (via RC snapshot from main.js).
// C++ equivalent: class RenderSystem { void Tick(float t, const GameState& rc); }

import { S } from './state.js';

// ── Canvas context ────────────────────────────────────────────────────────────
let ctx;
export function initRenderer(canvasCtx) {
  ctx = canvasCtx;
}

// ── Private caches ────────────────────────────────────────────────────────────
let _backdropCache = { key: '', canvas: null };
let _pauseButtons = [];
export const getPauseButtons = () => _pauseButtons;
export function warmBackdropCache(RC) {
  _backdropCache.key = '';
  _unpackRC(RC);
  _ensureBackdropCache(false);
}

// ── Frame-local render context ────────────────────────────────────────────────
// Set at the start of each drawFrame call; all draw functions read from these.
let state, view, selectedTheme, songCoverImg, songCoverImgId, homeVisual;
let notes, particles, texts, slashFx, slashLines, flowing, flowFx, coachFx, centerJudge;
let products, orders, orderFlash;
let heat, combo, maxCombo, counts, customerAnger, holding, activeHold;
let readyTimer, leadInTimer, leadInTotal, resumeCountdown;
let diff, song, debug, perfStats, dayRun, serviceRun, speedIndex, dpr;
let READY_TIME, READY_HANDOFF_ALPHA, READY_EXIT_FADE, SPEEDS, WINDOWS, FRUITS;
let total, lastErr, maxNoteSpan;
let noteX, noteY, lowerBoundNotes, noteLookahead, pixelsPerSecond;

// Precomputed theme data and function results:
let _palette, _assets, _mainVisual, _shopInterior, _noteFruitIcons;
let _songTime, _playDuration, _chartEnd, _isTutorialShift;

function _unpackRC(RC) {
  ({
    state,
    view,
    selectedTheme,
    songCoverImg,
    songCoverImgId,
    homeVisual,
    notes,
    particles,
    texts,
    slashFx,
    slashLines,
    flowing,
    flowFx,
    coachFx,
    centerJudge,
    products,
    orders,
    orderFlash,
    heat,
    combo,
    maxCombo,
    counts,
    customerAnger,
    holding,
    activeHold,
    readyTimer,
    leadInTimer,
    leadInTotal,
    resumeCountdown,
    diff,
    song,
    debug,
    perfStats,
    dayRun,
    serviceRun,
    speedIndex,
    dpr,
    READY_TIME,
    READY_HANDOFF_ALPHA,
    READY_EXIT_FADE,
    SPEEDS,
    WINDOWS,
    FRUITS,
    total,
    lastErr,
    maxNoteSpan,
    noteX,
    noteY,
    lowerBoundNotes,
    noteLookahead,
    pixelsPerSecond,
  } = RC);
  _palette = RC.palette;
  _assets = RC.assets;
  _mainVisual = RC.mainVisual;
  _shopInterior = RC.shopInterior;
  _noteFruitIcons = RC.noteFruitIcons;
  _songTime = RC.songTimeValue;
  _playDuration = RC.playDurationValue;
  _chartEnd = RC.chartEndValue;
  _isTutorialShift = RC.isTutorialShift;
}

// ── Compat aliases (extracted function bodies need zero changes) ───────────────
function isNightTheme() {
  return selectedTheme === 'night';
}
function isSunnyTheme() {
  return selectedTheme === 'sunny';
}
function themePalette() {
  return _palette;
}
function themeAssets() {
  return _assets;
}
function currentMainVisual() {
  return state === S.HOME && homeVisual && homeVisual.complete && homeVisual.naturalWidth
    ? homeVisual
    : _mainVisual;
}
function currentShopInterior() {
  return _shopInterior;
}
function noteFruitIconSet() {
  return _noteFruitIcons;
}
function songTime() {
  return _songTime;
}
function playDuration() {
  return _playDuration;
}
function chartEnd() {
  return _chartEnd;
}
function currentShiftIsTutorial() {
  return _isTutorialShift;
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function ensureImageLoaded(img) {
  if (img && img._rfaSrc && !img.src) img.src = img._rfaSrc;
  return img;
}

// ── Extracted render functions ────────────────────────────────────────────────
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawCover(img, alpha = 1, blur = 0) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const s = Math.max(innerWidth / img.naturalWidth, innerHeight / img.naturalHeight),
    w = img.naturalWidth * s,
    h = img.naturalHeight * s;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(img, (innerWidth - w) / 2, (innerHeight - h) / 2, w, h);
  ctx.restore();
  return true;
}
export function invalidateBackdropCache() {
  _backdropCache.key = '';
}
function _ensureBackdropCache(dim) {
  const mainVisual = currentMainVisual();
  ensureImageLoaded(mainVisual);
  const bgMode = state === S.HOME ? 'home' : state === S.SELECT ? 'select' : 'game';
  const key = [
    selectedTheme,
    bgMode,
    dim ? 'dim' : 'live',
    ctx.canvas.width,
    ctx.canvas.height,
    mainVisual && mainVisual.complete,
    mainVisual && mainVisual.naturalWidth,
    songCoverImgId,
    songCoverImg && songCoverImg.complete,
  ].join('|');
  if (_backdropCache.key === key && _backdropCache.canvas) return true;
  if (!_backdropCache.canvas) _backdropCache.canvas = document.createElement('canvas');
  const ow = ctx.canvas.width,
    oh = ctx.canvas.height;
  _backdropCache.canvas.width = ow;
  _backdropCache.canvas.height = oh;
  const bctx = _backdropCache.canvas.getContext('2d');
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, ow, oh);
  const oc = document.createElement('canvas');
  oc.width = ow;
  oc.height = oh;
  const octx = oc.getContext('2d');
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const prev = ctx;
  ctx = octx;
  try {
    renderBackdropLayer(dim);
  } finally {
    ctx = prev;
  }
  bctx.drawImage(oc, 0, 0);
  _backdropCache.key = key;
  return true;
}
function drawCachedBackdrop() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(_backdropCache.canvas, 0, 0);
  ctx.restore();
}
/** While flowing: the hit line takes the colour of the next fruit, brightest in the lane it will land in. */
function drawFlowGlow(t) {
  if (!flowFx) return;
  const u = view.uiScale || 1,
    pulse = 0.5 + 0.5 * Math.sin(t * 9);
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = flowFx.color;
  rr(view.cx - view.laneW / 2 - 18, view.hitY - 13, view.laneW + 36, 26, 13);
  ctx.fill();
  const g = ctx.createRadialGradient(flowFx.x, view.hitY, 2 * u, flowFx.x, view.hitY, (40 + 8 * pulse) * u);
  g.addColorStop(0, flowFx.color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(flowFx.x, view.hitY, (48 + 8 * pulse) * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawVisibleNotes(t) {
  if (flowing) drawFlowGlow(t);
  let count = 0,
    lookahead = noteLookahead(),
    start = Math.max(0, lowerBoundNotes(t - lookahead - WINDOWS.miss - maxNoteSpan) - 4),
    end = t + lookahead + WINDOWS.miss + 0.1;
  for (let i = start; i < notes.length && notes[i].time <= end; i++) {
    const n = notes[i];
    if (n.state !== 'done') {
      drawNote(n, t);
      count++;
    }
  }
  perfStats.visibleNotes = count;
}
function renderBackdropLayer(dim = false) {
  const night = isNightTheme(),
    sunny = isSunnyTheme(),
    assets = themeAssets(),
    p = themePalette(),
    poster = currentMainVisual(),
    hasCover = state !== S.HOME && songCoverImg && songCoverImg.complete && songCoverImg.naturalWidth;
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  if (hasCover) {
    const coverAlpha = dim ? (night ? 0.45 : sunny ? 0.38 : 0.42) : night ? 0.7 : sunny ? 0.55 : 0.6;
    drawCover(songCoverImg, coverAlpha, dim ? 8 : 5);
  }
  const posterAlpha =
    state === S.HOME
      ? dim
        ? 0.74
        : 0.92
      : hasCover
        ? dim
          ? night
            ? 0.18
            : sunny
              ? 0.1
              : 0.12
          : night
            ? 0.22
            : sunny
              ? 0.12
              : 0.14
        : dim
          ? night
            ? 0.42
            : sunny
              ? 0.2
              : 0.28
          : night
            ? 0.56
            : sunny
              ? 0.28
              : 0.3;
  if (!drawCover(poster, posterAlpha, dim && state !== S.HOME ? 3 : 0)) {
    const bgImg = night ? assets.background_neon : sunny ? assets.background_sunny : assets.background_clean;
    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      drawCover(bgImg, dim ? 0.5 : 0.78, 0);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
      g.addColorStop(0, night ? '#111936' : sunny ? '#fff4bf' : '#fbfff9');
      g.addColorStop(0.65, night ? '#0b1024' : sunny ? '#ffe6a8' : '#eefaf0');
      g.addColorStop(1, p.bg);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, innerWidth, innerHeight);
    }
  }
  const veil = ctx.createLinearGradient(0, 0, 0, innerHeight);
  if (night) {
    veil.addColorStop(0, dim ? 'rgba(5,8,23,.52)' : 'rgba(5,8,23,.24)');
    veil.addColorStop(0.55, dim ? 'rgba(5,8,23,.58)' : 'rgba(5,8,23,.18)');
    veil.addColorStop(1, dim ? 'rgba(5,8,23,.68)' : 'rgba(5,8,23,.32)');
  } else if (sunny) {
    veil.addColorStop(0, dim ? 'rgba(255,248,226,.68)' : 'rgba(255,248,226,.36)');
    veil.addColorStop(0.56, dim ? 'rgba(255,252,238,.74)' : 'rgba(255,252,238,.40)');
    veil.addColorStop(1, dim ? 'rgba(255,241,197,.80)' : 'rgba(255,241,197,.48)');
  } else {
    veil.addColorStop(0, dim ? 'rgba(250,255,249,.58)' : 'rgba(250,255,249,.22)');
    veil.addColorStop(0.6, dim ? 'rgba(250,255,249,.64)' : 'rgba(250,255,249,.16)');
    veil.addColorStop(1, dim ? 'rgba(250,255,249,.72)' : 'rgba(250,255,249,.30)');
  }
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}
function drawBaseBackdrop(dim = false) {
  _ensureBackdropCache(dim);
  drawCachedBackdrop();
}
function bg() {
  drawBaseBackdrop(false);
  drawConveyor();
  drawShop();
}
function drawShop() {}
function drawShelf(x, y, w, h) {
  const shop = themeAssets().shop_card;
  if (shop && shop.complete && shop.naturalWidth) {
    ctx.drawImage(shop, x, y, w, h);
    return;
  }
  ctx.fillStyle = isNightTheme() ? 'rgba(8,13,34,.72)' : 'rgba(255,255,255,.78)';
  rr(x, y, w, h, 24);
  ctx.fill();
  ctx.strokeStyle = isNightTheme() ? 'rgba(121,255,245,.26)' : 'rgba(38,48,68,.10)';
  ctx.stroke();
  ctx.fillStyle = isNightTheme() ? '#79fff5' : '#3f9f65';
  ctx.font = '900 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(isNightTheme() ? 'JUICE IT UP' : 'FRESH & FUN', x + w / 2, y + 24);
}
function drawCustomer(x, y, w, h) {
  const night = isNightTheme(),
    done = orders.filter((o) => o.done).length,
    mood =
      counts.Miss > 8
        ? '\u7740\u6025'
        : done >= orders.length
          ? '\u6ee1\u610f'
          : combo > 30
            ? '\u5174\u594b'
            : '\u7b49\u5f85';
  ctx.fillStyle = night ? 'rgba(8,13,34,.78)' : 'rgba(255,255,255,.82)';
  rr(x, y, w, h, 26);
  ctx.fill();
  ctx.strokeStyle = night ? 'rgba(255,75,181,.34)' : 'rgba(38,48,68,.08)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = night ? '#79fff5' : '#607086';
  ctx.font = '900 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(night ? 'NIGHT ORDER' : 'CURRENT ORDER', x + w / 2, y + 25);
  const avatar = themeAssets().customer_happy;
  if (avatar && avatar.complete && avatar.naturalWidth) ctx.drawImage(avatar, x + w / 2 - 42, y + 40, 84, 84);
  ctx.fillStyle = night ? '#fff' : '#263044';
  ctx.font = '950 14px system-ui';
  ctx.fillText(mood, x + w / 2, y + h - 58);
  ctx.fillStyle = night ? '#ffdf5c' : '#3f9f65';
  ctx.font = '900 12px system-ui';
  ctx.fillText(`\u8ba2\u5355 ${done}/${orders.length}`, x + w / 2, y + h - 34);
}
function drawConveyor() {
  const p = themePalette(),
    night = isNightTheme(),
    x = view.cx - view.laneW / 2,
    y = view.laneTop,
    w = view.laneW,
    h = view.hitY - view.laneTop + 80;
  ctx.fillStyle = p.lane;
  rr(x, y, w, h, 30);
  ctx.fill();
  ctx.strokeStyle = p.laneStroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const lx = view.cx + (i - 1) * view.laneW * 0.22;
    ctx.strokeStyle = p.laneLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, y + 22);
    ctx.lineTo(lx, y + h - 24);
    ctx.stroke();
  }
  const slashGlow = slashFx.reduce((m, s) => Math.max(m, 1 - s.age / s.life), 0);
  ctx.save();
  if (slashGlow > 0) {
    const glow = night
      ? `rgba(121,255,245,${(0.35 * slashGlow).toFixed(2)})`
      : `rgba(113,203,135,${(0.3 * slashGlow).toFixed(2)})`;
    ctx.shadowColor = night ? '#79fff5' : '#71cb87';
    ctx.shadowBlur = 18 * slashGlow;
    ctx.fillStyle = glow;
    rr(x - 20, view.hitY - 14 - 4 * slashGlow, w + 40, 28 + 8 * slashGlow, 14 + 4 * slashGlow);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = p.hitFill;
  rr(x - 18, view.hitY - 13, w + 36, 26, 13);
  ctx.fill();
  ctx.strokeStyle =
    slashGlow > 0
      ? night
        ? `rgba(121,255,245,${(0.5 + 0.5 * slashGlow).toFixed(2)})`
        : `rgba(63,159,101,${(0.5 + 0.5 * slashGlow).toFixed(2)})`
      : p.hitLine;
  ctx.lineWidth = 4 + 2 * slashGlow;
  ctx.beginPath();
  ctx.moveTo(x - 16, view.hitY);
  ctx.lineTo(x + w + 16, view.hitY);
  ctx.stroke();
  ctx.restore();
}
function drawLeaf(r) {
  ctx.fillStyle = '#68e38b';
  ctx.beginPath();
  ctx.ellipse(r * 0.16, -r * 0.78, r * 0.14, r * 0.3, -0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(5,40,24,.38)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
}
function drawFruitIcon(f, r, seed = 0) {
  const name = f.name || '',
    c = f.color;
  ctx.save();
  ctx.rotate(Math.sin(seed) * 0.12);
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = r * 0.34;
  ctx.fillStyle = 'rgba(5,8,18,.92)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.08, r * 0.96, r * 1.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (name === 'Banana') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = c;
    ctx.lineWidth = r * 0.48;
    ctx.beginPath();
    ctx.arc(-r * 0.05, -r * 0.03, r * 0.72, 0.42, Math.PI * 1.42);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(-r * 0.16, -r * 0.1, r * 0.57, 0.56, Math.PI * 1.24);
    ctx.stroke();
  } else if (name === 'Grape') {
    for (let i = 0; i < 6; i++) {
      const px = [-0.28, 0.26, 0, -0.42, 0.42, 0][i] * r,
        py = [-0.34, -0.34, -0.02, 0.1, 0.1, 0.38][i] * r;
      ctx.fillStyle = i % 2 ? '#b88cff' : c;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    drawLeaf(r);
  } else {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      name === 'Apple' ? r * 0.86 : r * 0.92,
      name === 'Lemon' ? r * 0.9 : r * 0.95,
      Math.sin(seed) * 0.16,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (name === 'Apple') drawLeaf(r);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.86)';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function drawFruit(x, y, r, n) {
  const img = ensureImageLoaded(noteFruitIconSet()[n.fruit.name]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(n.id) * 0.1);
  ctx.shadowColor = 'rgba(0,0,0,.42)';
  ctx.shadowBlur = r * 0.34;
  if (img && img.complete && img.naturalWidth) {
    const banana = n.fruit.name === 'Banana';
    const s = banana ? r * 2.78 : r * 2.35;
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
  } else drawFruitIcon(n.fruit, r * (n.fruit.name === 'Banana' ? 1.22 : 1.06), n.id);
  ctx.restore();
}
function drawHoldNozzle(x, n, t, r) {
  const u = view.uiScale || 1,
    night = isNightTheme(),
    glow = 0.55 + 0.45 * Math.sin(t * 18);
  ctx.save();
  ctx.globalAlpha = 0.95;
  const g = ctx.createRadialGradient(x, view.hitY, 4 * u, x, view.hitY, (56 + glow * 14) * u);
  g.addColorStop(0, night ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.62)');
  g.addColorStop(0.32, night ? 'rgba(255,75,181,.32)' : 'rgba(113,203,135,.30)');
  g.addColorStop(1, night ? 'rgba(121,255,245,0)' : 'rgba(113,203,135,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, view.hitY, (58 + glow * 10) * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = night ? 'rgba(8,13,34,.88)' : 'rgba(255,255,255,.92)';
  rr(x - r * 0.92, view.hitY - 13 * u, r * 1.84, 26 * u, 13 * u);
  ctx.fill();
  ctx.strokeStyle = night ? 'rgba(255,223,92,.92)' : 'rgba(113,203,135,.92)';
  ctx.lineWidth = (3.2 + glow * 1.2) * u;
  rr(x - r * 0.92, view.hitY - 13 * u, r * 1.84, 26 * u, 13 * u);
  ctx.stroke();
  ctx.fillStyle = n.fruit.color;
  for (let i = 0; i < 7; i++) {
    const phase = t * 5 + i * 0.9,
      px = x + Math.sin(phase) * r * 0.52,
      py = view.hitY - 18 * u - Math.abs(Math.cos(phase)) * 18 * u,
      sz = (2.2 + (i % 3) * 0.8 + glow) * u;
    ctx.globalAlpha = 0.45 + (0.35 * ((i % 2) + glow)) / 2;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawNote(n, t) {
  if (n.state === 'done') return;
  const u = view.uiScale || 1,
    night = isNightTheme(),
    appear = n.time - (n.travel || diff.travel),
    endTime = Math.max(n.end, n.time);
  if (t < appear || t > endTime + WINDOWS.miss) return;
  const x = noteX(n),
    rawY = noteY(n, t, n.time),
    r = 30 * u,
    laneMin = view.laneTop - r * 1.25,
    lateVisualWindow = WINDOWS.miss * 0.72,
    laneMax = view.hitY + pixelsPerSecond(n) * lateVisualWindow,
    y = clamp(rawY, laneMin, laneMax),
    barY = clamp(rawY, laneMin, view.hitY),
    fade = clamp((t - appear) / 0.18, 0, 1),
    lateFade = n.state === 'pending' && t > n.time ? 1 - clamp((t - n.time) / lateVisualWindow, 0, 1) : 1;
  if (lateFade <= 0 && n.state === 'pending') return;
  ctx.save();
  ctx.globalAlpha = fade * lateFade;
  if (n.kind === 'press') {
    const rawY2 = noteY(n, t, n.end),
      y2 = clamp(rawY2, laneMin, view.hitY),
      top = Math.max(laneMin, Math.min(barY, y2)),
      bottom = Math.min(view.hitY, Math.max(barY, y2)),
      body = Math.max(0, bottom - top);
    ctx.shadowColor =
      n.state === 'holding'
        ? night
          ? 'rgba(255,75,181,.65)'
          : 'rgba(113,203,135,.42)'
        : night
          ? 'rgba(121,255,245,.22)'
          : 'rgba(113,203,135,.20)';
    ctx.shadowBlur = (n.state === 'holding' ? 14 : 6) * u;
    ctx.fillStyle =
      n.state === 'holding'
        ? night
          ? 'rgba(255,75,181,.18)'
          : 'rgba(113,203,135,.18)'
        : night
          ? 'rgba(121,255,245,.10)'
          : 'rgba(113,203,135,.12)';
    if (body > 1 * u) {
      rr(x - r * 0.66, top, r * 1.32, body, 16 * u);
      ctx.fill();
      ctx.strokeStyle =
        n.state === 'holding'
          ? night
            ? 'rgba(255,75,181,.96)'
            : 'rgba(113,203,135,.96)'
          : night
            ? 'rgba(121,255,245,.72)'
            : 'rgba(113,203,135,.72)';
      ctx.lineWidth = (n.state === 'holding' ? 4 : 3) * u;
      rr(x - r * 0.66, top, r * 1.32, body, 16 * u);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = night ? 'rgba(255,255,255,.55)' : 'rgba(38,48,68,.25)';
    ctx.beginPath();
    ctx.arc(x, y2, 5 * u, 0, Math.PI * 2);
    ctx.fill();
    if (n.state === 'holding') drawHoldNozzle(x, n, t, r);
    else if (n.state === 'chopping') {
      ctx.strokeStyle = 'rgba(255,177,76,.95)';
      ctx.lineWidth = 3 * u;
      for (let i = 0; i < n.chops; i++) {
        const cy = bottom - (i + 1) * Math.min(18 * u, body / (n.chops + 1));
        ctx.beginPath();
        ctx.moveTo(x - r * 0.8, cy + (i % 2 ? 4 : -4) * u);
        ctx.lineTo(x + r * 0.8, cy - (i % 2 ? 4 : -4) * u);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = night ? '#79fff5' : '#3f9f65';
      ctx.font = `900 ${Math.round(12 * u)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText('PRESS', x, top + Math.min(30 * u, body * 0.5));
    }
  }
  if (!(n.kind === 'press' && n.state === 'holding')) drawFruit(x, y, r, n);
  ctx.restore();
}
function drawCenterJudge() {
  if (!centerJudge) return;
  const p = themePalette(),
    age = centerJudge.age,
    life = centerJudge.life,
    a = 1 - age / life,
    pop = 1 + Math.max(0, 1 - age / 0.1) * 0.06,
    x = view.cx,
    s = clamp(view.uiScale || 1, 0.62, 1.15),
    judgeSize = Math.round(46 * s),
    comboSize = Math.round(29 * s),
    comboY = Math.round(47 * s),
    y = view.laneTop + (view.hitY - view.laneTop) * 0.28 - 18 * s * a;
  ctx.save();
  ctx.globalAlpha = Math.min(0.66, a);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.font = `950 ${judgeSize}px system-ui`;
  ctx.lineWidth = Math.round(8 * s);
  ctx.strokeStyle = p.judgeStroke;
  ctx.strokeText(centerJudge.txt, 0, 0);
  ctx.fillStyle = centerJudge.color;
  ctx.fillText(centerJudge.txt, 0, 0);
  if (centerJudge.tag) {
    // How the note was played (swipe, chop, flow), small above the judgement.
    const tagSize = Math.round(24 * s),
      tagY = -Math.round(42 * s);
    ctx.font = `950 ${tagSize}px system-ui`;
    ctx.lineWidth = Math.round(6 * s);
    ctx.strokeText(centerJudge.tag, 0, tagY);
    ctx.fillStyle = p.gold;
    ctx.fillText(centerJudge.tag, 0, tagY);
  }
  if (centerJudge.combo > 1) {
    ctx.globalAlpha = Math.min(0.6, a);
    ctx.font = `950 ${comboSize}px system-ui`;
    ctx.lineWidth = Math.round(6 * s);
    ctx.strokeText(`${centerJudge.combo} COMBO`, 0, comboY);
    ctx.fillStyle = p.gold;
    ctx.fillText(`${centerJudge.combo} COMBO`, 0, comboY);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
/** Slow-motion practice: a caption, and a fingertip acting out the gesture on the note it is for. */
function drawCoach() {
  if (!coachFx) return;
  const u = view.uiScale || 1,
    { mode, x, caption, alpha } = coachFx,
    y = view.hitY + 26 * u,
    ph = ((performance.now() / 1000) % 1.3) / 1.3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(17 * u)}px system-ui`;
  const tw = ctx.measureText(caption).width,
    cy = view.hitY + 70 * u;
  ctx.fillStyle = 'rgba(38,48,68,.84)';
  rr(view.cx - tw / 2 - 18 * u, cy - 19 * u, tw + 36 * u, 38 * u, 19 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(caption, view.cx, cy);
  let fx = x,
    fy = y,
    down = true;
  if (mode === 'swipe') {
    const k = Math.min(1, ph / 0.45);
    fx = x - 46 * u + 92 * u * k;
    fy = y + 22 * u - 70 * u * k;
    down = ph < 0.5;
    if (down) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 6 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 46 * u, y + 22 * u);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
  } else if (mode === 'chop') {
    // Press, let go, then quick taps.
    if (ph < 0.25) down = true;
    else {
      const beat = Math.floor(((ph - 0.25) / 0.75) * 8);
      down = beat % 2 === 0 && beat > 0;
      fx = x + (beat % 4 < 2 ? -8 : 8) * u;
    }
  }
  const r = 17 * u;
  if (down) {
    const ring = (performance.now() / 600) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${(1 - ring).toFixed(2)})`;
    ctx.lineWidth = 3 * u;
    ctx.beginPath();
    ctx.arc(fx, fy, r + ring * 22 * u, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowColor = 'rgba(38,48,68,.35)';
  ctx.shadowBlur = 10 * u;
  ctx.fillStyle = down ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.arc(fx, fy, down ? r * 0.9 : r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(63,159,101,.9)';
  ctx.lineWidth = 3 * u;
  ctx.stroke();
  ctx.restore();
}
/** Blade strokes left by swipes and chops. */
function drawSlashLines() {
  const u = view.uiScale || 1;
  for (const sl of slashLines || []) {
    const a = 1 - sl.age / sl.life,
      len = 120 * u * (0.6 + 0.4 * (1 - a)),
      dx = Math.cos(sl.angle) * len,
      dy = Math.sin(sl.angle) * len;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = 'round';
    ctx.shadowColor = sl.color;
    ctx.shadowBlur = 16 * u;
    ctx.strokeStyle = sl.color;
    ctx.lineWidth = 9 * u * a;
    ctx.beginPath();
    ctx.moveTo(sl.x - dx, sl.y - dy);
    ctx.lineTo(sl.x + dx, sl.y + dy);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * u * a;
    ctx.stroke();
    ctx.restore();
  }
}
function drawFx() {
  const p = themePalette();
  for (const part of particles) {
    const a = 1 - part.age / part.life;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(part.x, part.y);
    ctx.rotate(part.rot || 0);
    ctx.fillStyle = part.color;
    if (part.kind === 'drop') {
      ctx.beginPath();
      ctx.ellipse(0, 0, part.r * 0.62, part.r * 1.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.34)';
      ctx.beginPath();
      ctx.arc(-part.r * 0.18, -part.r * 0.28, part.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.kind === 'slice') {
      ctx.beginPath();
      ctx.moveTo(-part.r * 0.9, part.r * 0.55);
      ctx.quadraticCurveTo(0, -part.r * 0.95, part.r * 0.9, part.r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.48)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    } else if (part.kind === 'half') {
      // Half a fruit: skin on the round side, pale flesh on the cut.
      ctx.scale(1, part.side);
      ctx.beginPath();
      ctx.arc(0, 0, part.r, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,248,226,.92)';
      ctx.beginPath();
      ctx.ellipse(0, 1.5, part.r * 0.86, part.r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (part.kind === 'cube') {
      rr(-part.r, -part.r, part.r * 2, part.r * 2, part.r * 0.35);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)';
      rr(-part.r * 0.7, -part.r * 0.7, part.r * 0.8, part.r * 0.5, part.r * 0.2);
      ctx.fill();
    } else if (part.kind === 'spark') {
      ctx.globalAlpha = a * a;
      ctx.beginPath();
      ctx.arc(0, 0, part.r * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * a * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, part.r * a * 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, part.r * (0.55 + a * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawSlashLines();
  drawCoach();
  drawCenterJudge();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ts = clamp(view.uiScale || 1, 0.62, 1.15),
    floatSize = Math.round(24 * ts);
  for (const f of texts) {
    const a = 1 - f.age / f.life;
    ctx.globalAlpha = a;
    ctx.font = `900 ${floatSize}px system-ui`;
    ctx.lineWidth = Math.round(5 * ts);
    ctx.strokeStyle = p.judgeStroke;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function drawProducts() {
  const u = view.uiScale || 1,
    night = isNightTheme(),
    portrait = view.portrait,
    done = orders.filter((o) => o.done).length,
    current = orders.find((o) => !o.done),
    allDone = done >= orders.length,
    displayOrder = current || orders[orders.length - 1],
    rate = allDone ? 1 : displayOrder ? clamp(displayOrder.have / displayOrder.need, 0, 1) : 1;
  if (portrait) {
    const panelW = Math.min(innerWidth - 28 * u, 460 * u),
      panelH = view.orderH || 72 * u,
      x = innerWidth / 2 - panelW / 2,
      thumbTop = innerHeight - view.safeBottom - (view.thumbH || 50 * u),
      y = Math.min(thumbTop - panelH - 8 * u, view.hitY + 42 * u);
    ctx.fillStyle = night ? 'rgba(8,13,34,.86)' : 'rgba(255,255,255,.90)';
    rr(x, y, panelW, panelH, 22 * u);
    ctx.fill();
    ctx.strokeStyle = night ? 'rgba(121,255,245,.24)' : 'rgba(38,48,68,.08)';
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    const avatar = themeAssets().customer_happy;
    if (avatar && avatar.complete && avatar.naturalWidth)
      ctx.drawImage(avatar, x + 14 * u, y + 14 * u, 42 * u, 42 * u);
    ctx.fillStyle = night ? '#79fff5' : '#3f9f65';
    ctx.font = `950 ${Math.round(12 * u)}px system-ui`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(allDone ? '订单完成' : `\u8ba2\u5355 ${done}/${orders.length}`, x + 66 * u, y + 22 * u);
    ctx.fillStyle = night ? '#fff' : '#263044';
    ctx.font = `950 ${Math.round(15 * u)}px system-ui`;
    ctx.fillText(
      allDone ? '全部完成' : displayOrder ? displayOrder.name : '暂无订单',
      x + 132 * u,
      y + 22 * u,
    );
    ctx.fillStyle = night ? 'rgba(255,255,255,.16)' : '#e6ede8';
    rr(x + 66 * u, y + 35 * u, panelW - 92 * u, 12 * u, 6 * u);
    ctx.fill();
    ctx.fillStyle = allDone
      ? night
        ? '#ffdf5c'
        : '#3f9f65'
      : displayOrder
        ? displayOrder.color
        : night
          ? '#ff4bb5'
          : '#71cb87';
    rr(x + 66 * u, y + 35 * u, (panelW - 92 * u) * rate, 12 * u, 6 * u);
    ctx.fill();
    ctx.fillStyle = night ? '#ffdf5c' : '#607086';
    ctx.font = `900 ${Math.round(11 * u)}px system-ui`;
    ctx.fillText(
      allDone
        ? '已全部出餐'
        : `出品  杯料${productCounts.chunks}  果汁${productCounts.juice}  损耗${productCounts.waste}`,
      x + 66 * u,
      y + 59 * u,
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = night ? '#fff' : '#263044';
    ctx.font = `950 ${Math.round(11 * u)}px system-ui`;
    ctx.fillText(
      allDone ? '完成' : displayOrder ? `${displayOrder.have}/${displayOrder.need}` : '--',
      x + panelW - 16 * u,
      y + 22 * u,
    );
  } else {
    const panelW = 270 * u,
      panelH = 318 * u,
      x = innerWidth - panelW - 30 * u,
      y = innerHeight * 0.46;
    ctx.fillStyle = night ? 'rgba(8,13,34,.82)' : 'rgba(255,255,255,.86)';
    rr(x, y, panelW, panelH, 26 * u);
    ctx.fill();
    ctx.strokeStyle = night ? 'rgba(255,75,181,.32)' : 'rgba(38,48,68,.08)';
    ctx.lineWidth = 2 * u;
    ctx.stroke();
    ctx.fillStyle = night ? '#79fff5' : '#3f9f65';
    ctx.font = `950 ${Math.round(14 * u)}px system-ui`;
    ctx.textAlign = 'left';
    ctx.fillText(night ? 'NIGHT MARKET ORDER' : 'CURRENT ORDER', x + 20 * u, y + 30 * u);
    ctx.fillStyle = night ? '#b9c7dc' : '#607086';
    ctx.font = `850 ${Math.round(12 * u)}px system-ui`;
    ctx.fillText('完成订单，稳住顾客满意度', x + 20 * u, y + 50 * u);
    orders.forEach((o, i) => {
      const oy = y + (82 + i * 46) * u,
        barW = panelW - 48 * u,
        rate = clamp(o.have / o.need, 0, 1);
      ctx.fillStyle = o.done
        ? night
          ? 'rgba(255,75,181,.16)'
          : 'rgba(113,203,135,.16)'
        : night
          ? 'rgba(255,255,255,.07)'
          : '#f6f9f7';
      rr(x + 18 * u, oy - 21 * u, panelW - 36 * u, 36 * u, 16 * u);
      ctx.fill();
      ctx.fillStyle = o.color;
      ctx.font = `950 ${Math.round(12 * u)}px system-ui`;
      ctx.fillText(o.done ? '完成' : o.name, x + 30 * u, oy - 8 * u);
      ctx.fillStyle = night ? 'rgba(255,255,255,.16)' : '#e6ede8';
      rr(x + 30 * u, oy + 3 * u, barW - 26 * u, 8 * u, 4 * u);
      ctx.fill();
      ctx.fillStyle = o.color;
      rr(x + 30 * u, oy + 3 * u, (barW - 26 * u) * rate, 8 * u, 4 * u);
      ctx.fill();
      ctx.fillStyle = night ? '#fff' : '#263044';
      ctx.font = `900 ${Math.round(11 * u)}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText(`${o.have}/${o.need}`, x + panelW - 28 * u, oy - 8 * u);
      ctx.textAlign = 'left';
    });
    const trayY = y + 222 * u;
    ctx.fillStyle = night ? 'rgba(255,223,92,.10)' : '#fff7e7';
    rr(x + 18 * u, trayY, panelW - 36 * u, 58 * u, 18 * u);
    ctx.fill();
    ctx.fillStyle = night ? '#ffdf5c' : '#f59b32';
    ctx.font = `900 ${Math.round(12 * u)}px system-ui`;
    ctx.fillText(
      `出品  杯料${productCounts.chunks}  果汁${productCounts.juice}  损耗${productCounts.waste}`,
      x + 30 * u,
      trayY + 19 * u,
    );
    products.slice(-14).forEach((p, i) => {
      const col = i % 7,
        row = Math.floor(i / 7),
        px = x + (30 + col * 30) * u,
        py = trayY + (30 + row * 20) * u,
        a = clamp(p.age / 0.25, 0, 1);
      ctx.globalAlpha = 0.55 + a * 0.45;
      ctx.fillStyle =
        p.kind === 'waste' ? '#9aa3b3' : p.kind === 'juice' ? p.color : night ? '#ffdf5c' : '#ffb14c';
      rr(px, py, 22 * u, 15 * u, 7 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  orderFlash.forEach((f, i) => {
    const a = 1 - f.age / f.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.font = `900 ${Math.round((portrait ? 18 : 23) * u)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, innerWidth / 2, view.hitY - 92 * u - i * 28 * u);
    ctx.globalAlpha = 1;
  });
}
function drawThumbPad(warm = false) {
  if (state !== S.PLAYING && !warm) return;
  if (!view.portrait) return;
  const night = isNightTheme(),
    w = Math.min(280, innerWidth * 0.6),
    h = 6,
    x = innerWidth / 2 - w / 2,
    y = innerHeight - view.safeBottom - 16;
  ctx.save();
  ctx.globalAlpha = holding ? 0.6 : 0.2;
  ctx.fillStyle = holding ? (night ? '#ff4bb5' : '#71cb87') : night ? '#79fff5' : '#263044';
  rr(x, y, w, h, h / 2);
  ctx.fill();
  ctx.restore();
}
function hudSafeColor() {
  return isNightTheme() ? '#79fff5' : isSunnyTheme() ? '#2f9e4c' : '#3f9f65';
}
function hudDangerColor() {
  return isNightTheme() ? '#ff4bb5' : '#e84968';
}
function moodEmoji(mood) {
  if (mood >= 80) return '\ud83d\ude0a';
  if (mood >= 60) return '\ud83d\ude42';
  if (mood >= 40) return '\ud83d\ude10';
  if (mood >= 20) return '\ud83d\ude1f';
  return '\ud83d\ude20';
}
function drawMoodIcon(x, y, r, mood) {
  ctx.save();
  ctx.font = `${Math.round(r * 1.6)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(moodEmoji(mood), x, y + 1);
  ctx.restore();
}
function hud(t) {
  const p = themePalette(),
    u = view.uiScale || 1,
    pr = clamp(t / playDuration(), 0, 1),
    anger = clamp(customerAnger, 0, 100),
    mood = 100 - anger,
    compact = view.portrait,
    night = isNightTheme(),
    margin = (compact ? 10 : 18) * u,
    w = compact ? innerWidth - margin * 2 : Math.min(720 * u, innerWidth * 0.72),
    h = (compact ? 50 : 46) * u,
    x = margin,
    y = compact ? view.safeTop : 14 * u,
    safe = hudSafeColor(),
    danger = hudDangerColor();
  ctx.save();
  ctx.fillStyle = night ? 'rgba(8,13,34,.88)' : 'rgba(255,255,255,.90)';
  rr(x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = mood <= 25 ? danger : p.panelStroke;
  ctx.lineWidth = (mood <= 25 ? 2.5 : 1.5) * u;
  ctx.stroke();
  const pad = (compact ? 12 : 14) * u,
    iconR = (compact ? 14 : 13) * u,
    iconX = x + pad + iconR,
    iconY = y + h / 2,
    scoreW = (compact ? 120 : 130) * u,
    scorePadX = x + w - scoreW - 38 * u,
    scorePadY = y + 6 * u,
    scorePadH = h - 12 * u,
    barX = iconX + iconR + 8 * u,
    barY = y + h / 2 - 5 * u,
    barW = Math.max(60 * u, scorePadX - barX - 10 * u),
    barH = 10 * u;
  drawMoodIcon(iconX, iconY, iconR, mood);
  const moodColor = mood >= 60 ? safe : mood >= 30 ? p.gold : danger;
  ctx.fillStyle = night ? 'rgba(255,255,255,.12)' : 'rgba(38,48,68,.08)';
  rr(barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.fillStyle = moodColor;
  rr(barX, barY, barW * (mood / 100), barH, barH / 2);
  ctx.fill();
  ctx.strokeStyle = mood <= 30 ? danger : 'rgba(255,255,255,.30)';
  ctx.lineWidth = 1.2 * u;
  rr(barX, barY, barW, barH, barH / 2);
  ctx.stroke();
  ctx.fillStyle = night ? 'rgba(255,223,92,.12)' : 'rgba(255,180,60,.1)';
  rr(scorePadX, scorePadY, scoreW, scorePadH, scorePadH / 2);
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = p.gold;
  ctx.font = `950 ${Math.round((compact ? 22 : 20) * u)}px system-ui`;
  ctx.fillText(String(heat), scorePadX + scoreW - 12 * u, y + h / 2);
  const progY = y + h - 3 * u,
    progX = x + h / 2,
    progW = w - h;
  ctx.fillStyle = p.progressBg;
  rr(progX, progY, progW, 3 * u, 2 * u);
  ctx.fill();
  ctx.fillStyle = p.accent;
  rr(progX, progY, progW * pr, 3 * u, 2 * u);
  ctx.fill();
  ctx.restore();
  if (debug) drawDebug(t);
}
function drawDebug(t) {
  const ce = chartEnd(),
    lines = [
      `song: ${t.toFixed(3)} / ${playDuration().toFixed(3)}`,
      `audio/visual/drift: ${(perfStats.audioSongTime || 0).toFixed(3)} / ${(perfStats.visualSongTime || 0).toFixed(3)} / ${(perfStats.audioDriftMs || 0).toFixed(1)}ms`,
      `chart end: ${ce.toFixed(3)} tail: ${(playDuration() - ce).toFixed(3)}s`,
      `difficulty: ${diff.name}`,
      `visible notes: ${perfStats.visibleNotes} / notes ${total}`,
      `fx: particles ${perfStats.particleCount} texts ${perfStats.textsCount}`,
      `frame: ${perfStats.frameMs.toFixed(2)}ms  fps ${perfStats.fpsEMA.toFixed(1)}`,
      `update/draw: ${perfStats.updateMs.toFixed(2)} / ${perfStats.drawMs.toFixed(2)}ms`,
      `audio prime/play: ${perfStats.audioPrimeMs.toFixed(1)} / ${perfStats.audioPlayCallMs.toFixed(2)} / ${perfStats.audioPlayResolveMs.toFixed(1)}ms`,
      `result renders: ${perfStats.resultRenderCount}`,
      `last error: ${lastErr.toFixed(1)}ms`,
      `combo: ${combo} / max ${maxCombo}`,
      `activeStart: ${(song.activeStart || 0).toFixed(2)} offset: ${(song.audioOffset || 0).toFixed(3)}`,
      '[ / ] adjust offset by 20ms',
    ],
    lineH = 20,
    padX = 20,
    padY = 18,
    w = Math.min(430, innerWidth - 28),
    h = padY * 2 + lineH * lines.length,
    x = Math.max(14, innerWidth - w - 22),
    y = 22;
  ctx.fillStyle = 'rgba(5,8,18,.78)';
  rr(x, y, w, h, 18);
  ctx.fill();
  ctx.fillStyle = '#cfe0ff';
  ctx.font = '13px Consolas,monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => ctx.fillText(line, x + padX, y + padY + i * lineH));
}
function drawPauseButton(warm = false) {
  _pauseButtons = [];
  if (![S.READY, S.LEAD_IN, S.PLAYING, S.PAUSED, S.RESUME_COUNTDOWN].includes(state) && !warm) return;
  const p = themePalette(),
    u = view.uiScale || 1,
    compact = view.portrait,
    margin = (compact ? 10 : 18) * u,
    hudW = compact ? innerWidth - margin * 2 : Math.min(720 * u, innerWidth * 0.72),
    hudH = (compact ? 50 : 46) * u,
    hudX = margin,
    hudY = compact ? view.safeTop : 14 * u,
    sz = (compact ? 24 : 22) * u,
    x = hudX + hudW - sz - 10 * u,
    y = hudY + (hudH - sz) / 2;
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = p.text;
  const bw = Math.round(sz * 0.22),
    gap = Math.round(sz * 0.2),
    bh = Math.round(sz * 0.6),
    bx = x + (sz - bw * 2 - gap) / 2,
    by = y + (sz - bh) / 2;
  rr(bx, by, bw, bh, 2 * u);
  ctx.fill();
  rr(bx + bw + gap, by, bw, bh, 2 * u);
  ctx.fill();
  ctx.restore();
  _pauseButtons.push({ id: 'pause', x: x - 8 * u, y: y - 8 * u, w: sz + 16 * u, h: sz + 16 * u });
}
function drawPauseOverlay() {
  if (state !== S.PAUSED) return;
  const portrait = view.portrait,
    u = view.uiScale || 1,
    inDay = !!dayRun.active,
    lockedStory = serviceRun.fromStory || currentShiftIsTutorial();
  ctx.save();
  ctx.fillStyle = 'rgba(3,5,14,.66)';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  const tutorialShift = currentShiftIsTutorial(),
    actions = inDay
      ? [
          ['resume', '\u7ee7\u7eed', 'primary'],
          ['retry', '\u91cd\u8bd5\u672c\u73ed', 'warn'],
          ['restartDay', '\u91cd\u6765\u4eca\u5929', 'plain'],
        ].concat(tutorialShift ? [] : [['endDay', '\u63d0\u524d\u6536\u5de5', 'plain']])
      : [
          ['resume', '\u7ee7\u7eed', 'primary'],
          ['retry', '\u91cd\u8bd5', 'warn'],
          ['skip', '\u8df3\u8fc7\uff08\u6ee1\u5206\uff09', 'plain'],
        ].concat(lockedStory ? [] : [['songSelect', '\u9000\u51fa\u7ec3\u4e60', 'plain']]),
    cardW = Math.min((portrait ? 500 : 460) * u, innerWidth * 0.88),
    cardH = Math.min(
      (portrait ? (inDay ? 470 : lockedStory ? 400 : 460) : inDay ? 430 : lockedStory ? 360 : 410) * u,
      innerHeight * 0.82,
    ),
    cardX = innerWidth / 2 - cardW / 2,
    cardY = Math.max(view.safeTop + view.topHudH + 14 * u, innerHeight / 2 - cardH / 2);
  ctx.fillStyle = 'rgba(8,13,34,.76)';
  rr(cardX, cardY, cardW, cardH, 34 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 2.4 * u;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = `950 ${Math.round((portrait ? 42 : 38) * u)}px system-ui`;
  ctx.fillText(
    inDay
      ? '\u6682\u505c\u8425\u4e1a'
      : lockedStory
        ? '\u6682\u505c\u670d\u52a1'
        : '\u6682\u505c\u7ec3\u4e60',
    innerWidth / 2,
    cardY + 44 * u,
  );
  ctx.fillStyle = '#dbe7ff';
  ctx.font = `850 ${Math.round((portrait ? 18 : 16) * u)}px system-ui`;
  ctx.fillText(
    inDay
      ? tutorialShift
        ? '\u7ee7\u7eed\u6559\u5b66\u5173\uff0c\u6216\u91cd\u8bd5\u672c\u73ed'
        : '\u7ee7\u7eed\u3001\u91cd\u8bd5\uff0c\u6216\u5904\u7406\u4eca\u5929\u7684\u8425\u4e1a'
      : lockedStory
        ? '\u5267\u60c5\u670d\u52a1\u4e2d\uff0c\u8bf7\u5b8c\u6210\u8fd9\u4e00\u5355'
        : '\u7ee7\u7eed\u5f53\u524d\u7ec3\u4e60\uff0c\u6216\u9000\u56de\u9009\u66f2',
    innerWidth / 2,
    cardY + 78 * u,
  );
  _pauseButtons = [];
  const w = Math.min(390 * u, cardW - 58 * u),
    h = (portrait ? 50 : 44) * u,
    gap = 8 * u,
    startY = cardY + 106 * u;
  actions.forEach(([id, label, tone], i) => {
    const x = innerWidth / 2 - w / 2,
      y = startY + i * (h + gap);
    ctx.fillStyle =
      tone === 'primary'
        ? 'rgba(140,255,193,.94)'
        : tone === 'warn'
          ? 'rgba(255,217,140,.94)'
          : 'rgba(255,255,255,.18)';
    rr(x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = tone === 'plain' ? '#eef4ff' : '#081022';
    ctx.font = `950 ${Math.round((portrait ? 19 : 17) * u)}px system-ui`;
    ctx.fillText(label, innerWidth / 2, y + h / 2);
    _pauseButtons.push({ id, x, y, w, h });
  });
  const speedY = startY + actions.length * (h + gap) + 24 * u,
    btnW = Math.min(76 * u, (w - 36 * u) / 4),
    btnH = (portrait ? 50 : 42) * u,
    totalW = btnW * 4 + 12 * u * 3,
    sx = innerWidth / 2 - totalW / 2;
  ctx.fillStyle = '#dbe7ff';
  ctx.font = `900 ${Math.round((portrait ? 16 : 14) * u)}px system-ui`;
  ctx.fillText('\u4e0b\u843d\u901f\u5ea6', innerWidth / 2, speedY - 16 * u);
  SPEEDS.forEach((s, i) => {
    const x = sx + i * (btnW + 12 * u),
      y = speedY,
      active = i === speedIndex;
    ctx.fillStyle = active ? 'rgba(140,255,193,.94)' : 'rgba(255,255,255,.18)';
    rr(x, y, btnW, btnH, btnH / 2);
    ctx.fill();
    ctx.fillStyle = active ? '#081022' : '#eef4ff';
    ctx.font = `950 ${Math.round((portrait ? 19 : 17) * u)}px system-ui`;
    ctx.fillText(s.name, x + btnW / 2, y + btnH / 2);
    _pauseButtons.push({ id: 'speed' + i, x, y, w: btnW, h: btnH });
  });
  ctx.restore();
}
function drawReadyOverlay(alpha = 1, progress = null) {
  if (state !== S.READY && state !== S.LEAD_IN) return;
  const p = progress ?? clamp((READY_TIME - readyTimer) / READY_TIME, 0, 1),
    tail = p > 0.76 ? clamp((p - 0.76) / 0.24, 0, 1) : 0,
    envelope = alpha * (1 - tail * (1 - READY_HANDOFF_ALPHA)),
    scan = p * 3.2 - 0.1,
    pal = themePalette();
  ctx.save();
  const laneH = view.hitY - view.laneTop + 80;
  [-1, 0, 1].forEach((lane, i) => {
    const phase = clamp(1 - Math.abs(scan - i) * 1.45, 0, 1),
      x = view.cx + lane * view.laneW * 0.22,
      glow = (0.035 + phase * 0.42) * envelope;
    ctx.globalAlpha = glow;
    ctx.fillStyle = pal.accent;
    rr(x - 23, view.laneTop + 18, 46, laneH - 36, 23);
    ctx.fill();
    ctx.globalAlpha = (0.08 + phase * 0.7) * envelope;
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.4 + phase * 2.1;
    ctx.beginPath();
    ctx.moveTo(x, view.laneTop + 28);
    ctx.lineTo(x, view.hitY + 48);
    ctx.stroke();
  });
  ctx.globalAlpha = (0.08 + 0.42 * Math.max(0, Math.sin(p * Math.PI * 3))) * envelope;
  ctx.strokeStyle = pal.gold;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(view.cx - view.laneW / 2 - 22, view.hitY);
  ctx.lineTo(view.cx + view.laneW / 2 + 22, view.hitY);
  ctx.stroke();
  ctx.restore();
}
function drawResumeCountdownOverlay() {
  if (state !== S.RESUME_COUNTDOWN) return;
  _pauseButtons = [];
  const u = view.uiScale || 1,
    num = Math.max(1, Math.ceil(resumeCountdown));
  ctx.save();
  ctx.fillStyle = 'rgba(3,5,14,.46)';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `950 ${Math.round(108 * u)}px system-ui`;
  ctx.lineWidth = Math.round(10 * u);
  ctx.strokeStyle = 'rgba(5,8,18,.72)';
  ctx.strokeText(String(num), innerWidth / 2, innerHeight * 0.5);
  ctx.fillStyle = themePalette().gold;
  ctx.fillText(String(num), innerWidth / 2, innerHeight * 0.5);
  ctx.restore();
}
function drawGameplayChrome(t = 0, warm = false) {
  drawThumbPad(warm);
  hud(t);
  drawPauseButton(warm);
}
export function drawFrame(RC) {
  _unpackRC(RC);
  perfStats.visibleNotes = 0;
  const t = songTime();
  if (state === S.READY) {
    bg();
    drawReadyOverlay();
    drawFx();
    drawGameplayChrome(0, true);
    return;
  }
  if (state === S.LEAD_IN) {
    const progress = leadInTotal ? clamp(1 - leadInTimer / leadInTotal, 0, 1) : 1,
      exitAlpha = READY_HANDOFF_ALPHA * (1 - clamp(progress / READY_EXIT_FADE, 0, 1)),
      noteAlpha = clamp(progress / 0.35, 0, 1);
    bg();
    ctx.save();
    ctx.globalAlpha = noteAlpha;
    drawVisibleNotes(t);
    ctx.restore();
    drawFx();
    if (exitAlpha > 0) drawReadyOverlay(exitAlpha, 1);
    drawGameplayChrome(t, true);
    return;
  }
  if (state === S.PAUSED) {
    bg();
    drawVisibleNotes(t);
    drawFx();
    hud(t);
    drawPauseOverlay();
    return;
  }
  if (state === S.RESUME_COUNTDOWN) {
    bg();
    drawVisibleNotes(t);
    drawFx();
    hud(t);
    drawResumeCountdownOverlay();
    return;
  }
  if (state !== S.PLAYING) {
    drawBaseBackdrop(true);
    return;
  }
  bg();
  drawVisibleNotes(t);
  drawFx();
  drawGameplayChrome(t, false);
}
