// SPDX-License-Identifier: MIT
// Lit 6-pack aviation instruments, Doppler/terrain radar, auto-wrapped radio card, and unified HUD.

import { GAME_TITLE, PALETTE } from './config.js';
import { clamp, formatHeading } from './random.js';
import { getTelemetry } from './flightModel.js';
import { getActiveWaypoint } from './missions.js';
import { countSetPieces, SYNERGY_SETS } from './refits.js';

const CLEAN_KEY_LEGEND = [
  { key: 'W/S', label: 'PITCH' },
  { key: 'A/D', label: 'ROLL' },
  { key: 'Q/E', label: 'RUDDER' },
  { key: 'UP/DN', label: 'THROTTLE' },
  { key: 'SHIFT', label: 'BOOST' },
  { key: 'F', label: 'FLAPS' },
  { key: 'SPACE', label: 'DROP' },
  { key: 'C', label: 'VIEW' },
  { key: 'P', label: 'PAUSE' },
  { key: 'M', label: 'MUTE' },
];

function drawDialBezel(ctx, cx, cy, r, glowColor = '#ffd46b') {
  ctx.save();
  // Recessed outer metallic housing
  ctx.fillStyle = '#09131b';
  ctx.strokeStyle = '#476578';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Warm backlit instrument dial face
  const grad = ctx.createRadialGradient(cx, cy - r * 0.22, r * 0.08, cx, cy, r);
  grad.addColorStop(0, '#223d4e');
  grad.addColorStop(0.74, '#11222e');
  grad.addColorStop(1, '#081219');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle internal glowing backlight rim
  ctx.strokeStyle = glowColor;
  ctx.globalAlpha = 0.52;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Four corner bezel screws
  ctx.fillStyle = '#8aa5b5';
  for (const a of [0.78, 2.35, 3.92, 5.49]) {
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (r + 1.5), cy + Math.sin(a) * (r + 1.5), 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGlassSheen(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.clip();
  const shine = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.35, cy + r * 0.35);
  shine.addColorStop(0, 'rgba(255, 250, 232, 0.22)');
  shine.addColorStop(0.45, 'rgba(255, 250, 232, 0.04)');
  shine.addColorStop(1, 'rgba(255, 250, 232, 0)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.24, cy - r * 0.4, r * 0.88, r * 0.5, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawArtificialHorizon(ctx, cx, cy, r, plane) {
  drawDialBezel(ctx, cx, cy, r, '#ffd46b');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll);
  const pitchOffset = clamp((plane.pitch * 180 / Math.PI) * (r / 40), -r * 0.82, r * 0.82);

  // Sky & Ground hemispheres
  ctx.fillStyle = '#2d82a8';
  ctx.fillRect(-r * 1.5, -r * 1.8 + pitchOffset, r * 3, r * 1.8);
  ctx.fillStyle = '#7c4c2a';
  ctx.fillRect(-r * 1.5, pitchOffset, r * 3, r * 1.8);

  // Horizon & pitch ladder
  ctx.strokeStyle = '#fff5d9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchOffset);
  ctx.lineTo(r, pitchOffset);
  ctx.stroke();

  ctx.lineWidth = 1.3;
  ctx.fillStyle = '#fff5d9';
  ctx.font = `bold ${Math.max(7, Math.round(r * 0.16))}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const deg of [-20, -10, 10, 20]) {
    const y = pitchOffset - deg * (r / 40);
    const hw = Math.abs(deg) === 10 ? r * 0.3 : r * 0.18;
    ctx.beginPath();
    ctx.moveTo(-hw, y);
    ctx.lineTo(hw, y);
    ctx.stroke();
    if (Math.abs(deg) === 10 && r >= 48) {
      ctx.fillText('10', hw + 3, y);
    }
  }

  // Rotating bank-angle triangle pointer against top scale
  ctx.fillStyle = '#ffd46b';
  ctx.beginPath();
  ctx.moveTo(0, -r + 5);
  ctx.lineTo(-4.5, -r + 12);
  ctx.lineTo(4.5, -r + 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Fixed top bank ticks & center orange reference wing bar
  ctx.save();
  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 1.4;
  for (const deg of [-45, -30, -15, 0, 15, 30, 45]) {
    const a = -Math.PI * 0.5 + (deg * Math.PI) / 180;
    const len = deg === 0 ? 7 : 4.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
    ctx.lineTo(cx + Math.cos(a) * (r - 3 - len), cy + Math.sin(a) * (r - 3 - len));
    ctx.stroke();
  }

  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.44, cy);
  ctx.lineTo(cx - r * 0.14, cy);
  ctx.lineTo(cx - r * 0.14, cy + 5);
  ctx.moveTo(cx + r * 0.44, cy);
  ctx.lineTo(cx + r * 0.14, cy);
  ctx.lineTo(cx + r * 0.14, cy + 5);
  ctx.stroke();
  ctx.fillStyle = '#ff6b4a';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawAirspeedDial(ctx, cx, cy, r, plane) {
  drawDialBezel(ctx, cx, cy, r, plane.stalling ? '#ff4636' : '#54d996');
  const startA = Math.PI * 0.72;
  const spanA = Math.PI * 1.56;
  const speedToA = (kts) => startA + clamp((kts - 20) / 160, 0, 1) * spanA;

  const arc = (a0, a1, col, lw = 4.2) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 7, a0, a1);
    ctx.stroke();
  };
  arc(speedToA(40), speedToA(85), '#dce8ee', 3.2);
  arc(speedToA(55), speedToA(138), '#43d08a', 4.2);
  arc(speedToA(138), speedToA(162), '#efae38', 4.2);
  arc(speedToA(162), speedToA(176), '#e84c38', 4.8);

  // Ticks & numerals placed clearly inside outer arc
  ctx.fillStyle = '#f6efde';
  ctx.font = `bold ${Math.max(8, Math.round(r * 0.19))}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 40; k <= 160; k += 20) {
    const a = speedToA(k);
    ctx.strokeStyle = '#f6efde';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12));
    ctx.lineTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
    ctx.stroke();
    if (k % 40 === 0) {
      ctx.fillText(String(k), cx + Math.cos(a) * (r - 20), cy + Math.sin(a) * (r - 20));
    }
  }

  // Digital KTS badge & clean bottom ASI label (never crossed by needle!)
  ctx.fillStyle = '#081219';
  ctx.strokeStyle = '#355061';
  ctx.lineWidth = 1;
  ctx.fillRect(cx - r * 0.52, cy + r * 0.34, r * 1.04, r * 0.34);
  ctx.strokeRect(cx - r * 0.52, cy + r * 0.34, r * 1.04, r * 0.34);
  ctx.fillStyle = plane.stalling ? '#ff5442' : '#54d996';
  ctx.font = `bold ${Math.max(8, Math.round(r * 0.21))}px "Trebuchet MS", sans-serif`;
  ctx.fillText(`${Math.round(plane.speedKts)} KTS`, cx, cy + r * 0.52);

  // Needle with subtle drop shadow (short clean tip so it stops clear of numerals)
  const na = speedToA(plane.speedKts);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(na) * 6, cy - Math.sin(na) * 6);
  ctx.lineTo(cx + Math.cos(na) * (r - 14), cy + Math.sin(na) * (r - 14));
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#f6efde';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawAltimeterDial(ctx, cx, cy, r, telemetry) {
  drawDialBezel(ctx, cx, cy, r, '#ffd46b');
  ctx.fillStyle = '#f6efde';
  ctx.font = `bold ${Math.max(8, Math.round(r * 0.19))}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * 0.5 + (i / 10) * Math.PI * 2;
    ctx.strokeStyle = '#f6efde';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
    ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.stroke();
    if (i !== 5) {
      ctx.fillText(String(i), cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
    }
  }

  ctx.fillStyle = '#9bb8c7';
  ctx.font = `bold ${Math.max(7, Math.round(r * 0.15))}px "Trebuchet MS", sans-serif`;
  ctx.fillText('ALT', cx, cy + r * 0.22);

  // Digital altitude box cleanly placed in lower notch
  ctx.fillStyle = '#081219';
  ctx.strokeStyle = '#3c5768';
  ctx.lineWidth = 1;
  ctx.fillRect(cx - r * 0.48, cy + r * 0.34, r * 0.96, r * 0.34);
  ctx.strokeRect(cx - r * 0.48, cy + r * 0.34, r * 0.96, r * 0.34);
  ctx.fillStyle = '#ffd46b';
  ctx.font = `bold ${Math.max(8, Math.round(r * 0.21))}px "Trebuchet MS", sans-serif`;
  ctx.fillText(`${telemetry.altFt} FT`, cx, cy + r * 0.52);

  // Broad cyan 1000-ft needle & slender white 100-ft needle
  const a1000 = -Math.PI * 0.5 + ((telemetry.altFt % 10000) / 10000) * Math.PI * 2;
  const a100 = -Math.PI * 0.5 + ((telemetry.altFt % 1000) / 1000) * Math.PI * 2;

  ctx.strokeStyle = '#43c4c4';
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a1000) * (r * 0.46), cy + Math.sin(a1000) * (r * 0.46));
  ctx.stroke();

  ctx.strokeStyle = '#fff5d9';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a100) * (r - 12), cy + Math.sin(a100) * (r - 12));
  ctx.stroke();

  ctx.fillStyle = '#ffd46b';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawCompassRose(ctx, cx, cy, r, telemetry, waypointBearingDeg) {
  drawDialBezel(ctx, cx, cy, r, '#43c4c4');
  const hdgRad = (telemetry.hdgDeg * Math.PI) / 180;

  // Draw ticks rotated, and cardinal/numeric labels kept upright for instant reading!
  ctx.save();
  for (let d = 0; d < 360; d += 30) {
    const a = -Math.PI * 0.5 + ((d * Math.PI) / 180) - hdgRad;
    const isCard = d % 90 === 0;
    ctx.strokeStyle = isCard ? '#ffd46b' : '#7b99a8';
    ctx.lineWidth = isCard ? 2 : 1.1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
    ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
    ctx.stroke();

    const lbl = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : String(d / 10);
    if (isCard || r >= 48) {
      ctx.fillStyle = d === 0 ? '#ff5d47' : isCard ? '#fff5d9' : '#9bb8c7';
      ctx.font = `bold ${Math.max(8, Math.round(r * (isCard ? 0.21 : 0.16)))}px "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
    }
  }

  // Prominent Amber Waypoint / Runway Course Bug
  const bugA = -Math.PI * 0.5 + ((waypointBearingDeg * Math.PI) / 180) - hdgRad;
  const bx = cx + Math.cos(bugA) * (r - 6);
  const by = cy + Math.sin(bugA) * (r - 6);
  ctx.fillStyle = '#ff8c2e';
  ctx.strokeStyle = '#fff5d9';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(bx, by, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Top orange lubber triangle
  ctx.fillStyle = '#ff6b4a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 1);
  ctx.lineTo(cx - 4.5, cy - r + 9);
  ctx.lineTo(cx + 4.5, cy - r + 9);
  ctx.closePath();
  ctx.fill();

  // Miniature centered aircraft silhouette
  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 8);
  ctx.moveTo(cx - 9, cy - 1);
  ctx.lineTo(cx + 9, cy - 1);
  ctx.moveTo(cx - 4, cy + 6);
  ctx.lineTo(cx + 4, cy + 6);
  ctx.stroke();
  ctx.restore();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawTurnCoordinator(ctx, cx, cy, r, plane) {
  drawDialBezel(ctx, cx, cy, r, '#43c4c4');
  ctx.save();
  // Bank wing marks L / R
  ctx.strokeStyle = '#f6efde';
  ctx.lineWidth = 1.8;
  for (const ang of [-0.36, 0, 0.36]) {
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(ang) * (r - 13), cy + Math.sin(ang) * (r - 13));
    ctx.lineTo(cx - Math.cos(ang) * (r - 5), cy + Math.sin(ang) * (r - 5));
    ctx.moveTo(cx + Math.cos(ang) * (r - 13), cy - Math.sin(ang) * (r - 13));
    ctx.lineTo(cx + Math.cos(ang) * (r - 5), cy - Math.sin(ang) * (r - 5));
    ctx.stroke();
  }

  // Miniature banking aircraft icon
  ctx.save();
  ctx.translate(cx, cy - 4);
  ctx.rotate(clamp(plane.roll * 0.75, -0.55, 0.55));
  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.52, 0);
  ctx.lineTo(r * 0.52, 0);
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 6);
  ctx.moveTo(-6, -6);
  ctx.lineTo(6, -6);
  ctx.stroke();
  ctx.restore();

  // Inclinometer slip-skid tube & ball at bottom
  const tubeW = r * 0.92;
  const tubeY = cy + r * 0.42;
  ctx.fillStyle = '#09151d';
  ctx.strokeStyle = '#738f9f';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(cx - tubeW * 0.5, tubeY - 6, tubeW, 12, 6);
  ctx.fill();
  ctx.stroke();
  const ballOff = clamp(-plane.roll * 14 + plane.rudderDeflect * 10, -tubeW * 0.34, tubeW * 0.34);
  ctx.fillStyle = '#f6efde';
  ctx.beginPath();
  ctx.arc(cx + ballOff, tubeY, 4.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#9bb8c7';
  ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TURN / SLIP', cx, cy - r * 0.52);
  ctx.restore();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawVsiDial(ctx, cx, cy, r, telemetry) {
  drawDialBezel(ctx, cx, cy, r, telemetry.vsiFpm < -420 ? '#ff5442' : '#54d996');
  ctx.save();
  // Zero at 9 o'clock (Math.PI), climb clockwise up, descent counter-clockwise down
  const fpmToA = (fpm) => Math.PI + clamp(fpm / 1000, -1, 1) * (Math.PI * 0.72);
  ctx.fillStyle = '#f6efde';
  ctx.font = `bold ${Math.max(7, Math.round(r * 0.18))}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const v of [-800, -400, 0, 400, 800]) {
    const a = fpmToA(v);
    ctx.strokeStyle = v < -400 ? '#ff6b52' : '#f6efde';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 11), cy + Math.sin(a) * (r - 11));
    ctx.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.stroke();
    ctx.fillText(String(Math.abs(v) / 100), cx + Math.cos(a) * (r - 19), cy + Math.sin(a) * (r - 19));
  }

  ctx.fillStyle = '#9bb8c7';
  ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
  ctx.fillText('VSI', cx, cy - r * 0.28);
  ctx.fillStyle = telemetry.vsiFpm < -400 ? '#ff6b52' : '#54d996';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillText(`${telemetry.vsiFpm >= 0 ? '+' : ''}${telemetry.vsiFpm}`, cx + 4, cy + r * 0.34);

  const na = fpmToA(telemetry.vsiFpm);
  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (r - 12), cy + Math.sin(na) * (r - 12));
  ctx.stroke();
  ctx.fillStyle = '#f6efde';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawTerrainRadar(ctx, cx, cy, r, world, plane, mission, weather) {
  drawDialBezel(ctx, cx, cy, r, '#54d996');
  const isStorm = weather.preset.rainIntensity > 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#071819';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Range rings + crosshairs
  ctx.strokeStyle = 'rgba(84, 217, 150, 0.24)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // Animated phosphor radar sweep cone
  const sweepA = (weather.time * 1.4) % (Math.PI * 2) - Math.PI * 0.5;
  ctx.fillStyle = 'rgba(84, 217, 150, 0.12)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, sweepA - 0.5, sweepA);
  ctx.closePath();
  ctx.fill();

  const scale = (r - 6) / 1900;
  const sinY = Math.sin(plane.yaw);
  const cosY = Math.cos(plane.yaw);
  const toRadar = (wx, wz) => {
    const dx = wx - plane.x;
    const dz = wz - plane.z;
    const right = dx * cosY - dz * sinY;
    const fwd = dx * sinY + dz * cosY;
    return { x: cx + right * scale, y: cy - fwd * scale };
  };

  // Doppler rain storm cells in monsoon weather
  if (isStorm) {
    ctx.fillStyle = 'rgba(239, 174, 56, 0.24)';
    ctx.beginPath();
    ctx.arc(cx + 16, cy - 18, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232, 76, 56, 0.24)';
    ctx.beginPath();
    ctx.arc(cx + 22, cy - 22, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const isl of world.islands) {
    const p = toRadar(isl.x, isl.z);
    if (Math.hypot(p.x - cx, p.y - cy) > r + 40) continue;
    ctx.fillStyle = 'rgba(84, 217, 150, 0.24)';
    ctx.strokeStyle = 'rgba(84, 217, 150, 0.62)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(5, isl.radius * scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const rwy = isl.runway;
    const a = toRadar(rwy.x - rwy.dirX * rwy.length * 0.5, rwy.z - rwy.dirZ * rwy.length * 0.5);
    const b = toRadar(rwy.x + rwy.dirX * rwy.length * 0.5, rwy.z + rwy.dirZ * rwy.length * 0.5);
    ctx.strokeStyle = '#ffd46b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (const ring of mission.rings) {
    if (ring.cleared) continue;
    const p = toRadar(ring.x, ring.z);
    ctx.fillStyle = '#ffd46b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Own aircraft nose-up icon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx - 4.5, cy + 5);
  ctx.lineTo(cx + 4.5, cy + 5);
  ctx.closePath();
  ctx.fill();

  // Top range pill cleanly masking the vertical crosshair behind 2 KM
  ctx.fillStyle = 'rgba(7, 24, 25, 0.92)';
  ctx.fillRect(cx - 16, cy - r + 5, 32, 13);
  ctx.fillStyle = '#54d996';
  ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('2 KM', cx, cy - r + 12);

  // Rotating Wind Vector Arrow + Wind Speed Pill with generous internal clearance!
  const relWindRad = ((weather.windDirDeg * Math.PI) / 180) - plane.yaw;
  ctx.fillStyle = 'rgba(7, 24, 25, 0.92)';
  ctx.fillRect(cx - r * 0.84, cy + r * 0.42, r * 1.68, 17);
  ctx.fillStyle = '#54d996';
  ctx.font = 'bold 8.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`WND ${Math.round(weather.windSpeedKts)}`, cx - r * 0.62, cy + r * 0.56);

  // Directional wind arrow with breathing room inside bezel
  const ax = cx + r * 0.36;
  const ay = cy + r * 0.52;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(relWindRad);
  ctx.strokeStyle = '#ffd46b';
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.lineTo(0, -5);
  ctx.lineTo(-3, -1.5);
  ctx.moveTo(0, -5);
  ctx.lineTo(3, -1.5);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  drawGlassSheen(ctx, cx, cy, r);
}

function drawLabeledGaugeBar(ctx, x, y, w, label, valueText, ratio, fillCol, warn = false) {
  // Label & Value cleanly ABOVE the bar track so ZERO split-text or poor contrast!
  ctx.save();
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = warn ? '#ff6b52' : '#c5d8e2';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = warn ? '#ff6b52' : '#ffd46b';
  ctx.fillText(valueText, x + w, y);

  const by = y + 13;
  const bh = 10;
  ctx.fillStyle = '#081219';
  ctx.strokeStyle = warn ? '#ff5442' : '#355061';
  ctx.lineWidth = warn ? 1.5 : 1.1;
  ctx.beginPath();
  ctx.roundRect(x, by, w, bh, 4);
  ctx.fill();
  ctx.stroke();

  const innerW = Math.max(0, (w - 4) * clamp(ratio, 0, 1));
  ctx.fillStyle = fillCol;
  ctx.beginPath();
  ctx.roundRect(x + 2, by + 2, innerW, bh - 4, 2);
  ctx.fill();
  ctx.restore();
}

function drawTopTelemetryBar(ctx, state, telemetry, w) {
  const { mission, weather, campaign, camera } = state;
  ctx.save();
  ctx.fillStyle = 'rgba(13, 27, 38, 0.94)';
  ctx.fillRect(0, 0, w, 46);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(0, 44, w, 2);

  // Far Left: Brand & Leg
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(GAME_TITLE, 14, 15);
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillStyle = PALETTE.amber;
  ctx.fillText(`${mission.def.code} · ${mission.def.title} · ${weather.preset.label}`, 14, 33);

  // Core Aviation HUD Readouts (ALT / SPD / HDG / CLOCK / STREAK)
  const drawPill = (x, pw, lbl, val, accent) => {
    ctx.fillStyle = '#0b1822';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, 6, pw, 33, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9bb8c7';
    ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(lbl, x + 8, 15);
    ctx.fillStyle = accent;
    ctx.font = '900 15px "Trebuchet MS", sans-serif';
    ctx.fillText(val, x + 8, 29);
  };

  drawPill(394, 110, 'ALTITUDE', `${telemetry.altFt} FT`, '#ffd46b');
  drawPill(512, 112, 'AIRSPEED', `${telemetry.spdKts} KTS`, state.plane.stalling ? '#ff5442' : '#54d996');
  drawPill(632, 98, 'HEADING', `${formatHeading(telemetry.hdgDeg)}°`, '#43c4c4');

  const mm = Math.floor(mission.timeLeft / 60);
  const ss = String(Math.floor(mission.timeLeft % 60)).padStart(2, '0');
  drawPill(738, 86, 'CLOCK', `${mm}:${ss}`, mission.timeLeft < 25 ? '#ff5442' : '#f6efde');

  const streakLabel = mission.streak >= 2 ? `STREAK x${mission.streak}` : camera.mode === 'cockpit' ? 'COCKPIT IFR' : 'CHASE VIEW';
  drawPill(832, 128, camera.mode === 'cockpit' ? 'MODE · IFR' : 'MOMENTUM', streakLabel, mission.streak >= 2 ? '#ff8b47' : '#9cc8db');

  // Far Right: Postage & Total Score
  const totalScore = (campaign.totalScore || 0) + mission.score;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9bb8c7';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillText(`POSTAGE ${(campaign.postage || 0) + mission.postageEarned} · SCORE`, w - 16, 14);
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = '900 20px "Trebuchet MS", sans-serif';
  ctx.fillText(totalScore.toLocaleString(), w - 16, 31);
  ctx.restore();
}

function drawRadioAndRefitBadges(ctx, state, w) {
  const { mission, campaign, plane, camera } = state;

  const cardX = camera.mode === 'cockpit' ? 68 : 14;
  const cardY = camera.mode === 'cockpit' ? 74 : 56;
  const cardW = 304;
  const cardH = 82;

  ctx.save();
  ctx.fillStyle = 'rgba(246, 239, 222, 0.94)';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.navyPanel;
  ctx.beginPath();
  ctx.roundRect(cardX + 2, cardY + 2, cardW - 4, 21, [4, 4, 0, 0]);
  ctx.fill();

  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('RADIO · DISPATCHER T. SATO', cardX + 10, cardY + 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#54d996';
  ctx.fillText(`${mission.ringsCleared}/${mission.rings.length} RINGS · ${mission.dropsCleared}/${mission.dropZones.length} DROPS`, cardX + cardW - 10, cardY + 12);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.crimson;
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillText(mission.def.objectiveText, cardX + 10, cardY + 35);

  // Auto-fit radio message cleanly within card width (ZERO truncation/ellipsis!)
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '11px "Trebuchet MS", sans-serif';
  ctx.fillText(mission.radioLine, cardX + 10, cardY + 53, cardW - 20);

  // Unified distance matching the 3D gate tag!
  const wp = getActiveWaypoint(mission);
  const distM = Math.round(Math.hypot(wp.x - plane.x, wp.z - plane.z));
  ctx.fillStyle = '#1e6e75';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillText(`NEXT: ${wp.label} · ${distM}m`, cardX + 10, cardY + 71);
  ctx.restore();

  // Upper-right compact Active Refit Sets card
  const rx = camera.mode === 'cockpit' ? w - 274 : w - 216;
  const ry = camera.mode === 'cockpit' ? 74 : 56;
  const rw = 202;
  const rh = 68;
  const counts = countSetPieces(campaign.refits || []);

  ctx.save();
  ctx.fillStyle = 'rgba(15, 31, 43, 0.9)';
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`REFITS ${(campaign.refits || []).length}/18`, rx + 10, ry + 16);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#54d996';
  ctx.fillText(`LAND ${mission.targetRunway.code}`, rx + rw - 10, ry + 16);

  const sets = [
    { key: 'turbocharger', short: 'TURBO', col: SYNERGY_SETS.turbocharger.color },
    { key: 'glider', short: 'GLIDER', col: SYNERGY_SETS.glider.color },
    { key: 'avionics', short: 'AVION', col: SYNERGY_SETS.avionics.color },
  ];
  sets.forEach((s, idx) => {
    const bx = rx + 10 + idx * 62;
    ctx.fillStyle = counts[s.key] >= 2 ? s.col : '#1d3444';
    ctx.beginPath();
    ctx.roundRect(bx, ry + 26, 58, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#fff8ea';
    ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.short} ${counts[s.key]}/6`, bx + 29, ry + 39);
  });

  ctx.fillStyle = '#ff9d7a';
  ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GOAL: GREASE LANDING · HULL > 0', rx + 10, ry + 58);
  ctx.restore();
}

function drawChaseInstrumentDeck(ctx, state, telemetry, waypointBearing, w, h) {
  const { plane, world, mission, weather } = state;
  const deckH = 122;
  const deckY = h - 26 - deckH;

  ctx.save();
  const panelW = 1046;
  const panelX = (w - panelW) * 0.5;
  const grad = ctx.createLinearGradient(panelX, deckY, panelX, deckY + deckH);
  grad.addColorStop(0, 'rgba(20, 40, 54, 0.96)');
  grad.addColorStop(1, 'rgba(10, 21, 30, 0.98)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, deckY, panelW, deckH, [12, 12, 0, 0]);
  ctx.fill();
  ctx.stroke();

  const dialCy = deckY + 61;
  const dialR = 46;
  drawAirspeedDial(ctx, panelX + 74, dialCy, dialR, plane);
  drawArtificialHorizon(ctx, panelX + 188, dialCy, dialR, plane);
  drawAltimeterDial(ctx, panelX + 302, dialCy, dialR, telemetry);
  drawCompassRose(ctx, panelX + 416, dialCy, dialR, telemetry, waypointBearing);

  // Clean above-track labeled gauges (ZERO low-contrast white-on-cyan or split words!)
  const sysX = panelX + 490;
  drawLabeledGaugeBar(ctx, sysX, deckY + 11, 224, plane.bingoFuel ? 'BINGO FUEL!' : 'FUEL RESERVE', `${telemetry.fuelPct}%`, plane.fuel / plane.fuelCap, plane.bingoFuel ? '#e84c38' : '#efae38', plane.bingoFuel);
  drawLabeledGaugeBar(ctx, sysX, deckY + 41, 224, 'AIRFRAME HULL', `${telemetry.hullPct}%`, plane.hull / plane.hullCap, telemetry.hullPct < 40 ? '#e84c38' : '#2f9668', telemetry.hullPct < 40);
  drawLabeledGaugeBar(ctx, sysX, deckY + 71, 224, plane.boosting ? 'WEP BOOST (2.5x)' : 'THROTTLE', `${telemetry.throttlePct}%`, plane.throttle, plane.boosting ? '#ff6b3d' : '#43c4c4', plane.boosting);

  // Crisp telemetry pill row
  ctx.fillStyle = '#0a1620';
  ctx.strokeStyle = '#3c5768';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(sysX, deckY + 99, 224, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = plane.flapsDeg > 0 ? '#ffd46b' : '#9bb8c7';
  ctx.fillText(`FLAPS ${plane.flapsDeg}°`, sysX + 8, deckY + 108);
  ctx.fillStyle = telemetry.vsiFpm < -420 ? '#ff6b52' : '#54d996';
  ctx.fillText(`VSI ${telemetry.vsiFpm >= 0 ? '+' : ''}${telemetry.vsiFpm}`, sysX + 86, deckY + 108);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd46b';
  ctx.fillText(`MAIL ${mission.mailAmmo}`, sysX + 216, deckY + 108);

  // Annunciator Lamps Stack (high-contrast dark ink on lit lamps!)
  const lampX = panelX + 734;
  const lamps = [
    { text: 'STALL', on: plane.stalling, col: '#ff4636' },
    { text: 'BINGO', on: plane.bingoFuel, col: '#ff8f32' },
    { text: 'THERMAL', on: plane.inThermal, col: '#ffd46b' },
    { text: 'FLAPS', on: plane.flapsDeg > 0, col: '#43c4c4' },
  ];
  lamps.forEach((l, i) => {
    const ly = deckY + 13 + i * 26;
    ctx.fillStyle = l.on ? l.col : '#0d1b26';
    ctx.strokeStyle = l.on ? '#fff3d1' : '#2e4757';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(lampX, ly, 78, 21, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = l.on ? '#0c1821' : '#557285';
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(l.text, lampX + 39, ly + 11);
  });

  drawTerrainRadar(ctx, panelX + 930, dialCy, 50, world, plane, mission, weather);
  ctx.restore();
}

function drawCockpitInstrumentDashboard(ctx, state, telemetry, waypointBearing, w, h) {
  const { plane, world, mission, weather } = state;
  const dashTop = h - 224;

  ctx.save();
  // Glare shield & riveted cockpit fascia
  const shieldGrad = ctx.createLinearGradient(0, dashTop - 10, 0, dashTop + 26);
  shieldGrad.addColorStop(0, '#2c4150');
  shieldGrad.addColorStop(0.4, '#14232e');
  shieldGrad.addColorStop(1, '#0b151d');
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.moveTo(0, dashTop + 14);
  ctx.quadraticCurveTo(w * 0.5, dashTop - 20, w, dashTop + 14);
  ctx.lineTo(w, h - 26);
  ctx.lineTo(0, h - 26);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#d89b32';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, dashTop + 14);
  ctx.quadraticCurveTo(w * 0.5, dashTop - 20, w, dashTop + 14);
  ctx.stroke();

  // Master Warning Annunciator Row on Glare Shield (distinct nominal dim-emerald vs alerts)
  const ann = [
    { label: `STORM ${Math.round(weather.windSpeedKts)} KT`, bg: '#ef9a34', fg: '#0c1821', border: '#fff3d1' },
    { label: `BINGO FUEL ${telemetry.fuelPct}%`, bg: plane.bingoFuel ? '#e03b2d' : '#152e2b', fg: plane.bingoFuel ? '#fff8ea' : '#54d996', border: plane.bingoFuel ? '#fff3d1' : '#2f7a5a' },
    { label: `HULL ${telemetry.hullPct}%`, bg: telemetry.hullPct < 75 ? '#efae38' : '#152e2b', fg: telemetry.hullPct < 75 ? '#0c1821' : '#54d996', border: '#fff3d1' },
    { label: plane.stalling ? 'STALL WARN' : 'AIRSPEED OK', bg: plane.stalling ? '#e03b2d' : '#15342c', fg: plane.stalling ? '#fff8ea' : '#5ce8a4', border: plane.stalling ? '#fff3d1' : '#2f8a66' },
    { label: `FLAPS ${plane.flapsDeg}°`, bg: plane.flapsDeg > 0 ? '#43c4c4' : '#152e2b', fg: plane.flapsDeg > 0 ? '#0c1821' : '#8cb0bf', border: '#fff3d1' },
  ];
  const startAnnX = w * 0.5 - 325;
  ann.forEach((a, i) => {
    const ax = startAnnX + i * 132;
    const ay = dashTop + 4;
    ctx.fillStyle = a.bg;
    ctx.strokeStyle = a.border;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(ax, ay, 122, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = a.fg;
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(a.label, ax + 61, ay + 11);
  });

  // True Illuminated 6-Pack Flight Instruments (2 clean rows of 3 dials OR 6 crisp dials + Radar + Engine Panel)
  const r = 49;
  const dialY = dashTop + 114;
  drawAirspeedDial(ctx, 78, dialY, r, plane);
  drawArtificialHorizon(ctx, 194, dialY, r + 3, plane);
  drawAltimeterDial(ctx, 312, dialY, r, telemetry);
  drawTurnCoordinator(ctx, 428, dialY, r, plane);
  drawCompassRose(ctx, 544, dialY, r, telemetry, waypointBearing);
  drawVsiDial(ctx, 660, dialY, r, telemetry);

  // Doppler Weather / Terrain Radar Scope
  drawTerrainRadar(ctx, 796, dialY, 62, world, plane, mission, weather);

  // Far-right Engine & Fuel/Hull Decisions Panel with clean above-bar labels
  const qx = 886;
  const qy = dashTop + 42;
  ctx.fillStyle = '#0b161f';
  ctx.strokeStyle = '#3c5768';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(qx, qy, 370, 144, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffd46b';
  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AERO-7 ENGINE & DECISIONS PANEL', qx + 14, qy + 18);

  drawLabeledGaugeBar(ctx, qx + 14, qy + 30, 248, plane.bingoFuel ? 'BINGO FUEL ALERT' : 'FUEL TANKS', `${telemetry.fuelPct}%`, plane.fuel / plane.fuelCap, plane.bingoFuel ? '#e84c38' : '#efae38', plane.bingoFuel);
  drawLabeledGaugeBar(ctx, qx + 14, qy + 67, 248, 'AIRFRAME INTEGRITY', `${telemetry.hullPct}%`, plane.hull / plane.hullCap, telemetry.hullPct < 70 ? '#ff6b3d' : '#2f9668', telemetry.hullPct < 70);
  drawLabeledGaugeBar(ctx, qx + 14, qy + 104, 248, plane.boosting ? 'WEP BOOST 2.5x' : 'TWIN RADIAL RPM', `${telemetry.throttlePct}%`, plane.throttle, plane.boosting ? '#ff5a3c' : '#43c4c4', plane.boosting);

  // Physical brass throttle lever track with WEP/IDLE ticks
  const tx = qx + 314;
  const tyTop = qy + 34;
  const tyBot = qy + 124;
  ctx.fillStyle = '#182b38';
  ctx.fillRect(tx - 6, tyTop, 12, tyBot - tyTop);
  ctx.fillStyle = '#9bb8c7';
  ctx.font = 'bold 8px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WEP', tx, tyTop - 7);
  ctx.fillText('IDLE', tx, tyBot + 10);

  const knobY = tyBot - plane.throttle * (tyBot - tyTop);
  ctx.fillStyle = plane.boosting ? '#ff4636' : '#d89b32';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tx - 24, knobY - 9, 48, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0c1821';
  ctx.font = '900 9px "Trebuchet MS", sans-serif';
  ctx.fillText('THR', tx, knobY + 1);
  ctx.restore();
}

export function drawFooterStrip(ctx, seed, w, h, customLegend = null) {
  const items = customLegend || CLEAN_KEY_LEGEND;
  ctx.save();
  ctx.fillStyle = '#0b161f';
  ctx.fillRect(0, h - 26, w, 26);
  ctx.fillStyle = '#d89b32';
  ctx.fillRect(0, h - 27, w, 1.5);

  let x = 16;
  ctx.textBaseline = 'middle';
  for (const item of items) {
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    const kw = ctx.measureText(item.key).width + 14;
    ctx.fillStyle = PALETTE.cream;
    ctx.beginPath();
    ctx.roundRect(x, h - 20, kw, 15, 3);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText(item.key, x + kw * 0.5, h - 12.5);

    x += kw + 6;
    ctx.fillStyle = '#c9dbe3';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, x, h - 12.5);
    x += ctx.measureText(item.label).width + 14;
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillText(`SEED #${seed}`, w - 16, h - 12.5);
  ctx.restore();
}

function drawPopupsAndAlerts(ctx, state, w) {
  const { mission, plane } = state;
  mission.popups.slice(-2).forEach((pop, i) => {
    const py = 74 + i * 36;
    ctx.save();
    ctx.font = '900 18px "Trebuchet MS", sans-serif';
    const tw = Math.max(ctx.measureText(pop.text).width, 130) + 28;
    ctx.fillStyle = 'rgba(17, 34, 46, 0.88)';
    ctx.strokeStyle = pop.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(w * 0.5 - tw * 0.5, py - 14, tw, 28, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pop.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pop.text} · ${pop.sub}`, w * 0.5, py);
    ctx.restore();
  });

  if (state.paused) {
    ctx.save();
    ctx.fillStyle = 'rgba(11, 22, 31, 0.65)';
    ctx.fillRect(0, 46, w, 650);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '900 42px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLIGHT PAUSED', w * 0.5, 310);
    ctx.fillStyle = PALETTE.amberGlow;
    ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
    ctx.fillText('[P] RESUME  ·  [R] RETRY SORTIE  ·  [C] TOGGLE COCKPIT', w * 0.5, 358);
    ctx.restore();
  } else if (plane.crashed) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 12, 14, 0.68)';
    ctx.fillRect(0, 46, w, 650);
    ctx.fillStyle = '#ff5442';
    ctx.font = '900 44px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AIRFRAME LOST', w * 0.5, 290);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.fillText(plane.crashReason || 'TERRAIN IMPACT', w * 0.5, 336);
    ctx.fillStyle = PALETTE.amberGlow;
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.fillText('PRESS [R] TO RE-FLY SORTIE  ·  [ENTER] DEBRIEF LOGBOOK', w * 0.5, 382);
    ctx.restore();
  }
}

export function renderFlightHud(ctx, state, w, h) {
  const telemetry = getTelemetry(state.plane);
  const wp = getActiveWaypoint(state.mission);
  const wpBearingDeg = ((Math.atan2(wp.x - state.plane.x, wp.z - state.plane.z) * 180) / Math.PI + 360) % 360;

  drawTopTelemetryBar(ctx, state, telemetry, w);
  drawRadioAndRefitBadges(ctx, state, w);

  if (state.camera.mode === 'cockpit') {
    drawCockpitInstrumentDashboard(ctx, state, telemetry, wpBearingDeg, w, h);
  } else {
    drawChaseInstrumentDeck(ctx, state, telemetry, wpBearingDeg, w, h);
  }

  drawPopupsAndAlerts(ctx, state, w);
  drawFooterStrip(ctx, state.campaign.seed, w, h);
}
