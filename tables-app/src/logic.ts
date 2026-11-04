import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEVEL_WEIGHTS = [50, 25, 13, 7, 5]; // chance of drawing from L1..L5
export const STREAK_TO_LEVEL_UP = [4, 3, 3, 2]; // fast-correct answers in a row to leave L1..L4
export const TIMEOUT_MS = 15000;
export const UP_TO_OPTIONS = [10, 12, 15, 20];

/** l: level 1-5, s: fast-correct streak, n: attempts, w: wrong, t: total ms of correct answers */
export type Fact = { l: number; s: number; n?: number; w?: number; t?: number };
export type Mastery = Record<string, Fact>;
export type Q = { a: number; b: number };
export type GameLog = { at: number; correct: number; total: number; points: number };
export type Settings = { tables: number[]; count: number; upTo: number; keypad: boolean; best: number; stars: number; history: GameLog[]; games: number; trophies: number[] };
export const DEFAULT_SETTINGS: Settings = { tables: range(1, 12), count: 25, upTo: 10, keypad: false, best: 0, stars: 0, history: [], games: 0, trophies: [] };

export function range(a: number, b: number) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
export const key = ({ a, b }: Q) => `${a}x${b}`;
export const fact = (m: Mastery, q: Q): Fact => m[key(q)] ?? { l: 1, s: 0 };
export const facts = (tables: number[], upTo: number): Q[] => tables.flatMap(a => range(1, upTo).map(b => ({ a, b })));
/** Time allowed for a "fast" answer: 3s up to 10×10, 5s when one side is over 10, 6s when both are. */
export const fastMs = ({ a, b }: Q) => [3000, 5000, 6000][+(a > 10) + +(b > 10)];

/** Storage read errors propagate (so callers don't overwrite real data); a corrupt value is kept aside and defaults used. */
async function load<T>(k: string, d: T): Promise<T> {
  const raw = await AsyncStorage.getItem(k);
  try { return { ...d, ...JSON.parse(raw ?? '{}') }; }
  catch { await AsyncStorage.setItem(`${k}.corrupt`, raw ?? ''); return d; }
}
const save = (k: string) => (v: object) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
export const loadMastery = () => load<Mastery>('mastery', {});
export const saveMastery = save('mastery');
export const loadSettings = () => load('settings', DEFAULT_SETTINGS).then(s => ({ ...s, games: Math.max(s.games, s.history.length) }));
export const saveSettings = save('settings');

/** Fast correct builds a streak (longer streaks needed at lower levels); slow correct resets it; wrong drops a level. */
export function grade(f: Fact, q: Q, correct: boolean, ms: number): Fact {
  const stats = { n: (f.n ?? 0) + 1, w: (f.w ?? 0) + +!correct, t: (f.t ?? 0) + (correct ? ms : 0) };
  if (!correct) return { ...stats, l: Math.max(1, f.l - 1), s: 0 };
  if (ms > fastMs(q)) return { ...stats, l: f.l, s: 0 };
  const s = f.s + 1;
  return { ...stats, ...(f.l < 5 && s >= STREAK_TO_LEVEL_UP[f.l - 1] ? { l: f.l + 1, s: 0 } : { l: f.l, s }) };
}

/** Pick a level by weight (empty levels skipped), then a random fact in it, avoiding `last`. */
export function pick(m: Mastery, all: Q[], last?: Q): Q {
  const pool = all.length > 1 && last ? all.filter(q => key(q) !== key(last)) : all;
  const byLevel = [1, 2, 3, 4, 5].map(l => pool.filter(q => fact(m, q).l === l));
  const total = byLevel.reduce((t, qs, i) => t + (qs.length ? LEVEL_WEIGHTS[i] : 0), 0);
  let r = Math.random() * total;
  const qs = byLevel.find((qs, i) => qs.length && (r -= LEVEL_WEIGHTS[i]) < 0) ?? pool;
  return qs[Math.floor(Math.random() * qs.length)];
}

/** Grand prizes, unlocked by holding every trophy in `tables`. */
export const GRANDS = [
  { id: 'grand1', name: 'Times Tables Champion', icon: '👑', tables: range(1, 12) },
  { id: 'grand2', name: 'Legend of Tables', icon: '🐉', tables: range(1, 20) },
];
export type Grand = (typeof GRANDS)[number];

/** Dragons so far in table `a` (out of `upTo`); a trophy is earned when all are dragons. */
export const dragons = (m: Mastery, a: number, upTo: number) => facts([a], upTo).filter(q => fact(m, q).l === 5).length;
/** Trophies newly earned from mastery `m`, and grand prizes they complete. Earned trophies are never taken away. */
export function unlocks(m: Mastery, upTo: number, have: number[]) {
  const fresh = range(1, 20).filter(a => !have.includes(a) && dragons(m, a, upTo) === upTo);
  const all = [...have, ...fresh];
  const grands = GRANDS.filter(g => g.tables.every(a => all.includes(a)) && !g.tables.every(a => have.includes(a)));
  return { fresh, grands, all };
}

/** Points for a correct answer: 10, +5 if fast, +2 per combo step (capped). */
export const points = (q: Q, ms: number, combo: number) => 10 + (ms <= fastMs(q) ? 5 : 0) + 2 * Math.min(combo, 10);

const ONES: Record<string, number> = {
  zero: 0, oh: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3, four: 4, for: 4, five: 5, six: 6,
  seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

const WEAK = new Set(['oh', 'won', 'to', 'too', 'for', 'ate', 'tree']); // number-like everyday words

/** Last number spoken in a transcript, e.g. "7 times 8 is fifty six" → 56. Lone everyday words ("for sure") count only if nothing else does. */
export function parseNumber(text: string): number | null {
  const nums: { n: number; weak: boolean }[] = [];
  let cur: number | null = null, weak = false;
  const flush = () => { if (cur !== null) nums.push({ n: cur, weak }); cur = null; weak = false; };
  for (const w of text.toLowerCase().replace(/-/g, ' ').split(/[^a-z0-9]+/).filter(Boolean)) {
    if (/^\d+$/.test(w)) { flush(); nums.push({ n: +w, weak: false }); }
    else if (w === 'hundred') { cur = (cur || 1) * 100; weak = false; }
    else if (w === 'and' && cur !== null) continue;
    else if (w in TENS || w in ONES) {
      const v = TENS[w] ?? ONES[w], r = (cur ?? 0) % 100;
      if (cur !== null && cur >= 1 && cur <= 4 && !weak && w in TENS) cur *= 100; // "one twenty" = 120
      else if (!(cur !== null && (cur >= 100 && r === 0 || r >= 20 && r % 10 === 0 && v < 10))) flush();
      weak = cur === null && WEAK.has(w);
      cur = (cur ?? 0) + v;
    }
    else flush();
  }
  flush();
  const strong = nums.filter(x => !x.weak), pick = strong.length ? strong : nums;
  return pick.length ? pick[pick.length - 1].n : null;
}
