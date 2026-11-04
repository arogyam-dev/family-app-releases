import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Fredoka_500Medium, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import Game from './src/Game';
import Insights from './src/Insights';
import Trophies from './src/Trophies';
import { DEFAULT_SETTINGS, loadMastery, loadSettings, Mastery, saveMastery, saveSettings, Settings } from './src/logic';
import { GameSummary, Home, Results, Setup, Splash, TableList, TableView } from './src/screens';

type Route =
  | { name: 'splash' | 'home' | 'tables' | 'setup' | 'insights' | 'trophies' }
  | { name: 'table'; n: number }
  | { name: 'game'; id: number; tables?: number[] }
  | { name: 'results'; summary: GameSummary; tables?: number[] };

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
  const play = (tables?: number[]) => go({ name: 'game', id: Date.now(), tables });
  const home = () => go({ name: 'home' });
  const finish = (summary: GameSummary, tables?: number[]) => {
    const log = { at: Date.now(), correct: summary.results.filter(r => r.correct).length, total: summary.results.length, points: summary.points };
    updateSettings({ stars: settings.stars + summary.stars, history: [...settings.history, log].slice(-50), games: Math.max(settings.games, settings.history.length) + 1, ...(summary.best && { best: summary.points }) });
    go({ name: 'results', summary, tables });
  };

  if (!fonts) return null;
  const screen = () => {
    switch (route.name) {
      case 'splash': return <Splash onDone={home} />;
      case 'home': return <Home mastery={mastery} settings={settings} onView={() => go({ name: 'tables' })} onPlay={() => go({ name: 'setup' })} onInsights={() => go({ name: 'insights' })} onTrophies={() => go({ name: 'trophies' })} />;
      case 'trophies': return <Trophies mastery={mastery} settings={settings} onPractice={n => play([n])} onBack={home} />;
      case 'insights': return <Insights mastery={mastery} settings={settings} onBack={home} />;
      case 'tables': return <TableList mastery={mastery} settings={settings} onSettings={updateSettings} onPick={n => go({ name: 'table', n })} onBack={home} />;
      case 'table': return <TableView n={route.n} mastery={mastery} upTo={settings.upTo} onBack={() => go({ name: 'tables' })} />;
      case 'setup': return <Setup settings={settings} onSettings={updateSettings} onStart={() => play()} onBack={home} />;
      case 'game': return <Game key={route.id} tables={route.tables} settings={settings} mastery={mastery} onUpdate={updateMastery} onSettings={updateSettings} onDone={sm => finish(sm, route.tables)} onBack={home} />;
      case 'results': return <Results summary={route.summary} onAgain={() => play(route.tables)} onHome={home} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen()}
    </SafeAreaProvider>
  );
}
