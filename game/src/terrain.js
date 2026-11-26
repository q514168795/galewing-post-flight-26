// SPDX-License-Identifier: MIT
// Amber Archipelago 3D world generator: islands, volcanic calderas, lighthouses, harbors, and airstrip runways.

import { createRng, randRange } from './random.js';

export const ARCHIPELAGO_ISLANDS = [
  { id: 'pelican-quay', name: 'Pelican Quay', x: 0, z: 0, radius: 520, peak: 88, kind: 'harbor', rwyHeading: 84, hasLighthouse: true, hasHangar: true },
  { id: 'coral-spire', name: 'Coral Spire', x: 1650, z: 420, radius: 480, peak: 175, kind: 'canyon', rwyHeading: 62, hasLighthouse: false, hasHangar: true },
  { id: 'beacon-point', name: 'Beacon Point', x: 3250, z: -260, radius: 440, peak: 132, kind: 'lighthouse', rwyHeading: 105, hasLighthouse: true, hasHangar: true },
  { id: 'squall-reach', name: 'Squall Reach', x: 4820, z: 680, radius: 560, peak: 196, kind: 'clinic', rwyHeading: 78, hasLighthouse: true, hasHangar: true },
  { id: 'mt-solis', name: 'Mt. Solis', x: 6420, z: -120, radius: 660, peak: 340, kind: 'volcano', rwyHeading: 90, hasLighthouse: false, hasHangar: true },
  { id: 'drifter-atoll', name: 'Drifter Atoll', x: 8050, z: 540, radius: 470, peak: 92, kind: 'atoll', rwyHeading: 82, hasLighthouse: true, hasHangar: true },
  { id: 'amber-channel', name: 'Amber Channel', x: 9680, z: 120, radius: 590, peak: 225, kind: 'strait', rwyHeading: 88, hasLighthouse: true, hasHangar: true },
  { id: 'imperial-harbor', name: 'Imperial Harbor', x: 11420, z: 320, radius: 680, peak: 185, kind: 'capital', rwyHeading: 90, hasLighthouse: true, hasHangar: true },
];

export function buildArchipelago(seed) {
  const rng = createRng(seed ^ 0x51a7);
  const islands = [];
  const runways = [];
  const lighthouses = [];
  const hangars = [];
  const scenicIslets = [];

  for (let idx = 0; idx < ARCHIPELAGO_ISLANDS.length; idx++) {
    const def = ARCHIPELAGO_ISLANDS[idx];
    const verts = [];
    const sides = 14;
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2;
      const wobble = 0.82 + 0.34 * Math.sin(ang * 3 + idx * 1.4) + randRange(rng, -0.07, 0.07);
      verts.push({
        x: def.x + Math.cos(ang) * def.radius * wobble,
        z: def.z + Math.sin(ang) * def.radius * wobble,
      });
    }

    const rwyRad = (def.rwyHeading * Math.PI) / 180;
    const rwyLength = def.kind === 'capital' ? 420 : 340;
    const rwyWidth = 34;
    const rwyY = 14;
    const rwyCenterX = def.x + Math.cos(rwyRad + Math.PI * 0.5) * 45;
    const rwyCenterZ = def.z - Math.sin(rwyRad + Math.PI * 0.5) * 45;
    const rwyCode = String(Math.round(def.rwyHeading / 10) || 36).padStart(2, '0');

    const runway = {
      id: `rwy-${def.id}`,
      islandId: def.id,
      islandName: def.name,
      code: `RWY ${rwyCode}`,
      x: rwyCenterX,
      y: rwyY,
      z: rwyCenterZ,
      headingRad: rwyRad,
      headingDeg: def.rwyHeading,
      length: rwyLength,
      width: rwyWidth,
      dirX: Math.sin(rwyRad),
      dirZ: Math.cos(rwyRad),
      rightX: Math.cos(rwyRad),
      rightZ: -Math.sin(rwyRad),
    };
    runways.push(runway);

    // Secondary terrain ridges & volcanic spires offset well clear of runway approach corridor
    const peaks = [];
    const peakCount = def.kind === 'volcano' ? 3 : 2;
    for (let p = 0; p < peakCount; p++) {
      const side = p % 2 === 0 ? -1 : 1;
      const lateral = 245 + p * 78 + randRange(rng, -15, 25);
      const along = randRange(rng, -90, 120);
      const px = rwyCenterX + runway.rightX * side * lateral + runway.dirX * along;
      const pz = rwyCenterZ + runway.rightZ * side * lateral + runway.dirZ * along;
      const height = p === 0 ? def.peak : def.peak * randRange(rng, 0.55, 0.8);
      const baseR = def.radius * (p === 0 ? 0.44 : 0.32);
      peaks.push({
        x: px,
        z: pz,
        height,
        baseR,
        crater: def.kind === 'volcano' && p === 0,
      });
    }

    // Pine groves on flanks
    const trees = [];
    for (let t = 0; t < 18; t++) {
      const side = t % 2 === 0 ? -1 : 1;
      const lat = randRange(rng, 68, def.radius * 0.52);
      const al = randRange(rng, -def.radius * 0.45, def.radius * 0.45);
      const tx = rwyCenterX + runway.rightX * side * lat + runway.dirX * al;
      const tz = rwyCenterZ + runway.rightZ * side * lat + runway.dirZ * al;
      trees.push({
        x: tx,
        z: tz,
        scale: randRange(rng, 10, 22),
      });
    }

    let lighthouse = null;
    if (def.hasLighthouse) {
      // Anchor lighthouse cleanly on the front coastal shoreline spit (clear of mountain slope!)
      const lx = rwyCenterX - runway.rightX * 145 - runway.dirX * (rwyLength * 0.48);
      const lz = rwyCenterZ - runway.rightZ * 145 - runway.dirZ * (rwyLength * 0.48);
      lighthouse = {
        islandId: def.id,
        islandName: def.name,
        x: lx,
        y: 12,
        z: lz,
        height: 54,
        phase: idx * 1.1,
      };
      lighthouses.push(lighthouse);
    }

    if (def.hasHangar) {
      hangars.push({
        islandId: def.id,
        x: rwyCenterX + runway.rightX * 56 - runway.dirX * 35,
        y: rwyY,
        z: rwyCenterZ + runway.rightZ * 56 - runway.dirZ * 35,
        headingRad: rwyRad,
      });
    }

    islands.push({
      ...def,
      index: idx,
      verts,
      peaks,
      trees,
      runway,
      lighthouse,
    });
  }

  // Add scenic sea-stacks & jagged volcanic islets well clear of runway approach corridors
  for (let i = 0; i < 42; i++) {
    const seg = i % (ARCHIPELAGO_ISLANDS.length - 1);
    const a = ARCHIPELAGO_ISLANDS[seg];
    const b = ARCHIPELAGO_ISLANDS[seg + 1];
    const t = randRange(rng, 0.22, 0.78);
    const side = i % 2 === 0 ? 1 : -1;
    const offset = side * randRange(rng, 320, 820);
    const ix = a.x + (b.x - a.x) * t + randRange(rng, -90, 90);
    const iz = a.z + (b.z - a.z) * t + offset;
    const tooClose = runways.some((r) => Math.hypot(ix - r.x, iz - r.z) < 780);
    if (tooClose) continue;
    scenicIslets.push({
      x: ix,
      z: iz,
      radius: randRange(rng, 55, 145),
      height: randRange(rng, 38, 148),
      volcanic: i % 5 === 0,
    });
  }

  return { seed, islands, runways, lighthouses, hangars, scenicIslets };
}

export function queryTerrainElevation(world, x, z) {
  let maxElev = 0;
  let surface = 'water';
  let onRunway = null;

  for (const rwy of world.runways) {
    const dx = x - rwy.x;
    const dz = z - rwy.z;
    const along = dx * rwy.dirX + dz * rwy.dirZ;
    const across = dx * rwy.rightX + dz * rwy.rightZ;
    if (Math.abs(along) <= rwy.length * 0.54 && Math.abs(across) <= rwy.width * 0.65) {
      return { elevation: rwy.y, surface: 'runway', runway: rwy, along, across };
    }
    // Flat graded apron around runway
    if (Math.abs(along) <= rwy.length * 0.62 && Math.abs(across) <= rwy.width * 1.4) {
      if (rwy.y > maxElev) {
        maxElev = rwy.y;
        surface = 'grass';
        onRunway = rwy;
      }
    }
  }

  for (const isl of world.islands) {
    const d = Math.hypot(x - isl.x, z - isl.z);
    if (d < isl.radius * 1.05) {
      const shelf = Math.max(0, 1 - d / (isl.radius * 1.05)) * 18;
      if (shelf > maxElev) {
        maxElev = shelf;
        surface = shelf > 5 ? 'island' : 'sand';
      }
      for (const pk of isl.peaks) {
        const dp = Math.hypot(x - pk.x, z - pk.z);
        if (dp < pk.baseR) {
          const ratio = 1 - dp / pk.baseR;
          let h = 14 + pk.height * Math.pow(ratio, 1.35);
          if (pk.crater && dp < pk.baseR * 0.24) {
            h -= (1 - dp / (pk.baseR * 0.24)) * 36;
          }
          if (h > maxElev) {
            maxElev = h;
            surface = 'cliff';
          }
        }
      }
    }
  }

  for (const islet of world.scenicIslets) {
    const d = Math.hypot(x - islet.x, z - islet.z);
    if (d < islet.radius) {
      const h = islet.height * Math.pow(1 - d / islet.radius, 1.25);
      if (h > maxElev) {
        maxElev = h;
        surface = 'cliff';
      }
    }
  }

  return { elevation: maxElev, surface, runway: onRunway, along: 0, across: 0 };
}

export function computePapiLights(plane, runway) {
  // Distance along approach to runway touchdown zone
  const tdX = runway.x - runway.dirX * (runway.length * 0.34);
  const tdZ = runway.z - runway.dirZ * (runway.length * 0.34);
  const dx = plane.x - tdX;
  const dz = plane.z - tdZ;
  const dist = Math.max(35, Math.hypot(dx, dz));
  const altAbove = Math.max(0, plane.y - runway.y);
  const slopeDeg = (Math.atan2(altAbove, dist) * 180) / Math.PI;
  // Standard 4-light PAPI thresholds around ideal 4.5 deg visual approach
  const thresholds = [6.2, 5.1, 3.9, 2.8];
  return thresholds.map((th) => (slopeDeg >= th ? 'white' : 'red'));
}
