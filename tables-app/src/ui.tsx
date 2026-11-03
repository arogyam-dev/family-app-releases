import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const C = { bg: '#FFF8EE', ink: '#2B2D42', primary: '#5B5BD6', good: '#2DBE6C', bad: '#E5484D', muted: '#8D8FA3', card: '#FFFFFF' };
export const LEVEL_COLORS = ['#E5484D', '#F76B15', '#FFC53D', '#7FCC4E', '#2DBE6C'];

export const Btn = ({ title, onPress, color = C.primary, style }: { title: string; onPress: () => void; color?: string; style?: ViewStyle }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.btn, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }, style]}>
    <Text style={s.btnText}>{title}</Text>
  </Pressable>
);

export const Screen = ({ title, onBack, children, bg = C.bg }: { title?: string; onBack?: () => void; children: ReactNode; bg?: string }) => (
  <SafeAreaView style={[s.screen, { backgroundColor: bg }]}>
    {(title || onBack) && (
      <View style={s.header}>
        {onBack && <Pressable onPress={onBack} hitSlop={16}><Text style={s.back}>‹ Back</Text></Pressable>}
        <Text style={s.title}>{title}</Text>
      </View>
    )}
    {children}
  </SafeAreaView>
);

/** Square tile for picking a table number. */
export const Tile = ({ n, on = true, onPress }: { n: number; on?: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[s.tile, { backgroundColor: on ? C.primary : C.card }]}>
    <Text style={[s.tileText, { color: on ? '#fff' : C.ink }]}>{n}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  back: { fontSize: 20, color: C.primary, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: C.ink },
  btn: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  tile: { width: '22%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  tileText: { fontSize: 26, fontWeight: '800' },
});
