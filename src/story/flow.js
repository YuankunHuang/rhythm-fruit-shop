// Story flow: the phase cursor, score branches and boss-letter placement. No DOM.
// A day flow is { phases: [...] }; phase types are listed in PHASE_TYPES.

export const PHASE_TYPES = [
  'dialogue',
  'service',
  'service_select',
  'track_event',
  'score_branch',
  'tutorial_complete',
  'settlement',
];

/** Position in the current day's phases. take() hands out the next phase and advances. */
export class FlowCursor {
  constructor() {
    this.stop();
  }
  start(phases) {
    this.phases = phases;
    this.index = 0;
    this.active = true;
  }
  take() {
    return this.phases[this.index++];
  }
  get finished() {
    return !this.active || this.index >= this.phases.length;
  }
  stop() {
    this.phases = [];
    this.index = 0;
    this.active = false;
  }
}

/** Nodes for a score_branch phase: the highest branch whose min the score reaches, then `after`. */
/**
 * The reaction branch for a result. A branch with `style` wins when that way of playing finished at
 * least `minShare` (default 0.5) of the notes; otherwise the highest score band reached.
 */
export function pickBranch(branches = [], score, styleShares = {}) {
  const styled = branches.find((b) => b.style && (styleShares[b.style] || 0) >= (b.minShare ?? 0.5));
  if (styled) return styled;
  return branches
    .filter((b) => !b.style)
    .sort((a, b) => b.min - a.min)
    .find((b) => score >= b.min);
}

export function scoreBranchNodes(phase, score, styleShares) {
  const branch = pickBranch(phase.branches, score, styleShares);
  return [...(branch ? branch.nodes : []), ...(phase.after || [])];
}

const MADE_STYLES = ['swipe', 'chop', 'flow'];

/** How a result was made: the new way of playing that finished at least half the notes, else plain 'tap'. */
export function dominantStyle(styleShares = {}) {
  return MADE_STYLES.find((st) => (styleShares[st] || 0) >= 0.5) || 'tap';
}

/** Score band name: good >= 88, ok >= 62, otherwise bad. */
export function band(score) {
  return score >= 88 ? 'good' : score >= 62 ? 'ok' : 'bad';
}

const banded = (entry, score) => (Array.isArray(entry) ? entry : (entry && entry[band(score)]) || []);

/**
 * A layered reaction, for phases that use `byDrink` / `byStyle`; others fall back to scoreBranchNodes.
 * Layers play in order: what the customer says about the drink they got when it is not the one they
 * asked for (`byDrink[served]`), how it was made (`byStyle[tap|swipe|chop|flow]`), the score band,
 * then `after`. A wrong drink's entry takes the place of the band layer: "it came out well" means
 * little about a drink nobody ordered. Any layer may be an array, or banded as { good, ok, bad }.
 * ctx: { score, styleShares, served, wanted } (served/wanted are song ids; missing means as ordered).
 */
export function reactionNodes(phase, ctx = {}) {
  const score = ctx.score || 0;
  if (!phase.byDrink && !phase.byStyle) return scoreBranchNodes(phase, score, ctx.styleShares);
  const wrong = ctx.served && ctx.wanted && ctx.served !== ctx.wanted;
  const drinkLayer = wrong ? banded(phase.byDrink && (phase.byDrink[ctx.served] || phase.byDrink._default), score) : [];
  const styleLayer = banded(phase.byStyle && phase.byStyle[dominantStyle(ctx.styleShares)], score);
  const bandLayer = wrong ? [] : (pickBranch((phase.branches || []).filter((b) => !b.style), score) || {}).nodes || [];
  return [...drinkLayer, ...styleLayer, ...bandLayer, ...(phase.after || [])];
}

/** Customer score bands used by the prologue: good >= 88, ok >= 62. No result (null) counts as good. */
export function serviceBranch(customer) {
  if (customer === null) return 'good';
  return customer >= 88 ? 'good' : customer >= 62 ? 'ok' : 'bad';
}

export function afterServiceNodes(data, branch) {
  const branches = (data && data.branches) || {},
    lines = branches[branch] || branches.ok || branches.good || [];
  return [...lines, ...((data && data.shared) || [])];
}

// ── Boss letters ──────────────────────────────────────────────────────────────
// ctx: { day, reputation, shopLevel, rentDaysLeft, seen: string[] }

export function matchMilestone(m, ctx) {
  if (!m || !m.type) return false;
  if (m.type === 'rent_days_left_eq') return ctx.rentDaysLeft === +m.value;
  if (m.type === 'shop_level_gte') return ctx.shopLevel >= +m.value;
  if (m.type === 'reputation_gte') return ctx.reputation >= +m.value;
  if (m.type === 'no_boss_letters_seen') return ctx.seen.length === 0;
  if (m.type === 'day_gte') return ctx.day >= +m.value;
  if (m.type === 'day_eq') return ctx.day === +m.value;
  return false;
}

export function letterPlacement(letter) {
  return (letter && letter.placement && letter.placement.type) || 'day_start';
}

/** Unseen letter for this placement whose milestone is met, lowest priority number first. */
export function pickLetter(letters, placement, ctx) {
  const seen = new Set(ctx.seen);
  let best = null;
  for (const L of letters) {
    if (seen.has(L.id) || !matchMilestone(L.milestone, ctx) || letterPlacement(L) !== placement) continue;
    if (!best || L.priority < best.priority) best = L;
  }
  return best;
}

// How the letter reaches you, per delivery style and where it lands in the day.
const DELIVERY_LINES = {
  after_home: {
    postman_knock:
      '门被敲了两下。你拉开门缝，外面的脚步声已经走远——指缝里却多了一只薄信封，像被人故意卡在门板上。',
    yuzu_hands_you: '正要锁门，柚子把信封推过来：「我读过了。你该读你的。」',
    mailbox: '临走前，你看到门口的桌上安安静静躺着一只信封。没有邮戳。',
    plain: '收工前，台面角落那封信等了你整整一天。',
  },
  flow_after_phase: {
    postman_knock: '店门轻轻一响，像有人屈指敲了两记。推门只见门槛上立着一封白信封，风还没把它刮跑。',
    yuzu_hands_you: '柚子从侧门进来，二话不说把一封信压在你面前：「对方不想打电话。他们想让你读纸。」',
    mailbox: '你的眼睛先一步看见了台面——不知何时多了一只信封，角上折得过分整齐。',
    plain: '周围安静下来。那封信却像一直在等你抬头。',
  },
  flow_start: {
    postman_knock: '你刚把店门开了条缝，邮差把信往信箱口一塞，像逃班一样转身就跑。',
    yuzu_hands_you: '柚子进店的第一件事，是把一只信封拍在吧台上：「别问，先读。」',
    mailbox: '开店前你从信箱口抽出一张纸：寄件栏缺了半截，却印着你们店的编号——像有人专门练过怎么让你不安。',
    plain: '开业前你把台面擦过一遍，却在秤盘阴影里摸到一封信，压得平平整整。',
  },
};

/** Delivery line plus the letter card. The first letter ever always arrives by mailbox. */
export function letterNodes(letter, position, firstEver, bodyHtml) {
  const d = letter.delivery || 'plain_read',
    lines = DELIVERY_LINES[position] || DELIVERY_LINES.flow_start,
    style =
      d === 'postman_knock' || d === 'yuzu_hands_you'
        ? d
        : d === 'mailbox_intro' || firstEver
          ? 'mailbox'
          : 'plain';
  return [{ text: lines[style] }, { html: bodyHtml(letter) }];
}

export function letterPhase(letter, position, firstEver, bodyHtml) {
  return {
    type: 'dialogue',
    id: '__boss_' + letter.id,
    bossLetterId: letter.id,
    nodes: letterNodes(letter, position, firstEver, bodyHtml),
  };
}

/**
 * The day's phases with boss letters inserted: one day_start letter at the head and at most one
 * after_flow_phase letter right after its anchor phase.
 */
export function insertBossLetters(flow, letters, ctx, bodyHtml, warn = console.warn) {
  if (!flow || !Array.isArray(flow.phases)) return flow;
  const phases = flow.phases.slice(),
    ids = new Set(phases.map((p) => p.id).filter(Boolean)),
    firstEver = ctx.seen.length === 0,
    head = [];
  const opening = pickLetter(letters, 'day_start', ctx);
  if (opening) head.push(letterPhase(opening, 'flow_start', firstEver, bodyHtml));
  const seen = new Set(ctx.seen);
  const afterPool = letters
    .filter(
      (L) => letterPlacement(L) === 'after_flow_phase' && !seen.has(L.id) && matchMilestone(L.milestone, ctx),
    )
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  for (const L of afterPool) {
    const anchor = L.placement && L.placement.afterPhaseId;
    if (!anchor) {
      warn('[bossLetter] after_flow_phase missing afterPhaseId', L.id);
      continue;
    }
    if (!ids.has(anchor)) {
      warn('[bossLetter] after_flow_phase: phase id not in day flow', {
        letterId: L.id,
        afterPhaseId: anchor,
        day: ctx.day,
      });
      continue;
    }
    phases.splice(
      phases.findIndex((p) => p.id === anchor) + 1,
      0,
      letterPhase(L, 'flow_after_phase', firstEver, bodyHtml),
    );
    break;
  }
  return { ...flow, phases: head.concat(phases) };
}
