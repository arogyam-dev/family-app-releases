import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Fredoka_500Medium, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import Game from './src/Game';
import Insights from './src/Insights';
import { DEFAULT_SETTINGS, loadMastery, loadSettings, Mastery, saveMastery, saveSettings, Settings } from './src/logic';
import { GameSummary, Home, Results, Setup, Splash, TableList, TableView } from './src/screens';

type Route =
  | { name: 'splash' | 'home' | 'tables' | 'setup' | 'insights' }
  | { name: 'table'; n: number }
  | { name: 'game'; id: number }
  | { name: 'results'; summary: GameSummary };

const parent = (r: Route): Route | null =>
  r.name === 'table' ? { name: 'tables' } : r.name === 'home' || r.name === 'splash' ? null : { name: 'home' };

export default function App() {
  const [fonts] = useFonts({ Fredoka_500Medium, Fredoka_700Bold });
  const [route, go] = useState<Route>({ name: 'splash' });
  const [mastery, setMastery] = useState<Mastery>({});
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadMastery().then(setMastery).catch(() => {});
    loadSettings().then(setSettings).catch(() => {});
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const p = parent(route);
      if (p) go(p);
      return !!p;
    });
    return () => sub.remove();
  }, [route]);

  const updateMastery = (m: Mastery) => { setMastery(m); saveMastery(m); };
  const updateSettings = (p: Partial<Settings>) => setSettings(s => { const n = { ...s, ...p }; saveSettings(n); return n; });
  const play = () => go({ name: 'game', id: Date.now() });
  const home = () => go({ name: 'home' });
  const finish = (summary: GameSummary) => {
    const log = { at: Date.now(), correct: summary.results.filter(r => r.correct).length, total: summary.results.length, points: summary.points };
    updateSettings({ stars: settings.stars + summary.stars, history: [...settings.history, log].slice(-50), ...(summary.best && { best: summary.points }) });
    go({ name: 'results', summary });
  };

  if (!fonts) return null;
  const screen = () => {
    switch (route.name) {
      case 'splash': return <Splash onDone={home} />;
      case 'home': return <Home settings={settings} onView={() => go({ name: 'tables' })} onPlay={() => go({ name: 'setup' })} onInsights={() => go({ name: 'insights' })} />;
      case 'insights': return <Insights mastery={mastery} settings={settings} onBack={home} />;
      case 'tables': return <TableList mastery={mastery} settings={settings} onSettings={updateSettings} onPick={n => go({ name: 'table', n })} onBack={home} />;
      case 'table': return <TableView n={route.n} mastery={mastery} upTo={settings.upTo} onBack={() => go({ name: 'tables' })} />;
      case 'setup': return <Setup settings={settings} onSettings={updateSettings} onStart={play} onBack={home} />;
      case 'game': return <Game key={route.id} settings={settings} mastery={mastery} onUpdate={updateMastery} onSettings={updateSettings} onDone={finish} onBack={home} />;
      case 'results': return <Results summary={route.summary} onAgain={play} onHome={home} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen()}
    </SafeAreaProvider>
  );
}
