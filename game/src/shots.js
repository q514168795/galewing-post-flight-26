// SPDX-License-Identifier: MIT
// Deterministic ?shot= staging for 4 polished competition screenshots (sync paint + 8 rAF + __shotReady).

import { buildArchipelago } from './terrain.js';
import { createWeatherState, stepWeather } from './weather.js';
import { createAircraft, stepFlightModel } from './flightModel.js';
import { buildSortieMission } from './missions.js';
import { createCameraState, snapCameraToPlane } from './camera.js';
import { computeRefitMods, REFIT_CATALOG } from './refits.js';
import { evaluateFeats } from './feats.js';
import { createEmptySlots } from './save.js';

export function buildShotState(shotName, seed, actions) {
  const world = buildArchipelago(seed);
  const ownedRefits = [
    'twin-supercharger',
    'brass-props',
    'slotted-flaps',
    'albatross-tips',
    'gyro-compass',
    'storm-radar',
  ];
  const refitMods = computeRefitMods(ownedRefits);

  const campaign = {
    seed,
    sortieIndex: 5,
    completedSorties: 5,
    totalScore: 142800,
    postage: 3420,
    refits: ownedRefits,
    sortieScores: [
      { score: 21400, rating: 'GREASED' },
      { score: 24900, rating: 'GREASED' },
      { score: 26300, rating: 'FIRM' },
      { score: 29800, rating: 'GREASED' },
      { score: 31200, rating: 'GREASED' },
      { score: 35600, rating: 'GREASED' },
      { score: 42400, rating: 'GREASED' },
    ],
    stats: {
      greasedLandings: 6,
      centerlineHits: 4,
      bestStreak: 6,
      bullseyeDrops: 3,
      stormCleared: true,
      thermalClimbFt: 620,
      bingoLandings: 1,
      usedCockpit: true,
      cleanHullSorties: 5,
      maxSetPieces: 3,
      fullFlapLanding: true,
    },
    feats: [],
  };

  if (shotName === 'play-cover') {
    // Climax Golden Hour 3/4 Chase frame: AERO-7 PELICAN banking toward glowing Final Gate + clean unobstructed RWY 09 + PAPI + Lighthouse!
    const mission = buildSortieMission(5, world, refitMods);
    const weather = createWeatherState('goldenHour', seed, mission.thermals);
    stepWeather(weather, 1.8);

    const rwy = mission.targetRunway;
    for (let i = 0; i < mission.rings.length - 1; i++) mission.rings[i].cleared = true;
    mission.ringsCleared = mission.rings.length - 1;
    for (const dz of mission.dropZones) dz.delivered = true;
    mission.dropsCleared = mission.dropZones.length;
    mission.streak = 6;
    mission.bestStreak = 6;
    mission.score = 18400;
    mission.timeLeft = 74;
    mission.postageEarned = 640;
    mission.radioLine = 'Cleared RWY 09 — hold 15° flaps & glide PAPI.';

    // Position Final Gate cleanly on ideal 4.5-deg glideslope so PAPI reads iconic 2 WHITE + 2 RED and ring clears propellers!
    const finalRing = mission.rings[mission.rings.length - 1];
    finalRing.x = rwy.x - rwy.dirX * 365;
    finalRing.z = rwy.z - rwy.dirZ * 365;
    finalRing.y = rwy.y + 29;
    finalRing.yaw = rwy.headingRad;
    finalRing.cleared = false;

    const plane = createAircraft(
      {
        x: finalRing.x - rwy.dirX * 172 - rwy.rightX * 16,
        y: finalRing.y + 6,
        z: finalRing.z - rwy.dirZ * 172 - rwy.rightZ * 16,
        headingDeg: rwy.headingDeg - 4,
        speedKts: 112,
        pitchRad: -0.05,
        rollRad: 0.24,
        throttle: 0.78,
        fuelPct: 68,
        hullPct: 94,
      },
      refitMods,
    );
    plane.flapIndex = 1;
    plane.flapsDeg = 15;
    plane.aileronDeflect = 0.62;
    plane.boosting = false;

    for (let s = 0; s < 16; s++) {
      plane.trail.push({
        x: plane.x - Math.sin(plane.yaw) * (16 - s) * 2.8,
        y: plane.y + (16 - s) * 0.22,
        z: plane.z - Math.cos(plane.yaw) * (16 - s) * 2.8,
        roll: plane.roll * (0.6 + (s / 16) * 0.4),
        yaw: plane.yaw,
      });
    }
    stepFlightModel(plane, { pitch: 0, roll: 0.08, yaw: 0, throttleDelta: 0, boost: false }, world, weather, refitMods, 1 / 60);
    plane.verticalFpm = -210;

    const camera = createCameraState(plane);
    camera.mode = 'chase';
    snapCameraToPlane(camera, plane);
    camera.y += 2.6;
    camera.pitch -= 0.025;

    return {
      screen: 'play',
      paused: false,
      selectedSlot: 0,
      logbookSlots: createEmptySlots(),
      world,
      weather,
      plane,
      mission,
      camera,
      campaign,
      refitMods,
      hangar: null,
      debrief: null,
      actions,
    };
  }

  if (shotName === 'cockpit-storm') {
    // First-person Lit 6-Pack Cockpit in Monsoon Squall: RWY 08 clearly visible ahead through sleek gate + rain/lightning!
    campaign.sortieIndex = 2;
    campaign.completedSorties = 2;
    campaign.totalScore = 68450;
    const mission = buildSortieMission(2, world, refitMods);
    const weather = createWeatherState('monsoon', seed, mission.thermals);
    stepWeather(weather, 2.4);
    weather.lightningFlash = 0.82;
    weather.lightningBoltX = 0.76;
    weather.windSpeedKts = 28;

    const rwy = mission.targetRunway;
    for (let i = 0; i < mission.rings.length - 1; i++) mission.rings[i].cleared = true;
    mission.ringsCleared = mission.rings.length - 1;
    // Mark clinic drop delivered so approach sightline to RWY 08 is 100% crisp and unambiguous!
    for (const dz of mission.dropZones) dz.delivered = true;
    mission.dropsCleared = mission.dropZones.length;
    mission.streak = 4;
    mission.timeLeft = 41;
    mission.score = 12900;
    mission.radioLine = '28 KT gusts! Cut boost at 18% fuel — ILS RWY 08.';

    const finalRing = mission.rings[mission.rings.length - 1];
    finalRing.x = rwy.x - rwy.dirX * 320;
    finalRing.z = rwy.z - rwy.dirZ * 320;
    finalRing.y = rwy.y + 28;
    finalRing.yaw = rwy.headingRad;
    finalRing.cleared = false;

    const plane = createAircraft(
      {
        x: finalRing.x - rwy.dirX * 185 + rwy.rightX * 4,
        y: finalRing.y + 14,
        z: finalRing.z - rwy.dirZ * 185 + rwy.rightZ * 4,
        headingDeg: rwy.headingDeg - 1,
        speedKts: 88,
        pitchRad: -0.055,
        rollRad: -0.11,
        throttle: 0.56,
        fuelPct: 18,
        hullPct: 64,
      },
      refitMods,
    );
    plane.flapIndex = 1;
    plane.flapsDeg = 15;
    plane.bingoFuel = true;
    plane.verticalFpm = -260;

    const camera = createCameraState(plane);
    camera.mode = 'cockpit';
    snapCameraToPlane(camera, plane);

    return {
      screen: 'play',
      paused: false,
      selectedSlot: 0,
      logbookSlots: createEmptySlots(),
      world,
      weather,
      plane,
      mission,
      camera,
      campaign,
      refitMods,
      hangar: null,
      debrief: null,
      actions,
    };
  }

  if (shotName === 'hangar-refit') {
    campaign.sortieIndex = 5;
    campaign.completedSorties = 5;
    campaign.postage = 3420;
    campaign.refits = ['slotted-flaps', 'oleo-struts', 'gyro-compass', 'storm-radar'];
    const choices = [
      REFIT_CATALOG.find((r) => r.id === 'twin-supercharger'),
      REFIT_CATALOG.find((r) => r.id === 'albatross-tips'),
      REFIT_CATALOG.find((r) => r.id === 'chart-folio'),
    ];
    return {
      screen: 'hangar',
      paused: false,
      selectedSlot: 0,
      logbookSlots: createEmptySlots(),
      world,
      weather: createWeatherState('goldenHour', seed),
      plane: null,
      mission: null,
      camera: null,
      campaign,
      refitMods: computeRefitMods(campaign.refits),
      hangar: {
        choices,
        selectedIndex: 0,
        rerollCost: 150,
        freeRerolls: 0,
        rerollCount: 0,
      },
      debrief: null,
      actions,
    };
  }

  campaign.sortieIndex = 7;
  campaign.completedSorties = 7;
  campaign.totalScore = 211600;
  campaign.postage = 4890;
  campaign.refits = [
    'twin-supercharger',
    'brass-props',
    'slotted-flaps',
    'albatross-tips',
    'gyro-compass',
    'storm-radar',
    'chart-folio',
  ];
  evaluateFeats(campaign);

  return {
    screen: 'debrief',
    paused: false,
    selectedSlot: 0,
    logbookSlots: createEmptySlots(),
    world,
    weather: createWeatherState('goldenHour', seed),
    plane: null,
    mission: null,
    camera: null,
    campaign,
    refitMods: computeRefitMods(campaign.refits),
    hangar: null,
    debrief: {
      grade: 'S',
      headline: 'ALL 7 AMBER ARCHIPELAGO SORTIES COMPLETED · MASTER AIRMAIL PILOT',
      fuelPct: 44,
      hullPct: 92,
      crashReason: '',
      lastLanding: {
        runwayCode: 'RWY 09',
        islandName: 'Imperial Harbor',
        fpm: -140,
        rating: 'GREASED',
        centerlinePct: 98,
        centerOffset: 0.4,
        touchSpeedKts: 66,
        flapsDeg: 35,
        bonus: 3500,
      },
    },
    actions,
  };
}

export function runDeterministicShot(shotName, seed, renderer, actions) {
  const state = buildShotState(shotName, seed, actions);
  renderer.resize();
  renderer.draw(state);

  let painted = 0;
  function tick() {
    renderer.resize();
    renderer.draw(state);
    painted++;
    if (painted < 8) {
      window.requestAnimationFrame(tick);
    } else {
      window.__shotReady = true;
    }
  }
  window.requestAnimationFrame(tick);
}
