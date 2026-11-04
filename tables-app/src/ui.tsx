import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { sfx } from './sound';

export const C = { bg: '#FFF6E5', ink: '#2B2D42', primary: '#6C5CE7', good: '#00B894', bad: '#FF6B6B', muted: '#6B6880', card: '#FFFFFF', gold: '#FDCB6E', line: '#0000000F' };
/** The five type sizes used in the app. */
export const F = { display: 72, title: 40, head: 26, body: 20, small: 15 };
export const LEVEL_COLORS = ['#FF6B6B', '#FF9F43', '#FECA57', '#7BED9F', '#00B894'];
export const LEVEL_NAMES = ['Egg 🥚', 'Chick 🐣', 'Bird 🐦', 'Eagle 🦅', 'Dragon 🐉'];
export const creature = (l: number) => LEVEL_NAMES[l - 1].split(' ')[1];
/** "a Chick", "an Eagle" */
export const aName = (l: number) => { const n = LEVEL_NAMES[l - 1].split(' ')[0]; return `${/^[AEIOU]/.test(n) ? 'an' : 'a'} ${n}`; };

/** Text in the app's rounded font. */
export const T = ({ style, bold, ...p }: TextProps & { bold?: boolean }) => (
  <Text {...p} style={[{ fontFamily: bold ? 'Fredoka_700Bold' : 'Fredoka_500Medium', color: C.ink }, style]} />
);

const press = () => { sfx('tap'); Haptics.selectionAsync().catch(() => {}); };

/** Chunky pressable button; `soft` is the quiet white variant for secondary actions and unselected chips. */
export const Btn = ({ title, onPress, color = C.primary, soft, small, style }: { title: string; onPress: () => void; color?: string; soft?: boolean; small?: boolean; style?: StyleProp<ViewStyle> }) => (
  <Pressable onPress={() => { press(); onPress(); }} style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: soft ? C.card : color, transform: [{ scale: pressed ? 0.95 : 1 }] }, style]}>
    <T bold style={[s.btnText, small && { fontSize: F.body }, soft && { color: C.ink }]}>{title}</T>
  </Pressable>
);

/** Two-way switch, e.g. Voice | Keypad. */
export const Segment = <K extends string>({ options, value, onChange }: { options: [K, string][]; value: K; onChange: (k: K) => void }) => (
  <View style={s.segment}>
    {options.map(([k, label]) => (
      <Pressable key={k} onPress={() => { press(); onChange(k); }} style={[s.segItem, value === k && { backgroundColor: C.ink }]} hitSlop={4}>
        <T bold style={{ fontSize: F.small, color: value === k ? '#fff' : C.ink }}>{label}</T>
      </Pressable>
    ))}
  </View>
);

export const Screen = ({ title, onBack, right, children, bg = C.bg }: { title?: string; onBack?: () => void; right?: ReactNode; children: ReactNode; bg?: string }) => (
  <SafeAreaView style={[s.screen, { backgroundColor: bg }]}>
    {(title || onBack) && (
      <View style={s.header}>
        {onBack && <Pressable onPress={onBack} hitSlop={16} style={s.back}><T bold style={{ fontSize: F.head, color: C.ink, marginTop: -3 }}>‹</T></Pressable>}
        <T bold style={s.title}>{title}</T>
        {right}
      </View>
    )}
    {children}
  </SafeAreaView>
);

/** A number with a label under it, on a card. */
export const Stat = ({ value, label, style }: { value: string; label: string; style?: StyleProp<ViewStyle> }) => (
  <View style={[s.stat, style]}><T bold style={{ fontSize: F.head, color: C.primary }}>{value}</T><T style={{ fontSize: F.small, color: C.muted }}>{label}</T></View>
);

/** Square tile for picking a table number. */
export const Tile = ({ n, on = true, badge, onPress }: { n: number; on?: boolean; badge?: string; onPress: () => void }) => (
  <Pressable onPress={() => { press(); onPress(); }} style={({ pressed }) => [s.tile, { backgroundColor: on ? C.primary : C.card, transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
    <T bold style={[s.tileText, { color: on ? '#fff' : C.ink }]}>{n}</T>
    {badge && <T style={s.tileBadge}>{badge}</T>}
  </Pressable>
);

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
export const Keypad = ({ value, onChange, onSubmit, disabled }: { value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean }) => (
  <View style={[s.keypad, disabled && { opacity: 0.4 }]} pointerEvents={disabled ? 'none' : 'auto'}>
    {KEYS.map(k => (
      <Pressable key={k} onPress={() => {
        press();
        if (k === '✓') value && onSubmit();
        else onChange(k === '⌫' ? value.slice(0, -1) : (value + k).slice(0, 3));
      }} style={({ pressed }) => [s.key, k === '✓' && { backgroundColor: C.ink }, { opacity: pressed ? 0.7 : 1 }]}>
        <T bold style={[s.keyText, k === '✓' && { color: '#fff' }]}>{k}</T>
      </Pressable>
    ))}
  </View>
);

/** A burst of falling confetti; remount (change `key`) to fire again. */
export function Confetti({ count = 40 }: { count?: number }) {
  const { width, height } = Dimensions.get('window');
  const drop = useRef(new Animated.Value(0)).current;
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width, delay: Math.random() * 0.3, spin: (Math.random() - 0.5) * 1440,
    size: 8 + Math.random() * 8, color: [...LEVEL_COLORS, C.primary, C.gold][i % 7], drift: (Math.random() - 0.5) * 120,
  })), [count]);
  useEffect(() => { Animated.timing(drop, { toValue: 1, duration: 1600, useNativeDriver: true }).start(); }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => {
        const p = drop.interpolate({ inputRange: [b.delay, 1], outputRange: [0, 1], extrapolate: 'clamp' });
        return <Animated.View key={i} style={{
          position: 'absolute', left: b.x, top: -20, width: b.size, height: b.size * 0.5, borderRadius: 2, backgroundColor: b.color,
          opacity: p.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.9] }) },
            { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, b.drift] }) },
            { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${b.spin}deg`] }) },
          ],
        }} />;
      })}
    </View>
  );
}

/** The old creature shrinks away and the new one springs in. */
export function Hatch({ from, to, size = 96 }: { from: number; to: number; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start(); }, []);
  const out = v.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' });
  const inn = v.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const wobble = v.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 1], outputRange: ['0deg', '-15deg', '15deg', '0deg', '0deg'] });
  return (
    <View style={{ width: size * 1.2, height: size * 1.2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ position: 'absolute', fontSize: size, opacity: out, transform: [{ scale: out }, { rotate: wobble }] }}>{creature(from)}</Animated.Text>
      <Animated.Text style={{ position: 'absolute', fontSize: size, transform: [{ scale: inn }] }}>{creature(to)}</Animated.Text>
    </View>
  );
}

/** Springs in from small on mount. */
export function Pop({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, friction: 4, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: F.head, flex: 1 },
  btn: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', borderBottomWidth: 5, borderColor: '#0000001F' },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderBottomWidth: 3 },
  btnText: { color: '#fff', fontSize: F.head },
  tile: { width: '22%', aspectRatio: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderColor: '#0000001A' },
  tileText: { fontSize: F.head },
  tileBadge: { position: 'absolute', top: -6, right: -4, fontSize: F.body },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 12, alignItems: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  key: { width: '30%', height: 56, borderRadius: 16, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: '#0000001A' },
  keyText: { fontSize: F.head },
  segment: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 999, padding: 3 },
  segItem: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
});
