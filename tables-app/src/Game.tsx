import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ExpoSpeechRecognitionModule as Speech, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { fact, grade, key, Mastery, parseNumber, pick, Q, TIMEOUT_MS } from './logic';
import type { Result } from './screens';
import { C, LEVEL_COLORS, Screen } from './ui';

type Phase = 'ask' | 'right' | 'wrong';
type Props = { tables: number[]; count: number; mastery: Mastery; onUpdate: (m: Mastery) => void; onDone: (r: Result[]) => void; onBack: () => void };

export default function Game({ tables, count, mastery, onUpdate, onDone, onBack }: Props) {
  const [q, setQ] = useState<Q>(() => pick(mastery, tables));
  const [phase, setPhase] = useState<Phase>('ask');
  const [heard, setHeard] = useState('');
  const [micError, setMicError] = useState('');
  const st = useRef({ m: mastery, q, phase: 'ask' as Phase, t0: Date.now(), alive: true, results: [] as Result[], retry: [] as { q: Q; at: number }[] }).current;

  const listen = () => Speech.start({ interimResults: true, continuous: false, maxAlternatives: 3 });

  const ask = (next: Q) => {
    Object.assign(st, { q: next, phase: 'ask', t0: Date.now() });
    setQ(next); setPhase('ask'); setHeard('');
    listen();
  };

  const answer = (correct: boolean) => {
    if (st.phase !== 'ask') return;
    Speech.abort();
    const ms = Date.now() - st.t0, from = fact(st.m, st.q);
    const to = grade(from, st.q, correct, ms);
    st.m = { ...st.m, [key(st.q)]: to };
    onUpdate(st.m);
    st.results.push({ q: st.q, correct, ms, from: from.l, to: to.l });
    const n = st.results.length;
    if (!correct) st.retry.push({ q: st.q, at: n + 3 + Math.floor(Math.random() * 3) });
    st.phase = correct ? 'right' : 'wrong';
    setPhase(st.phase);
    setTimeout(() => {
      if (!st.alive) return;
      if (n >= count) return onDone(st.results);
      const due = st.retry.findIndex(r => r.at <= n);
      ask(due >= 0 ? st.retry.splice(due, 1)[0].q : pick(st.m, tables, st.q));
    }, correct ? 900 : 2500);
  };

  useSpeechRecognitionEvent('result', e => {
    if (st.phase !== 'ask') return;
    const texts = e.results.map(r => r.transcript);
    setHeard(texts[0] ?? '');
    const target = st.q.a * st.q.b;
    if (texts.some(t => parseNumber(t) === target)) answer(true); // accept as soon as it's heard, even mid-utterance
    else if (e.isFinal && texts[0] && parseNumber(texts[0]) !== null) answer(false);
  });
  useSpeechRecognitionEvent('end', () => { if (st.phase === 'ask') setTimeout(() => st.phase === 'ask' && listen(), 150); });
  useSpeechRecognitionEvent('error', e => { if (e.error === 'not-allowed') setMicError('Microphone permission is needed to play.'); });

  useEffect(() => {
    Speech.requestPermissionsAsync().then(p => p.granted ? ask(st.q) : setMicError('Microphone permission is needed to play.'));
    return () => { st.alive = false; st.phase = 'right'; Speech.abort(); };
  }, []);

  useEffect(() => {
    if (phase !== 'ask') return;
    const t = setTimeout(() => answer(false), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [q, phase]);

  const bg = phase === 'right' ? C.good : phase === 'wrong' ? C.bad : C.bg;
  const fg = phase === 'ask' ? C.ink : '#fff';
  const lvl = fact(st.m, q).l;
  return (
    <Screen title={`${st.results.length + (phase === 'ask' ? 1 : 0)} / ${count}`} onBack={onBack} bg={bg}>
      <View style={s.center}>
        <View style={[s.badge, { backgroundColor: phase === 'ask' ? LEVEL_COLORS[lvl - 1] : '#0003' }]}><Text style={s.badgeText}>Level {lvl}</Text></View>
        <Text style={[s.q, { color: fg }]}>{q.a} × {q.b}{phase === 'wrong' ? ` = ${q.a * q.b}` : ''}</Text>
        <Text style={[s.status, { color: fg }]}>
          {micError || (phase === 'right' ? '✅ Correct!' : phase === 'wrong' ? '❌ Not quite' : '🎤 Say the answer…')}
        </Text>
        {!!heard && <Text style={[s.heard, { color: fg }]}>“{heard}”</Text>}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: '800' },
  q: { fontSize: 72, fontWeight: '900', textAlign: 'center' },
  status: { fontSize: 28, fontWeight: '700' },
  heard: { fontSize: 20, opacity: 0.7 },
});
