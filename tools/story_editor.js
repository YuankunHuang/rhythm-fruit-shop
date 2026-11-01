// Story editor: edits the day flows (data/flows/dayN.json) and the prologue (data/dialogue/prologue.json)
// in place and saves them through scripts/dev_server.py. Open it from the dev server:
// http://localhost:8080/tools/story_editor.html
import { formatStoryJson } from '../src/story/format.js';
import { PHASE_TYPES } from '../src/story/flow.js';

const FILES = [
  { path: 'data/dialogue/prologue.json', name: '序章' },
  ...Array.from({ length: 10 }, (_, i) => ({ path: `data/flows/day${i + 1}.json`, name: `第 ${i + 1} 天` })),
];
const TYPES = {
  dialogue: { name: '对话', color: 'var(--dialogue)' },
  service_select: { name: '点单', color: 'var(--select)' },
  service: { name: '服务', color: 'var(--service)' },
  score_branch: { name: '反应', color: 'var(--branch)' },
  track_event: { name: '曲目事件', color: 'var(--track)' },
  settlement: { name: '收工结算', color: 'var(--end)' },
  tutorial_complete: { name: '教学结束', color: 'var(--end)' },
};
const INPUTS = { swipe: '划', chop: '切', flow: '流' };
const ACTIONS = { '': '（台词）', startService: '开始服务', settlement: '去结算' };
const SLOTS = { day: '白天', dusk: '黄昏', night: '夜里' };
const BASE_SPEAKERS = ['', '你', '柚子', '系统', '订单'];

const $ = (id) => document.getElementById(id);
let songs = [],
  menus = [],
  file = null, // { path, name, data }
  dirty = false;

// Arrays and objects the editor creates so they can be edited. Empty ones are left out when saving,
// so opening and saving a file without edits changes nothing.
let created = new WeakMap();
function ensure(obj, key, init) {
  if (!(key in obj)) {
    obj[key] = init;
    if (!created.has(obj)) created.set(obj, new Set());
    created.get(obj).add(key);
  }
  return obj[key];
}
const isEmpty = (v) => (Array.isArray(v) ? !v.length : v && typeof v === 'object' && !Object.keys(v).length);
function prunedCopy(v) {
  if (Array.isArray(v)) return v.map(prunedCopy);
  if (!v || typeof v !== 'object') return v;
  const out = {},
    made = created.get(v);
  for (const [k, x] of Object.entries(v)) if (!(made && made.has(k) && isEmpty(x))) out[k] = prunedCopy(x);
  return out;
}

// ---------------------------------------------------------------- small DOM helpers
function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}
function markDirty() {
  if (!dirty) {
    dirty = true;
    showStatus();
  }
  scheduleChecks();
}
let checkTimer = 0;
function scheduleChecks() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(() => {
    renderIssues();
    renderOutline();
  }, 300);
}
function showStatus(msg) {
  const s = $('status');
  s.textContent = msg || (dirty ? '● 有未保存的修改' : '已保存');
  s.classList.toggle('dirty', dirty && !msg);
}
/** A text input bound to obj[key]; empty text removes the key when `optional`. */
function textInput(obj, key, { placeholder = '', width, optional = false, list, onChange } = {}) {
  const i = el('input', { value: obj[key] ?? '', placeholder, list, style: width ? `width:${width}` : '' });
  i.addEventListener('input', () => {
    if (optional && i.value === '') delete obj[key];
    else obj[key] = i.value;
    markDirty();
    onChange && onChange();
  });
  return i;
}
function numberInput(obj, key, { step = 1, width = '5em' } = {}) {
  const i = el('input', { type: 'number', step, value: obj[key] ?? '', style: `width:${width}` });
  i.addEventListener('input', () => {
    obj[key] = i.value === '' ? 0 : Number(i.value);
    markDirty();
  });
  return i;
}
/** A select bound to obj[key]; choosing '' removes the key when `optional`. */
function selectInput(obj, key, choices, { optional = false, onChange } = {}) {
  const s = el('select');
  const entries = Array.isArray(choices) ? choices.map((c) => [c, c]) : Object.entries(choices);
  const current = obj[key] ?? '';
  if (current !== '' && !entries.some(([v]) => v === current)) entries.push([current, current + '（未知）']);
  for (const [v, label] of entries) s.append(el('option', { value: v, selected: v === current }, label));
  s.addEventListener('change', () => {
    if (optional && s.value === '') delete obj[key];
    else obj[key] = s.value;
    markDirty();
    onChange && onChange();
  });
  return s;
}
function autoGrow(t) {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 2 + 'px';
}
function field(label, input) {
  return el('label', {}, label, input);
}
function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return false;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return true;
}
const songChoices = (kinds) => ({
  '': '（选曲目）',
  ...Object.fromEntries(
    songs
      .filter((s) => !kinds || kinds.includes(s.type))
      .map((s) => [s.id, `${s.title}${s.type === 'track' ? ' · 曲目' : ''}`]),
  ),
});

// ---------------------------------------------------------------- lines of dialogue
/** Edits an array of dialogue nodes in place; re-renders only itself on structural changes. */
function linesEditor(nodes) {
  const box = el('div');
  const render = () => {
    box.replaceChildren();
    nodes.forEach((n, i) => box.append(lineRow(nodes, i, render)));
    box.append(
      el(
        'div',
        { class: 'add-row' },
        el(
          'button',
          { onclick: () => (nodes.push({ speaker: '', text: '' }), markDirty(), render()) },
          '＋ 加一句',
        ),
      ),
    );
    box.querySelectorAll('textarea').forEach(autoGrow);
  };
  render();
  return box;
}
function lineRow(nodes, i, render) {
  const n = nodes[i];
  const row = el('div', { class: 'line' });
  const style = () => {
    row.classList.toggle('narration', !n.speaker && !n.action);
    row.classList.toggle('action', !!n.action);
  };
  const speaker = textInput(n, 'speaker', { placeholder: '旁白', list: 'speakers', onChange: style });
  const text = el('textarea', { rows: 1, placeholder: n.action ? '（可空）' : '台词或旁白' });
  text.value = n.text ?? '';
  text.addEventListener('input', () => {
    n.text = text.value;
    autoGrow(text);
    markDirty();
  });
  text.addEventListener('keydown', (e) => {
    // Ctrl+Enter: a new line below, same speaker.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      nodes.splice(i + 1, 0, { speaker: n.speaker || '', text: '' });
      markDirty();
      render.focus = i + 1;
      render();
    }
  });
  const extra = el(
    'div',
    {},
    textInput(n, 'expr', { placeholder: '表情', list: 'exprs', optional: true, width: '100%' }),
  );
  const action = selectInput(n, 'action', ACTIONS, { optional: true, onChange: style });
  action.title = '这一句之后发生什么';
  extra.append(action);
  action.style.width = '100%';
  const tools = el(
    'div',
    { class: 'tools' },
    el(
      'button',
      { class: 'icon', title: '上移', onclick: () => move(nodes, i, -1) && (markDirty(), render()) },
      '↑',
    ),
    el(
      'button',
      { class: 'icon', title: '下移', onclick: () => move(nodes, i, 1) && (markDirty(), render()) },
      '↓',
    ),
    el(
      'button',
      {
        class: 'icon',
        title: '在下面插一句',
        onclick: () => (nodes.splice(i + 1, 0, { speaker: '', text: '' }), markDirty(), render()),
      },
      '＋',
    ),
    el(
      'button',
      { class: 'icon', title: '删除这句', onclick: () => (nodes.splice(i, 1), markDirty(), render()) },
      '✕',
    ),
  );
  row.append(speaker, n.html !== undefined ? htmlEditor(n) : text, extra, tools);
  style();
  if (render.focus === i) {
    render.focus = null;
    requestAnimationFrame(() => text.focus());
  }
  return row;
}

// Order cards are lines whose html is <div class="order-card"><span>item</span><b>who</b><span>note</span></div>.
const ORDER_CARD =
  /^<div class="order-card"><span>([\s\S]*?)<\/span><b>([\s\S]*?)<\/b><span>([\s\S]*?)<\/span><\/div>$/;
const escHtml = (v) =>
  String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const unescHtml = (v) =>
  v
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
function orderCardParts(n) {
  const m = ORDER_CARD.exec(n.html || '');
  return m && m.slice(1).map(unescHtml);
}
/** An order card gets three fields; any other html is edited as raw html. */
function htmlEditor(n) {
  const parts = orderCardParts(n);
  if (!parts) {
    const raw = el('textarea', { rows: 1, title: 'html' });
    raw.value = n.html;
    raw.addEventListener('input', () => {
      n.html = raw.value;
      autoGrow(raw);
      markDirty();
    });
    return raw;
  }
  const values = [...parts];
  const box = el(
    'div',
    { class: 'fields', style: 'margin:0' },
    el('b', { style: 'color:var(--select)' }, '订单卡'),
  );
  ['品名', '客人', '一句话'].forEach((label, k) => {
    const i = el('input', {
      value: values[k],
      placeholder: label,
      style: k === 2 ? 'flex:1;min-width:12em' : 'width:7em',
    });
    i.addEventListener('input', () => {
      values[k] = i.value;
      n.html = `<div class="order-card"><span>${escHtml(values[0])}</span><b>${escHtml(values[1])}</b><span>${escHtml(values[2])}</span></div>`;
      markDirty();
    });
    box.append(i);
  });
  return box;
}

// ---------------------------------------------------------------- reaction branches
function branchesEditor(phase) {
  ensure(phase, 'branches', []);
  const box = el('div');
  const render = () => {
    box.replaceChildren();
    phase.branches.forEach((b, i) => {
      const styled = !!b.style;
      const head = el('div', { class: 'fields' });
      if (styled) {
        head.append(
          field('做法', selectInput(b, 'style', INPUTS)),
          field('占比 ≥', numberInput(b, 'minShare', { step: 0.05 })),
        );
      } else head.append(field('分数 ≥', numberInput(b, 'min')));
      head.append(
        field('备注', textInput(b, 'label', { optional: true, width: '12em' })),
        el(
          'button',
          {
            class: 'icon',
            title: '上移',
            onclick: () => move(phase.branches, i, -1) && (markDirty(), render()),
          },
          '↑',
        ),
        el(
          'button',
          {
            class: 'icon',
            title: '下移',
            onclick: () => move(phase.branches, i, 1) && (markDirty(), render()),
          },
          '↓',
        ),
        el(
          'button',
          {
            class: 'icon',
            title: '删除分支',
            onclick: () => (phase.branches.splice(i, 1), markDirty(), render()),
          },
          '✕',
        ),
      );
      ensure(b, 'nodes', []);
      box.append(el('div', { class: 'branch' + (styled ? ' styled' : '') }, head, linesEditor(b.nodes)));
    });
    box.append(
      el(
        'div',
        { class: 'add-row' },
        el(
          'button',
          { onclick: () => (phase.branches.push({ min: 0, nodes: [] }), markDirty(), render()) },
          '＋ 分数分支',
        ),
        el(
          'button',
          {
            onclick: () => (
              phase.branches.unshift({ style: 'chop', minShare: 0.5, nodes: [] }), markDirty(), render()
            ),
          },
          '＋ 做法分支',
        ),
        el(
          'span',
          { class: 'hint' },
          '做法分支先于分数分支判断：这一班里用这种做法完成的音符占比达到时使用。',
        ),
      ),
    );
  };
  render();
  return box;
}

// ---------------------------------------------------------------- service settings shared by service / select / track
function playFields(phase) {
  const box = el('div', { class: 'fields' });
  const hintField = field(
    '解锁提示',
    textInput(phase, 'unlockHint', { optional: true, width: '22em', placeholder: '留空用默认说明' }),
  );
  const showHint = () => hintField.classList.toggle('hidden', !phase.unlockInput);
  box.append(
    field(
      '解锁做法',
      selectInput(phase, 'unlockInput', { '': '无', ...INPUTS }, { optional: true, onChange: showHint }),
    ),
    hintField,
    field('谱面', selectInput(phase, 'chart', { '': '原谱', mechanize: '机械谱面' }, { optional: true })),
  );
  const limit = el('input', { type: 'checkbox', checked: Array.isArray(phase.inputs) });
  const boxes = el('span', {});
  const renderBoxes = () => {
    boxes.replaceChildren();
    if (!Array.isArray(phase.inputs)) return;
    for (const [m, name] of Object.entries(INPUTS)) {
      const c = el('input', { type: 'checkbox', checked: phase.inputs.includes(m) });
      c.addEventListener('change', () => {
        phase.inputs = Object.keys(INPUTS).filter((k) => (k === m ? c.checked : phase.inputs.includes(k)));
        markDirty();
      });
      boxes.append(el('label', {}, c, name));
    }
  };
  limit.addEventListener('change', () => {
    if (limit.checked) phase.inputs = [];
    else delete phase.inputs;
    markDirty();
    renderBoxes();
  });
  renderBoxes();
  box.append(
    el(
      'label',
      { title: '勾上后这一班只能用勾选的做法（都不勾 = 只能点和按）' },
      limit,
      '限制本班做法',
      boxes,
    ),
  );
  showHint();
  return box;
}

// ---------------------------------------------------------------- phases
function phaseBody(phase) {
  const body = el('div');
  const t = phase.type;
  if (t === 'dialogue') body.append(linesEditor(ensure(phase, 'nodes', [])));
  if (t === 'service') {
    body.append(
      el(
        'div',
        { class: 'fields' },
        field('曲目', selectInput(phase, 'songId', songChoices())),
        field('菜单', selectInput(phase, 'menuId', { '': '无', ...menus }, { optional: true })),
        field('时段', selectInput(phase, 'slotId', SLOTS, { optional: true })),
      ),
      playFields(phase),
    );
  }
  if (t === 'service_select') body.append(selectEditor(phase));
  if (t === 'score_branch') {
    body.append(
      el('div', { class: 'section-title' }, '按结果分支'),
      branchesEditor(phase),
      el('div', { class: 'section-title' }, '之后（所有分支都会接着说）'),
      linesEditor(ensure(phase, 'after', [])),
    );
  }
  if (t === 'track_event') {
    body.append(
      el(
        'div',
        { class: 'fields' },
        field('曲目', selectInput(phase, 'songId', songChoices())),
        field('人物', textInput(phase, 'vipName', { width: '6em', list: 'speakers' })),
        field('时段', selectInput(phase, 'slotId', SLOTS, { optional: true })),
      ),
      playFields(phase),
      el('div', { class: 'section-title' }, '开口请求'),
      linesEditor(ensure(phase, 'nodes_before', [])),
      el('div', { class: 'section-title' }, '按结果分支'),
      branchesEditor(phase),
      el('div', { class: 'section-title' }, '之后'),
      linesEditor(ensure(phase, 'after', [])),
    );
  }
  if (t === 'settlement' || t === 'tutorial_complete')
    body.append(
      el(
        'div',
        { class: 'hint' },
        t === 'settlement' ? '这一天在这里结算。' : '教学在这里结束，进入第一天的营业。',
      ),
    );
  return body;
}
function selectEditor(phase) {
  ensure(phase, 'options', []);
  ensure(phase, 'onWrong', {});
  const box = el('div');
  const render = () => {
    box.replaceChildren();
    const optionIds = Object.fromEntries(phase.options.map((o) => [o.songId, o.label || o.songId]));
    box.append(
      el(
        'div',
        { class: 'fields' },
        field('客人', textInput(phase, 'customer', { width: '6em', list: 'speakers' })),
        field('标题', textInput(phase, 'selectTitle', { optional: true, width: '12em' })),
        field('提示', textInput(phase, 'selectHint', { optional: true, width: '18em' })),
        field(
          '正确答案',
          selectInput(phase, 'correctId', { '': '（选）', ...optionIds }, { onChange: render }),
        ),
        field('菜单', selectInput(phase, 'menuId', { '': '无', ...menus }, { optional: true })),
        field('时段', selectInput(phase, 'slotId', SLOTS, { optional: true })),
      ),
      playFields(phase),
      el('div', { class: 'section-title' }, '可选的饮品'),
    );
    const table = el('table', { class: 'options' });
    phase.options.forEach((o, i) => {
      table.append(
        el(
          'tr',
          {},
          el('td', {}, selectInput(o, 'songId', songChoices(), { onChange: render })),
          el(
            'td',
            {},
            textInput(o, 'label', { placeholder: '菜单上的名字', width: '9em', onChange: scheduleChecks }),
          ),
          el('td', {}, textInput(o, 'hint', { placeholder: '一句提示', width: '16em', optional: true })),
          el(
            'td',
            {},
            el(
              'button',
              { class: 'icon', onclick: () => (phase.options.splice(i, 1), markDirty(), render()) },
              '✕',
            ),
          ),
        ),
      );
    });
    box.append(
      table,
      el(
        'div',
        { class: 'add-row' },
        el(
          'button',
          { onclick: () => (phase.options.push({ songId: '', label: '' }), markDirty(), render()) },
          '＋ 加一个选项',
        ),
      ),
      el('div', { class: 'section-title' }, '选错时的反应（没有单独写的用“其他”）'),
    );
    const wrongKeys = [
      ...phase.options.map((o) => o.songId).filter((id) => id && id !== phase.correctId),
      '_default',
    ];
    for (const k of new Set([...wrongKeys, ...Object.keys(phase.onWrong)])) {
      const name = k === '_default' ? '其他' : optionIds[k] || k;
      const has = Array.isArray(phase.onWrong[k]);
      const wrap = el('div', { class: 'branch' });
      wrap.append(
        el(
          'div',
          { class: 'fields' },
          el('b', {}, '选了「' + name + '」'),
          has
            ? el(
                'button',
                { class: 'icon', onclick: () => (delete phase.onWrong[k], markDirty(), render()) },
                '删掉这段',
              )
            : el(
                'button',
                { onclick: () => ((phase.onWrong[k] = [{ speaker: '', text: '' }]), markDirty(), render()) },
                '＋ 写一段',
              ),
        ),
      );
      if (has) wrap.append(linesEditor(phase.onWrong[k]));
      box.append(wrap);
    }
  };
  render();
  return box;
}
function phaseCard(phases, i, renderDoc) {
  const phase = phases[i];
  const type = TYPES[phase.type] || { name: phase.type, color: 'var(--bad)' };
  const card = el('div', { class: 'card', id: 'phase-' + i, style: `--c:${type.color}` });
  card.append(
    el(
      'div',
      { class: 'card-head' },
      el('span', { class: 'badge' }, type.name),
      textInput(phase, 'id', { onChange: scheduleChecks }),
      el('span', { class: 'spacer' }),
      el(
        'button',
        { class: 'icon', title: '上移', onclick: () => move(phases, i, -1) && (markDirty(), renderDoc()) },
        '↑',
      ),
      el(
        'button',
        { class: 'icon', title: '下移', onclick: () => move(phases, i, 1) && (markDirty(), renderDoc()) },
        '↓',
      ),
      el(
        'button',
        {
          class: 'icon',
          title: '删除这一段',
          onclick: () =>
            confirm(`删除「${type.name} ${phase.id || ''}」？`) &&
            (phases.splice(i, 1), markDirty(), renderDoc()),
        },
        '✕',
      ),
    ),
    phaseBody(phase),
    addPhaseRow(phases, i + 1, renderDoc),
  );
  return card;
}
function newPhase(type, phases) {
  const n = phases.filter((p) => p.type === type).length + 1;
  const id = `${type}_${n}`;
  if (type === 'dialogue') return { id, type, nodes: [{ speaker: '', text: '' }] };
  if (type === 'service') return { id, type, songId: '', slotId: 'day' };
  if (type === 'service_select')
    return { id, type, customer: '', correctId: '', slotId: 'day', options: [], onWrong: { _default: [] } };
  if (type === 'score_branch')
    return {
      id,
      type,
      variable: 'customer',
      branches: [
        { min: 88, nodes: [] },
        { min: 62, nodes: [] },
        { min: 0, nodes: [] },
      ],
      after: [],
    };
  if (type === 'track_event')
    return {
      id,
      type,
      songId: '',
      vipName: '',
      slotId: 'night',
      nodes_before: [],
      branches: [
        { min: 88, nodes: [] },
        { min: 0, nodes: [] },
      ],
      after: [],
    };
  return { id, type };
}
function addPhaseRow(phases, at, renderDoc) {
  const s = el('select', { title: '在这里插入一段' }, el('option', { value: '' }, '＋ 插入…'));
  for (const t of PHASE_TYPES) s.append(el('option', { value: t }, TYPES[t]?.name || t));
  s.addEventListener('change', () => {
    if (!s.value) return;
    phases.splice(at, 0, newPhase(s.value, phases));
    markDirty();
    renderDoc();
    requestAnimationFrame(() => $('phase-' + at)?.scrollIntoView({ block: 'center' }));
  });
  return el('div', { class: 'add-row', style: 'justify-content:flex-end' }, s);
}

// ---------------------------------------------------------------- documents
function renderDoc() {
  const doc = $('doc');
  doc.replaceChildren();
  const d = file.data;
  if (d.phases) {
    doc.append(
      el(
        'div',
        { class: 'card', style: '--c:var(--end)' },
        el('div', { class: 'fields' }, field('标题', textInput(d, 'title', { width: '10em' }))),
        addPhaseRow(d.phases, 0, renderDoc),
      ),
    );
    d.phases.forEach((_, i) => doc.append(phaseCard(d.phases, i, renderDoc)));
  } else {
    // The prologue: opening lines, then reactions to the first lemonade.
    const a = ensure(d, 'afterService', {}),
      b = ensure(a, 'branches', {});
    const sections = [
      ['开场', ensure(d, 'opening', [])],
      ['第一杯之后 · 打得好', ensure(b, 'good', [])],
      ['第一杯之后 · 一般', ensure(b, 'ok', [])],
      ['第一杯之后 · 打砸了', ensure(b, 'bad', [])],
      ['第一杯之后 · 都会接着说', ensure(a, 'shared', [])],
    ];
    sections.forEach(([name, nodes], i) =>
      doc.append(
        el(
          'div',
          { class: 'card', id: 'phase-' + i, style: '--c:var(--dialogue)' },
          el('div', { class: 'card-head' }, el('span', { class: 'badge' }, name)),
          linesEditor(nodes),
        ),
      ),
    );
  }
  refreshLists();
  renderOutline();
  renderIssues();
  if (!$('read').classList.contains('hidden')) renderRead();
}
function renderOutline() {
  const nav = $('outline');
  nav.replaceChildren(el('div', { class: 'section-title' }, file.name));
  const d = file.data;
  const items = d.phases
    ? d.phases.map((p, i) => [i, TYPES[p.type]?.name || p.type, p.customer || p.vipName || p.id || ''])
    : ['开场', '打得好', '一般', '打砸了', '都会接着说'].map((n, i) => [i, '对话', n]);
  for (const [i, tag, name] of items)
    nav.append(
      el(
        'a',
        {
          href: '#phase-' + i,
          onclick: (e) => (e.preventDefault(), $('phase-' + i)?.scrollIntoView({ block: 'start' })),
        },
        el('span', { class: 'tag' }, tag),
        name,
      ),
    );
}
function walkNodes(d, fn) {
  const visit = (nodes) => Array.isArray(nodes) && nodes.forEach(fn);
  if (d.phases)
    for (const p of d.phases) {
      visit(p.nodes);
      visit(p.nodes_before);
      visit(p.after);
      (p.branches || []).forEach((b) => visit(b.nodes));
      Object.values(p.onWrong || {}).forEach(visit);
    }
  else {
    visit(d.opening);
    Object.values(d.afterService?.branches || {}).forEach(visit);
    visit(d.afterService?.shared);
  }
}
function refreshLists() {
  const speakers = new Set(BASE_SPEAKERS),
    exprs = new Set([
      'neutral',
      'smile',
      'teasing',
      'deadpan',
      'annoyed',
      'serious',
      'relieved',
      'sigh',
      'panic',
    ]);
  walkNodes(file.data, (n) => {
    if (n.speaker) speakers.add(n.speaker);
    if (n.expr) exprs.add(n.expr);
  });
  $('speakers').replaceChildren(...[...speakers].filter(Boolean).map((s) => el('option', { value: s })));
  $('exprs').replaceChildren(...[...exprs].map((s) => el('option', { value: s })));
}

// ---------------------------------------------------------------- checks
function issues() {
  const out = [],
    d = file.data,
    songIds = new Set(songs.map((s) => s.id));
  if (!d.phases) {
    walkNodes(d, (n) => !n.text && !n.action && !n.html && out.push({ level: 'warn', msg: '有一句是空的' }));
    return out;
  }
  const seen = new Map();
  d.phases.forEach((p, i) => {
    const where = { at: i };
    const label = `${TYPES[p.type]?.name || p.type}「${p.id || '无 id'}」`;
    if (!PHASE_TYPES.includes(p.type)) out.push({ level: 'error', msg: `${label}：未知类型`, ...where });
    if (!p.id) out.push({ level: 'error', msg: `${label}：缺 id`, ...where });
    else if (seen.has(p.id))
      out.push({ level: 'error', msg: `${label}：id 和第 ${seen.get(p.id) + 1} 段重复`, ...where });
    else seen.set(p.id, i);
    if (['service', 'track_event'].includes(p.type) && !songIds.has(p.songId))
      out.push({ level: 'error', msg: `${label}：曲目「${p.songId || '空'}」不存在`, ...where });
    if (p.type === 'service_select') {
      if (!p.options?.length) out.push({ level: 'error', msg: `${label}：没有可选的饮品`, ...where });
      for (const o of p.options || [])
        if (!songIds.has(o.songId))
          out.push({ level: 'error', msg: `${label}：选项曲目「${o.songId || '空'}」不存在`, ...where });
      if (!(p.options || []).some((o) => o.songId === p.correctId))
        out.push({ level: 'error', msg: `${label}：正确答案不在选项里`, ...where });
    }
    if (
      ['score_branch', 'track_event'].includes(p.type) &&
      !(p.branches || []).some((b) => !b.style && b.min === 0)
    )
      out.push({ level: 'error', msg: `${label}：缺少“分数 ≥ 0”的兜底分支`, ...where });
    if (p.unlockInput && !INPUTS[p.unlockInput])
      out.push({ level: 'error', msg: `${label}：解锁做法「${p.unlockInput}」不认识`, ...where });
    let empty = 0;
    walkNodes({ phases: [p] }, (n) => !n.text && !n.action && !n.html && empty++);
    if (empty) out.push({ level: 'warn', msg: `${label}：${empty} 句是空的`, ...where });
  });
  return out;
}
function renderIssues() {
  const box = $('issues');
  box.replaceChildren(
    ...issues().map((x) =>
      el(
        'div',
        {
          class: x.level,
          onclick: () => x.at !== undefined && $('phase-' + x.at)?.scrollIntoView({ block: 'center' }),
        },
        (x.level === 'error' ? '✕ ' : '△ ') + x.msg,
      ),
    ),
  );
}

// ---------------------------------------------------------------- reading view
function renderRead() {
  const d = file.data,
    lines = [];
  const say = (nodes, indent = '') =>
    (nodes || []).forEach((n) =>
      lines.push(
        indent +
          (n.action ? `【${ACTIONS[n.action] || n.action}】` : '') +
          (n.speaker ? n.speaker + '：' : '') +
          (n.text || (orderCardParts(n) ? '【订单卡】' + orderCardParts(n).join(' / ') : '')),
      ),
    );
  if (d.phases)
    for (const p of d.phases) {
      const name = TYPES[p.type]?.name || p.type;
      lines.push(
        '',
        `—— ${name}${p.customer ? ' · ' + p.customer : ''}${p.vipName ? ' · ' + p.vipName : ''}${p.songId ? ' · ' + (songs.find((s) => s.id === p.songId)?.title || p.songId) : ''} ——`,
      );
      if (p.unlockInput) lines.push(`（这一班解锁：${INPUTS[p.unlockInput]}）`);
      say(p.nodes);
      say(p.nodes_before);
      if (p.options)
        lines.push(
          '  选项：' +
            p.options.map((o) => (o.songId === p.correctId ? '★' : '') + (o.label || o.songId)).join(' / '),
        );
      for (const b of p.branches || []) {
        lines.push(b.style ? `  [${INPUTS[b.style]}的占比 ≥ ${b.minShare ?? 0.5}]` : `  [分数 ≥ ${b.min}]`);
        say(b.nodes, '    ');
      }
      if (p.after?.length) {
        lines.push('  [之后]');
        say(p.after, '    ');
      }
    }
  else {
    lines.push('—— 开场 ——');
    say(d.opening);
    for (const [k, name] of [
      ['good', '打得好'],
      ['ok', '一般'],
      ['bad', '打砸了'],
    ]) {
      lines.push('', `—— 第一杯之后 · ${name} ——`);
      say(d.afterService?.branches?.[k]);
    }
    lines.push('', '—— 都会接着说 ——');
    say(d.afterService?.shared);
  }
  $('read').textContent = lines.join('\n').trim();
}

// ---------------------------------------------------------------- load and save
async function fetchJson(path) {
  const res = await fetch('../' + path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return JSON.parse((await res.text()).replace(/^﻿/, ''));
}
async function openFile(path) {
  const meta = FILES.find((f) => f.path === path);
  created = new WeakMap();
  file = { ...meta, data: await fetchJson(path) };
  dirty = false;
  showStatus();
  renderDoc();
  history.replaceState(null, '', '?file=' + encodeURIComponent(path));
}
async function save() {
  if (!file) return;
  const bad = issues().filter((x) => x.level === 'error');
  if (bad.length && !confirm(`还有 ${bad.length} 个错误，游戏可能读不了这个文件。仍然保存？`)) return;
  showStatus('保存中…');
  try {
    const res = await fetch('../' + file.path, {
      method: 'PUT',
      body: formatStoryJson(prunedCopy(file.data)),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(res.status + ' ' + (await res.text()).slice(0, 120));
    dirty = false;
    showStatus('已保存 ' + new Date().toLocaleTimeString());
  } catch (e) {
    showStatus('保存失败：' + e.message + '（需要用 scripts/dev_server.py 打开）');
  }
}

async function init() {
  for (const f of FILES) $('file').append(el('option', { value: f.path }, f.name));
  $('file').addEventListener('change', async (e) => {
    if (dirty && !confirm('当前文件有未保存的修改，丢弃并切换？')) {
      e.target.value = file.path;
      return;
    }
    await openFile(e.target.value);
  });
  $('saveButton').addEventListener('click', save);
  $('modeButton').addEventListener('click', () => {
    const reading = $('read').classList.toggle('hidden') === false;
    $('doc').classList.toggle('hidden', reading);
    $('modeButton').textContent = reading ? '编辑模式' : '阅读模式';
    if (reading) renderRead();
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save();
    }
  });
  addEventListener('beforeunload', (e) => {
    if (dirty) e.preventDefault();
  });
  songs = (await fetchJson('data/songs.json')).songs;
  menus = Object.fromEntries((await fetchJson('data/menu_items.json')).menuItems.map((m) => [m.id, m.name]));
  const wanted = new URLSearchParams(location.search).get('file');
  const start = FILES.some((f) => f.path === wanted) ? wanted : FILES[1].path;
  $('file').value = start;
  await openFile(start);
}
init().catch((e) => showStatus('加载失败：' + e.message));
