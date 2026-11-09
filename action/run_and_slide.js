// 檔案路徑：action/run_and_slide.js
(function() {
  window.registerAction("run_and_slide", {
    update: function(player, dt, pluginCtx) {
      if (player.running === undefined) player.running = false;
      if (player.sliding === undefined) player.sliding = false;
      if (player.slideTimer === undefined) player.slideTimer = 0;
      if (player.slideDuration === undefined) player.slideDuration = 1.0; 
      if (player.lastTapLeft === undefined) player.lastTapLeft = -9999;
      if (player.lastTapRight === undefined) player.lastTapRight = -9999;

      if (player.dead || player.dying || player.won || player.ledgeClimbing || player.ledgeClimbingDown) {
        player.running = false;
        player.sliding = false;
        return;
      }

      const input = pluginCtx.input;
      const wasJustPressed = pluginCtx.wasJustPressed;
      const nowMs = performance.now();
      const DOUBLE_TAP_MS = 300;

      if (wasJustPressed('left')) {
        if (nowMs - player.lastTapLeft <= DOUBLE_TAP_MS && !player.crawling && !player.climbing && !player.sliding) {
          player.running = true;
          player.dir = -1;
        } else if (!player.sliding) {
          player.running = false;
        }
        player.lastTapLeft = nowMs;
      }

      if (wasJustPressed('right')) {
        if (nowMs - player.lastTapRight <= DOUBLE_TAP_MS && !player.crawling && !player.climbing && !player.sliding) {
          player.running = true;
          player.dir = 1;
        } else if (!player.sliding) {
          player.running = false;
        }
        player.lastTapRight = nowMs;
      }

      if ((!input.left && !input.right) ||
          (input.left && player.dir === 1) ||
          (input.right && player.dir === -1) ||
          player.crawling || player.climbing) {
        player.running = false;
      }

      if (player.running && player.grounded && wasJustPressed('crawl') && !player.sliding && !player.crawling && !player.climbing) {
        player.sliding = true;
        player.running = false;
        player.slideTimer = 0;
      }

      if (player.sliding) {
        player.slideTimer += dt;
        const p = player.slideTimer / player.slideDuration;

        player.lockDefaultMove = true;
        player.customHitbox = { halfW: 36, height: 64, isLow: true };
        
        // 💡 1. 動作端主動宣告：目前這個動作，手持道具的座標在哪裡
        player.customHold = { x: -10, y: 40 };

        const cStats = pluginCtx.getCharStats ? pluginCtx.getCharStats() : { speed: 5 };
        const baseStandSpeed = cStats.speed * 52;

        if (p < 0.65) {
          const slideK = p / 0.65;
          const easeOut = Math.pow(1 - slideK, 1);
          player.overrideVx = player.dir * (baseStandSpeed * 1.65) * easeOut;

          if (player.grounded && Math.random() < 0.4 && Array.isArray(pluginCtx.particles)) {
            pluginCtx.particles.push({
              type: 'smoke',
              x: player.x + player.dir * 24,
              y: player.y - 2,
              vx: -player.dir * (25 + Math.random() * 30),
              vy: -15 - Math.random() * 15,
              life: 0.3,
              maxLife: 0.3,
              r: 2.8 + Math.random() * 1.8
            });
          }
        } else {
          player.overrideVx = 0;
        }

        if (player.slideTimer >= player.slideDuration) {
          player.sliding = false;
          player.slideTimer = 0;
          player.overrideVx = null;
          player.customHitbox = null;
          
          // 💡 2. 動作結束時：把自訂持物座標清空，交還給主程式預設
          player.customHold = null; 
          
          let forceCrawl = false;
          
          if (pluginCtx.isHeadBlocked && pluginCtx.isHeadBlocked(player.x, player.y)) {
              forceCrawl = true;
          }
          
          if (!forceCrawl && Array.isArray(pluginCtx.frictionZones)) {
              const curHalfW = 36;
              for (const z of pluginCtx.frictionZones) {
                  if (z.requireCrawl && player.x + curHalfW > z.x1 && player.x - curHalfW < z.x2 && player.y >= z.yMin && player.y <= z.yMax) {
                      forceCrawl = true;
                      break;
                  }
              }
          }

          if (forceCrawl) {
            player.crawling = true;
            player.stanceT = 1.0; 
          }
        }
      } else if (player.running) {
        player.speedMultiplier = 1.3;
        player.customAnimSpeed = 15.5;
      }
    },

    drawBody: function(ctx, player, c) {
      const isRunningActive = player.running && Math.abs(player.vx) > 5 && !player.climbing && !player.crawling;
      if (!player.sliding && !isRunningActive) return null;

      const r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW, t = player.animT, d = player.dir;
      ctx.lineCap = ctx.lineJoin = 'round';

      if (player.sliding) {
        const p = Math.min(1, player.slideTimer / (player.slideDuration || 1.0));
        let standBlend = 0;
        
        if (p > 0.65) {
            standBlend = (p - 0.65) / 0.35;
            standBlend = standBlend * standBlend * (3 - 2 * standBlend);
        }

        const bodyTilt = d * (-1.08 * (1 - standBlend) + 0.12 * standBlend);
        const hipX = -d * 10 * (1 - standBlend);
        const hipY = -9 * (1 - standBlend) - 32 * standBlend;
        const shX = hipX + Math.sin(bodyTilt) * bh;
        const shY = hipY - Math.cos(bodyTilt) * bh;

        const hx = shX + d * (10 * (1 - standBlend) + 4 * standBlend);
        const hy = shY - r - 3;

        const backKneeX = hipX + d * (8 * (1 - standBlend) - 6 * standBlend);
        const backKneeY = (-3) * (1 - standBlend) + (hipY + 16) * standBlend;
        const backFootX = hipX - d * (14 * (1 - standBlend) + 10 * standBlend);
        const backFootY = -2;

        const frontKneeX = hipX + d * (24 * (1 - standBlend) + 6 * standBlend);
        const frontKneeY = (-6) * (1 - standBlend) + (hipY + 16) * standBlend;
        const frontFootX = hipX + d * (46 * (1 - standBlend) + 10 * standBlend);
        const frontFootY = (-4) * (1 - standBlend) + (-2) * standBlend;

        ctx.strokeStyle = player.dying ? '#111' : '#080605';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(hipX - 2, hipY); ctx.lineTo(backKneeX, backKneeY); ctx.lineTo(backFootX, backFootY);
        ctx.moveTo(hipX + 2, hipY); ctx.lineTo(frontKneeX, frontKneeY); ctx.lineTo(frontFootX, frontFootY);
        ctx.stroke();

        ctx.save();
        ctx.translate((hipX + shX) * 0.5, (hipY + shY) * 0.5);
        ctx.rotate(bodyTilt);
        ctx.fillStyle = player.dying ? '#1a1a1a' : c.bodyColor;
        ctx.strokeStyle = player.dying ? '#111' : '#080605';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.strokeStyle = player.dying ? '#111' : '#080605';
        ctx.lineWidth = lw;
        ctx.beginPath();
        if (player.holdingItem) {
          ctx.moveTo(shX - bw * 0.4, shY + 6); ctx.lineTo(shX + d * 14, shY + 6); ctx.lineTo(shX + d * 22, shY - 4);
          ctx.moveTo(shX + bw * 0.4, shY + 6); ctx.lineTo(shX + d * 16, shY + 8); ctx.lineTo(shX + d * 24, shY - 2);
        } else {
          const backElbX = shX - d * (12 * (1 - standBlend) + 10 * standBlend);
          const backElbY = shY + (14 * (1 - standBlend) + 18 * standBlend);
          const backHandX = shX - d * (20 * (1 - standBlend) + 14 * standBlend);
          const backHandY = (-3) * (1 - standBlend) + (shY + 32) * standBlend;

          const frontElbX = shX + d * (16 * (1 - standBlend) + 10 * standBlend);
          const frontElbY = shY + (-4 * (1 - standBlend) + 18 * standBlend);
          const frontHandX = shX + d * (30 * (1 - standBlend) + 14 * standBlend);
          const frontHandY = shY + (-10 * (1 - standBlend) + 32 * standBlend);
          
          ctx.moveTo(shX - 2, shY + 4); ctx.lineTo(backElbX, backElbY); ctx.lineTo(backHandX, backHandY);
          ctx.moveTo(shX + 2, shY + 4); ctx.lineTo(frontElbX, frontElbY); ctx.lineTo(frontHandX, frontHandY);
        }
        ctx.stroke();

        return { hx, hy };
      }

      const phase = t * 1.8;
      const bounce = Math.abs(Math.cos(phase)) * 5.5;
      const hipY = -30 - bounce;
      const bodyTilt = d * 0.36;
      const shX = Math.sin(bodyTilt) * bh;
      const shY = hipY - Math.cos(bodyTilt) * bh;
      const hx = shX + d * 6;
      const hy = shY - r - 4;

      const s1 = Math.sin(phase);
      const s2 = -s1;

      const k1X = d * (s1 * 16 + 7), k1Y = hipY + 13 - Math.max(0, s1) * 7;
      const f1X = d * (s1 * 26 - 4), f1Y = -2 - Math.max(0, -s1) * 14;
      const k2X = d * (s2 * 16 + 7), k2Y = hipY + 13 - Math.max(0, s2) * 7;
      const f2X = d * (s2 * 26 - 4), f2Y = -2 - Math.max(0, -s2) * 14;

      ctx.strokeStyle = player.dying ? '#111' : '#080605';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-2, hipY); ctx.lineTo(k1X, k1Y); ctx.lineTo(f1X, f1Y);
      ctx.moveTo(2, hipY);  ctx.lineTo(k2X, k2Y); ctx.lineTo(f2X, f2Y);
      ctx.stroke();

      ctx.save();
      ctx.translate(shX * 0.5, (hipY + shY) * 0.5);
      ctx.rotate(bodyTilt);
      ctx.fillStyle = player.dying ? '#1a1a1a' : c.bodyColor;
      ctx.strokeStyle = player.dying ? '#111' : '#080605';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = player.dying ? '#111' : '#080605';
      ctx.lineWidth = lw;
      ctx.beginPath();
      if (player.slapping) {
        const sl1 = Math.sin(performance.now() * 0.05) * 10, sl2 = Math.cos(performance.now() * 0.05) * 10;
        ctx.moveTo(shX - bw * 0.4, shY + 6); ctx.lineTo(hx - r - 12, hy - 4); ctx.lineTo(hx - 6, hy - r - 2 + sl1);
        ctx.moveTo(shX + bw * 0.4, shY + 6); ctx.lineTo(hx + r + 12, hy - 4); ctx.lineTo(hx + 6, hy - r - 2 + sl2);
      } else if (player.holdingItem) {
        ctx.moveTo(shX - bw * 0.4, shY + 6); ctx.lineTo(shX + d * 10, shY + 16); ctx.lineTo(shX + d * 20, shY + 12);
        ctx.moveTo(shX + bw * 0.4, shY + 6); ctx.lineTo(shX + d * 12, shY + 18); ctx.lineTo(shX + d * 22, shY + 14);
      } else {
        const armSw = -s1;
        const e1X = shX + d * (armSw * 14 - 3), e1Y = shY + 16;
        const h1X = e1X + d * (armSw * 9 + 11), h1Y = e1Y - 7 - armSw * 6;
        const e2X = shX + d * (-armSw * 14 - 3), e2Y = shY + 16;
        const h2X = e2X + d * (-armSw * 9 + 11), h2Y = e2Y - 7 + armSw * 6;
        ctx.moveTo(shX - 2, shY + 5); ctx.lineTo(e1X, e1Y); ctx.lineTo(h1X, h1Y);
        ctx.moveTo(shX + 2, shY + 5); ctx.lineTo(e2X, e2Y); ctx.lineTo(h2X, h2Y);
      }
      ctx.stroke();

      return { hx, hy };
    }
  });
})();
