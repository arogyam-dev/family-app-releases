import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { VOICE } from './clips';

const SFX = {
  applause: require('../assets/sfx/applause.mp3'),
  boink: require('../assets/sfx/boink.mp3'),
  levelup: require('../assets/sfx/levelup.mp3'),
  fanfare: require('../assets/sfx/fanfare.mp3'),
  tap: require('../assets/sfx/tap.mp3'),
};
export type Sfx = keyof typeof SFX;

setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }).catch(() => {});

const voice = createAudioPlayer();
const fx = Object.fromEntries(Object.entries(SFX).map(([k, v]) => [k, createAudioPlayer(v)])) as Record<Sfx, AudioPlayer>;
let done: (() => void) | null = null;
voice.addListener('playbackStatusUpdate', s => { if (s.didJustFinish) finish(); });
const finish = () => { const d = done; done = null; d?.(); };

/** Play a voice clip; resolves when it finishes (or is interrupted). */
export function say(name: string): Promise<void> {
  finish();
  const src = VOICE[name];
  if (src == null) return Promise.resolve();
  return new Promise(res => {
    const t = setTimeout(finish, 6000); // safety net if no finish event arrives
    done = () => { clearTimeout(t); res(); };
    voice.replace(src);
    voice.play();
  });
}

export function stopVoice() { voice.pause(); finish(); }

export function sfx(name: Sfx) {
  const p = fx[name];
  p.seekTo(0).then(() => p.play(), () => p.play());
}

export const pickOne = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
