// SPDX-License-Identifier: MIT
// Dynamic Archipelago weather: crosswinds, gusts, monsoon squalls, lightning, thermals, and cloud decks.

import { createRng, randRange } from './random.js';

export const WEATHER_PRESETS = {
  tradewind: {
    id: 'tradewind',
    label: 'MORNING TRADEWIND',
    skyTop: '#1c4d70',
    skyMid: '#5697b8',
    skyHorizon: '#f2ce96',
    sunColor: '#fff1c1',
    sunElevation: 0.28,
    sunAzimuth: 1.22,
    oceanDeep: '#144c6b',
    oceanNear: '#227599',
    fogColor: '#e7c99d',
    fogDensity: 0.00022,
    windSpeedKts: 9,
    windDirDeg: 145,
    gustAmp: 3,
    rainIntensity: 0,
    turbulence: 0.14,
  },
  goldenHour: {
    id: 'goldenHour',
    label: 'GOLDEN HOUR',
    skyTop: '#243054',
    skyMid: '#944a5b',
    skyHorizon: '#f4a853',
    sunColor: '#ffe08a',
    sunElevation: 0.16,
    sunAzimuth: 1.48,
    oceanDeep: '#183f5b',
    oceanNear: '#27657d',
    fogColor: '#ea9e5d',
    fogDensity: 0.00025,
    windSpeedKts: 15,
    windDirDeg: 162,
    gustAmp: 6,
    rainIntensity: 0,
    turbulence: 0.25,
  },
  monsoon: {
    id: 'monsoon',
    label: 'MONSOON SQUALL',
    skyTop: '#0d1a26',
    skyMid: '#1f3747',
    skyHorizon: '#526f7a',
    sunColor: '#a8c6cf',
    sunElevation: 0.2,
    sunAzimuth: 1.1,
    oceanDeep: '#0d2636',
    oceanNear: '#1a4254',
    fogColor: '#3f5a67',
    fogDensity: 0.00042,
    windSpeedKts: 28,
    windDirDeg: 175,
    gustAmp: 14,
    rainIntensity: 1.0,
    turbulence: 0.72,
  },
  volcanicDusk: {
    id: 'volcanicDusk',
    label: 'VOLCANIC DUSK',
    skyTop: '#1c1d3d',
    skyMid: '#7d3448',
    skyHorizon: '#eb7f42',
    sunColor: '#ffb766',
    sunElevation: 0.12,
    sunAzimuth: 1.56,
    oceanDeep: '#142f47',
    oceanNear: '#295169',
    fogColor: '#d47448',
    fogDensity: 0.0003,
    windSpeedKts: 19,
    windDirDeg: 205,
    gustAmp: 9,
    rainIntensity: 0.15,
    turbulence: 0.42,
  },
};

export function createWeatherState(presetKey, seed, thermals = []) {
  const preset = WEATHER_PRESETS[presetKey] || WEATHER_PRESETS.goldenHour;
  const rng = createRng(seed ^ 0x39c1);

  const clouds = [];
  for (let i = 0; i < 36; i++) {
    clouds.push({
      x: randRange(rng, -900, 12500),
      y: randRange(rng, 220, 560),
      z: randRange(rng, -1800, 2200),
      radius: randRange(rng, 110, 260),
      puffs: 3 + (i % 3),
      shade: randRange(rng, 0.82, 1.0),
    });
  }

  const rainDrops = [];
  for (let i = 0; i < 90; i++) {
    rainDrops.push({
      x: rng(),
      y: rng(),
      len: randRange(rng, 18, 42),
      speed: randRange(rng, 1.2, 2.2),
    });
  }

  return {
    preset,
    time: 0,
    windSpeedKts: preset.windSpeedKts,
    windDirDeg: preset.windDirDeg,
    gustPhase: rng() * Math.PI * 2,
    lightningFlash: 0,
    lightningCooldown: 4.5,
    lightningBoltX: 0.62,
    thermals: thermals.map((t, i) => ({ ...t, phase: i * 1.3 })),
    clouds,
    rainDrops,
  };
}

export function stepWeather(weather, dt) {
  weather.time += dt;
  const p = weather.preset;
  const gust = Math.sin(weather.time * 0.7 + weather.gustPhase) * p.gustAmp * 0.65
    + Math.sin(weather.time * 2.1) * p.gustAmp * 0.35;
  weather.windSpeedKts = Math.max(2, p.windSpeedKts + gust);

  if (p.rainIntensity > 0.5) {
    weather.lightningCooldown -= dt;
    if (weather.lightningCooldown <= 0) {
      weather.lightningFlash = 1.0;
      weather.lightningCooldown = 4.2 + ((Math.sin(weather.time * 13.7) + 1) * 2.4);
      weather.lightningBoltX = 0.25 + ((Math.sin(weather.time * 7.3) + 1) * 0.26);
    }
  }
  weather.lightningFlash = Math.max(0, weather.lightningFlash - dt * 2.8);

  if (p.rainIntensity > 0) {
    for (const drop of weather.rainDrops) {
      drop.y += drop.speed * dt * (0.9 + p.rainIntensity * 0.7);
      drop.x -= 0.18 * dt * p.rainIntensity;
      if (drop.y > 1.05) {
        drop.y = -0.05;
        drop.x = (drop.x + 1.37) % 1.0;
      }
      if (drop.x < -0.05) drop.x += 1.1;
    }
  }
}

export function sampleWindAt(weather, x, y, z, stabilityMult = 1.0) {
  const rad = (weather.windDirDeg * Math.PI) / 180;
  // Convert knots to gentle world m/s drift
  const speedMs = weather.windSpeedKts * 0.22 * stabilityMult;
  let vx = Math.sin(rad) * speedMs;
  let vz = Math.cos(rad) * speedMs;
  let vy = 0;

  let inThermal = false;
  for (const th of weather.thermals) {
    const dist = Math.hypot(x - th.x, z - th.z);
    if (dist < th.radius && y >= 15 && y <= th.topY) {
      const strength = (1 - dist / th.radius) * th.lift;
      vy += strength;
      inThermal = true;
    }
  }

  // Turbulence perturbation
  const turb = weather.preset.turbulence * stabilityMult;
  const rollKick = Math.sin(weather.time * 3.7 + x * 0.01) * turb * 0.42;
  const pitchKick = Math.cos(weather.time * 2.9 + z * 0.01) * turb * 0.24;

  return { vx, vy, vz, rollKick, pitchKick, inThermal };
}
