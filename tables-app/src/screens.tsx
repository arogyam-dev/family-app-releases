import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fact, facts, Mastery, Q, range, Settings, UP_TO_OPTIONS } from './logic';
import { say, sfx } from './sound';
import { Btn, C, Confetti, LEVEL_COLORS, LEVEL_NAMES, Pop, Screen, T, Tile } from './ui';

export type Result = { q: Q; correct: boolean; ms: number; from: number; to: number };
export type GameSummary = { results: Result[]; points: number; best: boolean; stars: number };

const emoji = (l: number) => LEVEL_NAMES[l - 1].split(' ')[1];

export function Splash({ onDone }: { onDone: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    say('welcome');
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen bg={C.primary}>
      <Animated.View style={[s.center, { opacity: v, transform: [{ scale: v }] }]}>
        <T style={{ fontSize: 110 }}>🦉</T>
        <T bold style={s.splash}>Welcome to Tables</T>
      </Animated.View>
      <Confetti />
    </Screen>
  );
}

export function Home({ mastery, settings, onView, onPlay }: { mastery: Mastery; settings: Settings; onView: () => void; onPlay: () => void }) {
  const all = facts(range(1, 20), settings.upTo);
  const counts = [1, 2, 3, 4, 5].map(l => all.filter(q => fact(mastery, q).l === l).length);
  return (
    <Screen>
      <View style={s.topBar}><View style={s.pill}><T bold style={{ fontSize: 20 }}>⭐ {settings.stars}</T></View><View style={s.pill}><T bold style={{ fontSize: 20 }}>🏆 {settings.best}</T></View></View>
      <View style={[s.center, { gap: 18 }]}>
        <T style={{ fontSize: 90 }}>🦉</T>
        <T bold style={s.h1}>Tables</T>
        <Btn title="📖  View Tables" onPress={onView} style={s.wide} />
        <Btn title="🎮  Play!" onPress={onPlay} color={C.good} style={s.wide} />
        <T bold style={[s.label, { marginTop: 16 }]}>Your fact family</T>
        <View style={s.levels}>
          {counts.map((n, i) => (
            <View key={i} style={[s.level, { backgroundColor: LEVEL_COLORS[i] }]}>
              <T style={{ fontSize: 26 }}>{emoji(i + 1)}</T>
              <T bold style={s.levelN}>{n}</T>
            </View>
          ))}
        </View>
        <T style={s.muted}>Answer fast to grow eggs into dragons!</T>
      </View>
    </Screen>
  );
}

export const UpToPicker = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <View style={{ gap: 8 }}>
    <T bold style={s.label}>Each table goes up to</T>
    <View style={s.chips}>
      {UP_TO_OPTIONS.map(n => <Btn key={n} small title={`× ${n}`} onPress={() => onChange(n)} color={value === n ? C.primary : C.muted} style={s.chip} />)}
    </View>
  </View>
);

export const TableList = ({ mastery, settings, onPick, onSettings, onBack }: { mastery: Mastery; settings: Settings; onPick: (n: number) => void; onSettings: (p: Partial<Settings>) => void; onBack: () => void }) => (
  <Screen title="Pick a table" onBack={onBack}>
    <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 20 }}>
      <View style={s.grid}>
        {range(1, 20).map(n => <Tile key={n} n={n} onPress={() => onPick(n)} badge={facts([n], settings.upTo).every(q => fact(mastery, q).l === 5) ? '👑' : undefined} />)}
      </View>
      <UpToPicker value={settings.upTo} onChange={upTo => onSettings({ upTo })} />
      <T style={s.muted}>👑 = every fact in that table is a dragon</T>
    </ScrollView>
  </Screen>
);

export const TableView = ({ n, mastery, upTo, onBack }: { n: number; mastery: Mastery; upTo: number; onBack: () => void }) => (
  <Screen title={`Table of ${n}`} onBack={onBack}>
    <T style={[s.muted, { marginBottom: 8 }]}>Tap a row to hear it 🔊</T>
    <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
      {range(1, upTo).map(b => (
        <Pressable key={b} onPress={() => say(`a${n}x${b}`)} style={({ pressed }) => [s.row, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <T style={{ fontSize: 22 }}>{emoji(fact(mastery, { a: n, b }).l)}</T>
          <T bold style={[s.rowText, { flex: 1 }]}>{n} × {b}</T>
          <T bold style={[s.rowText, { color: C.primary }]}>= {n * b}</T>
        </Pressable>
      ))}
    </ScrollView>
  </Screen>
);

export function Setup({ settings, onSettings, onStart, onBack }: { settings: Settings; onSettings: (p: Partial<Settings>) => void; onStart: () => void; onBack: () => void }) {
  const sel = new Set(settings.tables);
  const setTables = (t: number[]) => onSettings({ tables: t.sort((a, b) => a - b) });
  const toggle = (n: number) => setTables(sel.has(n) ? settings.tables.filter(x => x !== n) : [...settings.tables, n]);
  return (
    <Screen title="Choose tables" onBack={onBack}>
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 20 }}>
        <View style={s.grid}>{range(1, 20).map(n => <Tile key={n} n={n} on={sel.has(n)} onPress={() => toggle(n)} />)}</View>
        <View style={s.chips}>
          <Btn small title="1–12" onPress={() => setTables(range(1, 12))} color={C.muted} style={s.chip} />
          <Btn small title="All" onPress={() => setTables(range(1, 20))} color={C.muted} style={s.chip} />
          <Btn small title="None" onPress={() => setTables([])} color={C.muted} style={s.chip} />
        </View>
        <UpToPicker value={settings.upTo} onChange={upTo => onSettings({ upTo })} />
        <T bold style={s.label}>How many questions?</T>
        <View style={s.chips}>
          {[10, 25, 50].map(n => <Btn key={n} small title={`${n}`} onPress={() => onSettings({ count: n })} color={settings.count === n ? C.primary : C.muted} style={s.chip} />)}
        </View>
        <Btn title="Let's go! 🚀" color={sel.size ? C.good : C.muted} onPress={() => sel.size && onStart()} />
      </ScrollView>
    </Screen>
  );
}

const cheer = (pct: number) => pct >= 0.9 ? 'You are a SUPERSTAR! 🌟' : pct >= 0.7 ? 'Awesome work! 🎉' : pct >= 0.4 ? 'Great practice! 💪' : 'Keep going, you are learning! 🌱';

export function Results({ summary: { results, points, best, stars }, onAgain, onHome }: { summary: GameSummary; onAgain: () => void; onHome: () => void }) {
  useEffect(() => { sfx('fanfare'); setTimeout(() => say(best ? 'best' : 'done'), 900); }, []);
  const right = results.filter(r => r.correct);
  const avg = right.length ? right.reduce((t, r) => t + r.ms, 0) / right.length / 1000 : 0;
  const ups = results.filter(r => r.to > r.from);
  const missed = [...new Set(results.filter(r => !r.correct).map(r => `${r.q.a} × ${r.q.b} = ${r.q.a * r.q.b}`))];
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 24, alignItems: 'stretch' }}>
        <View style={s.stars}>{[1, 2, 3].map(i => <Pop key={i}><T style={{ fontSize: 64, opacity: i <= stars ? 1 : 0.2 }}>⭐</T></Pop>)}</View>
        <T bold style={s.cheer}>{cheer(right.length / results.length)}</T>
        {best && <Pop style={s.bestBox}><T bold style={{ fontSize: 22, color: C.ink }}>🏆 New high score!</T></Pop>}
        <View style={s.statRow}>
          <Stat label="Correct" value={`${right.length}/${results.length}`} />
          <Stat label="Points" value={`${points}`} />
          <Stat label="Speed" value={`${avg.toFixed(1)}s`} />
        </View>
        {ups.length > 0 && <T bold style={s.label}>Grew up! 🌱</T>}
        {ups.map((r, i) => <T key={i} style={s.stat}>{r.q.a} × {r.q.b}: {emoji(r.from)} → {emoji(r.to)}</T>)}
        {missed.length > 0 && <T bold style={s.label}>Let's practise these:</T>}
        {missed.map(m => <T key={m} style={[s.stat, { color: C.bad }]}>{m}</T>)}
        <Btn title="Play again 🔁" onPress={onAgain} color={C.good} />
        <Btn title="Home 🏠" onPress={onHome} />
      </ScrollView>
      <Confetti count={60} />
    </Screen>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={s.statBox}><T bold style={{ fontSize: 28, color: C.primary }}>{value}</T><T style={s.muted}>{label}</T></View>
);

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splash: { fontSize: 42, color: '#fff', textAlign: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 12 },
  pill: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, elevation: 2 },
  h1: { fontSize: 52, color: C.primary, marginTop: -12 },
  wide: { width: '85%' },
  levels: { flexDirection: 'row', gap: 8 },
  level: { width: 60, paddingVertical: 8, borderRadius: 16, alignItems: 'center' },
  levelN: { color: '#fff', fontSize: 20 },
  muted: { color: C.muted, fontSize: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '4%', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, padding: 14, borderRadius: 18, elevation: 1 },
  rowText: { fontSize: 28 },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1 },
  label: { fontSize: 20 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cheer: { fontSize: 28, textAlign: 'center', color: C.primary },
  bestBox: { alignSelf: 'center', backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8 },
  statRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, alignItems: 'center', elevation: 1 },
  stat: { fontSize: 20 },
});
