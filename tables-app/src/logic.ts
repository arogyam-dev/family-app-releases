import AsyncStorage from '@react-native-async-storage/async-storage';

export const LEVEL_WEIGHTS = [50, 25, 13, 7, 5]; // chance of drawing from L1..L5
export const STREAK_TO_LEVEL_UP = [4, 3, 3, 2]; // fast-correct answers in a row to leave L1..L4
export const TIMEOUT_MS = 15000;
export const UP_TO_OPTIONS = [10, 12, 15, 20];

export type Fact = { l: number; s: number }; // level 1-5, fast-correct streak
export type Mastery = Record<string, Fact>;
export type Q = { a: number; b: number };
export type Settings = { tables: number[]; count: number; upTo: number; keypad: boolean; best: number; stars: number };
export const DEFAULT_SETTINGS: Settings = { tables: range(1, 12), count: 25, upTo: 10, keypad: false, best: 0, stars: 0 };

export function range(a: number, b: number) { return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
export const key = ({ a, b }: Q) => `${a}x${b}`;
export const fact = (m: Mastery, q: Q): Fact => m[key(q)] ?? { l: 1, s: 0 };
export const facts = (tables: number[], upTo: number): Q[] => tables.flatMap(a => range(1, upTo).map(b => ({ a, b })));
/** Time allowed for a "fast" answer: 3s up to 10×10, 5s when one side is over 10, 6s when both are. */
export const fastMs = ({ a, b }: Q) => [3000, 5000, 6000][+(a > 10) + +(b > 10)];

const load = async <T,>(k: string, d: T): Promise<T> => ({ ...d, ...JSON.parse((await AsyncStorage.getItem(k)) ?? '{}') });
const save = (k: string) => (v: object) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});
export const loadMastery = () => load<Mastery>('mastery', {});
export const saveMastery = save('mastery');
export const loadSettings = () => load('settings', DEFAULT_SETTINGS);
export const saveSettings = save('settings');

/** Fast correct builds a streak (longer streaks needed at lower levels); slow correct resets it; wrong drops a level. */
export function grade(f: Fact, q: Q, correct: boolean, ms: number): Fact {
  if (!correct) return { l: Math.max(1, f.l - 1), s: 0 };
  if (ms > fastMs(q)) return { l: f.l, s: 0 };
  const s = f.s + 1;
  return f.l < 5 && s >= STREAK_TO_LEVEL_UP[f.l - 1] ? { l: f.l + 1, s: 0 } : { l: f.l, s };
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

/** Points for a correct answer: 10, +5 if fast, +2 per combo step (capped). */
export const points = (q: Q, ms: number, combo: number) => 10 + (ms <= fastMs(q) ? 5 : 0) + 2 * Math.min(combo, 10);

const ONES: Record<string, number> = {
  zero: 0, oh: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, tree: 3, four: 4, for: 4, five: 5, six: 6,
  seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** Last number spoken in a transcript, e.g. "7 times 8 is fifty six" → 56. */
export function parseNumber(text: string): number | null {
  const nums: number[] = [];
  let cur: number | null = null;
  const flush = () => { if (cur !== null) nums.push(cur); cur = null; };
  for (const w of text.toLowerCase().replace(/-/g, ' ').split(/[^a-z0-9]+/).filter(Boolean)) {
    if (/^\d+$/.test(w)) { flush(); nums.push(+w); }
    else if (w === 'hundred') cur = (cur || 1) * 100;
    else if (w === 'and' && cur !== null) continue;
    else if (w in TENS || w in ONES) {
      const v = TENS[w] ?? ONES[w];
      const r = (cur ?? 0) % 100;
      const joins = cur !== null && (cur >= 100 && r === 0 || r >= 20 && r % 10 === 0 && v < 10);
      if (!joins) flush();
      cur = (cur ?? 0) + v;
    }
    else flush();
  }
  flush();
  return nums.length ? nums[nums.length - 1] : null;
}
