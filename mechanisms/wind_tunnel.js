// 檔案路徑：mechanisms/wind_tunnel.js
(function() {

  // 逆旋轉座標轉換：取得點在風洞內的局部進度與風力衰減係數 (前 3/4 為 1.0，後 1/4 線性衰減至 0.0)
  // 若不在風洞內則回傳 null
  function getWindFalloffAtPoint(px, py, mech) {
    const w = mech.width || 260;
    const h = mech.height || 130;
    const cx = mech.x + w * 0.5;
    const cy = mech.y + h * 0.5;
    const rad = ((mech.angle || 0) * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);
    const dx = px - cx;
    const dy = py - cy;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    if (Math.abs(localX) > w * 0.5 || Math.abs(localY) > h * 0.5) {
      return null;
    }

    const progress = (localX + w * 0.5) / w; // 0.0 (風口起點) ~ 1.0 (風尾終點)
    if (progress <= 0.75) return 1.0;
    return Math.max(0, (1.0 - progress) / 0.25);
  }

  // 逆旋轉座標轉換：判斷世界座標點 (px, py) 是否落在旋轉後的矩形風洞內
  function isPointInRotatedRect(px, py, mech) {
    return getWindFalloffAtPoint(px, py, mech) !== null;
  }

  // 檢查目標矩形是否與風洞重疊
  function isEntityInWind(entity, mech) {
    const ew = entity.width || 32;
    const eh = entity.height || 32;
    const ex = entity.x !== undefined ? entity.x : (entity.x1 || 0);
    const ey = entity.y !== undefined ? entity.y : (entity.y1 || 0);
    const samplePts = [
      [ex + ew * 0.5, ey + eh * 0.5],
      [ex + 4, ey + 4],
      [ex + ew - 4, ey + 4],
      [ex + 4, ey + eh - 4],
      [ex + ew - 4, ey + eh - 4]
    ];
    for (const pt of samplePts) {
      if (isPointInRotatedRect(pt[0], pt[1], mech)) return true;
    }
    return false;
  }

  // 輔助骨架繪圖函數 (供角色受風專屬姿勢使用)
  function drawTaperedLimbSeg(ctx, x1, y1, x2, y2, r1, r2, fillCol, strokeCol) {
    const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
    ctx.save();
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = 2.4;
    ctx.beginPath();
    if (dist < 0.5) {
      ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2);
    } else {
      const ang = Math.atan2(dy, dx);
      ctx.arc(x1, y1, r1, ang + Math.PI * 0.5, ang - Math.PI * 0.5, false);
      ctx.arc(x2, y2, r2, ang - Math.PI * 0.5, ang + Math.PI * 0.5, false);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawWindLimb(ctx, x1, y1, jx, jy, x2, y2, lw, isArm, dir, fillCol, strokeCol) {
    const rRoot = isArm ? lw * 0.72 : lw * 1.35;
    const rMid  = isArm ? lw * 0.50 : lw * 0.65;
    const rEnd  = isArm ? lw * 0.36 : lw * 0.40;
    drawTaperedLimbSeg(ctx, x1, y1, jx, jy, rRoot, rMid, fillCol, strokeCol);
    drawTaperedLimbSeg(ctx, jx, jy, x2, y2, rMid, rEnd, fillCol, strokeCol);
    ctx.save();
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = 2.4;
    ctx.beginPath();
    if (isArm) {
      ctx.arc(x2, y2, lw * 0.62, 0, Math.PI * 2);
    } else {
      ctx.ellipse(x2 + dir * (lw * 0.35), y2, lw * 0.85, lw * 0.48, 0, 0, Math.PI * 2);
    }
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawWindTorso(ctx, cx, cy, bw, bh, tiltAngle, fillCol, strokeCol) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tiltAngle);
    const topW = bw * 0.35, waistW = bw * 0.38, hipW = bw * 0.45, halfH = bh * 0.5;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-topW, -halfH + 4);
    ctx.quadraticCurveTo(0, -halfH - 3, topW, -halfH + 4);
    ctx.quadraticCurveTo(waistW, 0, hipW, halfH - 4);
    ctx.quadraticCurveTo(0, halfH + 3, -hipW, halfH - 4);
    ctx.quadraticCurveTo(-waistW, 0, -topW, -halfH + 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // 確保 wind_tunnel_pose 永遠排在動作外掛最後執行，避免被其他移動外掛覆蓋
  function ensureWindPoseActionLast() {
    if (!window.GAME_ACTIONS_REGISTRY) return;
    const existing = window.GAME_ACTIONS_REGISTRY["wind_tunnel_pose"];
    if (existing) {
      delete window.GAME_ACTIONS_REGISTRY["wind_tunnel_pose"];
      window.GAME_ACTIONS_REGISTRY["wind_tunnel_pose"] = existing;
    }
  }

  // 註冊角色受風姿勢與物理覆寫外掛
  if (typeof window.registerAction === "function" && !window.GAME_ACTIONS_REGISTRY["wind_tunnel_pose"]) {
    window.registerAction("wind_tunnel_pose", {
      onReset: function(player) {
        player._windActive = false;
        player._windOverrideVx = null;
        player._windOverrideVy = null;
        player._windLockMove = false;
        player._windBBHover = false;
        player._windBBHoverStrength = 0;
        player._windPoseMode = null;
        player._windPoseTimer = 0;
      },
      update: function(player, dt) {
        // 套用本幀由風洞機關計算出的速度與控制覆寫
        if (player._windActive) {
          if (player._windLockMove) {
            player.lockDefaultMove = true;
          }
          if (player._windOverrideVx !== null && player._windOverrideVx !== undefined) {
            player.overrideVx = player._windOverrideVx;
          }
          if (player._windOverrideVy !== null && player._windOverrideVy !== undefined) {
            player.overrideVy = player._windOverrideVy;
          }
          // BB 在往上吹的風洞中往下掉時，掉落速度依風力衰減比例減慢 (滿風力時減少一半)
          if (player._windBBHover && !player.grounded && player.vy > 0) {
            const s = player._windBBHoverStrength ?? 1.0;
            const reducedGravityVy = Math.max(0, player.vy - (725 * s) * dt);
            const maxFallSpd = 520 - 260 * s; // 滿風力上限 260，衰減至 0 時恢復正常
            player.overrideVy = Math.min(reducedGravityVy, maxFallSpd);
            if (s > 0.3) player.fallStartY = player.y;
          }

          player._windActive = false;
          player._windOverrideVx = null;
          player._windOverrideVy = null;
          player._windLockMove = false;
          player._windBBHover = false;
          player._windBBHoverStrength = 0;
        }

        if (player._windPoseTimer > 0) {
          player._windPoseTimer -= dt;
          if (player._windPoseTimer <= 0) {
            player._windPoseMode = null;
          }
        }
      },
      drawBody: function(ctx, player, c) {
        if (!player._windPoseMode || player.dying || player.dead || player.ledgeClimbing || player.ledgeClimbingDown || player.crawling) {
          return null;
        }
        const r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW;
        const outCol = '#080605', bodyCol = c.bodyColor, limbCol = '#2b211e';
        const now = performance.now() * 0.018;
        const wx = player._windVecX || 0;
        const wy = player._windVecY || 0;

        // 1A. BB 專屬：原地抵擋強風 (壓低重心、雙手交叉護頭)
        if (player._windPoseMode === 'bb_brace_idle') {
          const againstDir = Math.abs(wx) > 0.15 ? (wx > 0 ? -1 : 1) : player.dir;
          const d = againstDir;
          const vib = Math.sin(now * 2.5) * 1.2;
          const hipX = -d * 3 + vib, hipY = -23;
          const torsoTilt = d * 0.34;
          const shX = hipX + Math.sin(torsoTilt) * bh;
          const shY = hipY - Math.cos(torsoTilt) * bh;
          const hx = shX + d * 6;
          const hy = shY - r + 8;

          drawWindLimb(ctx, hipX - d * 4, hipY, hipX - d * 15, hipY + 11, hipX - d * 24, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, hipX + d * 4, hipY, hipX + d * 16, hipY + 10, hipX + d * 19, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, shX - d * 3, shY + 6, shX + d * 13, shY + 2, shX + d * 16, hy + 6, lw, true, d, limbCol, outCol);
          drawWindTorso(ctx, (hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, torsoTilt, bodyCol, outCol);
          drawWindLimb(ctx, shX + d * 3, shY + 6, shX + d * 18, shY - 2, shX + d * 21, hy - 2, lw, true, d, limbCol, outCol);

          return { hx, hy };
        }

        // 1B. BB 專屬：逆風行走 (身體前傾頂風、雙手護頭踏步前行)
        if (player._windPoseMode === 'bb_walk_against') {
          const d = player.dir;
          const step = Math.sin(player.animT * 1.6) * 14;
          const bob = Math.abs(Math.cos(player.animT * 1.6)) * 2.5;
          const hipX = -d * 2, hipY = -25 + bob;
          const torsoTilt = d * 0.38;
          const shX = hipX + Math.sin(torsoTilt) * bh;
          const shY = hipY - Math.cos(torsoTilt) * bh;
          const hx = shX + d * 6;
          const hy = shY - r + 8;

          drawWindLimb(ctx, hipX - d * 3, hipY, hipX - d * 10 - step * 0.45, hipY + 12, hipX - d * 14 - step, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, hipX + d * 3, hipY, hipX + d * 12 + step * 0.45, hipY + 11, hipX + d * 15 + step, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, shX - d * 3, shY + 6, shX + d * 12, shY + 2, shX + d * 15, hy + 6, lw, true, d, limbCol, outCol);
          drawWindTorso(ctx, (hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, torsoTilt, bodyCol, outCol);
          drawWindLimb(ctx, shX + d * 3, shY + 6, shX + d * 17, shY - 2, shX + d * 20, hy - 2, lw, true, d, limbCol, outCol);

          return { hx, hy };
        }

        // 1C. BB 專屬：順風行走 (身體後傾、順風大步快走)
        if (player._windPoseMode === 'bb_tailwind') {
          const d = player.dir;
          const stride = Math.sin(player.animT * 2.2) * 18;
          const armSwing = Math.sin(player.animT * 2.2) * 14;
          const hipX = 0, hipY = -30;
          const torsoTilt = -d * 0.28;
          const shX = hipX + Math.sin(torsoTilt) * bh;
          const shY = hipY - Math.cos(torsoTilt) * bh;
          const hx = shX + d * 2;
          const hy = shY - r + 6;

          drawWindLimb(ctx, hipX - 3, hipY, hipX - stride * 0.5, hipY + 15, hipX - stride, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, hipX + 3, hipY, hipX + stride * 0.5, hipY + 15, hipX + stride, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, shX - 2, shY + 6, shX - d * 10 - armSwing * 0.5, shY + 18, shX - d * 14 - armSwing, shY + 30, lw, true, d, limbCol, outCol);
          drawWindTorso(ctx, (hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, torsoTilt, bodyCol, outCol);
          drawWindLimb(ctx, shX + 2, shY + 6, shX + d * 10 + armSwing * 0.5, shY + 18, shX + d * 14 + armSwing, shY + 30, lw, true, d, limbCol, outCol);

          return { hx, hy };
        }

        // 2A. Peter & Rose：按住逆風鍵抵抗 (在後 1/4 區段會呈現掙扎緩步前行，前 3/4 則原地蹬地微震)
        if (player._windPoseMode === 'resist') {
          const againstDir = Math.abs(wx) > 0.15 ? (wx > 0 ? -1 : 1) : player.dir;
          const d = againstDir;
          const isStrugglingForward = Math.abs(player.vx) > 5;
          const step = isStrugglingForward ? Math.sin(player.animT * 1.5) * 11 : 0;
          const vib = isStrugglingForward ? Math.sin(now * 2.4) * 0.8 : Math.sin(now * 3.2) * 1.5;
          const hipX = -d * 2 + vib, hipY = -24;
          const torsoTilt = d * 0.44;
          const shX = hipX + Math.sin(torsoTilt) * bh;
          const shY = hipY - Math.cos(torsoTilt) * bh;
          const hx = shX + d * 5;
          const hy = shY - r + 7;

          drawWindLimb(ctx, hipX - d * 3, hipY, hipX - d * 14 - step * 0.4, hipY + 12, hipX - d * 20 - step, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, hipX + d * 3, hipY, hipX + d * 14 + step * 0.4, hipY + 11, hipX + d * 16 + step, -2, lw, false, d, limbCol, outCol);
          drawWindLimb(ctx, shX - d * 2, shY + 6, shX - d * 12, shY + 14, shX - d * 20, shY + 10 + vib, lw, true, d, limbCol, outCol);
          drawWindTorso(ctx, (hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, torsoTilt, bodyCol, outCol);
          drawWindLimb(ctx, shX + d * 2, shY + 6, shX + d * 14, shY + 2, shX + d * 18, hy + 4, lw, true, d, limbCol, outCol);

          return { hx, hy };
        }

        // 2B. Peter & Rose：被強風吹著走 / 吹得騰空四肢隨風飄動的動作
        if (player._windPoseMode === 'blown') {
          const flowDir = Math.abs(wx) > 0.15 ? (wx > 0 ? 1 : -1) : player.dir;
          const d = flowDir;
          const flutter1 = Math.sin(now * 1.7) * 9;
          const flutter2 = Math.cos(now * 1.9) * 9;

          const isUpwardWind = wy < -0.35 || !player.grounded;
          const hipX = 0;
          const hipY = isUpwardWind ? -35 + Math.sin(now) * 3 : -29;
          const torsoTilt = -d * 0.38 + (wy * 0.15);
          const shX = hipX + Math.sin(torsoTilt) * bh;
          const shY = hipY - Math.cos(torsoTilt) * bh;
          const hx = shX - d * 3;
          const hy = shY - r + 6;

          if (isUpwardWind) {
            drawWindLimb(ctx, hipX - 3, hipY, hipX + d * 10, hipY + 14 + flutter1 * 0.4, hipX + d * 22, hipY + 25 + flutter1, lw, false, d, limbCol, outCol);
            drawWindLimb(ctx, hipX + 3, hipY, hipX + d * 14, hipY + 12 + flutter2 * 0.4, hipX + d * 26, hipY + 20 + flutter2, lw, false, d, limbCol, outCol);
          } else {
            const stride = Math.sin(now * 1.4) * 14;
            drawWindLimb(ctx, hipX - 3, hipY, hipX - stride * 0.5, hipY + 14, hipX - stride, -2, lw, false, d, limbCol, outCol);
            drawWindLimb(ctx, hipX + 3, hipY, hipX + stride * 0.5, hipY + 14, hipX + stride, -2, lw, false, d, limbCol, outCol);
          }

          drawWindLimb(ctx, shX - 2, shY + 5, shX + d * 13, shY - 3 + flutter2 * 0.4, shX + d * 27, shY - 9 + flutter2, lw, true, d, limbCol, outCol);
          drawWindTorso(ctx, (hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, torsoTilt, bodyCol, outCol);
          drawWindLimb(ctx, shX + 2, shY + 5, shX + d * 15, shY + 3 + flutter1 * 0.4, shX + d * 29, shY - 3 + flutter1, lw, true, d, limbCol, outCol);

          return { hx, hy };
        }

        return null;
      }
    });
  }

  function createStreamParticle(mech, randomProgress) {
    const w = mech.width || 240;
    const h = mech.height || 120;
    const prog = randomProgress ? Math.random() : 0;
    return {
      lx: -w * 0.5 + prog * w,
      ly: (Math.random() - 0.5) * (h * 0.88),
      len: 28 + Math.random() * 48,
      speedMul: 0.8 + Math.random() * 0.55,
      alpha: 0.12 + Math.random() * 0.22,
      thickness: 1.2 + Math.random() * 1.8,
      wavePhase: Math.random() * Math.PI * 2
    };
  }

  window.registerMechanismType("wind_tunnel", {
    solid: false,
    isForeground: true,

    // ====== 關卡編輯器專屬設定區 (完全由編輯器動態讀取) ======
    editorConfig: {
      name: "強風風洞",
      icon: "💨",
      defaultWidth: 260,
      defaultHeight: 130,
      rotatable: true,
      showDirectionArrow: true,
      params: [
        { key: "active", label: "預設啟動開關 (active，取消勾選則需按鈕開啟)", type: "boolean", default: true },
        { key: "angle", label: "風向旋轉角度 (0=右, 90=下, 180=左, -90=上)", type: "number", default: 0, step: 15, min: -180, max: 360 },
        { key: "windStrength", label: "風力強度 (像素/秒)", type: "number", default: 420, step: 20, min: 50, max: 1500 },
        { key: "blowDuration", label: "吹風持續時間 (秒)", type: "number", default: 3.0, step: 0.2, min: 0.2 },
        { key: "pauseDuration", label: "間隙停止時間 (秒，0=持續吹)", type: "number", default: 1.5, step: 0.2, min: 0 },
        { key: "startDelay", label: "初始啟動延遲 (秒)", type: "number", default: 0, step: 0.1, min: 0 }
      ]
    },

    init: function(mech) {
      ensureWindPoseActionLast();

      mech.active = mech.active !== undefined ? !!mech.active : true;
      mech.angle = Number(mech.angle) || 0;
      mech.windStrength = Number(mech.windStrength) || 420;
      mech.blowDuration = mech.blowDuration !== undefined ? Number(mech.blowDuration) : 3.0;
      mech.pauseDuration = mech.pauseDuration !== undefined ? Number(mech.pauseDuration) : 1.5;
      mech.startDelay = Number(mech.startDelay) || 0;

      mech._delayTimer = mech.startDelay;
      mech._cycleTimer = 0;
      mech.isBlowing = mech.active && (mech.startDelay <= 0);
      mech._windBlend = mech.isBlowing ? 1.0 : 0.0;

      const area = (mech.width || 260) * (mech.height || 130);
      const pCount = Math.max(16, Math.min(65, Math.round(area / 1200)));
      mech._particles = [];
      for (let i = 0; i < pCount; i++) {
        mech._particles.push(createStreamParticle(mech, true));
      }
    },

    update: function(mech, player, dt, pluginCtx) {
      if (!mech._particles) this.init(mech);

      // 總電源開關檢查：未啟動時停止吹風並淡出氣流
      if (!mech.active) {
        mech.isBlowing = false;
        mech._windBlend += (0.0 - mech._windBlend) * Math.min(1, dt * 10);
        return;
      }

      if (mech._delayTimer > 0) {
        mech._delayTimer -= dt;
        mech.isBlowing = false;
      } else if (mech.pauseDuration > 0) {
        mech._cycleTimer += dt;
        const totalCycle = Math.max(0.1, mech.blowDuration + mech.pauseDuration);
        const phase = mech._cycleTimer % totalCycle;
        mech.isBlowing = (phase < mech.blowDuration);
      } else {
        mech.isBlowing = true;
      }

      const targetBlend = mech.isBlowing ? 1.0 : 0.0;
      mech._windBlend += (targetBlend - mech._windBlend) * Math.min(1, dt * 10);

      const w = mech.width || 260;
      const h = mech.height || 130;
      const visualSpd = Math.max(280, mech.windStrength * 1.85) * (0.25 + 0.75 * mech._windBlend);

      for (const p of mech._particles) {
        p.lx += visualSpd * p.speedMul * dt;
        p.wavePhase += dt * 8;
        if (p.lx - p.len > w * 0.5) {
          p.lx = -w * 0.5 - Math.random() * 30;
          p.ly = (Math.random() - 0.5) * (h * 0.88);
        }
      }

      if (!mech.isBlowing) return;

      const rad = ((mech.angle || 0) * Math.PI) / 180;
      const dirX = Math.cos(rad);
      const dirY = Math.sin(rad);
      const force = mech.windStrength || 420;

      // 吹熄風洞範圍內的所有著火機關與道具
      if (pluginCtx && Array.isArray(pluginCtx.mechanisms)) {
        for (const other of pluginCtx.mechanisms) {
          if (other === mech || other.hidden) continue;
          if (isEntityInWind(other, mech)) {
            if (other.isBurning) {
              other.isBurning = false;
              other.igniteProgress = 0;
              other.currentFlameScale = 0;
              other.currentDmgScale = 0;
              if (pluginCtx.addSmoke) pluginCtx.addSmoke(other.x + (other.width || 40) * 0.5, other.y, true);
            }
            if (other.type === "fire_trap" && other.active) {
              other.active = false;
              if (pluginCtx.addSmoke) pluginCtx.addSmoke(other.x + (other.width || 40) * 0.5, other.y, true);
            }
          }
        }
      }

      if (pluginCtx && Array.isArray(pluginCtx.items)) {
        for (const it of pluginCtx.items) {
          if (it.hidden) continue;
          if (it.isBurning && isEntityInWind(it, mech)) {
            it.isBurning = false;
            if (pluginCtx.addSmoke) pluginCtx.addSmoke(it.x + (it.width || 28) * 0.5, it.y, false);
          }
        }
      }

      // 檢查玩家是否在風洞內，並計算該位置的風力衰減係數 (前 3/4 = 1.0，後 1/4 = 1.0 -> 0.0)
      const f1 = getWindFalloffAtPoint(player.x, player.y - 10, mech);
      const f2 = getWindFalloffAtPoint(player.x, player.y - 55, mech);
      const f3 = getWindFalloffAtPoint(player.x, player.y - 100, mech);
      const validFalloffs = [f1, f2, f3].filter(v => v !== null);

      if (validFalloffs.length === 0 || player.dying || player.dead) return;

      const falloff = Math.max(...validFalloffs);
      if (falloff <= 0.01) return;

      const effectiveForce = force * falloff;

      const cStats = (pluginCtx && typeof pluginCtx.getCharStats === "function") ? pluginCtx.getCharStats() : {};
      const activeCharObj = (typeof loadedCharacters !== "undefined" && typeof selectedCharIdx !== "undefined") ? loadedCharacters[selectedCharIdx] : null;
      const charKey = String(activeCharObj?.folder || activeCharObj?.name || "").toLowerCase();

      const isRose = charKey.includes("rose") || !!cStats.ponytail;
      const isBB   = charKey.includes("bb")   || (cStats.bodyW >= 22);

      // 吹熄 Peter 與 BB，但 Rose 為防風火柴不會被吹熄
      if (!isRose) {
        if (player.onFire || player.heat > 0) {
          if (player.onFire && pluginCtx && pluginCtx.addSmoke) {
            pluginCtx.addSmoke(player.x, player.y - 95, true);
          }
          player.onFire = false;
          player.heat = 0;
          player.slapping = false;
          player.slapProgress = 0;
        }
      }

      player._windVecX = dirX;
      player._windVecY = dirY;
      player._windPoseTimer = 0.12;
      player._windActive = true;
      player._windOverrideVx = null;
      player._windOverrideVy = null;
      player._windLockMove = false;
      player._windBBHover = false;
      player._windBBHoverStrength = 0;

      const baseSpeed = (cStats.speed || 5) * (player.crawling ? 26 : 52);
      const wantDir = (pluginCtx?.input?.left && !pluginCtx?.input?.right) ? -1 : ((pluginCtx?.input?.right && !pluginCtx?.input?.left) ? 1 : 0);
      const windSignX = Math.abs(dirX) > 0.15 ? Math.sign(dirX) : 0;

      if (isBB) {
        // 解除主程式原地轉身鎖定，確保 BB 可以順暢切換方向行走
        player.turning = false;
        player.turnTimer = 0;

        if (wantDir !== 0) {
          player.dir = wantDir;
          if (windSignX !== 0 && wantDir === windSignX) {
            // 順風行走：身體後傾，依風力衰減平滑加速至 1.2 倍
            player._windPoseMode = 'bb_tailwind';
            player._windOverrideVx = wantDir * (baseSpeed * (1.0 + 0.2 * falloff));
          } else {
            // 逆風行走：身體前傾擋著風行走，依風力衰減平滑減速至 0.85 倍
            player._windPoseMode = 'bb_walk_against';
            player._windOverrideVx = wantDir * (baseSpeed * (1.0 - 0.15 * falloff));
          }
        } else {
          // 不走時原地做出抵擋風的姿勢
          if (windSignX !== 0) player.dir = -windSignX;
          player._windPoseMode = 'bb_brace_idle';
          player._windOverrideVx = 0;
        }

        // BB 在往上吹的風洞中往下掉時，啟動掉落減速 (依風力衰減比例)
        if (dirY < -0.15) {
          player._windBBHover = true;
          player._windBBHoverStrength = falloff;
        }
      } else {
        // Peter 與 Rose
        if (player.climbing) player.climbing = false;
        player.turning = false;
        player.turnTimer = 0;

        const windVx = dirX * effectiveForce;
        const windVy = dirY * effectiveForce;

        if (windSignX !== 0) {
          if (wantDir === -windSignX) {
            player.dir = -windSignX;
            player._windLockMove = true;
            player._windPoseMode = 'resist';

            if (falloff >= 0.99) {
              // 前四分之三：完全走不動，按住逆風方向鍵停在原地抵抗
              player._windOverrideVx = 0;
            } else {
              // 最後四分之一：可緩慢往前走，越靠近前四分之三越難走 (速度由滿速漸減至 0)
              const slowWalkSpeed = baseSpeed * (1.0 - falloff);
              player._windOverrideVx = wantDir * slowWalkSpeed;
            }
          } else {
            // 放開按鈕或順風按鍵：順著風向被吹著走 (力道依衰減係數減弱)
            const extraPush = (wantDir === windSignX) ? wantDir * 110 : 0;
            player._windOverrideVx = windVx + extraPush;
            player._windLockMove = true;
            player._windPoseMode = 'blown';
          }
        } else {
          player._windPoseMode = 'blown';
        }

        // 垂直方向：往上吹的風將 Rose 與 Peter 吹離地面往上飛 (力道依衰減係數調整)
        if (dirY < -0.15) {
          const liftSpeed = dirY * effectiveForce;
          if (Math.abs(liftSpeed) > 60) {
            player.grounded = false;
            player._windOverrideVy = Math.min(player.vy, liftSpeed);
            player.vy = player._windOverrideVy;
            player.fallStartY = player.y;
            player._windPoseMode = 'blown';
          }
        } else if (dirY > 0.25 && !player.grounded) {
          player._windOverrideVy = Math.max(player.vy, windVy);
        }
      }
    },

    draw: function(ctx, mech) {
      if (!mech._particles) this.init(mech);
      if (mech._windBlend <= 0.02) return;

      const w = mech.width || 260;
      const h = mech.height || 130;
      const cx = mech.x + w * 0.5;
      const cy = mech.y + h * 0.5;
      const rad = ((mech.angle || 0) * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rad);

      ctx.beginPath();
      ctx.rect(-w * 0.5, -h * 0.5, w, h);
      ctx.clip();

      ctx.lineCap = "round";

      for (const p of mech._particles) {
        const normX = (p.lx + w * 0.5) / w;
        const clampedNorm = Math.max(0, Math.min(1, normX));
        const edgeFade = Math.sin(clampedNorm * Math.PI);
        // 最後四分之一同步視覺淡出，讓風力衰減區一目了然
        const tailFade = clampedNorm <= 0.75 ? 1.0 : Math.max(0, (1.0 - clampedNorm) / 0.25);
        const finalAlpha = p.alpha * edgeFade * tailFade * mech._windBlend;
        if (finalAlpha <= 0.01) continue;

        const waveY = Math.sin(p.wavePhase + p.lx * 0.025) * 3.5;
        const x1 = p.lx - p.len;
        const y1 = p.ly + waveY;
        const x2 = p.lx;
        const y2 = p.ly - waveY * 0.5;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(235, 248, 255, 0)`);
        grad.addColorStop(0.55, `rgba(225, 245, 255, ${(finalAlpha * 0.7).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${finalAlpha.toFixed(3)})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = p.thickness;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) * 0.5, p.ly - waveY * 1.2, x2, y2);
        ctx.stroke();
      }

      ctx.restore();
    }
  });
})();
