import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { fact, facts, fastMs, Mastery, Q, range, Settings } from './logic';
import { C, creature as emoji, F, LEVEL_NAMES, Screen, T } from './ui';

/** Sequential ramp (one hue, light → dark) for mastery level 1..5. */
const RAMP = ['#E4DEFB', '#BDB2F3', '#9585EA', '#6C5CE7', '#3B2BA8'];
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const label = (q: Q) => `${q.a} × ${q.b}`;

export default function Insights({ mastery, settings, onBack }: { mastery: Mastery; settings: Settings; onBack: () => void }) {
  const [tip, setTip] = useState('Tap a square or bar for details');
  const { upTo, history } = settings;
  const seen = facts(range(1, 20), upTo).filter(q => fact(mastery, q).n);
  const tables = [...new Set([...settings.tables, ...seen.map(q => q.a)])].sort((a, b) => a - b);
  const scope = facts(tables, upTo);
  const f = (q: Q) => fact(mastery, q);

  if (!seen.length) return (
    <Screen title="Insights" onBack={onBack}>
      <View style={s.empty}><T style={{ fontSize: 96 }}>🥚</T><T bold style={s.h2}>Play a game to see insights.</T></View>
    </Screen>
  );

  const tries = seen.reduce((t, q) => t + f(q).n!, 0), wrong = seen.reduce((t, q) => t + (f(q).w ?? 0), 0);
  const corrects = tries - wrong, totalMs = seen.reduce((t, q) => t + (f(q).t ?? 0), 0);
  const counts = [1, 2, 3, 4, 5].map(l => scope.filter(q => f(q).l === l).length);
  const tableScore = tables.filter(a => facts([a], upTo).some(q => f(q).n)).map(a => ({ a, lvl: avg(facts([a], upTo).map(q => f(q).l)) }));
  const byScore = [...tableScore].sort((x, y) => y.lvl - x.lvl);
  const strong = byScore.slice(0, 3).filter(t => t.lvl > 1);
  const weak = byScore.slice(-3).reverse().filter(t => !strong.includes(t));
  const tricky = seen.filter(q => f(q).w).sort((x, y) => f(y).w! / f(y).n! - f(x).w! / f(x).n! || f(y).w! - f(x).w!).slice(0, 5);
  const avgMs = (q: Q) => f(q).t! / (f(q).n! - (f(q).w ?? 0));
  const slow = seen.filter(q => f(q).n! > (f(q).w ?? 0) && avgMs(q) > fastMs(q)).sort((x, y) => avgMs(y) - avgMs(x)).slice(0, 5);
  const recent = history.slice(-10);
  const factTip = (q: Q) => {
    const x = f(q);
    return `${label(q)} = ${q.a * q.b} · ${LEVEL_NAMES[x.l - 1]} · ` + (x.n ? `${x.n} tries, ${x.w ?? 0} missed${x.n > (x.w ?? 0) ? `, ${(avgMs(q) / 1000).toFixed(1)}s avg` : ''}` : 'not tried yet');
  };

  return (
    <Screen title="Insights" onBack={onBack}>
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 24 }}>
        <View style={s.tiles}>
          <Tile value={`${counts[4]}/${scope.length}`} label="Dragons 🐉" />
          <Tile value={`${Math.round((corrects / tries) * 100)}%`} label="Accuracy" />
          <Tile value={`${corrects ? (totalMs / corrects / 1000).toFixed(1) : '–'}s`} label="Avg speed" />
          <Tile value={`${Math.max(settings.games, history.length)}`} label="Games" />
          <Tile value={`${settings.trophies.length}/20`} label="Trophies 🏆" />
          <Tile value={`${settings.best}`} label="Best score" />
        </View>

        <Card title="Mastery">
          <View style={s.stack}>
            {counts.map((n, i) => n > 0 && <View key={i} style={{ flex: n, backgroundColor: RAMP[i] }} />)}
          </View>
          <View style={s.legend}>
            {counts.map((n, i) => (
              <View key={i} style={s.legendItem}><View style={[s.swatch, { backgroundColor: RAMP[i] }]} /><T style={s.small}>{emoji(i + 1)} {n}</T></View>
            ))}
          </View>
        </Card>

        <Card title="Every fact">
          {tables.map(a => (
            <View key={a} style={s.heatRow}>
              <T bold style={s.heatLabel}>{a}</T>
              {range(1, upTo).map(b => (
                <Pressable key={b} onPress={() => setTip(factTip({ a, b }))} hitSlop={2}
                  style={[s.cell, f({ a, b }).n ? { backgroundColor: RAMP[f({ a, b }).l - 1] } : s.untried]} />
              ))}
            </View>
          ))}
          <T style={[s.small, { color: C.muted, marginTop: 6 }]}>Rows are tables, columns × 1 to × {upTo}. Outlined = not tried. Darker = stronger.</T>
        </Card>

        {strong.length > 0 && <Card title="Strongest tables">{strong.map(t => <Line key={t.a} left={`Table of ${t.a}`} right={emoji(Math.round(t.lvl))} />)}</Card>}
        {weak.length > 0 && <Card title="Needs practice">{weak.map(t => <Line key={t.a} left={`Table of ${t.a}`} right={emoji(Math.round(t.lvl))} />)}</Card>}
        {tricky.length > 0 && <Card title="Most missed">{tricky.map(q => <Line key={label(q)} left={`${label(q)} = ${q.a * q.b}`} right={`missed ${f(q).w} of ${f(q).n}`} />)}</Card>}
        {slow.length > 0 && <Card title="Slowest answers">{slow.map(q => <Line key={label(q)} left={`${label(q)} = ${q.a * q.b}`} right={`${(avgMs(q) / 1000).toFixed(1)}s`} />)}</Card>}

        {recent.length > 0 && (
          <Card title="Recent games (% correct)">
            <View style={s.bars}>
              {recent.map((g, i) => {
                const pct = Math.round((g.correct / g.total) * 100);
                return (
                  <Pressable key={g.at} style={s.barCol} onPress={() => setTip(`${new Date(g.at).toLocaleDateString()} · ${g.correct}/${g.total} correct · ${g.points} points`)}>
                    {i === recent.length - 1 && <T bold style={s.small}>{pct}%</T>}
                    <View style={[s.bar, { height: `${Math.max(pct, 3)}%` }]} />
                  </Pressable>
                );
              })}
            </View>
          </Card>
        )}
      </ScrollView>
      <View style={s.tip}><T style={s.small}>💡 {tip}</T></View>
    </Screen>
  );
}

const Tile = ({ value, label }: { value: string; label: string }) => (
  <View style={s.tile}><T bold style={{ fontSize: F.head }}>{value}</T><T style={[s.small, { color: C.muted }]}>{label}</T></View>
);
const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={s.card}><T bold style={s.h2}>{title}</T>{children}</View>
);
const Line = ({ left, right }: { left: string; right: string }) => (
  <View style={s.line}><T style={{ fontSize: F.body }}>{left}</T><T style={{ fontSize: F.body, color: C.muted }}>{right}</T></View>
);

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  h2: { fontSize: F.body, marginBottom: 8 },
  small: { fontSize: F.small },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, backgroundColor: C.card, borderRadius: 18, padding: 14 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 14 },
  stack: { flexDirection: 'row', height: 24, borderRadius: 6, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  heatLabel: { width: 24, fontSize: F.small, color: C.muted, textAlign: 'right', marginRight: 4 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 3, maxWidth: 28 },
  untried: { borderWidth: 1.5, borderColor: '#D9D5E6' },
  tip: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.line },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: '#F1EFF6' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, borderBottomWidth: 1, borderColor: '#E5E3EE' },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', backgroundColor: C.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
