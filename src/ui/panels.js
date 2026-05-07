// Panel / modal management and toast notifications.
// C++ equivalent: UIManager class with a panel stack and modal queue.

const $ = (id) => document.getElementById(id);

// ── Toast ─────────────────────────────────────────────────────────────────────
let _toastTimer = 0;
export function showToast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Panel manager factory ─────────────────────────────────────────────────────
// Returns the UI object. Call once after DOM is ready.
// C++ equivalent: UIManager::Init(overlayWidget)
export function createPanelManager(overlay) {
  let _currentScreen = '';
  let _serial = 0;          // increments on every screen change (used by tutorial positioning)

  const mgr = {
    screens: [
      'homePanel', 'savePanel', 'flowPanel', 'menuEditPanel',
      'dayOverviewPanel', 'songPanel', 'resultPanel',
      'upgradePanel', 'settingsPanel',
    ],
    modals: ['resetConfirmModal', 'resultPhotoModal', 'resourceIntroModal'],
    stack: [],
    modalStack: [],

    /** Read-only: increments when the displayed screen changes. */
    get serial() { return _serial; },

    showOnly(id) {
      if (_currentScreen !== id) { _currentScreen = id; _serial++; }
      this.screens.forEach(pid => $(pid)?.classList.toggle('hidden', pid !== id));
      overlay.classList.add('overlay-shell-active');
      overlay.style.pointerEvents = 'auto';
      const onHome = id === 'homePanel';
      overlay.classList.toggle('overlay-home', onHome);
      const room = document.getElementById('homeRoomBackdrop');
      if (room) room.classList.toggle('hidden', !onHome);
    },

    /** 所有注册面板隐藏（开场-only、尚未 root(home) 时关闭设置等）。 */
    showNone() {
      if (_currentScreen !== '') { _currentScreen = ''; _serial++; }
      this.screens.forEach(pid => $(pid)?.classList.add('hidden'));
      overlay.classList.add('overlay-shell-active');
      overlay.style.pointerEvents = 'auto';
      overlay.classList.remove('overlay-home');
      const room = document.getElementById('homeRoomBackdrop');
      if (room) room.classList.add('hidden');
    },

    root(id)    { this.stack = [id]; this.showOnly(id); },

    replace(id) {
      if (this.stack.length) this.stack[this.stack.length - 1] = id;
      else this.stack = [id];
      this.showOnly(id);
    },

    push(id) {
      if (this.stack[this.stack.length - 1] !== id) this.stack.push(id);
      this.showOnly(id);
    },

    back(fallback = 'homePanel') {
      if (this.stack.length > 1) {
        this.stack.pop();
      } else if (this.stack.length === 1) {
        this.stack.pop();
        this.showNone();
        return '';
      } else {
        this.stack = [fallback];
      }
      const id = this.stack[this.stack.length - 1] || fallback;
      this.showOnly(id);
      return id;
    },

    clear() {
      this.screens.forEach(id => $(id)?.classList.add('hidden'));
      this.modalStack.slice().forEach(id => this.closeModal(id));
      this.stack = [];
      overlay.classList.remove('overlay-shell-active');
      overlay.classList.remove('overlay-home');
      overlay.style.pointerEvents = 'none';
      const room = document.getElementById('homeRoomBackdrop');
      if (room) room.classList.add('hidden');
    },

    openModal(id) {
      const el = $(id);
      if (!el) return;
      if (!this.modalStack.includes(id)) this.modalStack.push(id);
      el.classList.remove('hidden');
    },

    closeModal(id = null) {
      const target = id || this.modalStack[this.modalStack.length - 1];
      const el = target && $(target);
      if (!target || !el) return null;
      el.classList.add('hidden');
      this.modalStack = this.modalStack.filter(x => x !== target);
      return target;
    },

    closeTopModal() { return this.closeModal(); },
  };

  return mgr;
}
