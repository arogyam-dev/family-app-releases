import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fact, Mastery, MAX_MULT, Q } from './logic';
import { Btn, C, LEVEL_COLORS, Screen, Tile } from './ui';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export type Result = { q: Q; correct: boolean; ms: number; from: number; to: number };

export function Splash({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen bg={C.primary}>
      <Animated.View style={[s.center, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
        <Text style={s.splashEmoji}>🔢</Text>
        <Text style={s.splash}>Welcome to Tables</Text>
      </Animated.View>
    </Screen>
  );
}

export function Home({ mastery, onView, onPlay }: { mastery: Mastery; onView: () => void; onPlay: () => void }) {
  const counts = [1, 2, 3, 4, 5].map(l => range(1, 20).flatMap(a => range(1, MAX_MULT).map(b => ({ a, b }))).filter(q => fact(mastery, q).l === l).length);
  return (
    <Screen>
      <View style={[s.center, { gap: 20 }]}>
        <Text style={s.h1}>Tables</Text>
        <Btn title="📖  View Tables" onPress={onView} style={s.wide} />
        <Btn title="🎮  Play Math Game" onPress={onPlay} color={C.good} style={s.wide} />
        <View style={s.levels}>
          {counts.map((n, i) => (
            <View key={i} style={[s.level, { backgroundColor: LEVEL_COLORS[i] }]}>
              <Text style={s.levelN}>{n}</Text>
              <Text style={s.levelL}>L{i + 1}</Text>
            </View>
          ))}
        </View>
        <Text style={s.muted}>Facts at each mastery level</Text>
      </View>
    </Screen>
  );
}

export const TableList = ({ onPick, onBack }: { onPick: (n: number) => void; onBack: () => void }) => (
  <Screen title="Pick a table" onBack={onBack}>
    <View style={s.grid}>{range(1, 20).map(n => <Tile key={n} n={n} onPress={() => onPick(n)} />)}</View>
  </Screen>
);

export const TableView = ({ n, onBack }: { n: number; onBack: () => void }) => (
  <Screen title={`Table of ${n}`} onBack={onBack}>
    <ScrollView contentContainerStyle={{ gap: 8 }}>
      {range(1, MAX_MULT).map(b => (
        <View key={b} style={s.row}>
          <Text style={s.rowText}>{n} × {b}</Text>
          <Text style={[s.rowText, { color: C.primary }]}>= {n * b}</Text>
        </View>
      ))}
    </ScrollView>
  </Screen>
);

export function Setup({ onStart, onBack }: { onStart: (tables: number[], count: number) => void; onBack: () => void }) {
  const [sel, setSel] = useState(new Set(range(1, 12)));
  const [count, setCount] = useState(25);
  const toggle = (n: number) => setSel(p => { const x = new Set(p); x.has(n) ? x.delete(n) : x.add(n); return x; });
  return (
    <Screen title="Choose tables" onBack={onBack}>
      <ScrollView contentContainerStyle={{ gap: 20 }}>
        <View style={s.grid}>{range(1, 20).map(n => <Tile key={n} n={n} on={sel.has(n)} onPress={() => toggle(n)} />)}</View>
        <View style={s.chips}>
          <Btn title="1–12" onPress={() => setSel(new Set(range(1, 12)))} color={C.muted} style={s.chip} />
          <Btn title="All" onPress={() => setSel(new Set(range(1, 20)))} color={C.muted} style={s.chip} />
          <Btn title="None" onPress={() => setSel(new Set())} color={C.muted} style={s.chip} />
        </View>
        <Text style={s.label}>Questions</Text>
        <View style={s.chips}>
          {[10, 25, 50].map(n => <Btn key={n} title={`${n}`} onPress={() => setCount(n)} color={count === n ? C.primary : C.muted} style={s.chip} />)}
        </View>
        <Btn title="Start ▶" color={sel.size ? C.good : C.muted} onPress={() => sel.size && onStart([...sel].sort((a, b) => a - b), count)} />
      </ScrollView>
    </Screen>
  );
}

export function Results({ results, onAgain, onHome }: { results: Result[]; onAgain: () => void; onHome: () => void }) {
  const right = results.filter(r => r.correct);
  const avg = right.length ? right.reduce((t, r) => t + r.ms, 0) / right.length / 1000 : 0;
  const up = results.filter(r => r.to > r.from).length, down = results.filter(r => r.to < r.from).length;
  const missed = [...new Set(results.filter(r => !r.correct).map(r => `${r.q.a} × ${r.q.b} = ${r.q.a * r.q.b}`))];
  return (
    <Screen title="Results">
      <ScrollView contentContainerStyle={{ gap: 14 }}>
        <Text style={s.score}>{right.length} / {results.length}</Text>
        <Text style={s.stat}>⏱ Avg. correct answer: {avg.toFixed(1)}s</Text>
        <Text style={s.stat}>⬆️ Levelled up: {up}   ⬇️ Dropped: {down}</Text>
        {missed.length > 0 && <Text style={s.label}>Practise these:</Text>}
        {missed.map(m => <Text key={m} style={[s.stat, { color: C.bad }]}>{m}</Text>)}
        <Btn title="Play again" onPress={onAgain} color={C.good} />
        <Btn title="Home" onPress={onHome} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashEmoji: { fontSize: 80 },
  splash: { fontSize: 40, fontWeight: '900', color: '#fff', textAlign: 'center' },
  h1: { fontSize: 48, fontWeight: '900', color: C.ink },
  wide: { width: '85%' },
  levels: { flexDirection: 'row', gap: 8, marginTop: 24 },
  level: { width: 56, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  levelN: { color: '#fff', fontSize: 20, fontWeight: '800' },
  levelL: { color: '#fff', fontSize: 12, fontWeight: '700' },
  muted: { color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '4%', rowGap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.card, padding: 16, borderRadius: 14 },
  rowText: { fontSize: 28, fontWeight: '700', color: C.ink },
  chips: { flexDirection: 'row', gap: 12 },
  chip: { flex: 1, paddingVertical: 12 },
  label: { fontSize: 20, fontWeight: '700', color: C.ink },
  score: { fontSize: 64, fontWeight: '900', color: C.primary, textAlign: 'center' },
  stat: { fontSize: 20, color: C.ink },
});
