// SPDX-License-Identifier: MIT
// Polished Title, Hangar Refit (3-card airmail stamps + parked Pelican + aligned 3x6 refits), and Debrief Logbook.

import { AIRCRAFT_NAME, GAME_SUBTITLE, GAME_TITLE, PALETTE } from './config.js';
import { FEAT_CATALOG } from './feats.js';
import { SORTIE_DEFS } from './missions.js';
import { countSetPieces, previewSetBonus, REFIT_CATALOG, SYNERGY_SETS } from './refits.js';
import { drawFooterStrip } from './hud.js';

function drawStampCardPath(ctx, x, y, w, h) {
  // Authentic postage-stamp perforated border on top & bottom with clean vintage notches on sides
  const teeth = 16;
  const step = w / teeth;
  const amp = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + amp);
  for (let i = 0; i < teeth; i++) {
    ctx.lineTo(x + (i + 0.5) * step, y);
    ctx.lineTo(x + (i + 1) * step, y + amp);
  }
  ctx.lineTo(x + w, y + h - amp);
  for (let i = teeth; i > 0; i--) {
    ctx.lineTo(x + (i - 0.5) * step, y + h);
    ctx.lineTo(x + (i - 1) * step, y + h - amp);
  }
  ctx.closePath();
}

function drawRefitIcon(ctx, icon, cx, cy, r, fg = '#fff8ea') {
  // 18 genuinely distinct custom vector icons so NO two refits look identical!
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = Math.max(1.5, r * 0.11);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (icon) {
    case 'turbo':
      // Snail-shell twin turbocharger scroll + impeller
      ctx.beginPath();
      ctx.arc(-r * 0.08, r * 0.06, r * 0.54, 0, Math.PI * 1.65);
      ctx.lineTo(r * 0.65, -r * 0.48);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.08, r * 0.06, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd46b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.52);
      ctx.lineTo(r * 0.3, -r * 0.52);
      ctx.stroke();
      break;
    case 'exhaust':
      // Curved twin copper exhaust headers
      for (const oy of [-r * 0.24, r * 0.24]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.62, oy);
        ctx.quadraticCurveTo(0, oy - r * 0.32, r * 0.62, oy + r * 0.08);
        ctx.stroke();
      }
      break;
    case 'prop':
      // 3-blade feathered aviation propeller
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 - 0.35;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, r * 0.42, r * 0.14, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = PALETTE.ink;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'tank':
      // Aux wing fuel canister with cap & fuel gauge stripe
      ctx.strokeRect(-r * 0.52, -r * 0.38, r * 1.04, r * 0.8);
      ctx.fillStyle = '#ffd46b';
      ctx.fillRect(-r * 0.42, 0, r * 0.84, r * 0.32);
      ctx.strokeRect(-r * 0.18, -r * 0.6, r * 0.36, r * 0.22);
      break;
    case 'radiator':
      // Baffled oil-cooler fins grid
      ctx.strokeRect(-r * 0.58, -r * 0.48, r * 1.16, r * 0.96);
      for (const ly of [-r * 0.22, 0, r * 0.22]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.48, ly);
        ctx.lineTo(r * 0.48, ly);
        ctx.stroke();
      }
      break;
    case 'spark':
      // High-octane lightning spark plug
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.68);
      ctx.lineTo(-r * 0.32, r * 0.04);
      ctx.lineTo(r * 0.05, r * 0.04);
      ctx.lineTo(-r * 0.12, r * 0.68);
      ctx.lineTo(r * 0.36, -r * 0.08);
      ctx.lineTo(-r * 0.02, -r * 0.08);
      ctx.closePath();
      ctx.fill();
      break;
    case 'flap':
      // Slotted high-lift airfoil + dropped trailing flap
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.05);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.44, r * 0.32, -r * 0.06);
      ctx.lineTo(-r * 0.58, r * 0.2);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = '#ffd46b';
      ctx.beginPath();
      ctx.moveTo(r * 0.34, 0);
      ctx.lineTo(r * 0.72, r * 0.42);
      ctx.stroke();
      break;
    case 'gullwing':
      // Swept Albatross gull-wings with upturned winglets!
      ctx.beginPath();
      ctx.moveTo(-r * 0.74, -r * 0.36);
      ctx.lineTo(-r * 0.56, r * 0.1);
      ctx.quadraticCurveTo(0, -r * 0.26, r * 0.56, r * 0.1);
      ctx.lineTo(r * 0.74, -r * 0.36);
      ctx.stroke();
      ctx.strokeStyle = '#ffd46b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, r * 0.28);
      ctx.quadraticCurveTo(0, r * 0.04, r * 0.52, r * 0.28);
      ctx.stroke();
      break;
    case 'thermal':
      // Rising helical thermal ribbons
      for (const ox of [-r * 0.34, 0, r * 0.34]) {
        ctx.beginPath();
        ctx.moveTo(ox, r * 0.52);
        ctx.quadraticCurveTo(ox - r * 0.18, 0, ox + r * 0.12, -r * 0.52);
        ctx.stroke();
      }
      break;
    case 'strut':
      // Oleo shock-absorber landing gear spring + tire
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.65);
      ctx.lineTo(0, -r * 0.25);
      ctx.lineTo(-r * 0.24, -r * 0.1);
      ctx.lineTo(r * 0.24, r * 0.06);
      ctx.lineTo(-r * 0.24, r * 0.22);
      ctx.lineTo(0, r * 0.34);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.5, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'ribs':
      // Reinforced spruce aircraft wing ribs truss
      ctx.strokeRect(-r * 0.62, -r * 0.34, r * 1.24, r * 0.68);
      ctx.beginPath();
      ctx.moveTo(-r * 0.62, r * 0.34);
      ctx.lineTo(0, -r * 0.34);
      ctx.lineTo(r * 0.62, r * 0.34);
      ctx.stroke();
      break;
    case 'pontoon':
      // Hydroplane float skimming wave crest
      ctx.beginPath();
      ctx.moveTo(-r * 0.68, -r * 0.08);
      ctx.lineTo(r * 0.68, -r * 0.08);
      ctx.lineTo(r * 0.44, r * 0.24);
      ctx.lineTo(-r * 0.56, r * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffd46b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.66, r * 0.44);
      ctx.quadraticCurveTo(0, r * 0.24, r * 0.66, r * 0.44);
      ctx.stroke();
      break;
    case 'gyro':
      // Gimbaled gyro compass rings
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.58, r * 0.22, 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd46b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'crosshair':
      // Drift bombsight optic
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.54, 0, Math.PI * 2);
      ctx.moveTo(-r * 0.72, 0);
      ctx.lineTo(r * 0.72, 0);
      ctx.moveTo(0, -r * 0.72);
      ctx.lineTo(0, r * 0.72);
      ctx.stroke();
      break;
    case 'radar':
      // Sweep radar scope pie
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd46b';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r * 0.56, -1.1, -0.35);
      ctx.closePath();
      ctx.fill();
      break;
    case 'stamp':
      // Vintage airmail postage seal
      ctx.strokeRect(-r * 0.52, -r * 0.52, r * 1.04, r * 1.04);
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.25);
      ctx.lineTo(0, r * 0.1);
      ctx.lineTo(r * 0.42, -r * 0.25);
      ctx.stroke();
      break;
    case 'map':
      // Tri-fold nautical chart with red flight arc
      ctx.strokeRect(-r * 0.62, -r * 0.46, r * 1.24, r * 0.92);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.46);
      ctx.lineTo(-r * 0.2, r * 0.46);
      ctx.moveTo(r * 0.2, -r * 0.46);
      ctx.lineTo(r * 0.2, r * 0.46);
      ctx.stroke();
      ctx.strokeStyle = '#ff6b4a';
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.beginPath();
      ctx.moveTo(-r * 0.44, r * 0.22);
      ctx.quadraticCurveTo(0, -r * 0.34, r * 0.44, -r * 0.16);
      ctx.stroke();
      break;
    case 'collimator':
      // Optical collimator glass reflector sight
      ctx.beginPath();
      ctx.roundRect(-r * 0.52, -r * 0.56, r * 1.04, r * 0.8, 4);
      ctx.stroke();
      ctx.strokeStyle = '#ffd46b';
      ctx.beginPath();
      ctx.arc(0, -r * 0.16, r * 0.22, 0, Math.PI * 2);
      ctx.moveTo(-r * 0.26, r * 0.46);
      ctx.lineTo(r * 0.26, r * 0.46);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.stroke();
  }
  ctx.restore();
}

function drawMedalIcon(ctx, icon, cx, cy, r, fg = '#11222e') {
  // 16 bespoke vector medal icons for Debrief Logbook (NO 16 identical stars!)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (icon) {
    case 'wings':
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, 0);
      ctx.lineTo(-r * 0.2, -r * 0.35);
      ctx.lineTo(r * 0.2, -r * 0.35);
      ctx.lineTo(r * 0.65, 0);
      ctx.lineTo(0, r * 0.32);
      ctx.closePath();
      ctx.fill();
      break;
    case 'feather':
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.45);
      ctx.quadraticCurveTo(0, -r * 0.55, r * 0.55, -r * 0.48);
      ctx.quadraticCurveTo(r * 0.2, r * 0.2, -r * 0.5, r * 0.45);
      ctx.fill();
      break;
    case 'target':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'ring':
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'crown':
      ctx.beginPath();
      ctx.moveTo(-r * 0.52, r * 0.32);
      ctx.lineTo(-r * 0.52, -r * 0.24);
      ctx.lineTo(-r * 0.16, r * 0.04);
      ctx.lineTo(0, -r * 0.44);
      ctx.lineTo(r * 0.16, r * 0.04);
      ctx.lineTo(r * 0.52, -r * 0.24);
      ctx.lineTo(r * 0.52, r * 0.32);
      ctx.closePath();
      ctx.fill();
      break;
    case 'parachute':
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.5, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.1);
      ctx.lineTo(0, r * 0.48);
      ctx.lineTo(r * 0.35, -r * 0.1);
      ctx.stroke();
      break;
    case 'bolt':
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.6);
      ctx.lineTo(-r * 0.32, r * 0.04);
      ctx.lineTo(r * 0.04, r * 0.04);
      ctx.lineTo(-r * 0.12, r * 0.6);
      ctx.lineTo(r * 0.34, -r * 0.06);
      ctx.lineTo(-r * 0.02, -r * 0.06);
      ctx.closePath();
      ctx.fill();
      break;
    case 'thermal':
      for (const ox of [-r * 0.28, r * 0.06, r * 0.34]) {
        ctx.beginPath();
        ctx.moveTo(ox, r * 0.44);
        ctx.quadraticCurveTo(ox - 3, 0, ox + 2, -r * 0.44);
        ctx.stroke();
      }
      break;
    case 'gauge':
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.5, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r * 0.1);
      ctx.lineTo(r * 0.36, -r * 0.28);
      ctx.stroke();
      break;
    case 'dial':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.54, 0, Math.PI * 2);
      ctx.moveTo(-r * 0.52, 0);
      ctx.lineTo(r * 0.52, 0);
      ctx.stroke();
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(r * 0.46, -r * 0.28);
      ctx.lineTo(r * 0.34, r * 0.36);
      ctx.lineTo(0, r * 0.58);
      ctx.lineTo(-r * 0.34, r * 0.36);
      ctx.lineTo(-r * 0.46, -r * 0.28);
      ctx.closePath();
      ctx.fill();
      break;
    case 'wrench':
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, r * 0.42);
      ctx.lineTo(r * 0.36, -r * 0.36);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.32, -r * 0.32, r * 0.24, 0.6, Math.PI * 1.9);
      ctx.stroke();
      break;
    case 'gear':
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36);
        ctx.lineTo(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58);
        ctx.stroke();
      }
      break;
    case 'flap':
      ctx.beginPath();
      ctx.moveTo(-r * 0.56, 0);
      ctx.lineTo(r * 0.2, -r * 0.2);
      ctx.lineTo(r * 0.56, r * 0.34);
      ctx.stroke();
      break;
    case 'stamp':
      ctx.strokeRect(-r * 0.46, -r * 0.38, r * 0.92, r * 0.76);
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.32);
      ctx.lineTo(0, r * 0.08);
      ctx.lineTo(r * 0.42, -r * 0.32);
      ctx.stroke();
      break;
    default:
      // 5-pointed ace star
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r * 0.56 : r * 0.25;
        const a = -Math.PI * 0.5 + (i * Math.PI) / 5;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
  }
  ctx.restore();
}

function drawHangarBackdrop(ctx, w, h, showPlaneBanner = true) {
  // Twilight coastal hangar bay with roof trusses, clear moon away from UI, and full visible AERO-7 PELICAN!
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, '#0d1d2d');
  sky.addColorStop(0.5, '#213a52');
  sky.addColorStop(1, '#684e58');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Harvest moon positioned cleanly in upper-left bay sky (away from Reroll button!)
  ctx.fillStyle = '#fae7bc';
  ctx.beginPath();
  ctx.arc(146, 188, 32, 0, Math.PI * 2);
  ctx.fill();

  // Harbor water & moonlight shimmer
  ctx.fillStyle = '#143347';
  ctx.fillRect(0, 210, w, 320);
  ctx.fillStyle = 'rgba(250, 231, 188, 0.2)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(114 + i * 4, 216 + i * 8, 66 - i * 8, 2.5);
  }

  // Corrugated steel roof trusses & pillars
  ctx.fillStyle = '#132433';
  ctx.fillRect(0, 0, w, 36);
  ctx.strokeStyle = '#294559';
  ctx.lineWidth = 2;
  for (let x = 40; x < w - 40; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 32, 36);
    ctx.lineTo(x + 64, 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#0e1b26';
  ctx.fillRect(20, 34, 20, 500);
  ctx.fillRect(w - 40, 34, 20, 500);

  // Open slipway vista & full illustrated side-profile AERO-7 PELICAN right above cards!
  if (showPlaneBanner) {
    ctx.fillStyle = '#2c404e';
    ctx.fillRect(40, 224, w - 80, 14);
    ctx.fillStyle = '#d89b32';
    ctx.fillRect(40, 224, w - 80, 2.5);

    // Full iconic side-profile AERO-7 PELICAN parked on the coastal slipway
    ctx.save();
    const px = 490;
    const py = 186;
    // Hull
    ctx.fillStyle = PALETTE.cream;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 155, py + 12);
    ctx.lineTo(px + 95, py + 4);
    ctx.quadraticCurveTo(px + 148, py + 10, px + 142, py + 28);
    ctx.lineTo(px + 102, py + 36);
    ctx.lineTo(px - 120, py + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Burgundy boat belly + crimson stripe
    ctx.fillStyle = '#8f2c24';
    ctx.fillRect(px - 110, py + 28, 226, 8);
    ctx.fillStyle = PALETTE.crimson;
    ctx.fillRect(px - 144, py + 18, 276, 6);

    // Tall crimson tail fin with gold chevron
    ctx.beginPath();
    ctx.moveTo(px - 155, py + 14);
    ctx.lineTo(px - 172, py - 24);
    ctx.lineTo(px - 134, py - 20);
    ctx.lineTo(px - 118, py + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit window + parasol high wing + radial nacelle + prop
    ctx.fillStyle = '#2d627d';
    ctx.beginPath();
    ctx.moveTo(px + 54, py + 6);
    ctx.lineTo(px + 94, py + 6);
    ctx.lineTo(px + 108, py + 16);
    ctx.lineTo(px + 54, py + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(px - 36, py - 12, 118, 10);
    ctx.strokeRect(px - 36, py - 12, 118, 10);
    ctx.fillStyle = PALETTE.crimson;
    ctx.fillRect(px + 56, py - 15, 34, 16);
    ctx.strokeRect(px + 56, py - 15, 34, 16);
    ctx.fillStyle = '#ffd46b';
    ctx.beginPath();
    ctx.arc(px + 92, py - 7, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 240, 200, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(px + 93, py - 28);
    ctx.lineTo(px + 93, py + 14);
    ctx.stroke();

    // Small red harbor tool chest & oil drum beside plane
    ctx.fillStyle = '#b8422a';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.6;
    ctx.fillRect(px + 204, py + 14, 34, 22);
    ctx.strokeRect(px + 204, py + 14, 34, 22);
    ctx.fillStyle = '#247f86';
    ctx.fillRect(px + 246, py + 10, 20, 26);
    ctx.strokeRect(px + 246, py + 10, 20, 26);
    ctx.restore();
  }

  // Warm hanging hangar work lamps
  for (const lx of [280, 640, 1000]) {
    const glow = ctx.createRadialGradient(lx, 42, 4, lx, 86, 110);
    glow.addColorStop(0, 'rgba(255, 214, 118, 0.3)');
    glow.addColorStop(1, 'rgba(255, 214, 118, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, 86, 110, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderTitleScreen(ctx, state, input, w, h) {
  input.clearButtons();
  ctx.save();
  const vig = ctx.createLinearGradient(0, 0, 0, h);
  vig.addColorStop(0, 'rgba(13, 27, 38, 0.72)');
  vig.addColorStop(0.5, 'rgba(13, 27, 38, 0.34)');
  vig.addColorStop(1, 'rgba(13, 27, 38, 0.86)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 66px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 10;
  ctx.strokeStyle = PALETTE.ink;
  ctx.strokeText(GAME_TITLE, w * 0.5, 134);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(GAME_TITLE, w * 0.5, 134);

  const ribW = 460;
  ctx.fillStyle = PALETTE.crimson;
  ctx.fillRect(w * 0.5 - ribW * 0.5, 174, ribW, 30);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(w * 0.5 - ribW * 0.5, 180, ribW, 18);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`${GAME_SUBTITLE} · ${AIRCRAFT_NAME}`, w * 0.5, 189);

  ctx.fillStyle = 'rgba(17, 34, 46, 0.9)';
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(w * 0.5 - 320, 224, 640, 62, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 14px "Trebuchet MS", sans-serif';
  ctx.fillText('7 ISLAND AIRMAIL SORTIES · CHASE & LIT COCKPIT VIEWS · 18 HANGAR REFITS', w * 0.5, 246);
  ctx.fillStyle = '#9cc8db';
  ctx.font = '13px "Trebuchet MS", sans-serif';
  ctx.fillText('Master throttle, flaps, crosswinds, thermals & FPM runway landings across the Amber Archipelago.', w * 0.5, 268);

  const slots = state.logbookSlots || [];
  const slotW = 210;
  const startX = w * 0.5 - (slotW * 3 + 28) * 0.5;
  slots.forEach((slot, i) => {
    const sx = startX + i * (slotW + 14);
    const sy = 314;
    const selected = state.selectedSlot === i;
    ctx.fillStyle = selected ? 'rgba(246, 239, 222, 0.96)' : 'rgba(17, 34, 46, 0.88)';
    ctx.strokeStyle = selected ? PALETTE.amber : '#49687a';
    ctx.lineWidth = selected ? 3 : 1.6;
    ctx.beginPath();
    ctx.roundRect(sx, sy, slotW, 92, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? PALETTE.crimson : PALETTE.amberGlow;
    ctx.font = '900 14px "Trebuchet MS", sans-serif';
    ctx.fillText(`${slot.callsign} [${i + 1}]`, sx + slotW * 0.5, sy + 22);
    ctx.fillStyle = selected ? PALETTE.ink : PALETTE.cream;
    ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
    ctx.fillText(`BEST ${slot.bestScore.toLocaleString()} · GRADE ${slot.bestGrade}`, sx + slotW * 0.5, sy + 48);
    ctx.fillStyle = selected ? '#247f86' : '#9bb8c7';
    ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
    ctx.fillText(`SORTIES ${slot.sorties}/7 · MEDALS ${slot.feats}/16`, sx + slotW * 0.5, sy + 72);

    input.registerButton({
      x: sx,
      y: sy,
      w: slotW,
      h: 92,
      onClick: () => state.actions.selectSlot(i),
    });
  });

  const btnX = w * 0.5 - 170;
  const btnY = 438;
  ctx.fillStyle = PALETTE.crimson;
  ctx.strokeStyle = PALETTE.amberGlow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, 340, 56, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '900 20px "Trebuchet MS", sans-serif';
  ctx.fillText('LAUNCH SORTIE 1  [ENTER]', w * 0.5, btnY + 29);

  input.registerButton({
    x: btnX,
    y: btnY,
    w: 340,
    h: 56,
    onClick: () => state.actions.startCampaign(),
  });

  ctx.restore();
  drawFooterStrip(ctx, state.campaign.seed, w, h);
}

export function renderHangarScreen(ctx, state, input, w, h) {
  input.clearButtons();
  const { campaign, hangar } = state;
  const owned = campaign.refits || [];
  const setCounts = countSetPieces(owned);
  const nextSortie = SORTIE_DEFS[Math.min(SORTIE_DEFS.length - 1, campaign.sortieIndex)];
  const prevSortie = SORTIE_DEFS[Math.max(0, campaign.sortieIndex - 1)];

  drawHangarBackdrop(ctx, w, h, true);

  // 1. Header: HANGAR REFIT + Striped Ribbon carrying full destination route (ZERO truncation!)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px "Trebuchet MS", sans-serif';
  ctx.lineWidth = 7;
  ctx.strokeStyle = PALETTE.ink;
  ctx.strokeText('HANGAR REFIT', w * 0.5, 34);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText('HANGAR REFIT', w * 0.5, 34);

  ctx.fillStyle = PALETTE.crimson;
  ctx.fillRect(0, 56, w, 24);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(0, 60, w, 16);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '900 12px "Trebuchet MS", sans-serif';
  ctx.fillText(
    `PICK 1 OF 3 AIRFRAME UPGRADES  ·  NEXT: ${nextSortie.code} (${prevSortie.to.toUpperCase()} → ${nextSortie.to.toUpperCase()})`,
    w * 0.5,
    68,
  );

  // 2. Spacious Route Map + Postage & Reroll Strip (generous spacing, ZERO collision!)
  const routeY = 90;
  ctx.fillStyle = 'rgba(13, 27, 38, 0.92)';
  ctx.strokeStyle = '#3c5768';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(46, routeY, w - 92, 46, 8);
  ctx.fill();
  ctx.stroke();

  const mapLeft = 84;
  const mapRight = 838;
  ctx.strokeStyle = '#48687a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mapLeft, routeY + 17);
  ctx.lineTo(mapRight, routeY + 17);
  ctx.stroke();

  const progressX = mapLeft + ((Math.min(7, campaign.sortieIndex) / 7) * (mapRight - mapLeft));
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(mapLeft, routeY + 17);
  ctx.lineTo(progressX, routeY + 17);
  ctx.stroke();

  const stops = ['PELICAN', 'CORAL', 'BEACON', 'SQUALL', 'MT SOLIS', 'DRIFTER', 'AMBER', 'IMPERIAL'];
  stops.forEach((name, idx) => {
    const nx = mapLeft + (idx / 7) * (mapRight - mapLeft);
    const done = idx <= campaign.sortieIndex;
    const current = idx === campaign.sortieIndex;
    ctx.fillStyle = current ? PALETTE.crimsonBright : done ? PALETTE.amber : '#243c4c';
    ctx.strokeStyle = PALETTE.cream;
    ctx.lineWidth = current ? 2.5 : 1.4;
    ctx.beginPath();
    ctx.arc(nx, routeY + 17, current ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = current ? PALETTE.amberGlow : done ? PALETTE.cream : '#8aa5b5';
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.fillText(name, nx, routeY + 34);
  });

  // Right-aligned Postage Bank + Brass/Navy Reroll Button
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9bb8c7';
  ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  ctx.fillText('POSTAGE BANK', 1038, routeY + 15);
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`${campaign.postage.toLocaleString()} P`, 1038, routeY + 32);

  const rerollCost = hangar.freeRerolls > 0 ? 0 : hangar.rerollCost;
  const canReroll = campaign.postage >= rerollCost;
  const rrX = 1054;
  const rrY = routeY + 8;
  ctx.fillStyle = canReroll ? '#1b3142' : '#18242e';
  ctx.strokeStyle = canReroll ? PALETTE.amberGlow : '#49687a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(rrX, rrY, 166, 30, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(rerollCost === 0 ? 'REROLL [X] · FREE' : `REROLL [X] · ${rerollCost} P`, rrX + 83, rrY + 15);
  input.registerButton({
    x: rrX,
    y: rrY,
    w: 166,
    h: 30,
    onClick: () => state.actions.rerollHangar(),
  });

  // 3. Three Perforated Vintage Airmail Cards positioned below the open Pelican Hangar Bay Vista!
  const cardW = 336;
  const cardH = 282;
  const gap = 34;
  const cardsStartX = (w - (cardW * 3 + gap * 2)) * 0.5;
  const cardsY = 242;

  // Distinct color semantics: COMMON=olive-sage, RARE=burnished gold-amber (NOT teal!), EPIC=crimson
  const rarityBadge = {
    COMMON: { bg: '#4f6b56', text: '#fff8ea' },
    RARE: { bg: '#c9881d', text: '#fffdf2' },
    EPIC: { bg: '#b33226', text: '#ffd46b' },
  };

  hangar.choices.forEach((card, idx) => {
    const selected = hangar.selectedIndex === idx;
    const cx = cardsStartX + idx * (cardW + gap);
    const cy = selected ? cardsY - 7 : cardsY;
    const setDef = SYNERGY_SETS[card.set];
    const rStyle = rarityBadge[card.rarity] || rarityBadge.COMMON;
    const setBonusText = previewSetBonus(owned, card);

    // Contour-hugging glow & deep lift shadow on selected card (NO ugly boxy rectangle!)
    ctx.save();
    if (selected) {
      ctx.shadowColor = '#ffd46b';
      ctx.shadowBlur = 22;
      drawStampCardPath(ctx, cx, cy, cardW, cardH);
      ctx.fillStyle = PALETTE.cream;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(8, 15, 22, 0.55)';
      ctx.fillRect(cx + 6, cy + 8, cardW, cardH - 6);
    }
    ctx.restore();

    drawStampCardPath(ctx, cx, cy, cardW, cardH);
    ctx.fillStyle = PALETTE.cream;
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd46b' : PALETTE.ink;
    ctx.lineWidth = selected ? 3.2 : 2.1;
    ctx.stroke();

    // Primary Archetype Set Header (prominent top bar) + Compact Corner Rarity Pill
    ctx.fillStyle = setDef.color;
    ctx.fillRect(cx + 8, cy + 12, cardW - 16, 28);
    ctx.fillStyle = '#fff8ea';
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(setDef.name, cx + 18, cy + 26);

    ctx.fillStyle = rStyle.bg;
    ctx.beginPath();
    ctx.roundRect(cx + cardW - 76, cy + 16, 60, 20, 4);
    ctx.fill();
    ctx.fillStyle = rStyle.text;
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.rarity, cx + cardW - 46, cy + 26);

    // Circular Icon Medallion color-coded to SET COLOR (matches bottom inventory!)
    const medY = cy + 84;
    ctx.fillStyle = setDef.color;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx + cardW * 0.5, medY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawRefitIcon(ctx, card.icon, cx + cardW * 0.5, medY, 25, '#fff8ea');

    // Card Title & Crisp High-Contrast Body Copy (generous padding above SET BONUS!)
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '900 16px "Trebuchet MS", sans-serif';
    ctx.fillText(card.name, cx + cardW * 0.5, cy + 134);

    ctx.fillStyle = '#1f2b33';
    ctx.font = 'bold 13px Georgia, serif';
    const words = card.desc.split(' ');
    let line1 = '';
    let line2 = '';
    for (const wd of words) {
      if ((line1 + ' ' + wd).trim().length <= 34) line1 = (line1 + ' ' + wd).trim();
      else line2 = (line2 + ' ' + wd).trim();
    }
    ctx.fillText(line1, cx + cardW * 0.5, cy + 157);
    if (line2) ctx.fillText(line2, cx + cardW * 0.5, cy + 175);

    // Middle Synergy Status Slot (balanced rhythm across ALL 3 cards!)
    if (setBonusText) {
      ctx.save();
      ctx.translate(cx + cardW * 0.5, cy + 211);
      ctx.rotate(-0.025);
      ctx.fillStyle = setDef.color;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-144, -12, 288, 24, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff8dc';
      ctx.font = '900 10px "Trebuchet MS", sans-serif';
      ctx.fillText(setBonusText, 0, 0);
      ctx.restore();
    } else {
      const nextCount = setCounts[card.set] + 1;
      ctx.fillStyle = '#e5d6b6';
      ctx.strokeStyle = setDef.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(cx + 36, cy + 195, cardW - 72, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = setDef.color;
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      ctx.fillText(`SET PROGRESS: ${nextCount}/2 · 2 PC BONUS`, cx + cardW * 0.5, cy + 206);
    }

    // Riveted CTA Pill Button (tight, clean spacing!)
    const btnW = 196;
    const btnH = 34;
    const bx = cx + (cardW - btnW) * 0.5;
    const by = cy + cardH - 48;
    ctx.fillStyle = selected ? PALETTE.crimson : '#193545';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, btnW, btnH, 17);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? PALETTE.cream : PALETTE.amber;
    ctx.beginPath();
    ctx.arc(bx + 15, by + btnH * 0.5, 2.8, 0, Math.PI * 2);
    ctx.arc(bx + btnW - 15, by + btnH * 0.5, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.cream;
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.fillText(`INSTALL [${idx + 1}]`, bx + btnW * 0.5, by + btnH * 0.5 + 1);

    input.registerButton({
      x: cx,
      y: cy,
      w: cardW,
      h: cardH,
      onClick: () => state.actions.pickRefit(idx),
    });
  });

  // 4. Bottom Dashboard: 3 Aligned 6-Slot Refit Clusters directly above each Synergy Column (ZERO wasted void!)
  const dashY = 538;
  const dashH = h - 26 - dashY;
  ctx.fillStyle = 'rgba(12, 24, 34, 0.97)';
  ctx.fillRect(0, dashY, w, dashH);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(0, dashY, w, 2);

  const setsList = [SYNERGY_SETS.turbocharger, SYNERGY_SETS.glider, SYNERGY_SETS.avionics];
  const selectedCard = hangar.choices[hangar.selectedIndex];

  setsList.forEach((setDef, i) => {
    const colX = cardsStartX + i * (cardW + gap);
    const count = setCounts[setDef.id];
    const itemsInSet = REFIT_CATALOG.filter((r) => r.set === setDef.id);
    const isPreviewing = selectedCard && selectedCard.set === setDef.id;

    // 6-slot aligned cluster directly over this synergy column (dashed gold ring for live preview!)
    const slotStep = (cardW - 36) / 5;
    itemsInSet.forEach((item, si) => {
      const sx = colX + 18 + si * slotStep;
      const sy = dashY + 28;
      const has = owned.includes(item.id);
      const isCardMatch = selectedCard && selectedCard.id === item.id;
      ctx.save();
      ctx.fillStyle = has ? setDef.color : isCardMatch ? 'rgba(255, 212, 107, 0.16)' : '#142634';
      ctx.strokeStyle = isCardMatch ? '#ffd46b' : has ? PALETTE.amberGlow : setDef.color;
      ctx.lineWidth = isCardMatch ? 2.2 : has ? 2 : 1.1;
      if (isCardMatch && !has) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = has ? 1 : isCardMatch ? 0.85 : 0.35;
      drawRefitIcon(ctx, item.icon, sx, sy, 11, '#fff8ea');
      ctx.restore();
    });

    // Header ABOVE thinner bar so colored bar NEVER slices behind white text!
    const barHeaderY = dashY + 58;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '900 12px "Trebuchet MS", sans-serif';
    ctx.fillText(setDef.name, colX, barHeaderY);
    ctx.textAlign = 'right';
    ctx.fillStyle = isPreviewing ? '#ffd46b' : '#9bb8c7';
    ctx.fillText(isPreviewing ? `${count} → ${count + 1} / 6` : `${count} / 6`, colX + cardW, barHeaderY);

    // Thin sleek progress bar with live +1 preview segment
    const barY = dashY + 68;
    ctx.fillStyle = '#09151d';
    ctx.strokeStyle = '#3c5768';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(colX, barY, cardW, 12, 4);
    ctx.fill();
    ctx.stroke();

    if (count > 0) {
      ctx.fillStyle = setDef.color;
      ctx.beginPath();
      ctx.roundRect(colX + 2, barY + 2, ((cardW - 4) * count) / 6, 8, 3);
      ctx.fill();
    }
    if (isPreviewing && count < 6) {
      ctx.fillStyle = 'rgba(255, 212, 107, 0.65)';
      ctx.fillRect(colX + 2 + ((cardW - 4) * count) / 6, barY + 2, (cardW - 4) / 6, 8);
    }

    // Threshold bonus lines
    setDef.bonuses.forEach((b, bi) => {
      const unlocked = count >= b.pieces;
      const willUnlock = isPreviewing && count + 1 === b.pieces;
      ctx.textAlign = 'left';
      ctx.fillStyle = unlocked ? '#ffd46b' : willUnlock ? '#54d996' : '#8ea7b5';
      ctx.font = unlocked || willUnlock ? 'bold 11px "Trebuchet MS", sans-serif' : '11px "Trebuchet MS", sans-serif';
      ctx.fillText(willUnlock ? `★ ${b.label}` : b.label, colX, dashY + 95 + bi * 21);
    });
  });

  // Compact REFITS total badge centered in top border of dashboard
  ctx.fillStyle = PALETTE.amber;
  ctx.beginPath();
  ctx.roundRect(w * 0.5 - 64, dashY - 10, 128, 19, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = '900 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`REFITS OWNED ${owned.length}/18`, w * 0.5, dashY);

  ctx.restore();
  drawFooterStrip(ctx, campaign.seed, w, h, [
    { key: 'A/D', label: 'CHOOSE' },
    { key: '1/2/3', label: 'INSTALL' },
    { key: 'X', label: 'REROLL' },
    { key: 'ENTER', label: 'CONFIRM' },
    { key: 'M', label: 'MUTE' },
  ]);
}

function drawAviatorGradeCrest(ctx, cx, cy, grade) {
  // Celebratory winged brass-and-gold aviator crest (replaces flat red circle!)
  const isTop = grade === 'S' || grade === 'A';
  const ringCol = isTop ? '#ffd46b' : '#eb7b54';
  const fillCol = grade === 'S' ? '#1c4f59' : grade === 'A' ? '#24664e' : '#73342c';

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.08);

  // Layered feathered aviator wings behind seal
  ctx.fillStyle = '#d89b32';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 34, -15);
    ctx.lineTo(side * 72, -20);
    ctx.lineTo(side * 65, -8);
    ctx.lineTo(side * 70, -5);
    ctx.lineTo(side * 61, 4);
    ctx.lineTo(side * 65, 8);
    ctx.lineTo(side * 52, 16);
    ctx.lineTo(side * 34, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Feather lines
    ctx.strokeStyle = '#754d0c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(side * 44, -9);
    ctx.lineTo(side * 64, -10);
    ctx.moveTo(side * 44, 0);
    ctx.lineTo(side * 60, 0);
    ctx.moveTo(side * 44, 8);
    ctx.lineTo(side * 54, 8);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
  }

  // Sunburst outer medallion
  ctx.shadowColor = 'rgba(255, 212, 107, 0.45)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = fillCol;
  ctx.strokeStyle = ringCol;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#fff5cf';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff5cf';
  ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
  ctx.fillText('CAMPAIGN', 0, -24);
  ctx.fillStyle = ringCol;
  ctx.font = '900 48px Georgia, serif';
  ctx.fillText(grade, 0, 8);
  ctx.restore();
}

export function renderDebriefScreen(ctx, state, input, w, h) {
  input.clearButtons();
  const { campaign, debrief } = state;

  drawHangarBackdrop(ctx, w, h, false);

  ctx.save();
  ctx.fillStyle = 'rgba(10, 22, 32, 0.74)';
  ctx.fillRect(0, 0, w, h);

  const padX = 40;
  const bookY = 22;
  const bookW = w - padX * 2;
  const bookH = h - 64;

  ctx.fillStyle = PALETTE.cream;
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(padX, bookY, bookW, bookH, 10);
  ctx.fill();
  ctx.stroke();

  // Header Banner
  ctx.fillStyle = PALETTE.navyPanel;
  ctx.beginPath();
  ctx.roundRect(padX + 4, bookY + 4, bookW - 8, 56, [7, 7, 0, 0]);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = '900 23px "Trebuchet MS", sans-serif';
  ctx.fillText(`${GAME_TITLE} · FLIGHT LOGBOOK & DEBRIEF`, padX + 22, bookY + 23);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillText(`PILOT: CAPT. M. VALE · ${AIRCRAFT_NAME} · ${debrief.headline}`, padX + 22, bookY + 45);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9bb8c7';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillText('CAMPAIGN TOTAL SCORE', padX + bookW - 22, bookY + 19);
  ctx.fillStyle = '#54d996';
  ctx.font = '900 24px "Trebuchet MS", sans-serif';
  ctx.fillText(campaign.totalScore.toLocaleString(), padX + bookW - 22, bookY + 41);

  // Strict synchronized column geometry so Left & Right bottom edges lock flush!
  const bodyY = bookY + 74;
  const colBottom = bookY + bookH - 18;
  const leftX = padX + 22;
  const leftW = 412;

  // 1. LEFT TOP: Winged Grade S Seal + Spacious Final Touchdown Telemetry
  const heroH = 186;
  ctx.fillStyle = PALETTE.navyDeep;
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(leftX, bodyY, leftW, heroH, 8);
  ctx.fill();
  ctx.stroke();

  drawAviatorGradeCrest(ctx, leftX + 76, bodyY + 93, debrief.grade);

  const td = debrief.lastLanding;
  const tx = leftX + 154;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9cc0d1';
  ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
  ctx.fillText('FINAL TOUCHDOWN TELEMETRY', tx, bodyY + 26);

  ctx.fillStyle = td && td.rating === 'GREASED' ? '#54d996' : '#ffd46b';
  ctx.font = '900 20px "Trebuchet MS", sans-serif';
  ctx.fillText(td ? `${td.fpm} FPM · ${td.rating}` : 'AIRFRAME LOST', tx, bodyY + 53);

  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
  ctx.fillText(td ? `${td.islandName.toUpperCase()} (${td.runwayCode})` : (debrief.crashReason || 'INCOMPLETE'), tx, bodyY + 81);

  ctx.fillStyle = '#c5d8e2';
  ctx.font = '12px "Trebuchet MS", sans-serif';
  ctx.fillText(td ? `CENTERLINE ALIGNMENT: ${td.centerlinePct}%` : 'CHECK AIRSPEED & GLIDE SLOPE', tx, bodyY + 106);
  ctx.fillText(td ? `TOUCHDOWN: ${td.touchSpeedKts} KTS · FLAPS ${td.flapsDeg}°` : 'DEPLOY FLAPS [F] ON FINAL', tx, bodyY + 128);

  // Highlighted Bonus Pill
  ctx.fillStyle = '#1b3a4a';
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(tx, bodyY + 144, 224, 24, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(td ? `LANDING BONUS +${td.bonus.toLocaleString()} PTS` : 'PRESS [R] TO FLY AGAIN', tx + 112, bodyY + 156);

  // 2. LEFT MIDDLE: Campaign Summary (sized cleanly to lock bottom CTA flush with Right column!)
  const btnH = 46;
  const actY = colBottom - btnH;
  const statY = bodyY + heroH + 14;
  const statH = actY - 14 - statY;

  ctx.fillStyle = '#ede0c2';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(leftX, statY, leftW, statH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.navyPanel;
  ctx.font = '900 13px "Trebuchet MS", sans-serif';
  ctx.fillText('CAMPAIGN FLIGHT SUMMARY', leftX + 16, statY + 22);
  ctx.strokeStyle = 'rgba(23, 35, 44, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(leftX + 14, statY + 34);
  ctx.lineTo(leftX + leftW - 14, statY + 34);
  ctx.stroke();

  const rows = [
    ['SORTIES COMPLETED', `${campaign.completedSorties} / 7`, PALETTE.ink],
    ['PEAK RING STREAK', `x${campaign.stats.bestStreak || 0}`, '#b8501c'],
    ['GREASED LANDINGS', `${campaign.stats.greasedLandings || 0} / 7`, '#1f7a53'],
    ['AIRMAIL BULLSEYES', `${campaign.stats.bullseyeDrops || 0} / 3`, '#1e6e75'],
    ['FINAL FUEL RESERVE', `${debrief.fuelPct}%`, PALETTE.ink],
    ['AIRFRAME INTEGRITY', `${debrief.hullPct}%`, '#1f7a53'],
    ['REFITS INSTALLED', `${(campaign.refits || []).length} / 18`, PALETTE.ink],
    ['POSTAGE BANKED', `${campaign.postage.toLocaleString()} STAMPS`, '#a3680c'],
  ];
  const rowStep = (statH - 46) / rows.length;
  rows.forEach(([k, v, vc], i) => {
    const ry = statY + 49 + i * rowStep;
    ctx.fillStyle = '#405360';
    ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(k, leftX + 16, ry);
    ctx.fillStyle = vc;
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(v, leftX + leftW - 16, ry);
    if (i < rows.length - 1) {
      ctx.strokeStyle = 'rgba(23, 35, 44, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX + 14, ry + rowStep * 0.5);
      ctx.lineTo(leftX + leftW - 14, ry + rowStep * 0.5);
      ctx.stroke();
    }
  });

  // 3. LEFT BOTTOM: Action Buttons strictly aligned with Right Column bottom!
  const drawActBtn = (x, bw, label, bg, fg, onClick) => {
    ctx.fillStyle = bg;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, actY, bw, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + bw * 0.5, actY + btnH * 0.5 + 1);
    input.registerButton({ x, y: actY, w: bw, h: btnH, onClick });
  };
  drawActBtn(leftX, 198, 'NEW SEED  [R]', PALETTE.amber, PALETTE.ink, () => state.actions.restartNewSeed());
  drawActBtn(leftX + 214, 198, `REPLAY #${campaign.seed}  [S]`, '#1d5669', PALETTE.cream, () => state.actions.restartSameSeed());

  // 4. RIGHT TOP: 7-Sortie Bar Chart with Gridlines, Legend, AVG Line, Fixed Names & High-Contrast Pills!
  const rightX = leftX + leftW + 22;
  const rightW = padX + bookW - 22 - rightX;
  const chartH = 224;

  ctx.fillStyle = '#ede0c2';
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(rightX, bodyY, rightW, chartH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.navyPanel;
  ctx.font = '900 13px "Trebuchet MS", sans-serif';
  ctx.fillText('7-SORTIE ARCHIPELAGO SCORE BREAKDOWN', rightX + 18, bodyY + 21);

  const history = campaign.sortieScores || [];
  const greasedCnt = history.filter((x) => x && x.rating === 'GREASED').length;
  const firmCnt = history.filter((x) => x && x.rating !== 'GREASED').length;

  // Compact top-right legend
  ctx.fillStyle = '#247f86';
  ctx.fillRect(rightX + rightW - 216, bodyY + 15, 11, 11);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
  ctx.fillText(`GREASED (${greasedCnt})`, rightX + rightW - 200, bodyY + 21);

  ctx.fillStyle = '#c25e2c';
  ctx.fillRect(rightX + rightW - 102, bodyY + 15, 11, 11);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText(`FIRM (${firmCnt})`, rightX + rightW - 86, bodyY + 21);

  const maxBar = Math.max(45000, ...history.map((s) => s.score || 0));
  const barAreaX = rightX + 46;
  const barAreaW = rightW - 64;
  const baseLineY = bodyY + chartH - 32;
  const plotH = 132;

  // Horizontal Y-axis gridlines (20k / 40k)
  for (const val of [20000, 40000]) {
    const gy = baseLineY - (val / maxBar) * plotH;
    ctx.strokeStyle = 'rgba(23, 35, 44, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barAreaX, gy);
    ctx.lineTo(barAreaX + barAreaW, gy);
    ctx.stroke();
    ctx.fillStyle = '#5c6c78';
    ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${val / 1000}k`, barAreaX - 6, gy + 1);
  }

  // Average score dashed reference line
  const validScores = history.filter((x) => x && x.score > 0).map((x) => x.score);
  if (validScores.length > 0) {
    const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const avgY = baseLineY - (avgScore / maxBar) * plotH;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(194, 94, 44, 0.72)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(barAreaX, avgY);
    ctx.lineTo(barAreaX + barAreaW, avgY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#9c4319';
    ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`AVG ${(avgScore / 1000).toFixed(1)}k`, barAreaX + 4, avgY - 8);
    ctx.restore();
  }

  // Baseline axis
  ctx.strokeStyle = 'rgba(23, 35, 44, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(barAreaX, baseLineY);
  ctx.lineTo(barAreaX + barAreaW, baseLineY);
  ctx.stroke();

  const slotStep = barAreaW / 7;
  SORTIE_DEFS.forEach((def, idx) => {
    const rec = history[idx];
    const score = rec ? rec.score : 0;
    const bh = score > 0 ? Math.max(24, (score / maxBar) * plotH) : 8;
    const bx = barAreaX + idx * slotStep + 10;
    const bw = slotStep - 20;
    const by = baseLineY - bh;

    ctx.fillStyle = rec ? (rec.rating === 'GREASED' ? '#247f86' : '#c25e2c') : '#cbbba0';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [4, 4, 0, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    if (score > 0) {
      // Cream mask pill behind bar score so dashed AVG line never strikes through digits!
      const scoreTxt = `${(score / 1000).toFixed(1)}k`;
      ctx.fillStyle = '#ede0c2';
      ctx.fillRect(bx + bw * 0.5 - 18, by - 17, 36, 14);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '900 11px "Trebuchet MS", sans-serif';
      ctx.fillText(scoreTxt, bx + bw * 0.5, by - 10);

      // High-contrast dark navy pill inside top of bar (ZERO green-on-teal contrast failure!)
      ctx.fillStyle = 'rgba(13, 27, 38, 0.88)';
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + 5, bw - 8, 15, 3);
      ctx.fill();
      ctx.fillStyle = rec.rating === 'GREASED' ? '#6bffb8' : '#ffd46b';
      ctx.font = '900 8.5px "Trebuchet MS", sans-serif';
      ctx.fillText(rec.rating || '', bx + bw * 0.5, by + 13);
    }

    // Curated airfield short name (fixes S4 MT. -> S4 MT SOLIS!)
    ctx.fillStyle = PALETTE.ink;
    ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
    ctx.fillText(`S${idx + 1} ${def.shortTo}`, bx + bw * 0.5, baseLineY + 15);
  });

  // 5. RIGHT BOTTOM: 16 Pilot Medals Showcase with 16 Distinct Icons & ZERO Truncated Text!
  const featY = bodyY + chartH + 14;
  const featH = colBottom - featY;
  ctx.fillStyle = PALETTE.navyDeep;
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rightX, featY, rightW, featH, 8);
  ctx.fill();
  ctx.stroke();

  const earnedSet = new Set(campaign.feats || []);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.amberGlow;
  ctx.font = '900 13px "Trebuchet MS", sans-serif';
  ctx.fillText('PILOT MEDALS & FEATS', rightX + 16, featY + 21);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#54d996';
  ctx.font = 'bold 12px "Trebuchet MS", sans-serif';
  ctx.fillText(`${earnedSet.size} / 16 EARNED`, rightX + rightW - 16, featY + 21);

  const cols = 4;
  const rowsCount = 4;
  const cellW = (rightW - 28) / cols;
  const cellH = (featH - 40) / rowsCount;

  const catColor = {
    flight: '#efae38',
    precision: '#43c4c4',
    storm: '#e85d44',
    hangar: '#c97a3a',
  };
  const newHighlightIds = new Set(['grand-circuit', 'high-roller', 'silk-touch']);

  FEAT_CATALOG.forEach((feat, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const fx = rightX + 14 + col * cellW;
    const fy = featY + 34 + row * cellH;
    const earned = earnedSet.has(feat.id);
    const isNew = earned && newHighlightIds.has(feat.id);

    ctx.fillStyle = earned ? '#162f40' : '#0e1b24';
    ctx.strokeStyle = isNew ? '#ffd46b' : earned ? 'rgba(130, 174, 198, 0.32)' : '#1e3342';
    ctx.lineWidth = isNew ? 1.8 : 1;
    ctx.beginPath();
    ctx.roundRect(fx + 3, fy + 3, cellW - 6, cellH - 6, 6);
    ctx.fill();
    ctx.stroke();

    // Custom semantic medal icon disc
    const mx = fx + 21;
    const my = fy + cellH * 0.5;
    ctx.fillStyle = earned ? (catColor[feat.cat] || PALETTE.amber) : '#203340';
    ctx.beginPath();
    ctx.arc(mx, my, 12.5, 0, Math.PI * 2);
    ctx.fill();
    drawMedalIcon(ctx, feat.icon, mx, my, 12, earned ? '#0f1f2b' : '#4a6475');

    // Optional crisp NEW pill on flagship unlocked medals
    if (isNew) {
      ctx.fillStyle = PALETTE.amber;
      ctx.beginPath();
      ctx.roundRect(fx + cellW - 35, fy + 6, 28, 12, 3);
      ctx.fill();
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '900 7.5px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEW', fx + cellW - 21, fy + 12.5);
    }

    // Crisp vertically centered title & full description (100% readable, ZERO ellipses!)
    ctx.textAlign = 'left';
    ctx.fillStyle = earned ? PALETTE.cream : '#5d7787';
    ctx.font = 'bold 9.5px "Trebuchet MS", sans-serif';
    ctx.fillText(feat.name, fx + 38, fy + cellH * 0.35);

    ctx.fillStyle = earned ? '#b5d0de' : '#465f70';
    ctx.font = '9.5px "Trebuchet MS", sans-serif';
    const maxW = cellW - 44;
    const words = feat.desc.split(' ');
    let l1 = '';
    let l2 = '';
    for (const wd of words) {
      const cand = (l1 ? `${l1} ${wd}` : wd);
      if (ctx.measureText(cand).width <= maxW) l1 = cand;
      else l2 = l2 ? `${l2} ${wd}` : wd;
    }
    if (l2) {
      ctx.fillText(l1, fx + 38, fy + cellH * 0.58);
      ctx.fillText(l2, fx + 38, fy + cellH * 0.78);
    } else {
      ctx.fillText(l1, fx + 38, fy + cellH * 0.66);
    }
  });

  ctx.restore();
  drawFooterStrip(ctx, campaign.seed, w, h, [
    { key: 'R', label: 'NEW SEED' },
    { key: 'S', label: `REPLAY #${campaign.seed}` },
    { key: 'ENTER', label: 'TITLE LOGBOOK' },
    { key: 'M', label: 'MUTE' },
  ]);
}
