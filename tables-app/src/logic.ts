import AsyncStorage from '@react-native-async-storage/async-storage';

export const MAX_MULT = 10;
export const LEVEL_WEIGHTS = [50, 25, 13, 7, 5]; // L1..L5
export const TIMEOUT_MS = 10000;

export type Fact = { l: number; s: number }; // level 1-5, fast-correct streak
export type Mastery = Record<string, Fact>;
export type Q = { a: number; b: number };

export const key = ({ a, b }: Q) => `${a}x${b}`;
export const fact = (m: Mastery, q: Q): Fact => m[key(q)] ?? { l: 1, s: 0 };
const fastMs = ({ a, b }: Q) => (a > 10 || b > 10 ? 4500 : 3000);

const STORE = 'mastery';
export const loadMastery = async (): Promise<Mastery> => JSON.parse((await AsyncStorage.getItem(STORE)) ?? '{}');
export const saveMastery = (m: Mastery) => AsyncStorage.setItem(STORE, JSON.stringify(m));

/** Fast correct builds a streak (2 to level up, 3 for 4→5); slow correct resets it; wrong drops a level. */
export function grade(f: Fact, q: Q, correct: boolean, ms: number): Fact {
  if (!correct) return { l: Math.max(1, f.l - 1), s: 0 };
  if (ms > fastMs(q)) return { l: f.l, s: 0 };
  const s = f.s + 1;
  return s >= (f.l >= 4 ? 3 : 2) && f.l < 5 ? { l: f.l + 1, s: 0 } : { l: f.l, s };
}

/** Pick a level by weight (empty levels skipped), then a random fact in it, avoiding `last`. */
export function pick(m: Mastery, tables: number[], last?: Q): Q {
  const all = tables.flatMap(a => Array.from({ length: MAX_MULT }, (_, i) => ({ a, b: i + 1 })));
  const pool = all.length > 1 && last ? all.filter(q => key(q) !== key(last)) : all;
  const byLevel = [1, 2, 3, 4, 5].map(l => pool.filter(q => fact(m, q).l === l));
  const total = byLevel.reduce((t, qs, i) => t + (qs.length ? LEVEL_WEIGHTS[i] : 0), 0);
  let r = Math.random() * total;
  const qs = byLevel.find((qs, i) => qs.length && (r -= LEVEL_WEIGHTS[i]) < 0) ?? pool;
  return qs[Math.floor(Math.random() * qs.length)];
}

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
