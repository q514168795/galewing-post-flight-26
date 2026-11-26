# galewing-post-flight-26

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/q514168795/galewing-post-flight-26/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/q514168795/galewing-post-flight-26/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**GALEWING POST: Amber Archipelago** is an original offline 3D airmail flight game built with vanilla HTML5 Canvas, modular ES JavaScript, and procedural WebAudio — zero external libraries, zero build step, and zero network requests.

Pilot the vintage red-and-white twin-engine seaplane **AERO-7 PELICAN** across seven handcrafted archipelago sorties: thread volcanic canyon rings, drop parachute mail sacks onto coastal lighthouse piers, battle 28-knot monsoon crosswinds from a lit first-person cockpit, climb volcanic thermal ribbons, nurse bingo fuel reserves, and stick PAPI-guided runway landings rated by real vertical touchdown rate (FPM) and centerline alignment.

## Features

- **Dual Playable Perspectives (`C`)**: Smooth spring-damped 3D chase camera over the articulated twin-prop seaplane, plus an illuminated first-person cockpit with glass HUD collimator, rain streaks, and glowing six-pack dials.
- **Aerodynamic Flight Model (`flightModel.js`)**: True airspeed/lift/gravity energy conservation, aerodynamic stall & buffet, three-stage flaps (`F`: 0° / 15° / 35°), boost overburn (2.5× fuel), crosswind drift, volcanic updraft thermals, airframe integrity, and real FPM landing grades (`GREASED` / `FIRM` / `HARD` / `CRASH`).
- **7 Distinct Sorties (`missions.js`)**: Canyon Ring Run, Lighthouse Airdrop, Monsoon Medevac, Caldera Thermal Climb, Bingo Fuel Glide, Dusk Strait Express, and Archipelago Grand Circuit.
- **18 Hangar Refits & 3×6 Synergy Sets (`refits.js`)**: Pick 1 of 3 airmail-ticket upgrades between legs (`TURBOCHARGER`, `GLIDER WING`, `AVIONICS`) with Postage stamps economy, rerolls (`X`), 16 pilot medals (`feats.js`), and 3-slot local logbook saves (`save.js`).

## Controls

- `W` / `S` — Pitch nose down / up (or click-drag mouse yoke)
- `A` / `D` or `←` / `→` — Bank roll left / right
- `Q` / `E` — Rudder yaw left / right
- `↑` / `↓` — Increase / decrease throttle (`Shift` for WEP boost)
- `F` — Cycle flaps (`0°` / `15°` / `35°`)
- `Space` — Drop parachute airmail sack
- `C` — Toggle Chase / Lit Cockpit view
- `P` — Pause · `R` — Retry sortie · `M` — Mute procedural WebAudio

## Run it

```sh
node serve.ts
```

Open `http://127.0.0.1:8080` in desktop Chrome.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
