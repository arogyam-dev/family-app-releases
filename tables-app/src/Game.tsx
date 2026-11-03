import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { fact, facts, grade, key, Mastery, parseNumber, pick, points, Q, Settings, TIMEOUT_MS } from './logic';
import type { GameSummary, Result } from './screens';
import { pickOne, say, sfx, stopVoice } from './sound';
import { C, Confetti, F, Hatch, Keypad, LEVEL_COLORS, LEVEL_NAMES, Pop, Screen, Segment, T } from './ui';

type Phase = 'speak' | 'ask' | 'right' | 'wrong';
type Props = { settings: Settings; mastery: Mastery; onUpdate: (m: Mastery) => void; onSettings: (p: Partial<Settings>) => void; onDone: (s: GameSummary) => void; onBack: () => void };

const PRAISE = ['Awesome! 🎉', 'Great job! 🌟', 'You got it! 🙌', 'Super star! ⭐', 'Amazing! 🤩', 'Well done! 👏', 'Brilliant! 💡', 'Woohoo! 🥳'];
const COMBOS: Record<number, string> = { 3: 'combo3', 5: 'combo5', 10: 'combo10' };
const NO_MIC = 'No microphone. Use the keypad.';
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function Game({ settings, mastery, onUpdate, onSettings, onDone, onBack }: Props) {
  const { count, keypad } = settings;
  const all = useRef(facts(settings.tables, settings.upTo)).current;
  const [q, setQ] = useState<Q>(() => pick(mastery, all));
  const [phase, setPhase] = useState<Phase>('speak');
  const [heard, setHeard] = useState('');
  const [typed, setTyped] = useState('');
  const [praise, setPraise] = useState('');
  const [levelUp, setLevelUp] = useState<[number, number] | null>(null);
  const [micError, setMicError] = useState('');
  const st = useRef({ m: mastery, q, phase: 'speak' as Phase, t0: Date.now(), alive: true, combo: 0, points: 0, results: [] as Result[], retry: [] as { q: Q; at: number }[] }).current;
  const go = (p: Phase) => { st.phase = p; setPhase(p); };

  const listen = () => Speech.start({ lang: 'en-US', interimResults: true, continuous: false, maxAlternatives: 3 });

  /** Read the question aloud, then start the mic and the clock (so the app never hears itself). */
  const ask = async (next: Q) => {
    Object.assign(st, { q: next, t0: Date.now() });
    setQ(next); setHeard(''); setTyped(''); setLevelUp(null); go('speak');
    await say(`q${next.a}x${next.b}`);
    if (!st.alive || st.q !== next || st.phase !== 'speak') return;
    st.t0 = Date.now(); go('ask'); listen();
  };

  const answer = async (correct: boolean) => {
    if (st.phase !== 'ask' && st.phase !== 'speak') return;
    Speech.abort(); stopVoice();
    const ms = Date.now() - st.t0, from = fact(st.m, st.q), to = grade(from, st.q, correct, ms);
    st.m = { ...st.m, [key(st.q)]: to };
    onUpdate(st.m);
    st.results.push({ q: st.q, correct, ms, from: from.l, to: to.l });
    const n = st.results.length;
    go(correct ? 'right' : 'wrong');

    if (correct) {
      st.combo++; st.points += points(st.q, ms, st.combo);
      setPraise(pickOne(PRAISE));
      sfx('applause');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const up = to.l > from.l;
      if (up) { setLevelUp([from.l, to.l]); setTimeout(() => sfx('levelup'), 250); }
      const clip = COMBOS[st.combo] ?? (up ? 'levelup' : Math.random() < 0.5 ? `praise${1 + Math.floor(Math.random() * 8)}` : '');
      await Promise.all([wait(1400), clip && wait(200).then(() => say(clip))]);
    } else {
      st.combo = 0;
      st.retry.push({ q: st.q, at: n + 3 + Math.floor(Math.random() * 3) });
      sfx('boink');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      await wait(600);
      await say(`a${st.q.a}x${st.q.b}`);
      await wait(800);
    }
    if (!st.alive) return;
    if (n >= count) {
      const pct = st.results.filter(r => r.correct).length / n;
      return onDone({ results: st.results, points: st.points, best: st.points > settings.best, stars: pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1 });
    }
    const due = st.retry.findIndex(r => r.at <= n && key(r.q) !== key(st.q));
    ask(due >= 0 ? st.retry.splice(due, 1)[0].q : pick(st.m, all, st.q));
  };

  useSpeechRecognitionEvent('result', e => {
    if (st.phase !== 'ask') return;
    const texts = e.results.map(r => r.transcript);
    setHeard(texts[0] ?? '');
    const target = st.q.a * st.q.b;
    if (texts.some(t => parseNumber(t) === target)) answer(true); // accept as soon as it's heard, even mid-sentence
    else if (e.isFinal && texts[0] && parseNumber(texts[0]) !== null) answer(false);
  });
  useSpeechRecognitionEvent('end', () => { if (st.phase === 'ask') setTimeout(() => st.phase === 'ask' && listen(), 150); });
  useSpeechRecognitionEvent('error', e => { if (e.error === 'not-allowed') setMicError(NO_MIC); });

  useEffect(() => {
    Speech.requestPermissionsAsync().then(p => { if (!p.granted) { setMicError(NO_MIC); onSettings({ keypad: true }); } });
    ask(st.q);
    return () => { st.alive = false; st.phase = 'right'; Speech.abort(); stopVoice(); };
  }, []);

  useEffect(() => {
    if (phase !== 'ask') return;
    const t = setTimeout(() => answer(false), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [q, phase]);

  const done = phase === 'right' || phase === 'wrong';
  const fg = done ? '#fff' : C.ink;
  const lvl = fact(st.m, q).l;
  const num = st.results.length + (done ? 0 : 1);
  const status = micError || { speak: 'Listen…', ask: keypad ? 'Say it or type it!' : 'Say the answer!', right: praise, wrong: 'Nice try!' }[phase];

  return (
    <Screen onBack={onBack} bg={phase === 'right' ? C.good : phase === 'wrong' ? C.bad : C.bg} right={
      <View style={s.headRight}>
        <View style={s.pill}><T bold style={{ fontSize: F.small }}>⭐ {st.points}</T></View>
        <Segment options={[['voice', 'Voice'], ['keypad', 'Keypad']]} value={keypad ? 'keypad' : 'voice'} onChange={k => onSettings({ keypad: k === 'keypad' })} />
      </View>
    }>
      <View style={s.bar}><View style={[s.barFill, { width: `${(num / count) * 100}%` }]} /></View>
      <View style={s.center}>
        <View style={s.badges}>
          <View style={[s.badge, { backgroundColor: done ? '#0003' : LEVEL_COLORS[lvl - 1] }]}><T bold style={s.badgeText}>{LEVEL_NAMES[lvl - 1]}</T></View>
          {st.combo >= 2 && <Pop key={st.combo} style={[s.badge, { backgroundColor: C.gold }]}><T bold style={[s.badgeText, { color: C.ink }]}>🔥 x{st.combo}</T></Pop>}
        </View>
        <T bold style={[s.q, { color: fg }]} adjustsFontSizeToFit numberOfLines={1}>{q.a} × {q.b} = {phase === 'wrong' ? q.a * q.b : typed || '?'}</T>
        <T bold style={[s.status, { color: fg }]}>{status}</T>
        {!!heard && !keypad && <T style={[s.heard, { color: fg }]}>“{heard}”</T>}
        {levelUp && <View style={{ alignItems: 'center' }}><Hatch from={levelUp[0]} to={levelUp[1]} size={80} /><T bold style={[s.heard, { color: fg, opacity: 1 }]}>{q.a} × {q.b} grew into a {LEVEL_NAMES[levelUp[1] - 1].split(' ')[0]}!</T></View>}
      </View>
      {keypad && <Keypad value={typed} onChange={setTyped} onSubmit={() => answer(+typed === q.a * q.b)} disabled={done} />}
      {phase === 'right' && <Confetti key={num} count={st.combo >= 5 ? 70 : 35} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  headRight: { flexDirection: 'row', gap: 8, alignItems: 'center', marginLeft: 'auto' },
  pill: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  bar: { height: 12, borderRadius: 6, backgroundColor: '#0001', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.gold, borderRadius: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: F.small },
  q: { fontSize: F.display, textAlign: 'center' },
  status: { fontSize: F.head, textAlign: 'center' },
  heard: { fontSize: F.body, opacity: 0.7 },
});
