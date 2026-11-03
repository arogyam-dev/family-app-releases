import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Game from './src/Game';
import { loadMastery, Mastery, saveMastery } from './src/logic';
import { Home, Result, Results, Setup, Splash, TableList, TableView } from './src/screens';

type Route =
  | { name: 'splash' | 'home' | 'tables' | 'setup' }
  | { name: 'table'; n: number }
  | { name: 'game'; tables: number[]; count: number; id: number }
  | { name: 'results'; results: Result[]; tables: number[]; count: number };

const parent = (r: Route): Route | null =>
  r.name === 'table' ? { name: 'tables' } : r.name === 'home' || r.name === 'splash' ? null : { name: 'home' };

export default function App() {
  const [route, go] = useState<Route>({ name: 'splash' });
  const [mastery, setMastery] = useState<Mastery>({});

  useEffect(() => { loadMastery().then(setMastery).catch(() => {}); }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const p = parent(route);
      if (p) go(p);
      return !!p;
    });
    return () => sub.remove();
  }, [route]);

  const update = (m: Mastery) => { setMastery(m); saveMastery(m); };
  const play = (tables: number[], count: number) => go({ name: 'game', tables, count, id: Date.now() });
  const home = () => go({ name: 'home' });

  const screen = () => {
    switch (route.name) {
      case 'splash': return <Splash onDone={home} />;
      case 'home': return <Home mastery={mastery} onView={() => go({ name: 'tables' })} onPlay={() => go({ name: 'setup' })} />;
      case 'tables': return <TableList onPick={n => go({ name: 'table', n })} onBack={home} />;
      case 'table': return <TableView n={route.n} onBack={() => go({ name: 'tables' })} />;
      case 'setup': return <Setup onStart={play} onBack={home} />;
      case 'game': {
        const { tables, count } = route;
        return <Game key={route.id} tables={tables} count={count} mastery={mastery} onUpdate={update} onBack={home} onDone={results => go({ name: 'results', results, tables, count })} />;
      }
      case 'results': return <Results results={route.results} onAgain={() => play(route.tables, route.count)} onHome={home} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen()}
    </SafeAreaProvider>
  );
}
