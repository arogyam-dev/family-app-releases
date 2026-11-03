# Tables

Times-table flashcards for kids, built with Expo. Questions are answered out loud and checked with on-device speech recognition.

## Run

Speech recognition needs a native module, so the app needs a development build; it won't run in Expo Go.

```bash
npm install
npx expo run:android          # local build (Android Studio / SDK)
# or: npx eas-cli@latest build -p android --profile preview   (cloud APK)
```

## Mastery

Each fact (e.g. `7×8`) has a level from 1 to 5, and every fact starts at level 1. Levels are saved on the device.

- **Correct and fast** (≤3s, or ≤4.5s for tables above 10): adds 1 to the fact's streak. A streak of 2 moves it up a level; 4→5 needs a streak of 3.
- **Correct but slow**: the fact stays at its level and the streak resets.
- **Wrong or no answer within 10s**: the fact drops one level.

Each question is drawn from a level picked by weight: L1 50%, L2 25%, L3 13%, L4 7%, L5 5%. Empty levels are skipped. A fact you get wrong comes back 3–5 questions later.

Tunables are at the top of `src/logic.ts`.
