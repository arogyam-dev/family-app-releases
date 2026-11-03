# Tables 🦉

Times-table flashcards for kids (Android). The app reads each question aloud in a friendly voice, then listens for the spoken answer. A keypad is available as a backup.

## Run

Speech recognition is a native module, so this needs a development build (Expo Go won't work).

```bash
npm install
npx expo run:android                                  # local (needs Android SDK)
npx eas-cli@latest build -p android --profile preview # cloud APK
```

## How mastery works

Each fact (e.g. `7×8`) grows through 5 levels: 🥚 → 🐣 → 🐦 → 🦅 → 🐉. Every fact starts as an egg 🥚.

| Answer | Effect |
|---|---|
| Correct and fast | +1 streak; reaching the level's target streak moves it up a level |
| Correct but slow | Stays at its level; streak resets |
| Wrong, or no answer within 15s | Drops one level |

- **Streak needed to level up:** 4 (L1→2), 3 (L2→3), 3 (L3→4), 2 (L4→5).
- **Fast means:** ≤3s up to 10×10; ≤5s when one number is over 10; ≤6s when both are.
- **Question mix:** L1 50%, L2 25%, L3 13%, L4 7%, L5 5%. Empty levels are skipped.
- **Retries:** a fact you get wrong comes back 3–5 questions later.

Tunables are at the top of `src/logic.ts`.

## Gamification

- Points per answer, with bonuses for fast answers and combos 🔥.
- Spoken praise, applause and confetti for correct answers; a boink and the spoken answer for wrong ones.
- A level-up chime when a fact levels up.
- 1–3 stars per game, a lifetime star count, and a high score 🏆.
- 👑 on a table once every fact in it is a dragon.
- A buddy on Home that grows with average mastery, and creatures that hatch on level-up.

## Insights

The Insights screen (from Home) shows:

- Mastered facts, accuracy, average speed and games played.
- How many facts are at each level.
- A heat map of every fact (tap a square for details).
- The strongest tables and those that need practice.
- The most-missed and slowest facts.
- A chart of recent games.

## Audio

Voice clips are pre-rendered with [Kokoro TTS](https://github.com/thewh1teagle/kokoro-onnx) (voice `af_heart`, pitched up for a child-like sound), so they work offline. Sound effects are synthesized.

```bash
pip install kokoro-onnx soundfile numpy   # plus ffmpeg on PATH
python scripts/gen_voice.py kokoro-v1.0.onnx voices-v1.0.bin   # assets/voice + src/clips.ts
python scripts/gen_sfx.py                                       # assets/sfx
```

To change the voice, edit `VOICE`/`PITCH` in `gen_voice.py`, delete `assets/voice`, and re-run the script.
