// SPDX-License-Identifier: MIT
// Unified illustrated 3D renderer: backlit coastal cliffs, shimmering ocean, PAPI runways, AERO-7 Pelican & lit cockpit.

import { PALETTE } from './config.js';
import { clamp, lerp, wrapAngleRad } from './random.js';
import { buildCameraBasis, projectPoint, projectRingPoints } from './camera.js';
import { computePapiLights } from './terrain.js';

function drawPoly(ctx, pts, fill, stroke, lineWidth = 1.4) {
  if (!pts || pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function drawSkyAndOcean(ctx, basis, cam, weather, w, h) {
  const p = weather.preset;
  const isStorm = p.rainIntensity > 0.5;
  const horizonY = basis.cy + Math.tan(cam.pitch) * basis.focal;
  const diag = Math.hypot(w, h) * 0.95;

  ctx.save();
  ctx.translate(basis.cx, horizonY);
  ctx.rotate(-cam.roll);

  // Rich atmospheric sky gradient
  const skyGrad = ctx.createLinearGradient(0, -diag * 0.72, 0, 12);
  skyGrad.addColorStop(0, p.skyTop);
  skyGrad.addColorStop(0.52, p.skyMid);
  skyGrad.addColorStop(0.92, p.skyHorizon);
  skyGrad.addColorStop(1, p.fogColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-diag, -diag, diag * 2, diag + 20);

  // Lightning sheet flash illuminating upper storm clouds
  if (weather.lightningFlash > 0.02) {
    const boltScreenX = (weather.lightningBoltX - 0.5) * w;
    const flashGrad = ctx.createRadialGradient(boltScreenX, -135, 16, boltScreenX, -120, 390);
    flashGrad.addColorStop(0, `rgba(225, 246, 255, ${weather.lightningFlash * 0.65})`);
    flashGrad.addColorStop(0.45, `rgba(142, 206, 238, ${weather.lightningFlash * 0.3})`);
    flashGrad.addColorStop(1, 'rgba(120, 180, 215, 0)');
    ctx.fillStyle = flashGrad;
    ctx.fillRect(-diag, -diag, diag * 2, diag + 20);
  }

  // Sun disc + concentric golden-hour glow
  const sunYawDiff = wrapAngleRad(p.sunAzimuth - cam.yaw);
  const sunX = sunYawDiff * basis.focal * 0.85;
  const sunY = -p.sunElevation * basis.focal * 0.85;
  if (!isStorm && Math.abs(sunX) < diag * 0.95) {
    const halo = ctx.createRadialGradient(sunX, sunY, 14, sunX, sunY, 270);
    halo.addColorStop(0, '#fff8db');
    halo.addColorStop(0.22, 'rgba(255, 216, 122, 0.72)');
    halo.addColorStop(0.55, 'rgba(244, 148, 76, 0.24)');
    halo.addColorStop(1, 'rgba(244, 148, 76, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 270, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff5cf';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant atmospheric archipelago mountain silhouette range (soft mist-blended)
  ctx.fillStyle = isStorm ? 'rgba(26, 44, 58, 0.72)' : 'rgba(112, 68, 84, 0.44)';
  ctx.beginPath();
  ctx.moveTo(-diag, 6);
  for (let x = -diag; x <= diag; x += 36) {
    const ang = cam.yaw + x / (basis.focal * 0.92);
    const ridge = Math.max(
      0,
      Math.sin(ang * 2.8) * 22 + Math.sin(ang * 6.5 + 1.4) * 12 + Math.cos(ang * 11.7) * 5,
    );
    ctx.lineTo(x, 3 - ridge);
  }
  ctx.lineTo(diag, 6);
  ctx.closePath();
  ctx.fill();

  // Deep sunlit ocean gradient
  const seaGrad = ctx.createLinearGradient(0, 0, 0, diag * 0.78);
  seaGrad.addColorStop(0, isStorm ? '#344f5c' : '#e6a066');
  seaGrad.addColorStop(0.05, p.oceanDeep);
  seaGrad.addColorStop(0.42, p.oceanNear);
  seaGrad.addColorStop(1, isStorm ? '#081b28' : '#0f384e');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(-diag, 0, diag * 2, diag);

  // Shimmering golden sun reflection path dancing across waves
  if (!isStorm && Math.abs(sunX) < diag * 0.9) {
    for (let i = 0; i < 36; i++) {
      const f = i / 36;
      const ry = 4 + Math.pow(f, 1.85) * 340;
      const rw = 24 + f * 165 + Math.sin(weather.time * 2.8 + i * 1.9) * 22;
      const rx = sunX + Math.sin(weather.time * 1.6 + i * 1.3) * (8 + f * 24);
      ctx.fillStyle = `rgba(255, 224, 138, ${0.55 - f * 0.38})`;
      ctx.fillRect(rx - rw * 0.5, ry, rw, 2.2 + f * 3.8);
    }
  }

  // Stylized wave swell bands
  const drift = (weather.time * 16) % 32;
  ctx.strokeStyle = isStorm ? 'rgba(182, 218, 232, 0.16)' : 'rgba(255, 234, 184, 0.18)';
  for (let i = 1; i <= 20; i++) {
    const frac = Math.pow(i / 20, 2.1);
    const wy = 6 + frac * (diag * 0.65) + (drift / 32) * frac * 12;
    ctx.lineWidth = 1 + frac * 1.9;
    ctx.beginPath();
    for (let seg = -7; seg <= 7; seg++) {
      const sx = seg * 160 + Math.sin(i * 1.9 + seg) * 26;
      ctx.moveTo(sx - 32 * (0.4 + frac), wy);
      ctx.lineTo(sx + 32 * (0.4 + frac), wy);
    }
    ctx.stroke();
  }

  // Warm/misty horizon atmospheric haze band
  const hazeGrad = ctx.createLinearGradient(0, -18, 0, 22);
  hazeGrad.addColorStop(0, 'rgba(0,0,0,0)');
  hazeGrad.addColorStop(0.5, isStorm ? 'rgba(84, 114, 126, 0.45)' : 'rgba(246, 178, 108, 0.44)');
  hazeGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hazeGrad;
  ctx.fillRect(-diag, -18, diag * 2, 40);

  ctx.restore();

  // Forked monsoon lightning bolt with reactive glow
  if (weather.lightningFlash > 0.35) {
    ctx.save();
    let bx = w * weather.lightningBoltX;
    let by = 48;
    ctx.strokeStyle = `rgba(235, 250, 255, ${weather.lightningFlash})`;
    ctx.lineWidth = 3.2;
    ctx.shadowColor = '#8ce0ff';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    const pts = [[bx, by]];
    for (let s = 0; s < 6; s++) {
      bx += s % 2 === 0 ? -18 : 26;
      by += 32;
      ctx.lineTo(bx, by);
      pts.push([bx, by]);
    }
    ctx.stroke();
    // Secondary fork branch
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pts[2][0], pts[2][1]);
    ctx.lineTo(pts[2][0] - 28, pts[2][1] + 24);
    ctx.lineTo(pts[2][0] - 18, pts[2][1] + 52);
    ctx.stroke();
    ctx.restore();
  }
}

function drawClouds(ctx, basis, weather) {
  const isStorm = weather.preset.rainIntensity > 0.5;
  const visible = [];
  for (const c of weather.clouds) {
    const p = projectPoint(basis, c.x, c.y, c.z);
    if (!p || p.z > 6500 || p.sx < -340 || p.sx > basis.width + 340) continue;
    visible.push({ c, p });
  }
  visible.sort((a, b) => b.p.z - a.p.z);

  for (const { c, p } of visible) {
    const r = clamp(c.radius * p.scale, 20, 175);
    const alpha = clamp((1 - p.z / 6500) * 0.92, 0.16, 0.9);
    ctx.save();
    ctx.globalAlpha = alpha;

    // Cel-shaded layered cumulus: sunlit warm peach/gold underside vs twilight/storm cap
    const topCol = isStorm ? '#293e4c' : '#f2c8b0';
    const midCol = isStorm ? '#1b2b36' : '#fae4c6';
    const rimCol = isStorm
      ? (weather.lightningFlash > 0.25 ? '#9cd4ee' : '#4a6675')
      : '#ffd996';

    // Flat cloud base deck
    ctx.fillStyle = isStorm ? '#16232d' : '#c87e6c';
    ctx.beginPath();
    ctx.roundRect(p.sx - r * 1.15, p.sy - r * 0.08, r * 2.3, r * 0.34, r * 0.16);
    ctx.fill();

    // Sculpted billowing tops
    const offsets = [-0.62, -0.15, 0.34, 0.72];
    const scales = [0.46, 0.66, 0.56, 0.4];
    for (let i = 0; i < offsets.length; i++) {
      const ox = offsets[i] * r;
      const pr = scales[i] * r;
      ctx.fillStyle = topCol;
      ctx.beginPath();
      ctx.arc(p.sx + ox, p.sy - pr * 0.12, pr, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = midCol;
      ctx.beginPath();
      ctx.arc(p.sx + ox + pr * 0.08, p.sy - pr * 0.06, pr * 0.82, Math.PI * 1.05, -0.05);
      ctx.closePath();
      ctx.fill();
    }

    // Lit lower/edge rim glow
    ctx.strokeStyle = rimCol;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.sx - r * 1.02, p.sy + r * 0.22);
    ctx.lineTo(p.sx + r * 1.02, p.sy + r * 0.22);
    ctx.stroke();

    // Hanging rain curtains under storm clouds
    if (isStorm && p.z < 3600) {
      ctx.strokeStyle = 'rgba(130, 168, 184, 0.14)';
      ctx.lineWidth = 2.5;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(p.sx + k * r * 0.38, p.sy + r * 0.24);
        ctx.lineTo(p.sx + k * r * 0.38 - 22, p.sy + r * 1.65);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawVolcanicHeadland(ctx, lPt, rPt, apex, base, isStorm, distZ, sunIsRight, isCrater, time) {
  // Organic stepped coastal ridge profile (7-vertex faceted headland, NOT a sharp pyramid!)
  const w = rPt.sx - lPt.sx;
  const h = base.sy - apex.sy;
  if (Math.abs(w) < 6 || h < 4) return;

  const fogBlend = clamp((distZ - 900) / 4200, 0, 0.65);
  const shL = { sx: lPt.sx + w * 0.19, sy: base.sy - h * 0.56 };
  const topL = { sx: lPt.sx + w * 0.39, sy: apex.sy + h * 0.08 };
  const topR = { sx: lPt.sx + w * 0.57, sy: apex.sy + (isCrater ? h * 0.06 : 0) };
  const shR = { sx: lPt.sx + w * 0.81, sy: base.sy - h * 0.44 };
  const ridgeBot = { sx: lPt.sx + w * 0.49, sy: base.sy + 3 };

  const litColor = isStorm ? '#445c69' : '#c68a5c';
  const midColor = isStorm ? '#2c414f' : '#80574a';
  const darkColor = isStorm ? '#1b2c37' : '#4f3a43';
  const outlineCol = isStorm ? 'rgba(15, 28, 36, 0.72)' : 'rgba(42, 28, 34, 0.62)';

  // Align sunlit face toward the sun!
  const leftFill = sunIsRight ? darkColor : litColor;
  const rightFill = sunIsRight ? litColor : darkColor;

  ctx.save();
  // Whole volcanic massif silhouette
  drawPoly(ctx, [lPt, shL, topL, topR, shR, rPt], midColor, outlineCol, 1.3);
  // Sunlit facet
  drawPoly(ctx, [lPt, shL, topL, ridgeBot], leftFill, null, 0);
  // Shadow facet
  drawPoly(ctx, [ridgeBot, topL, topR, shR, rPt], rightFill, null, 0);

  // Warm sunset rim highlight along the sun-facing crest line
  if (!isStorm) {
    ctx.strokeStyle = 'rgba(255, 214, 134, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    if (sunIsRight) {
      ctx.moveTo(topL.sx, topL.sy);
      ctx.lineTo(topR.sx, topR.sy);
      ctx.lineTo(shR.sx, shR.sy);
    } else {
      ctx.moveTo(shL.sx, shL.sy);
      ctx.lineTo(topL.sx, topL.sy);
      ctx.lineTo(topR.sx, topR.sy);
    }
    ctx.stroke();
  }

  // Atmospheric distance haze tint over far islands
  if (fogBlend > 0.05) {
    drawPoly(
      ctx,
      [lPt, shL, topL, topR, shR, rPt],
      isStorm ? `rgba(54, 80, 92, ${fogBlend})` : `rgba(226, 152, 102, ${fogBlend * 0.75})`,
      null,
      0,
    );
  }

  // Volcanic caldera ember & soft drifting plume on Mt. Solis
  if (isCrater) {
    ctx.fillStyle = 'rgba(244, 118, 56, 0.72)';
    ctx.beginPath();
    ctx.ellipse((topL.sx + topR.sx) * 0.5, topL.sy + 2, Math.max(6, Math.abs(w) * 0.1), 4, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = `rgba(218, 184, 166, ${0.22 - s * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(topR.sx + 10 + s * 18, topR.sy - 12 - s * 18 + Math.sin(time + s) * 4, 14 + s * 8, 8 + s * 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawScenicIslet(ctx, basis, islet, isStorm, sunScreenX, time) {
  const base = projectPoint(basis, islet.x, 0, islet.z);
  const top = projectPoint(basis, islet.x, islet.height, islet.z);
  const left = projectPoint(basis, islet.x - basis.rightX * islet.radius, 0, islet.z - basis.rightZ * islet.radius);
  const right = projectPoint(basis, islet.x + basis.rightX * islet.radius, 0, islet.z + basis.rightZ * islet.radius);
  if (!base || !top || !left || !right) return;

  // Foaming turquoise reef collar
  ctx.fillStyle = isStorm ? 'rgba(135, 182, 198, 0.28)' : 'rgba(94, 206, 196, 0.36)';
  ctx.beginPath();
  ctx.ellipse(base.sx, base.sy + 2, Math.abs(right.sx - left.sx) * 0.56, Math.max(3, Math.abs(right.sx - left.sx) * 0.12), 0, 0, Math.PI * 2);
  ctx.fill();

  drawVolcanicHeadland(ctx, left, right, top, base, isStorm, base.z, sunScreenX > base.sx, false, time);
}

function drawRunway(ctx, basis, runway, plane, weather) {
  const halfL = runway.length * 0.5;
  const halfW = runway.width * 0.5;
  const y = runway.y + 0.4;

  const corners = [
    projectPoint(basis, runway.x - runway.dirX * halfL - runway.rightX * halfW, y, runway.z - runway.dirZ * halfL - runway.rightZ * halfW),
    projectPoint(basis, runway.x - runway.dirX * halfL + runway.rightX * halfW, y, runway.z - runway.dirZ * halfL + runway.rightZ * halfW),
    projectPoint(basis, runway.x + runway.dirX * halfL + runway.rightX * halfW, y, runway.z + runway.dirZ * halfL + runway.rightZ * halfW),
    projectPoint(basis, runway.x + runway.dirX * halfL - runway.rightX * halfW, y, runway.z + runway.dirZ * halfL - runway.rightZ * halfW),
  ];
  if (corners.some((c) => !c)) return;

  // Graded gravel shoulder & asphalt runway deck
  drawPoly(ctx, corners, '#263038', '#f6efde', 2.0);

  // Sequential approach lead-in strobe lights ("rabbit" lights) extending before threshold
  for (let s = 1; s <= 4; s++) {
    const along = -halfL - s * 28;
    const pt = projectPoint(basis, runway.x + runway.dirX * along, y + 1.5, runway.z + runway.dirZ * along);
    if (!pt) continue;
    const pulse = (Math.floor(weather.time * 6) % 4) === (4 - s);
    ctx.save();
    ctx.shadowColor = pulse ? '#fff8d4' : '#ffd46b';
    ctx.shadowBlur = pulse ? 16 : 8;
    ctx.fillStyle = pulse ? '#ffffff' : '#ffd46b';
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy, clamp(pt.scale * (pulse ? 3.2 : 2.2), 2.5, 6.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Threshold piano keys
  for (let k = -2; k <= 2; k++) {
    const off = k * (halfW * 0.34);
    const p1 = projectPoint(basis, runway.x - runway.dirX * (halfL - 6) + runway.rightX * off, y + 0.4, runway.z - runway.dirZ * (halfL - 6) + runway.rightZ * off);
    const p2 = projectPoint(basis, runway.x - runway.dirX * (halfL - 22) + runway.rightX * off, y + 0.4, runway.z - runway.dirZ * (halfL - 22) + runway.rightZ * off);
    if (!p1 || !p2) continue;
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = clamp(p1.scale * 2.4, 1.4, 4.5);
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }

  // Painted runway numerals directly on the asphalt surface (e.g. "09" or "08")
  const numPt = projectPoint(basis, runway.x - runway.dirX * (halfL - 44), y + 0.5, runway.z - runway.dirZ * (halfL - 44));
  if (numPt && numPt.z < 1800) {
    ctx.save();
    ctx.fillStyle = 'rgba(246, 239, 222, 0.9)';
    ctx.font = `900 ${clamp(Math.round(numPt.scale * 16), 11, 26)}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(runway.code.replace('RWY ', ''), numPt.sx, numPt.sy);
    ctx.restore();
  }

  // Crisp white dashed runway centerline
  ctx.strokeStyle = PALETTE.runwayLine;
  ctx.lineWidth = 2.2;
  for (let i = 1; i < 8; i++) {
    const a = -halfL + 40 + i * ((runway.length - 65) / 8);
    const b = a + 18;
    const p1 = projectPoint(basis, runway.x + runway.dirX * a, y + 0.3, runway.z + runway.dirZ * a);
    const p2 = projectPoint(basis, runway.x + runway.dirX * b, y + 0.3, runway.z + runway.dirZ * b);
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }

  // Runway edge marker lights (green threshold + warm amber edge beacons)
  for (let i = 0; i <= 5; i++) {
    const along = lerp(-halfL, halfL, i / 5);
    for (const side of [-1, 1]) {
      const pt = projectPoint(
        basis,
        runway.x + runway.dirX * along + runway.rightX * side * (halfW + 2.5),
        y + 1.5,
        runway.z + runway.dirZ * along + runway.rightZ * side * (halfW + 2.5),
      );
      if (!pt) continue;
      ctx.save();
      const col = i === 0 ? '#4eff9f' : '#ffd46b';
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, clamp(pt.scale * 2.4, 2.2, 5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // High-contrast 4-light PAPI glide-slope bar mounted cleanly on a dark roadside pad left of threshold
  const papiStates = computePapiLights(plane, runway);
  const papiAlong = -halfL * 0.54;
  const papiPts = [];
  for (let i = 0; i < 4; i++) {
    const lateral = -(halfW + 32 + i * 10);
    const pt = projectPoint(
      basis,
      runway.x + runway.dirX * papiAlong + runway.rightX * lateral,
      y + 2.6,
      runway.z + runway.dirZ * papiAlong + runway.rightZ * lateral,
    );
    if (pt) papiPts.push({ pt, state: papiStates[i] });
  }
  if (papiPts.length === 4) {
    const minX = Math.min(...papiPts.map((x) => x.pt.sx)) - 10;
    const maxX = Math.max(...papiPts.map((x) => x.pt.sx)) + 10;
    const avgY = papiPts.reduce((acc, x) => acc + x.pt.sy, 0) / 4;
    ctx.save();
    ctx.fillStyle = 'rgba(13, 24, 32, 0.9)';
    ctx.strokeStyle = '#5a7688';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(minX, avgY - 9, maxX - minX, 18, 4);
    ctx.fill();
    ctx.stroke();

    for (const { pt, state } of papiPts) {
      const isWhite = state === 'white';
      const r = clamp(pt.scale * 4.4, 4.2, 7.5);
      ctx.shadowColor = isWhite ? '#fff7d6' : '#ff2e24';
      ctx.shadowBlur = 12;
      ctx.fillStyle = isWhite ? '#fffdf0' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Red-roofed postal hangar & orange animated windsock beside the right apron
  const hangarBase = projectPoint(basis, runway.x + runway.rightX * (halfW + 32) - runway.dirX * 15, y, runway.z + runway.rightZ * (halfW + 32) - runway.dirZ * 15);
  if (hangarBase && hangarBase.z < 2400) {
    const hw = clamp(hangarBase.scale * 22, 8, 36);
    const hh = hw * 0.55;
    ctx.save();
    ctx.fillStyle = PALETTE.creamWarm;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.4;
    ctx.fillRect(hangarBase.sx - hw, hangarBase.sy - hh, hw * 2, hh);
    ctx.strokeRect(hangarBase.sx - hw, hangarBase.sy - hh, hw * 2, hh);
    // Dark hangar door opening
    ctx.fillStyle = '#182834';
    ctx.fillRect(hangarBase.sx - hw * 0.45, hangarBase.sy - hh * 0.7, hw * 0.9, hh * 0.7);
    // Crimson arched roof
    ctx.fillStyle = PALETTE.crimson;
    ctx.beginPath();
    ctx.ellipse(hangarBase.sx, hangarBase.sy - hh, hw * 1.08, hh * 0.46, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Orange striped windsock pole near runway approach right edge
  const sockBase = projectPoint(basis, runway.x + runway.rightX * (halfW + 18) - runway.dirX * (halfL * 0.55), y, runway.z + runway.rightZ * (halfW + 18) - runway.dirZ * (halfL * 0.55));
  const sockTop = projectPoint(basis, runway.x + runway.rightX * (halfW + 18) - runway.dirX * (halfL * 0.55), y + 14, runway.z + runway.rightZ * (halfW + 18) - runway.dirZ * (halfL * 0.55));
  if (sockBase && sockTop && sockBase.z < 1800) {
    ctx.save();
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sockBase.sx, sockBase.sy);
    ctx.lineTo(sockTop.sx, sockTop.sy);
    ctx.stroke();
    const flutter = Math.sin(weather.time * 7) * 2.5;
    drawPoly(
      ctx,
      [
        { sx: sockTop.sx, sy: sockTop.sy - 3 },
        { sx: sockTop.sx + 16, sy: sockTop.sy - 1 + flutter },
        { sx: sockTop.sx + 16, sy: sockTop.sy + 4 + flutter },
        { sx: sockTop.sx, sy: sockTop.sy + 4 },
      ],
      '#ff6b2b',
      PALETTE.ink,
      1,
    );
    ctx.restore();
  }
}

function drawLighthouse(ctx, basis, lh, time) {
  const base = projectPoint(basis, lh.x, 14, lh.z);
  const top = projectPoint(basis, lh.x, 14 + lh.height, lh.z);
  if (!base || !top || base.z > 4200) return;
  const wBase = clamp(base.scale * 11, 3.5, 22);
  const wTop = wBase * 0.56;

  // Grounded rocky coastal promontory base beneath lighthouse (NO floating green circle!)
  drawPoly(
    ctx,
    [
      { sx: base.sx - wBase * 2.2, sy: base.sy + wBase * 0.7 },
      { sx: base.sx - wBase * 1.4, sy: base.sy - wBase * 0.15 },
      { sx: base.sx + wBase * 1.4, sy: base.sy - wBase * 0.15 },
      { sx: base.sx + wBase * 2.3, sy: base.sy + wBase * 0.7 },
    ],
    '#5e4b42',
    PALETTE.ink,
    1.3,
  );

  // Red & cream striped masonry tower
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands;
    const t1 = (i + 1) / bands;
    const y0 = lerp(base.sy, top.sy, t0);
    const y1 = lerp(base.sy, top.sy, t1);
    const hw0 = lerp(wBase, wTop, t0);
    const hw1 = lerp(wBase, wTop, t1);
    const cx0 = lerp(base.sx, top.sx, t0);
    const cx1 = lerp(base.sx, top.sx, t1);
    drawPoly(
      ctx,
      [
        { sx: cx0 - hw0, sy: y0 },
        { sx: cx0 + hw0, sy: y0 },
        { sx: cx1 + hw1, sy: y1 },
        { sx: cx1 - hw1, sy: y1 },
      ],
      i % 2 === 0 ? PALETTE.cream : PALETTE.crimson,
      PALETTE.ink,
      1.1,
    );
  }

  // Sweeping translucent warm lantern light cone
  const beamAng = Math.sin(time * 1.4 + lh.phase) * 0.55;
  const beamLen = clamp(top.scale * 185, 38, 220);
  ctx.save();
  const beamGrad = ctx.createLinearGradient(top.sx, top.sy, top.sx + Math.cos(beamAng) * beamLen, top.sy + Math.sin(beamAng) * 20);
  beamGrad.addColorStop(0, 'rgba(255, 236, 152, 0.78)');
  beamGrad.addColorStop(1, 'rgba(255, 236, 152, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(top.sx, top.sy);
  ctx.lineTo(top.sx + Math.cos(beamAng - 0.12) * beamLen, top.sy + Math.sin(beamAng - 0.12) * beamLen * 0.2 - 14);
  ctx.lineTo(top.sx + Math.cos(beamAng + 0.12) * beamLen, top.sy + Math.sin(beamAng + 0.12) * beamLen * 0.2 + 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff9cc';
  ctx.shadowColor = '#ffd46b';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(top.sx, top.sy - 2, clamp(wTop * 0.9, 3, 8.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIsland(ctx, basis, isl, plane, weather, sunScreenX) {
  const isStorm = weather.preset.rainIntensity > 0.5;
  const center = projectPoint(basis, isl.x, 8, isl.z);
  if (!center || center.z > 6500) return;

  const beachPts = [];
  const grassPts = [];
  for (const v of isl.verts) {
    const pb = projectPoint(basis, v.x, 1.2, v.z);
    const pg = projectPoint(basis, lerp(isl.x, v.x, 0.87), 13.5, lerp(isl.z, v.z, 0.87));
    if (pb) beachPts.push(pb);
    if (pg) grassPts.push(pg);
  }

  // Foaming coastal surf ring + turquoise reef
  if (beachPts.length >= 4) {
    ctx.save();
    ctx.strokeStyle = isStorm ? 'rgba(130, 178, 194, 0.38)' : 'rgba(92, 208, 200, 0.52)';
    ctx.lineWidth = clamp(center.scale * 18, 5, 20);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(beachPts[0].sx, beachPts[0].sy);
    for (let i = 1; i < beachPts.length; i++) ctx.lineTo(beachPts[i].sx, beachPts[i].sy);
    ctx.closePath();
    ctx.stroke();

    // Crisp white surf foam
    ctx.strokeStyle = 'rgba(248, 245, 232, 0.55)';
    ctx.lineWidth = clamp(center.scale * 5, 1.5, 4);
    ctx.stroke();
    ctx.restore();

    drawPoly(ctx, beachPts, isStorm ? '#676f63' : '#e0be86', 'rgba(32, 42, 48, 0.5)', 1.2);
  }
  if (grassPts.length >= 4) {
    drawPoly(ctx, grassPts, isStorm ? '#25423d' : '#43704d', 'rgba(26, 40, 38, 0.55)', 1.2);
  }

  // Backlit stepped volcanic ridges & cliffs
  for (const pk of isl.peaks) {
    const base = projectPoint(basis, pk.x, 12, pk.z);
    const apex = projectPoint(basis, pk.x, 14 + pk.height, pk.z);
    const lPt = projectPoint(basis, pk.x - basis.rightX * pk.baseR * 0.82, 12, pk.z - basis.rightZ * pk.baseR * 0.82);
    const rPt = projectPoint(basis, pk.x + basis.rightX * pk.baseR * 0.82, 12, pk.z + basis.rightZ * pk.baseR * 0.82);
    if (!base || !apex || !lPt || !rPt) continue;
    drawVolcanicHeadland(ctx, lPt, rPt, apex, base, isStorm, base.z, sunScreenX > base.sx, pk.crater, weather.time);
  }

  // Multi-tiered stylized pine groves
  if (center.z < 2600) {
    for (const tr of isl.trees) {
      const tb = projectPoint(basis, tr.x, 14, tr.z);
      const tt = projectPoint(basis, tr.x, 14 + tr.scale, tr.z);
      if (!tb || !tt) continue;
      const hw = clamp(tb.scale * tr.scale * 0.36, 2.5, 10);
      drawPoly(
        ctx,
        [{ sx: tb.sx - hw, sy: tb.sy }, { sx: tt.sx, sy: tt.sy }, { sx: tb.sx + hw, sy: tb.sy }],
        isStorm ? '#183430' : '#2d5c42',
        'rgba(18, 30, 26, 0.65)',
        0.9,
      );
      if (!isStorm) {
        // Warm golden-hour sunlit treetop highlight
        drawPoly(
          ctx,
          [{ sx: tb.sx - hw * 0.2, sy: lerp(tb.sy, tt.sy, 0.45) }, { sx: tt.sx, sy: tt.sy }, { sx: tb.sx + hw * 0.55, sy: lerp(tb.sy, tt.sy, 0.35) }],
          '#4f8a5b',
          null,
          0,
        );
      }
    }
  }

  // Runway + PAPI + Hangar + Windsock
  drawRunway(ctx, basis, isl.runway, plane, weather);

  // Lighthouse
  if (isl.lighthouse) drawLighthouse(ctx, basis, isl.lighthouse, weather.time);
}

function drawThermals(ctx, basis, weather) {
  for (const th of weather.thermals) {
    const base = projectPoint(basis, th.x, 20, th.z);
    if (!base || base.z > 3200) continue;
    ctx.save();
    for (let ring = 0; ring < 5; ring++) {
      const h = 30 + ((weather.time * 42 + ring * 68) % (th.topY - 30));
      const p = projectPoint(basis, th.x, h, th.z);
      if (!p) continue;
      const rx = clamp(th.radius * 0.5 * p.scale, 10, 90);
      const ry = rx * 0.24;
      const alpha = clamp(1 - h / th.topY, 0.14, 0.62);
      ctx.strokeStyle = `rgba(255, 204, 104, ${alpha})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, rx, ry, 0, 0.2 + weather.time * 2 + ring, Math.PI * 1.45 + weather.time * 2 + ring);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTargetRingsAndDrops(ctx, basis, mission, plane, time) {
  const nextRing = mission.rings.find((r) => !r.cleared);

  // Subtle translucent breadcrumbs between active gate and runway
  if (nextRing) {
    const after = mission.rings[nextRing.index + 1] || mission.targetRunway;
    for (let s = 1; s <= 3; s++) {
      const f = s / 4;
      const pt = projectPoint(
        basis,
        lerp(nextRing.x, after.x, f),
        lerp(nextRing.y, (after.y || 20) + 14, f),
        lerp(nextRing.z, after.z, f),
      );
      if (!pt || pt.z > 3500) continue;
      ctx.fillStyle = 'rgba(255, 224, 134, 0.45)';
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, clamp(pt.scale * 3.5, 2, 5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sleek, crisp hollow 3D target gates (thinner & cleaner so runway + PAPI shine straight through!)
  const sortedRings = mission.rings
    .map((r) => ({ r, center: projectPoint(basis, r.x, r.y, r.z) }))
    .filter((item) => item.center && item.center.z < 4200)
    .sort((a, b) => b.center.z - a.center.z);

  for (const { r, center } of sortedRings) {
    if (r.cleared && r.flash <= 0.02) continue;
    const pts = projectRingPoints(basis, r.x, r.y, r.z, r.radius, r.yaw, 32);
    if (!pts) continue;
    const isNext = r === nextRing;
    const ringColor = r.cleared ? '#54d996' : isNext ? '#ffd46b' : '#43c4c4';
    const outerColor = r.cleared ? '#2f9668' : isNext ? '#d9532f' : '#247f86';

    ctx.save();
    ctx.globalAlpha = isNext ? 0.88 : 0.65;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = isNext ? 14 : 6;

    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
    ctx.closePath();

    ctx.strokeStyle = outerColor;
    ctx.lineWidth = clamp(center.scale * 2.6, 2.5, 6.2);
    ctx.stroke();

    ctx.strokeStyle = ringColor;
    ctx.lineWidth = clamp(center.scale * 1.4, 1.4, 3.2);
    ctx.stroke();

    // Subtle cardinal brass bracket ticks on active gate
    if (isNext && !r.cleared) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff5cf';
      ctx.lineWidth = 2;
      for (const idx of [0, 8, 16, 24]) {
        const p = pts[idx];
        const dx = p.sx - center.sx;
        const dy = p.sy - center.sy;
        const len = Math.max(1, Math.hypot(dx, dy));
        ctx.beginPath();
        ctx.moveTo(p.sx - (dx / len) * 6, p.sy - (dy / len) * 6);
        ctx.lineTo(p.sx + (dx / len) * 6, p.sy + (dy / len) * 6);
        ctx.stroke();
      }

      // Unified distance computed directly from PLANE to ring (exact match with Radio card!)
      const planeDistM = Math.round(Math.hypot(r.x - plane.x, r.z - plane.z));
      const rawTopY = Math.min(...pts.map((p) => p.sy)) - 15;
      // In cockpit view, lift the gate tag above the collimator HUD glass so it never overlaps +10 pitch marks!
      const topY = basis.cy < basis.height * 0.43 ? Math.min(rawTopY, basis.cy - 122) : rawTopY;
      const tag = r.kind === 'approach'
        ? `FINAL GATE · ${planeDistM}m`
        : `GATE ${r.index + 1}/${mission.rings.length} · ${planeDistM}m`;
      ctx.globalAlpha = 1;
      ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
      const tw = ctx.measureText(tag).width + 14;
      ctx.fillStyle = 'rgba(15, 31, 43, 0.9)';
      ctx.strokeStyle = '#ffd46b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(center.sx - tw * 0.5, topY - 10, tw, 19, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd46b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, center.sx, topY);
    }
    ctx.restore();
  }

  // Only draw ACTIVE undelivered airdrop bullseye beacons (with clean tag so it never looks like a stray oval!)
  for (const dz of mission.dropZones) {
    if (dz.delivered) continue;
    const pt = projectPoint(basis, dz.x, dz.y, dz.z);
    if (!pt || pt.z > 2800) continue;
    const rx = clamp(dz.radius * pt.scale * 0.52, 8, 42);
    ctx.save();
    ctx.fillStyle = 'rgba(232, 76, 56, 0.58)';
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(pt.sx, pt.sy, rx, rx * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.cream;
    ctx.beginPath();
    ctx.ellipse(pt.sx, pt.sy, rx * 0.35, rx * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft flare ribbon + compact DROP label
    for (let k = 0; k < 3; k++) {
      const fy = pt.sy - 12 - k * 14 - ((time * 20) % 14);
      ctx.fillStyle = `rgba(255, 198, 92, ${0.42 - k * 0.12})`;
      ctx.beginPath();
      ctx.arc(pt.sx + Math.sin(time * 3 + k) * 4, fy, 4 + k * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    const dTag = `DROP · ${Math.round(Math.hypot(dz.x - plane.x, dz.z - plane.z))}m`;
    const dw = ctx.measureText(dTag).width + 10;
    ctx.fillStyle = 'rgba(17, 34, 46, 0.88)';
    ctx.strokeStyle = '#ff6b4a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(pt.sx - dw * 0.5, pt.sy - rx * 0.5 - 24, dw, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd46b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dTag, pt.sx, pt.sy - rx * 0.5 - 16);
    ctx.restore();
  }

  // Falling parachute mailbags
  for (const sack of mission.activeSacks) {
    if (sack.landed) continue;
    const pt = projectPoint(basis, sack.x, sack.y, sack.z);
    if (!pt) continue;
    const s = clamp(pt.scale * 7, 6, 20);
    ctx.save();
    ctx.fillStyle = PALETTE.cream;
    ctx.strokeStyle = PALETTE.crimson;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy - s * 1.1, s * 0.9, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pt.sx - s * 0.7, pt.sy - s * 1.1);
    ctx.lineTo(pt.sx, pt.sy);
    ctx.moveTo(pt.sx + s * 0.7, pt.sy - s * 1.1);
    ctx.lineTo(pt.sx, pt.sy);
    ctx.stroke();
    ctx.fillStyle = '#c25e2c';
    ctx.fillRect(pt.sx - s * 0.35, pt.sy - s * 0.25, s * 0.7, s * 0.6);
    ctx.restore();
  }
}

function drawAeroPelican(ctx, basis, plane, time) {
  // Subtle dark aircraft shadow gliding across the sea surface below!
  const waterShadow = projectPoint(basis, plane.x, 1.5, plane.z);
  if (waterShadow && plane.y < 140) {
    const sw = clamp(waterShadow.scale * 11, 14, 58);
    ctx.save();
    ctx.fillStyle = `rgba(8, 22, 34, ${clamp(0.32 - plane.y / 420, 0.06, 0.28)})`;
    ctx.beginPath();
    ctx.ellipse(waterShadow.sx, waterShadow.sy, sw, sw * 0.28, -plane.roll * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Local aircraft orthonormal basis
  const cosP = Math.cos(plane.pitch);
  const sinP = Math.sin(plane.pitch);
  const sinY = Math.sin(plane.yaw);
  const cosY = Math.cos(plane.yaw);

  const fx = sinY * cosP;
  const fy = sinP;
  const fz = cosY * cosP;

  const r0x = cosY;
  const r0y = 0;
  const r0z = -sinY;

  const u0x = -sinY * sinP;
  const u0y = cosP;
  const u0z = -cosY * sinP;

  const cosR = Math.cos(plane.roll);
  const sinR = Math.sin(plane.roll);

  const rx = r0x * cosR - u0x * sinR;
  const ry = r0y * cosR - u0y * sinR;
  const rz = r0z * cosR - u0z * sinR;

  const ux = u0x * cosR + r0x * sinR;
  const uy = u0y * cosR + r0y * sinR;
  const uz = u0z * cosR + r0z * sinR;

  const toScreen = (lx, ly, lz) => projectPoint(
    basis,
    plane.x + rx * lx + ux * ly + fx * lz,
    plane.y + ry * lx + uy * ly + fy * lz,
    plane.z + rz * lx + uz * ly + fz * lz,
  );

  // Soft tapering translucent wingtip vortex ribbons
  if (plane.trail.length > 4 && (Math.abs(plane.roll) > 0.16 || plane.boosting || plane.speedKts > 100)) {
    for (const side of [-1, 1]) {
      ctx.save();
      for (let i = 1; i < plane.trail.length; i++) {
        const a = plane.trail[i - 1];
        const b = plane.trail[i];
        const f = i / plane.trail.length;
        const p1 = projectPoint(basis, a.x + Math.cos(a.yaw) * Math.cos(a.roll) * side * 9.8, a.y - Math.sin(a.roll) * side * 9.8 + 1.1, a.z - Math.sin(a.yaw) * Math.cos(a.roll) * side * 9.8);
        const p2 = projectPoint(basis, b.x + Math.cos(b.yaw) * Math.cos(b.roll) * side * 9.8, b.y - Math.sin(b.roll) * side * 9.8 + 1.1, b.z - Math.sin(b.yaw) * Math.cos(b.roll) * side * 9.8);
        if (!p1 || !p2) continue;
        ctx.strokeStyle = plane.boosting ? `rgba(255, 212, 110, ${f * 0.45})` : `rgba(255, 246, 224, ${f * 0.34})`;
        ctx.lineWidth = 0.8 + f * 3.2;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  const poly = (coords, fill, stroke = PALETTE.ink, lw = 1.7) => {
    const pts = [];
    for (const [lx, ly, lz] of coords) {
      const p = toScreen(lx, ly, lz);
      if (!p) return;
      pts.push(p);
    }
    drawPoly(ctx, pts, fill, stroke, lw);
  };

  // High-contrast Cream & Crimson Wingtip Pontoons with V-braced struts (never camouflages against blue water!)
  for (const side of [-1, 1]) {
    const sA = toScreen(side * 1.15, -0.7, 0.7);
    const sB = toScreen(side * 6.8, 1.3, 0.6);
    const sC = toScreen(side * 6.8, -1.35, 0.4);
    const sD = toScreen(side * 5.6, 1.3, -0.4);
    if (sA && sB && sC && sD) {
      ctx.strokeStyle = '#1b2b36';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(sA.sx, sA.sy);
      ctx.lineTo(sB.sx, sB.sy);
      ctx.moveTo(sB.sx, sB.sy);
      ctx.lineTo(sC.sx, sC.sy);
      ctx.moveTo(sD.sx, sD.sy);
      ctx.lineTo(sC.sx, sC.sy);
      ctx.stroke();
    }

    poly([
      [side * 6.8, -1.45, 2.4],
      [side * 7.65, -1.45, 0.6],
      [side * 7.2, -1.45, -2.5],
      [side * 6.3, -1.45, -2.3],
      [side * 6.15, -1.45, 1.0],
    ], PALETTE.creamWarm, PALETTE.ink, 1.6);
    poly([
      [side * 6.75, -1.42, 2.4],
      [side * 7.55, -1.42, 1.0],
      [side * 6.25, -1.42, 1.0],
    ], PALETTE.crimson, PALETTE.ink, 1.2);
  }

  // Sculpted Flying-Boat Hull Belly (warm deep mahogany-burgundy so it pops cleanly over blue ocean!)
  poly([
    [-1.2, -1.1, 4.6],
    [1.2, -1.1, 4.6],
    [1.52, -1.35, 0.8],
    [0.72, -0.68, -6.5],
    [-0.72, -0.68, -6.5],
    [-1.52, -1.35, 0.8],
  ], '#8f2c24', PALETTE.ink, 1.8);

  // Side fuselage cream panels (clearly visible from 3/4 high-chase angle!)
  poly([
    [1.15, 0.45, 5.2],
    [1.46, 0.95, 1.2],
    [1.08, 0.85, -3.6],
    [0.54, 0.65, -7.2],
    [0.72, -0.68, -6.5],
    [1.52, -1.35, 0.8],
    [1.2, -1.1, 4.6],
  ], PALETTE.creamWarm, PALETTE.ink, 1.6);

  // Upper main fuselage deck (warm cream with sunset rim sheen)
  poly([
    [-1.12, 0.42, 5.2],
    [1.12, 0.42, 5.2],
    [1.44, 0.98, 1.2],
    [1.06, 0.88, -3.6],
    [0.54, 0.68, -7.2],
    [-0.54, 0.68, -7.2],
    [-1.06, 0.88, -3.6],
    [-1.44, 0.98, 1.2],
  ], PALETTE.cream, PALETTE.ink, 1.8);

  // Postal nose crimson cap & golden cheek trim
  poly([
    [-0.86, 0.28, 5.9],
    [0.86, 0.28, 5.9],
    [1.16, 0.55, 4.2],
    [-1.16, 0.55, 4.2],
  ], PALETTE.crimson, PALETTE.ink, 1.5);

  // Tinted greenhouse cockpit canopy with golden sunset specular glint
  poly([
    [-0.95, 1.06, 3.65],
    [0.95, 1.06, 3.65],
    [1.18, 1.38, 1.45],
    [-1.18, 1.38, 1.45],
  ], '#234a61', PALETTE.ink, 1.6);
  poly([
    [-0.55, 1.22, 3.25],
    [0.2, 1.22, 3.25],
    [0.42, 1.36, 1.8],
    [-0.4, 1.36, 1.8],
  ], 'rgba(255, 228, 162, 0.72)', null, 0);

  // Horizontal tailplane & deflecting elevator
  const elevDip = plane.elevatorDeflect * 0.42;
  poly([
    [-3.7, 0.96, -5.5],
    [3.7, 0.96, -5.5],
    [3.35, 0.96 + elevDip, -7.3],
    [-3.35, 0.96 + elevDip, -7.3],
  ], PALETTE.creamWarm, PALETTE.ink, 1.6);
  poly([
    [-3.5, 0.98, -6.45],
    [3.5, 0.98, -6.45],
    [3.3, 0.98 + elevDip, -7.3],
    [-3.3, 0.98 + elevDip, -7.3],
  ], PALETTE.crimson, PALETTE.ink, 1.2);

  // High parasol wing with dark-navy anti-glare leading edge (pops against cream beaches!) + crimson wingtips
  poly([
    [-10.0, 1.4, 2.05],
    [10.0, 1.4, 2.05],
    [9.55, 1.34, -0.95],
    [-9.55, 1.34, -0.95],
  ], PALETTE.cream, PALETTE.ink, 2.0);
  // Dark maritime leading-edge de-icer boot + sunset golden rim line
  poly([
    [-9.9, 1.42, 2.05],
    [9.9, 1.42, 2.05],
    [9.8, 1.41, 1.42],
    [-9.8, 1.41, 1.42],
  ], '#1c3547', PALETTE.ink, 1.2);

  for (const side of [-1, 1]) {
    poly([
      [side * 7.2, 1.42, 2.03],
      [side * 10.0, 1.42, 2.03],
      [side * 9.55, 1.36, -0.92],
      [side * 7.0, 1.36, -0.92],
    ], PALETTE.crimson, PALETTE.ink, 1.5);

    const ailDip = side * plane.aileronDeflect * 0.36;
    poly([
      [side * 4.9, 1.35, -0.45],
      [side * 8.4, 1.35, -0.45],
      [side * 8.2, 1.33 + ailDip, -1.04],
      [side * 4.8, 1.33 + ailDip, -1.04],
    ], PALETTE.amber, PALETTE.ink, 1.1);

    const flapDrop = -(plane.flapsDeg / 35) * 0.58;
    poly([
      [side * 1.6, 1.33, -0.5],
      [side * 4.6, 1.33, -0.5],
      [side * 4.5, 1.29 + flapDrop, -1.16],
      [side * 1.6, 1.29 + flapDrop, -1.16],
    ], '#216975', PALETTE.ink, 1.1);
  }

  // Twin radial engine nacelles + golden brass spinners + sweeping translucent prop discs
  for (const side of [-1, 1]) {
    const nx = side * 3.3;
    poly([
      [nx - 0.78, 1.54, 3.1],
      [nx + 0.78, 1.54, 3.1],
      [nx + 0.85, 1.46, 0.15],
      [nx - 0.85, 1.46, 0.15],
    ], PALETTE.crimson, PALETTE.ink, 1.7);

    const propCenter = toScreen(nx, 1.48, 3.45);
    if (propCenter) {
      const pr = clamp(propCenter.scale * 1.72, 9, 29);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 244, 214, 0.24)';
      ctx.strokeStyle = 'rgba(255, 212, 112, 0.72)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(propCenter.sx, propCenter.sy, pr, pr * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let b = 0; b < 3; b++) {
        const a = plane.propAngle * side + (b * Math.PI * 2) / 3;
        ctx.strokeStyle = 'rgba(23, 35, 44, 0.58)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(propCenter.sx, propCenter.sy);
        ctx.lineTo(propCenter.sx + Math.cos(a) * pr * 0.92, propCenter.sy + Math.sin(a) * pr * 0.8);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd46b';
      ctx.beginPath();
      ctx.arc(propCenter.sx, propCenter.sy, Math.max(2.8, pr * 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Vertical tail fin with amber postal chevron + golden sunset top rim
  const rudShift = plane.rudderDeflect * 0.45;
  poly([
    [0, 0.85, -4.3],
    [0, 3.72, -6.35],
    [rudShift, 3.55, -7.5],
    [rudShift, 0.8, -7.4],
  ], PALETTE.crimson, PALETTE.ink, 1.8);
  poly([
    [0.06, 1.5, -5.15],
    [0.06, 2.8, -6.15],
    [rudShift * 0.5, 2.75, -6.85],
    [rudShift * 0.5, 1.5, -6.75],
  ], PALETTE.amber, PALETTE.ink, 1.1);

  // Wingtip Navigation Lights & Tail Strobe
  const portLight = toScreen(-10.1, 1.4, 0.95);
  const stbdLight = toScreen(10.1, 1.4, 0.95);
  const tailLight = toScreen(0, 3.76, -6.45);
  const drawNavGlow = (pt, col, r) => {
    if (!pt) return;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawNavGlow(portLight, '#ff3f34', 4.6);
  drawNavGlow(stbdLight, '#3ff08a', 4.6);
  if (Math.sin(time * 8) > -0.25) drawNavGlow(tailLight, '#fff9db', 3.4);
}

function drawCockpitCanopyAndCollimator(ctx, plane, mission, weather, w, h) {
  const dashTop = h - 224;
  const cx = w * 0.5;
  const cy = h * 0.40;

  ctx.save();

  // Realistic foreshortened twin engine nacelles + wing stubs visible outside windscreen
  for (const side of [-1, 1]) {
    const nx = cx + side * 388;
    const ny = dashTop + 14;
    // Wing root leading edge
    ctx.fillStyle = '#d4ccb8';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + side * 140, dashTop + 18);
    ctx.lineTo(nx + side * 165, dashTop - 4);
    ctx.lineTo(nx + side * 165, dashTop + 26);
    ctx.lineTo(cx + side * 140, dashTop + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sculpted crimson engine cowling + dark radial air intake + brass spinner cone
    const cowlGrad = ctx.createLinearGradient(nx, ny - 54, nx, ny + 10);
    cowlGrad.addColorStop(0, '#cf4434');
    cowlGrad.addColorStop(1, '#5c1b15');
    ctx.fillStyle = cowlGrad;
    ctx.beginPath();
    ctx.ellipse(nx, ny, 62, 46, side * 0.08, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#141e26';
    ctx.beginPath();
    ctx.ellipse(nx, ny - 10, 38, 22, 0, Math.PI, 0);
    ctx.fill();

    // Brass propeller spinner hub & multi-blade translucent swept arc
    ctx.fillStyle = '#d89b32';
    ctx.beginPath();
    ctx.arc(nx, ny - 16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(218, 232, 238, 0.34)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(nx, ny - 16, 86, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 224, 142, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(nx, ny - 16, 86, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }

  // Dark matte anti-glare aircraft nose hood
  const noseGrad = ctx.createLinearGradient(cx, dashTop - 34, cx, dashTop + 18);
  noseGrad.addColorStop(0, '#962f26');
  noseGrad.addColorStop(1, '#3b1512');
  ctx.fillStyle = noseGrad;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 168, dashTop + 16);
  ctx.quadraticCurveTo(cx, dashTop - 42, cx + 168, dashTop + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3-layer slanted Monsoon Rain + Windshield Glass Beads & Wiper Arc
  if (weather.preset.rainIntensity > 0.25) {
    // Distant rain sheet
    ctx.strokeStyle = 'rgba(182, 218, 235, 0.25)';
    ctx.lineWidth = 1.2;
    for (const drop of weather.rainDrops) {
      const dx = drop.x * w;
      const dy = 46 + drop.y * (dashTop - 48);
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - drop.len * 0.48, dy + drop.len * 0.9);
      ctx.stroke();
    }
    // Near fast wind-driven streaks
    ctx.strokeStyle = 'rgba(222, 245, 255, 0.5)';
    ctx.lineWidth = 2.1;
    for (let i = 0; i < 36; i++) {
      const drop = weather.rainDrops[i];
      const dx = ((drop.x * 1.37 + 0.2) % 1) * w;
      const dy = 48 + ((drop.y * 1.29 + 0.1) % 1) * (dashTop - 60);
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - drop.len * 0.72, dy + drop.len * 1.15);
      ctx.stroke();
    }
    // Canopy water beads clinging near left/right glass edges
    ctx.fillStyle = 'rgba(210, 242, 255, 0.34)';
    for (let i = 0; i < 34; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const rx = side < 0 ? 74 + ((i * 53) % 210) : w - 74 - ((i * 53) % 210);
      const ry = 66 + ((i * 89) % (dashTop - 105));
      ctx.beginPath();
      ctx.ellipse(rx, ry, 2.8, 5.2, -0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Physical metallic windshield wiper blade sweeping a rain-cleared arc on windscreen
    const wiperPivotX = cx - 235;
    const wiperPivotY = dashTop + 10;
    const wiperAng = -Math.PI * 0.6 + Math.sin(weather.time * 4.8) * 0.4;
    ctx.strokeStyle = 'rgba(205, 240, 255, 0.2)';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.arc(wiperPivotX, wiperPivotY, 175, -Math.PI * 0.84, -Math.PI * 0.25);
    ctx.stroke();

    const tipX = wiperPivotX + Math.cos(wiperAng) * 192;
    const tipY = wiperPivotY + Math.sin(wiperAng) * 192;
    ctx.strokeStyle = '#0b141c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(wiperPivotX, wiperPivotY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.strokeStyle = '#9cc4d6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(wiperPivotX + 2, wiperPivotY);
    ctx.lineTo(tipX + 2, tipY);
    ctx.stroke();
  }

  // Physically Mounted Brass Optical Collimator Glass HUD (anchored to glare shield!)
  const hudW = 336;
  const hudH = 216;
  const hudLeft = cx - hudW * 0.5;
  const hudTop = cy - hudH * 0.5;

  // Dark metallic stanchions mounting collimator glass to glare shield
  ctx.fillStyle = '#182936';
  ctx.strokeStyle = '#3b5769';
  ctx.lineWidth = 1.6;
  ctx.fillRect(hudLeft + 34, hudTop + hudH - 2, 14, dashTop - (hudTop + hudH) + 22);
  ctx.strokeRect(hudLeft + 34, hudTop + hudH - 2, 14, dashTop - (hudTop + hudH) + 22);
  ctx.fillRect(hudLeft + hudW - 48, hudTop + hudH - 2, 14, dashTop - (hudTop + hudH) + 22);
  ctx.strokeRect(hudLeft + hudW - 48, hudTop + hudH - 2, 14, dashTop - (hudTop + hudH) + 22);

  // Combiner glass pane with subtle optical bevel sheen
  ctx.save();
  ctx.fillStyle = 'rgba(22, 68, 64, 0.16)';
  ctx.strokeStyle = 'rgba(116, 245, 194, 0.58)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(hudLeft, hudTop, hudW, hudH, 12);
  ctx.fill();
  ctx.stroke();

  // Strictly INSET clip-rect for pitch ladder so numbers NEVER slice against the border!
  ctx.save();
  ctx.beginPath();
  ctx.rect(hudLeft + 62, hudTop + 26, hudW - 124, hudH - 58);
  ctx.clip();

  ctx.translate(cx, cy - 2);
  ctx.rotate(-plane.roll * 0.72);
  const pitchPx = (plane.pitch * 180 / Math.PI) * 4.4;
  ctx.strokeStyle = '#6bffb8';
  ctx.fillStyle = '#6bffb8';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 1.7;

  for (let deg = -10; deg <= 10; deg += 10) {
    const py = pitchPx - deg * 4.4;
    const half = deg === 0 ? 78 : 42;
    ctx.setLineDash(deg < 0 ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(-half, py);
    ctx.lineTo(-16, py);
    ctx.moveTo(16, py);
    ctx.lineTo(half, py);
    ctx.stroke();
    if (deg !== 0) {
      ctx.textAlign = 'right';
      ctx.fillText(String(deg), -half - 4, py + 3);
      ctx.textAlign = 'left';
      ctx.fillText(String(deg), half + 4, py + 3);
    }
  }
  ctx.setLineDash([]);
  ctx.restore();

  // Dedicated non-overlapping Left (SPD) & Right (ALT) HUD Edge Brackets
  ctx.strokeStyle = 'rgba(107, 255, 184, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hudLeft + 52, hudTop + 34);
  ctx.lineTo(hudLeft + 52, hudTop + hudH - 36);
  ctx.moveTo(hudLeft + hudW - 52, hudTop + 34);
  ctx.lineTo(hudLeft + hudW - 52, hudTop + hudH - 36);
  ctx.stroke();

  ctx.fillStyle = '#6bffb8';
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('KTS', hudLeft + 27, cy - 16);
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText(String(Math.round(plane.speedKts)), hudLeft + 27, cy + 2);

  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillText('FT', hudLeft + hudW - 27, cy - 16);
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText(String(Math.round(plane.y * 3.28084)), hudLeft + hudW - 27, cy + 2);

  // Working Crossed ILS Localizer + Glideslope Needles & Graduated Dot Scales
  const rwy = mission.targetRunway;
  const rwyBear = Math.atan2(rwy.x - plane.x, rwy.z - plane.z);
  const locDev = clamp(wrapAngleRad(rwyBear - plane.yaw) * 3.2, -1, 1);
  const gsDev = clamp((plane.y - rwy.y - 44) / 70, -1, 1);

  // Subtle crossed dashed amber ILS course deviation bars inside collimator
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 212, 107, 0.68)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  const locBarX = cx + locDev * 48;
  const gsBarY = cy - 2 + gsDev * 30;
  ctx.beginPath();
  ctx.moveTo(locBarX, cy - 42);
  ctx.lineTo(locBarX, cy + 36);
  ctx.moveTo(cx - 52, gsBarY);
  ctx.lineTo(cx + 52, gsBarY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 8, 0, Math.PI * 2);
  ctx.moveTo(cx - 22, cy - 2);
  ctx.lineTo(cx - 8, cy - 2);
  ctx.moveTo(cx + 8, cy - 2);
  ctx.lineTo(cx + 22, cy - 2);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy - 19);
  ctx.stroke();

  // Graduated Localizer scale + yellow bug above dark bottom bezel
  const locY = hudTop + hudH - 36;
  ctx.strokeStyle = 'rgba(107, 255, 184, 0.65)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - 64, locY);
  ctx.lineTo(cx + 64, locY);
  ctx.stroke();
  for (const d of [-48, -24, 0, 24, 48]) {
    ctx.fillStyle = 'rgba(107, 255, 184, 0.85)';
    ctx.beginPath();
    ctx.arc(cx + d, locY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd46b';
  ctx.beginPath();
  ctx.moveTo(cx + locDev * 48, locY - 5);
  ctx.lineTo(cx + locDev * 48 + 5, locY);
  ctx.lineTo(cx + locDev * 48, locY + 5);
  ctx.lineTo(cx + locDev * 48 - 5, locY);
  ctx.closePath();
  ctx.fill();

  // Graduated Glideslope vertical dot scale beside right bracket
  const gsX = hudLeft + hudW - 60;
  ctx.beginPath();
  ctx.moveTo(gsX, cy - 42);
  ctx.lineTo(gsX, cy + 38);
  ctx.stroke();
  for (const d of [-32, -16, 0, 16, 32]) {
    ctx.fillStyle = 'rgba(107, 255, 184, 0.85)';
    ctx.beginPath();
    ctx.arc(gsX, cy - 2 + d, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd46b';
  ctx.beginPath();
  ctx.arc(gsX, cy - 2 + gsDev * 30, 3.8, 0, Math.PI * 2);
  ctx.fill();

  // High-contrast dark-backed bottom bezel badge inside collimator (ZERO gate-glow washout!)
  ctx.fillStyle = 'rgba(11, 24, 34, 0.92)';
  ctx.strokeStyle = 'rgba(107, 255, 184, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(hudLeft + 34, hudTop + hudH - 23, hudW - 68, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd46b';
  ctx.font = 'bold 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText(`ILS · ${rwy.code}  ·  X-WIND ${Math.round(weather.windSpeedKts)} KTS`, cx, hudTop + hudH - 14);
  ctx.restore();

  // Beveled Metallic Cockpit Canopy Frame Pillars + Overhead Magnetic Compass Brow
  const leftGrad = ctx.createLinearGradient(0, 0, 82, 0);
  leftGrad.addColorStop(0, '#0d1922');
  leftGrad.addColorStop(0.75, '#1d3240');
  leftGrad.addColorStop(1, '#365263');
  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(0, 44);
  ctx.lineTo(78, 44);
  ctx.lineTo(30, dashTop + 14);
  ctx.lineTo(0, dashTop + 14);
  ctx.closePath();
  ctx.fill();

  const rightGrad = ctx.createLinearGradient(w - 82, 0, w, 0);
  rightGrad.addColorStop(0, '#365263');
  rightGrad.addColorStop(0.25, '#1d3240');
  rightGrad.addColorStop(1, '#0d1922');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(w, 44);
  ctx.lineTo(w - 78, 44);
  ctx.lineTo(w - 30, dashTop + 14);
  ctx.lineTo(w, dashTop + 14);
  ctx.closePath();
  ctx.fill();

  // Overhead brow + standby compass pod
  ctx.fillStyle = '#12222d';
  ctx.beginPath();
  ctx.moveTo(56, 44);
  ctx.lineTo(w - 56, 44);
  ctx.lineTo(w - 92, 66);
  ctx.lineTo(92, 66);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3b586a';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Subtle metallic recessed rivets (not bright yellow carnival lights!)
  ctx.fillStyle = '#4f6d7f';
  for (let i = 0; i < 6; i++) {
    const ry = 82 + i * 68;
    const inset = 18 + (1 - i / 6) * 24;
    ctx.beginPath();
    ctx.arc(inset, ry, 2.2, 0, Math.PI * 2);
    ctx.arc(w - inset, ry, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderWorld3D(ctx, state, w, h) {
  const { world, weather, plane, mission, camera } = state;
  const basis = buildCameraBasis(camera, w, h);

  // Sun screen X for sun-aligned cliff lighting
  const sunYawDiff = wrapAngleRad(weather.preset.sunAzimuth - camera.yaw);
  const sunScreenX = basis.cx + sunYawDiff * basis.focal * 0.85;

  drawSkyAndOcean(ctx, basis, camera, weather, w, h);
  drawClouds(ctx, basis, weather);

  const drawables = [];
  for (const isl of world.islands) {
    const p = projectPoint(basis, isl.x, 0, isl.z);
    if (p && p.z < 6500) drawables.push({ kind: 'island', z: p.z, obj: isl });
  }
  for (const islet of world.scenicIslets) {
    const p = projectPoint(basis, islet.x, 0, islet.z);
    if (p && p.z < 5500) drawables.push({ kind: 'islet', z: p.z, obj: islet });
  }
  drawables.sort((a, b) => b.z - a.z);

  const isStorm = weather.preset.rainIntensity > 0.5;
  for (const d of drawables) {
    if (d.kind === 'island') drawIsland(ctx, basis, d.obj, plane, weather, sunScreenX);
    else drawScenicIslet(ctx, basis, d.obj, isStorm, sunScreenX, weather.time);
  }

  drawThermals(ctx, basis, weather);
  drawTargetRingsAndDrops(ctx, basis, mission, plane, weather.time);

  if (camera.mode === 'chase') {
    drawAeroPelican(ctx, basis, plane, weather.time);
    if (weather.preset.rainIntensity > 0.2) {
      ctx.save();
      ctx.strokeStyle = 'rgba(206, 234, 245, 0.34)';
      ctx.lineWidth = 1.4;
      for (const drop of weather.rainDrops) {
        const dx = drop.x * w;
        const dy = drop.y * h;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx - drop.len * 0.4, dy + drop.len);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    drawCockpitCanopyAndCollimator(ctx, plane, mission, weather, w, h);
  }
}
