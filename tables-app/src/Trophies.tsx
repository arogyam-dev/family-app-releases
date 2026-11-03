import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { dragons, Grand, GRANDS, Mastery, range, Settings } from './logic';
import { say } from './sound';
import { Btn, C, Confetti, F, Pop, Screen, T } from './ui';

const GOLD = '#F6C445', GOLD_INK = '#6B4A00';

/** A trophy for table `n`: gold when earned, a faint silhouette with progress when not. */
export const Trophy = ({ n, earned, size = 44, note }: { n: number; earned: boolean; size?: number; note?: string }) => (
  <View style={{ alignItems: 'center' }}>
    <T style={{ fontSize: size, opacity: earned ? 1 : 0.2 }}>🏆</T>
    <View style={[s.plate, { backgroundColor: earned ? GOLD : C.line }]}>
      <T bold style={{ fontSize: size > 60 ? F.head : F.small, color: earned ? GOLD_INK : C.muted }}>{n}</T>
    </View>
    {note && <T style={s.note}>{note}</T>}
  </View>
);

const GrandCard = ({ g, have }: { g: Grand; have: number[] }) => {
  const got = g.tables.filter(a => have.includes(a)).length, won = got === g.tables.length;
  return (
    <View style={[s.grand, { backgroundColor: won ? GOLD : C.card }]}>
      <T style={{ fontSize: 56, opacity: won ? 1 : 0.25 }}>{g.icon}</T>
      <View style={{ flex: 1, gap: 6 }}>
        <T bold style={{ fontSize: F.body, color: won ? GOLD_INK : C.ink }}>{g.name}</T>
        <T style={{ fontSize: F.small, color: won ? GOLD_INK : C.muted }}>
          {won ? 'Grand prize won!' : `Win every trophy from 1 to ${g.tables.length}. ${got} of ${g.tables.length} so far.`}
        </T>
        {!won && <View style={s.track}><View style={[s.fill, { width: `${Math.max((got / g.tables.length) * 100, 3)}%` }]} /></View>}
      </View>
    </View>
  );
};

export default function Trophies({ mastery, settings, onPractice, onBack }: { mastery: Mastery; settings: Settings; onPractice: (n: number) => void; onBack: () => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const { trophies, upTo } = settings;
  const pick = (n: number) => { setSel(n); if (trophies.includes(n)) say(`trophy${n}`); };
  const left = sel ? upTo - dragons(mastery, sel, upTo) : 0;
  return (
    <Screen title="Trophy room" onBack={onBack}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
        {GRANDS.map(g => <GrandCard key={g.id} g={g} have={trophies} />)}
        <View style={s.panel}>
          <T bold style={{ fontSize: F.body }}>{trophies.length} of 20 trophies</T>
          <View style={s.grid}>
            {range(1, 20).map(n => (
              <Pressable key={n} onPress={() => pick(n)} style={[s.cell, sel === n && { backgroundColor: C.bg }]}>
                <Trophy n={n} earned={trophies.includes(n)} note={trophies.includes(n) ? undefined : `${dragons(mastery, n, upTo)}/${upTo} 🐉`} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={s.footer}>
        {sel == null ? <T style={s.hint}>Turn every fact in a table into a dragon to win its trophy.</T>
          : trophies.includes(sel) ? <T bold style={s.hint}>You won the trophy for the table of {sel}!</T>
          : <>
              <T style={s.hint}>Table of {sel}: {left} more {left === 1 ? 'dragon' : 'dragons'} to win this trophy.</T>
              <Btn title={`Practise table ${sel}`} color={C.good} onPress={() => onPractice(sel)} />
            </>}
      </View>
    </Screen>
  );
}

/** Full-screen celebration when trophies or grand prizes are unlocked mid-game. */
export const TrophyUnlock = ({ tables, grands }: { tables: number[]; grands: Grand[] }) => (
  <View style={[StyleSheet.absoluteFill, s.unlock]}>
    {grands.length ? (
      <Pop style={{ alignItems: 'center', gap: 8 }}>
        <T style={{ fontSize: 120 }}>{grands[grands.length - 1].icon}</T>
        <T bold style={[s.unlockTitle]}>Grand prize!</T>
        <T bold style={s.unlockSub}>{grands[grands.length - 1].name}</T>
      </Pop>
    ) : (
      <Pop style={{ alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>{tables.map(n => <Trophy key={n} n={n} earned size={110} />)}</View>
        <T bold style={s.unlockTitle}>Trophy unlocked!</T>
        <T bold style={s.unlockSub}>{tables.length === 1 ? `Table of ${tables[0]}` : `Tables ${tables.join(' and ')}`}</T>
      </Pop>
    )}
    <Confetti count={90} />
  </View>
);

const s = StyleSheet.create({
  plate: { marginTop: -4, minWidth: 30, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 8, alignItems: 'center' },
  note: { fontSize: F.small, color: C.muted, marginTop: 2 },
  grand: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16 },
  track: { height: 10, borderRadius: 5, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: GOLD, borderRadius: 5 },
  panel: { backgroundColor: C.card, borderRadius: 20, padding: 14, gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '25%', alignItems: 'center', paddingVertical: 8, borderRadius: 14 },
  footer: { gap: 10, paddingTop: 8 },
  hint: { fontSize: F.body, textAlign: 'center', color: C.ink },
  unlock: { backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  unlockTitle: { fontSize: F.title, color: GOLD_INK, textAlign: 'center' },
  unlockSub: { fontSize: F.head, color: GOLD_INK, textAlign: 'center' },
});
