import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fact, facts, Mastery, Q, range, Settings, UP_TO_OPTIONS } from './logic';
import { say, sfx } from './sound';
import { Trophy } from './Trophies';
import { aName, Btn, C, Confetti, creature, F, Hatch, Pop, Screen, Stat, T, Tile } from './ui';

export type Result = { q: Q; correct: boolean; ms: number; from: number; to: number };
export type GameSummary = { results: Result[]; trophies: number[]; points: number; best: boolean; stars: number };

export function Splash({ onDone }: { onDone: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    say('welcome');
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen bg={C.primary}>
      <Animated.View style={[s.center, { opacity: v }]}>
        <Hatch from={1} to={2} size={120} />
        <T bold style={s.splash}>Welcome to Tables</T>
      </Animated.View>
      <Confetti />
    </Screen>
  );
}

/** The home mascot grows with the average mastery of the chosen tables. */
export function Home({ mastery, settings, onView, onPlay, onInsights, onTrophies }: { mastery: Mastery; settings: Settings; onView: () => void; onPlay: () => void; onInsights: () => void; onTrophies: () => void }) {
  const qs = facts(settings.tables.length ? settings.tables : range(1, 12), settings.upTo);
  const avg = qs.reduce((t, q) => t + fact(mastery, q).l, 0) / qs.length;
  const stage = Math.min(5, Math.floor(avg)), grow = stage === 5 ? 1 : avg - stage;
  return (
    <Screen>
      <View style={s.topBar}>
        <View style={s.pill}><T bold style={s.pillText}>⭐ {settings.stars}</T></View>
        <Pressable onPress={onTrophies} style={s.pill}><T bold style={s.pillText}>🏆 {settings.trophies.length}/20</T></Pressable>
      </View>
      <View style={s.center}>
        <Pop><T style={{ fontSize: 140 }}>{creature(stage)}</T></Pop>
        <T bold style={s.h1}>Tables</T>
        <T style={s.sub}>{stage === 5 ? 'Your buddy is a mighty Dragon!' : `Your buddy is ${aName(stage)}. Fast answers help it grow!`}</T>
        <View style={s.grow}><View style={[s.growFill, { width: `${Math.max(grow * 100, 4)}%` }]} /></View>
      </View>
      <View style={{ gap: 12, paddingBottom: 8 }}>
        <Btn title="Play!" onPress={onPlay} color={C.good} style={{ paddingVertical: 24 }} />
        <View style={s.chips}>
          <Btn soft small title="Tables" onPress={onView} style={[s.chip, s.tall]} />
          <Btn soft small title="Trophies" onPress={onTrophies} style={[s.chip, s.tall]} />
          <Btn soft small title="Insights" onPress={onInsights} style={[s.chip, s.tall]} />
        </View>
      </View>
    </Screen>
  );
}

const Chips = ({ options, value, onChange }: { options: [number, string][]; value: number; onChange: (n: number) => void }) => (
  <View style={s.chips}>
    {options.map(([n, label]) => <Btn key={n} small soft={value !== n} title={label} onPress={() => onChange(n)} style={s.chip} />)}
  </View>
);

export const UpToPicker = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <View style={{ gap: 8 }}>
    <T bold style={s.label}>Each table goes up to</T>
    <Chips options={UP_TO_OPTIONS.map(n => [n, `× ${n}`])} value={value} onChange={onChange} />
  </View>
);

export const TableList = ({ mastery, settings, onPick, onSettings, onBack }: { mastery: Mastery; settings: Settings; onPick: (n: number) => void; onSettings: (p: Partial<Settings>) => void; onBack: () => void }) => (
  <Screen title="Pick a table" onBack={onBack}>
    <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 20 }}>
      <View style={s.grid}>
        {range(1, 20).map(n => <Tile key={n} n={n} onPress={() => onPick(n)} badge={settings.trophies.includes(n) ? '🏆' : undefined} />)}
      </View>
      <UpToPicker value={settings.upTo} onChange={upTo => onSettings({ upTo })} />
      <T style={s.muted}>🏆 means you won that table's trophy.</T>
    </ScrollView>
  </Screen>
);

export const TableView = ({ n, mastery, upTo, onBack }: { n: number; mastery: Mastery; upTo: number; onBack: () => void }) => (
  <Screen title={`Table of ${n}`} onBack={onBack}>
    <T style={[s.muted, { marginBottom: 8, textAlign: 'left' }]}>Tap a row to hear it.</T>
    <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
      {range(1, upTo).map(b => (
        <Pressable key={b} onPress={() => say(`a${n}x${b}`)} style={({ pressed }) => [s.row, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <T style={{ fontSize: F.head }}>{creature(fact(mastery, { a: n, b }).l)}</T>
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 18, paddingBottom: 16 }}>
        <View style={s.grid}>{range(1, 20).map(n => <Tile key={n} n={n} on={sel.has(n)} onPress={() => toggle(n)} />)}</View>
        <View style={s.chips}>
          <Btn small soft title="1–12" onPress={() => setTables(range(1, 12))} style={s.chip} />
          <Btn small soft title="All" onPress={() => setTables(range(1, 20))} style={s.chip} />
          <Btn small soft title="None" onPress={() => setTables([])} style={s.chip} />
        </View>
        <UpToPicker value={settings.upTo} onChange={upTo => onSettings({ upTo })} />
        <View style={{ gap: 8 }}>
          <T bold style={s.label}>How many questions?</T>
          <Chips options={[[10, '10'], [25, '25'], [50, '50']]} value={settings.count} onChange={count => onSettings({ count })} />
        </View>
      </ScrollView>
      <Btn title={sel.size ? "Let's go!" : 'Pick a table first'} color={sel.size ? C.good : C.muted} onPress={() => sel.size && onStart()} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const cheer = (pct: number) => pct >= 0.9 ? 'You are a superstar!' : pct >= 0.7 ? 'Awesome work!' : pct >= 0.4 ? 'Great practice!' : 'Keep going, you are learning!';

export function Results({ summary: { results, trophies, points, best, stars }, onAgain, onHome }: { summary: GameSummary; onAgain: () => void; onHome: () => void }) {
  useEffect(() => {
    sfx('fanfare');
    const t = setTimeout(() => say(best ? 'best' : 'done'), 900);
    return () => clearTimeout(t);
  }, []);
  const right = results.filter(r => r.correct);
  const avg = right.length ? right.reduce((t, r) => t + r.ms, 0) / right.length / 1000 : 0;
  const ups = results.filter(r => r.to > r.from);
  return (
    <Screen>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingVertical: 20 }}>
        <View style={s.stars}>{[1, 2, 3].map(i => <Pop key={i}><T style={{ fontSize: 64, opacity: i <= stars ? 1 : 0.2 }}>⭐</T></Pop>)}</View>
        <T bold style={s.cheer}>{cheer(right.length / results.length)}</T>
        {best && <Pop style={s.bestBox}><T bold style={{ fontSize: F.body }}>🏆 New high score!</T></Pop>}
        <View style={s.statRow}>
          <Stat label="Correct" value={`${right.length}/${results.length}`} />
          <Stat label="Points" value={`${points}`} />
          <Stat label="Speed" value={`${avg.toFixed(1)}s`} />
        </View>
        {trophies.length > 0 && (
          <View style={[s.panel, { backgroundColor: C.gold }]}>
            <T bold style={s.label}>{trophies.length === 1 ? 'New trophy!' : `${trophies.length} new trophies!`}</T>
            <View style={s.hatches}>{trophies.map(n => <Trophy key={n} n={n} earned size={56} />)}</View>
          </View>
        )}
        {ups.length > 0 && (
          <View style={s.panel}>
            <T bold style={s.label}>{ups.length === 1 ? '1 fact grew up!' : `${ups.length} facts grew up!`}</T>
            <View style={s.hatches}>
              {ups.map((r, i) => (
                <View key={i} style={{ alignItems: 'center' }}>
                  <Hatch from={r.from} to={r.to} size={44} />
                  <T bold style={{ fontSize: F.small }}>{r.q.a} × {r.q.b}</T>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={s.panel}>
          <T bold style={s.label}>This game</T>
          <View style={s.facts}>
            {results.map((r, i) => (
              <View key={i} style={[s.factChip, { backgroundColor: r.correct ? '#D7F5EC' : '#FFE1E1' }]}>
                <T bold style={{ fontSize: F.small, color: r.correct ? '#00624E' : '#A3262A' }}>
                  {r.correct ? '✓' : '✗'} {r.q.a} × {r.q.b}{r.correct ? '' : ` = ${r.q.a * r.q.b}`}
                </T>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={[s.chips, { marginTop: 8 }]}>
        <Btn soft title="Home" onPress={onHome} style={s.chip} />
        <Btn title="Play again" onPress={onAgain} color={C.good} style={{ flex: 2 }} />
      </View>
      <Confetti count={60} />
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  splash: { fontSize: F.title, color: '#fff', textAlign: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 12 },
  pill: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontSize: F.body },
  h1: { fontSize: F.title, color: C.ink },
  sub: { fontSize: F.body, color: C.muted, textAlign: 'center', paddingHorizontal: 24 },
  grow: { width: '60%', height: 12, borderRadius: 6, backgroundColor: C.line, overflow: 'hidden' },
  growFill: { height: '100%', backgroundColor: C.good, borderRadius: 6 },
  muted: { color: C.muted, fontSize: F.small, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '4%', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, padding: 14, borderRadius: 18 },
  rowText: { fontSize: F.head },
  chips: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1 },
  tall: { paddingVertical: 16, borderRadius: 24 },
  label: { fontSize: F.body },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  cheer: { fontSize: F.head, textAlign: 'center', color: C.ink },
  bestBox: { alignSelf: 'center', backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8 },
  statRow: { flexDirection: 'row', gap: 10 },
  panel: { backgroundColor: C.card, borderRadius: 18, padding: 14, gap: 10 },
  hatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
