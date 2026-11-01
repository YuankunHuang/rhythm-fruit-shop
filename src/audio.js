// Web Audio SFX engine + gain helpers.
// C++ equivalent: SfxSystem with an AudioContext and named gain bus hierarchy.

const AUDIO_GAIN = {
  master: 1,
  gameplayMusic: 0.9,
  preview: 0.5,
  menuHome: 0.32,
  menuSub: 0.22,
  uiSfx: 1,
  gameplaySfx: 0.62,
  resultSfx: 1,
};

export function audioGain(kind) {
  return Math.max(0, Math.min(1, (AUDIO_GAIN.master ?? 1) * (AUDIO_GAIN[kind] ?? 1)));
}

// ── SFX state ────────────────────────────────────────────────────────────────
let _ctx = null,
  _master = null,
  _uiBus = null,
  _gameplayBus = null,
  _resultBus = null,
  _routeName = '',
  _last = {};
// Live-exported binding: preview audio in main.js connects to this bus.
export let sfxPreviewBus = null;

const SFX_GAMEPLAY = new Set(['judge', 'miss', 'hold.tick', 'hold.complete', 'combo', 'order.complete']);

let _gameplayNoteSfxEnabled = false;

/** 是否播放打歌过程中的音符相关音效（判定 / Miss / 长按等）；默认关。 */
export function setGameplayNoteSfxEnabled(on) {
  _gameplayNoteSfxEnabled = !!on;
}

export function sfxContext() {
  if (!_ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC({ latencyHint: 'interactive' });
    _master = _ctx.createGain();
    _uiBus = _ctx.createGain();
    _gameplayBus = _ctx.createGain();
    _resultBus = _ctx.createGain();
    sfxPreviewBus = _ctx.createGain();
    _master.gain.value = 1;
    _uiBus.gain.value = audioGain('uiSfx');
    _gameplayBus.gain.value = audioGain('gameplaySfx');
    _resultBus.gain.value = audioGain('resultSfx');
    sfxPreviewBus.gain.value = 1;
    _uiBus.connect(_master);
    _gameplayBus.connect(_master);
    _resultBus.connect(_master);
    _master.connect(_ctx.destination);
    sfxPreviewBus.connect(_ctx.destination);
  }
  return _ctx;
}

export function unlockSfx() {
  const c = sfxContext();
  if (!c) return Promise.resolve(null);
  if (c.state === 'suspended') return c.resume().catch(() => {});
  return Promise.resolve(c);
}

function _out() {
  const c = sfxContext();
  if (!c) return null;
  if (_routeName.startsWith('result.')) return _resultBus || _master;
  if (_routeName.startsWith('ui.')) return _uiBus || _master;
  if (_routeName.startsWith('game.') || SFX_GAMEPLAY.has(_routeName)) return _gameplayBus || _master;
  return _uiBus || _master || c.destination;
}

function _tone(freq, dur = 0.08, type = 'sine', gain = 0.08, delay = 0, endFreq = 0) {
  const c = sfxContext(),
    out = _out();
  if (!c || !out) return;
  const t = c.currentTime + delay,
    o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + dur + 0.04);
}

function _noise(dur = 0.08, gain = 0.08, delay = 0, filterFreq = 1800) {
  const c = sfxContext(),
    out = _out();
  if (!c || !out) return;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate),
    data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(),
    filter = c.createBiquadFilter(),
    g = c.createGain();
  const t = c.currentTime + delay;
  src.buffer = buf;
  filter.type = 'highpass';
  filter.frequency.value = filterFreq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t);
}

function _schedule(name, detail = '') {
  _routeName = name;
  if (name === 'ui.click') {
    _tone(620, 0.06, 'square', 0.13, 0, 980);
    _tone(1240, 0.045, 'triangle', 0.08, 0.018);
  } else if (name === 'ui.select') {
    _tone(520, 0.07, 'triangle', 0.12, 0, 780);
  } else if (name === 'ui.back') {
    _tone(420, 0.08, 'triangle', 0.1, 0, 260);
  } else if (name === 'game.start') {
    _tone(440, 0.08, 'triangle', 0.13, 0, 660);
    _tone(880, 0.13, 'triangle', 0.11, 0.075, 1320);
  } else if (name === 'game.pause') {
    _tone(520, 0.07, 'sine', 0.11, 0, 300);
  } else if (name === 'game.resume') {
    _tone(360, 0.065, 'sine', 0.11, 0, 620);
  } else if (name === 'judge') {
    const m = {
      Perfect: [820, 1120, 0.034],
      Great: [680, 940, 0.026],
      Good: [520, 660, 0.018],
    }[detail] || [440, 560, 0.015];
    _tone(m[0], 0.036, 'sine', m[2], 0, m[1]);
    if (detail === 'Perfect' || detail === 'Great')
      _tone(m[1], 0.028, 'sine', m[2] * 0.35, 0.012, m[1] * 0.92);
  } else if (name === 'miss') {
    _noise(0.11, 0.075, 0, 550);
    _tone(220, 0.12, 'sawtooth', 0.048, 0, 95);
  } else if (name === 'hold.tick') {
    _tone(560, 0.028, 'sine', 0.022, 0, 615);
  } else if (name === 'hold.complete') {
    _tone(590, 0.065, 'sine', 0.055, 0, 840);
    _tone(980, 0.08, 'sine', 0.034, 0.038);
  } else if (name === 'combo') {
    _tone(660, 0.055, 'sine', 0.055, 0, 940);
    _tone(1120, 0.09, 'sine', 0.04, 0.042);
  } else if (name === 'order.complete') {
    _tone(620, 0.065, 'sine', 0.055, 0, 880);
    _tone(910, 0.075, 'sine', 0.048, 0.038, 1180);
    _tone(1180, 0.1, 'sine', 0.034, 0.085);
  } else if (name === 'result.tick') {
    _tone(1100, 0.04, 'triangle', 0.12, 0, 1320);
  } else if (name === 'result.done') {
    _tone(523, 0.1, 'triangle', 0.14, 0, 784);
    _tone(1046, 0.16, 'sine', 0.12, 0.08);
  }
}

export function sfxPlay(name, detail = '') {
  if (SFX_GAMEPLAY.has(name) && !_gameplayNoteSfxEnabled) return;
  const now = performance.now(),
    key = name + detail;
  if (now - (_last[key] || 0) < 22) return;
  _last[key] = now;
  const c = sfxContext();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume()
      .then(() => _schedule(name, detail))
      .catch(() => {});
    return;
  }
  _schedule(name, detail);
}
