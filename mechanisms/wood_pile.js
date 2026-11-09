// 檔案路徑：mechanisms/wood_pile.js
// ==========================================
// 模組化外掛機關：木材堆
// 支援：
// 1. igniteDelay (例如 2.0 秒)：需被燃燒中角色頭頂的火焰持續燒烤指定秒數才會起火 (附進度條)
// 2. noPlayerDamage：設為 true 時，木柴堆架高在頭頂，角色站在下方不會被反燒扣血
// 3. 水球熄滅漸縮與大量白色水蒸氣冒煙動畫
// ==========================================
(function() {
  window.registerMechanismType("wood_pile", {
    solid: false,
    isForeground: false,

    init: function(mech) {
      mech.width = mech.width ?? 90;
      mech.height = mech.height ?? 50;
      mech.isBurning = !!mech.initialBurning;
      mech.burnDuration = (mech.burnDuration !== undefined && mech.burnDuration !== null && mech.burnDuration > 0)
        ? Number(mech.burnDuration)
        : Infinity;
      mech.burnTimer = 0;
      mech.flameAnim = Math.random() * 100;

      // 點火延遲設定 (預設 0 秒立即點燃；若設定 igniteDelay: 2.0 則需持續燒 2 秒)
      mech.igniteDelay = mech.igniteDelay ?? 0;
      mech.igniteProgress = 0;

      // 是否關閉對玩家的反燒傷害 (架高於頭頂時使用)
      mech.noPlayerDamage = !!mech.noPlayerDamage;

      // 熄火與冷卻冒煙動畫狀態
      mech.isExtinguishing = false;
      mech.extinguishTimer = 0;
      mech.extinguishDuration = 0.65;
      mech.coolingSmokeTimer = 0;
      mech.igniteGraceTimer = 0;
      mech.steamParticles = [];
    },

    ignite: function(mech, ctxObj, fromPlayer) {
      if (!mech.isBurning || mech.isExtinguishing) {
        mech.isBurning = true;
        mech.isExtinguishing = false;
        mech.extinguishTimer = 0;
        mech.coolingSmokeTimer = 0;
        mech.burnTimer = 0;
        mech.igniteProgress = 0;
        mech.igniteGraceTimer = fromPlayer ? 0.45 : 0.15;
        if (ctxObj && ctxObj.addSparks) {
          ctxObj.addSparks(mech.x + mech.width * 0.5, mech.y + mech.height * 0.4, true);
        }
      } else if (mech.burnDuration !== Infinity) {
        mech.burnTimer = 0;
      }
    },

    onWaterHit: function(mech, waterItem, ctxObj) {
      const actualCtx = (waterItem && (waterItem.particles || waterItem.addSmoke)) ? waterItem : ctxObj;

      if (mech.isBurning && !mech.isExtinguishing) {
        mech.isExtinguishing = true;
        mech.extinguishTimer = 0;
        mech.coolingSmokeTimer = 1.4;
        mech.igniteProgress = 0;

        const cx = mech.x + mech.width * 0.5;
        const cy = mech.y + mech.height * 0.45;

        for (let i = 0; i < 16; i++) {
          mech.steamParticles.push({
            x: mech.x + mech.width * (0.15 + Math.random() * 0.7),
            y: cy + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 110,
            vy: -55 - Math.random() * 95,
            life: 0.55 + Math.random() * 0.45,
            maxLife: 1.0,
            r: 8 + Math.random() * 10
          });
        }

        if (actualCtx && actualCtx.addSmoke) {
          actualCtx.addSmoke(cx - 15, cy, true);
          actualCtx.addSmoke(cx + 15, cy, true);
        }
      }
    },

    update: function(mech, player, dt, ctxObj) {
      mech.flameAnim += dt;

      if (mech.igniteGraceTimer > 0) {
        mech.igniteGraceTimer = Math.max(0, mech.igniteGraceTimer - dt);
      }

      if (mech.steamParticles && mech.steamParticles.length > 0) {
        for (let i = mech.steamParticles.length - 1; i >= 0; i--) {
          const sp = mech.steamParticles[i];
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vx *= 0.95;
          sp.vy *= 0.97;
          sp.life -= dt;
          if (sp.life <= 0) mech.steamParticles.splice(i, 1);
        }
      }

      if (mech.isExtinguishing) {
        mech.extinguishTimer += dt;
        if (Math.random() < 0.75) {
          mech.steamParticles.push({
            x: mech.x + mech.width * (0.2 + Math.random() * 0.6),
            y: mech.y + mech.height * 0.5,
            vx: (Math.random() - 0.5) * 45,
            vy: -45 - Math.random() * 55,
            life: 0.5 + Math.random() * 0.35,
            maxLife: 0.85,
            r: 6 + Math.random() * 7
          });
        }
        if (mech.extinguishTimer >= mech.extinguishDuration) {
          mech.isExtinguishing = false;
          mech.isBurning = false;
          mech.extinguishTimer = 0;
          mech.burnTimer = 0;
        }
      }

      if (!mech.isBurning && mech.coolingSmokeTimer > 0) {
        mech.coolingSmokeTimer = Math.max(0, mech.coolingSmokeTimer - dt);
        if (Math.random() < 0.45) {
          mech.steamParticles.push({
            x: mech.x + mech.width * (0.25 + Math.random() * 0.5),
            y: mech.y + mech.height * 0.55,
            vx: (Math.random() - 0.5) * 25,
            vy: -35 - Math.random() * 35,
            life: 0.45 + Math.random() * 0.3,
            maxLife: 0.75,
            r: 4.5 + Math.random() * 4.5
          });
        }
      }

      const isLowStance = player.crawling || !!(player.customHitbox && player.customHitbox.isLow);
      const pHalfW = player.customHitbox?.halfW ?? (player.crawling ? 52 : 16);
      const pH = player.customHitbox?.height ?? (isLowStance ? 64 : 132);
      const pLeft = player.x - pHalfW;
      const pRight = player.x + pHalfW;
      const pTop = player.y - pH;
      const pBot = player.y;

      // 💡 計算燃燒中角色的「頭頂火焰區」：頭頂向上延伸約 65px 的火舌範圍
      const headFlameTop = pTop - 65;
      const headFlameBot = pTop + 25;
      const pad = 16;

      const isPlayerFlameTouching = (
        player.onFire && !player.dead && !player.dying &&
        pRight >= mech.x - pad &&
        pLeft <= mech.x + mech.width + pad &&
        headFlameBot >= mech.y - pad &&
        headFlameTop <= mech.y + mech.height + pad
      );

      // 1. 著火角色頭頂火焰燒烤未燃燒的木材堆
      if (!mech.isBurning && !mech.isExtinguishing) {
        if (isPlayerFlameTouching) {
          if (mech.igniteDelay > 0) {
            mech.igniteProgress += dt;
            if (ctxObj && Math.random() < 0.45 && ctxObj.addSparks) {
              ctxObj.addSparks(mech.x + mech.width * 0.5, mech.y + mech.height * 0.85, false);
            }
            if (mech.igniteProgress >= mech.igniteDelay) {
              this.ignite(mech, ctxObj, true);
            }
          } else {
            this.ignite(mech, ctxObj, true);
          }
        } else {
          mech.igniteProgress = Math.max(0, mech.igniteProgress - dt * 0.5);
        }
      }

      // 2. 燃燒狀態下的邏輯
      if (mech.isBurning && !mech.isExtinguishing) {
        if (mech.burnDuration !== Infinity) {
          mech.burnTimer += dt;
          if (mech.burnTimer >= mech.burnDuration) {
            this.onWaterHit(mech, null, ctxObj);
            return;
          }
        }

        // 💡 若未設定 noPlayerDamage，且角色身體進入木柴堆火焰區，才會燒傷角色
        if (!mech.noPlayerDamage) {
          const fireTop = mech.y - mech.height * 0.85;
          const fireBot = mech.y + mech.height - 6;
          const inFlameZone = (
            pRight > mech.x + 6 &&
            pLeft < mech.x + mech.width - 6 &&
            pBot > fireTop &&
            pTop < fireBot
          );

          if (inFlameZone && !player.dead && !player.dying && mech.igniteGraceTimer <= 0) {
            player.heat = player.maxHeat;
            player.onFire = true;
            player.hp = Math.max(0, player.hp - 95 * dt);
            if (player.hp <= 0) {
              player.deathCause = 'fire';
            }
            if (ctxObj && Math.random() < 0.55) {
              if (ctxObj.addSparks) ctxObj.addSparks(player.x, player.y - pH * 0.5, true);
              if (ctxObj.addSmoke) ctxObj.addSmoke(player.x, player.y - pH * 0.7, false);
            }
          }
        }

        if (ctxObj && Math.random() < 0.22 && ctxObj.addSparks) {
          ctxObj.addSparks(
            mech.x + mech.width * (0.25 + Math.random() * 0.5),
            mech.y + mech.height * 0.35,
            false
          );
        }

        if (ctxObj && Array.isArray(ctxObj.particles) && Math.random() < 0.1) {
          ctxObj.particles.push({
            type: 'smoke',
            x: mech.x + mech.width * (0.3 + Math.random() * 0.4),
            y: mech.y + mech.height * 0.15,
            vx: (Math.random() - 0.5) * 18,
            vy: -40 - Math.random() * 25,
            life: 0.45,
            maxLife: 0.45,
            r: 2.8 + Math.random() * 1.8
          });
        }

        // 點燃靠近的道具（如伸手過來的油球）
        if (ctxObj && Array.isArray(ctxObj.items)) {
          for (const item of ctxObj.items) {
            if (item.hidden || (item.collected && !item.isHeld && !item.isThrown)) continue;
            const holdOffX = player.customHold?.x ?? 22;
            const holdOffY = player.customHold?.y ?? (player.crawling ? 18 : 64);
            const ix = item.isHeld ? (player.x + player.dir * holdOffX - item.width * 0.5) : item.x;
            const iy = item.isHeld ? (player.y - holdOffY - item.height * 0.5) : item.y;

            const hitFire = (
              ix + item.width >= mech.x - 10 &&
              ix <= mech.x + mech.width + 10 &&
              iy + item.height >= mech.y - 28 &&
              iy <= mech.y + mech.height + 12
            );

            if (hitFire) {
              if (item.type === "water_ball") {
                this.onWaterHit(mech, item, ctxObj);
              }
              const itemDef = window.GAME_ITEMS_REGISTRY[item.type];
              if (itemDef && typeof itemDef.ignite === 'function') {
                itemDef.ignite(item, ctxObj);
              } else if (!item.isBurning) {
                item.isBurning = true;
              }
            }
          }
        }
      }
    },

    draw: function(ctx, mech, customImg) {
      ctx.save();
      const x = mech.x, y = mech.y, w = mech.width, h = mech.height;
      const cx = x + w * 0.5;

      let flameScale = 0;
      if (mech.isBurning) {
        if (mech.isExtinguishing) {
          flameScale = Math.max(0, 1 - (mech.extinguishTimer / mech.extinguishDuration));
        } else {
          flameScale = 1.0;
        }
      }

      if (flameScale > 0.02) {
        const glowR = Math.max(w, h) * 1.15 * (0.4 + 0.6 * flameScale);
        const glow = ctx.createRadialGradient(cx, y + h * 0.35, 6, cx, y + h * 0.35, glowR);
        glow.addColorStop(0, `rgba(255, 200, 60, ${0.65 * flameScale})`);
        glow.addColorStop(0.5, `rgba(255, 70, 15, ${0.3 * flameScale})`);
        glow.addColorStop(1, "rgba(255, 20, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, y + h * 0.35, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!window.drawEntityTexture(ctx, mech, customImg)) {
        const isHot = flameScale > 0.2 || mech.igniteProgress > 0.2;
        const logColor1 = isHot ? "#4a2511" : "#6e3b1e";
        const logColor2 = isHot ? "#2e1508" : "#4d2712";
        const cutColor  = isHot ? "#ff7b29" : "#d4a373";

        const drawLog = (lx, ly, lw, lh, angle) => {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(angle);
          const grad = ctx.createLinearGradient(0, -lh * 0.5, 0, lh * 0.5);
          grad.addColorStop(0, logColor1);
          grad.addColorStop(1, logColor2);
          ctx.fillStyle = grad;
          ctx.strokeStyle = "#170b04";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-lw * 0.5, -lh * 0.5, lw, lh, lh * 0.35);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = cutColor;
          ctx.beginPath();
          ctx.ellipse(-lw * 0.5 + lh * 0.3, 0, lh * 0.25, lh * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        };

        const lh = Math.max(12, h * 0.32);
        drawLog(cx - w * 0.18, y + h - lh * 0.55, w * 0.52, lh, -0.06);
        drawLog(cx + w * 0.18, y + h - lh * 0.55, w * 0.52, lh, 0.08);
        drawLog(cx,            y + h - lh * 0.62, w * 0.58, lh, 0.02);
        drawLog(cx - w * 0.1,  y + h - lh * 1.35, w * 0.50, lh, 0.22);
        drawLog(cx + w * 0.12, y + h - lh * 1.35, w * 0.50, lh, -0.20);
        drawLog(cx,            y + h - lh * 1.95, w * 0.44, lh, 0.05);
      }

      // 繪製 2 秒點火累計進度條
      if (!mech.isBurning && mech.igniteDelay > 0 && mech.igniteProgress > 0.02) {
        const ratio = Math.min(1, mech.igniteProgress / mech.igniteDelay);
        const barW = Math.min(70, w * 0.9);
        const barX = cx - barW * 0.5;
        const barY = y - 16;
        ctx.fillStyle = "rgba(15, 10, 8, 0.85)";
        ctx.strokeStyle = "#f39c12";
        ctx.lineWidth = 1.5;
        ctx.fillRect(barX, barY, barW, 7);
        ctx.strokeRect(barX, barY, barW, 7);
        ctx.fillStyle = "#ff5252";
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, 5);
      }

      if (flameScale > 0.02) {
        const t = mech.flameAnim;
        const sway1 = Math.sin(t * 9) * 7 * flameScale;
        const sway2 = Math.cos(t * 12) * 6 * flameScale;
        const flk1 = 1 + Math.sin(t * 15) * 0.16;
        const flk2 = 1 + Math.cos(t * 11) * 0.18;
        const baseY = y + h * 0.68;
        const fireH = h * 1.35 * flameScale;

        ctx.save();
        ctx.globalAlpha = Math.min(1, flameScale * 1.15);

        ctx.fillStyle = "rgba(255, 45, 0, 0.9)";
        ctx.strokeStyle = "#2b0500";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.12, baseY);
        ctx.quadraticCurveTo(x + w * 0.05, baseY - fireH * 0.5, x + w * 0.26 + sway1, baseY - fireH * 0.85 * flk1);
        ctx.lineTo(x + w * 0.38, baseY - fireH * 0.45);
        ctx.quadraticCurveTo(cx + sway2 * 0.5, baseY - fireH * 1.3 * flk2, cx + sway1, baseY - fireH * 1.18 * flk1);
        ctx.lineTo(x + w * 0.64, baseY - fireH * 0.5);
        ctx.quadraticCurveTo(x + w * 0.78 + sway2, baseY - fireH * 0.95 * flk2, x + w * 0.75 + sway2, baseY - fireH * 0.8 * flk2);
        ctx.quadraticCurveTo(x + w * 0.95, baseY - fireH * 0.4, x + w * 0.88, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 140, 0, 0.95)";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.22, baseY);
        ctx.quadraticCurveTo(x + w * 0.25, baseY - fireH * 0.6, x + w * 0.35 + sway2, baseY - fireH * 0.72 * flk2);
        ctx.lineTo(x + w * 0.45, baseY - fireH * 0.38);
        ctx.quadraticCurveTo(cx, baseY - fireH * 1.0, cx + sway2 * 0.6, baseY - fireH * 0.92 * flk1);
        ctx.lineTo(x + w * 0.62, baseY - fireH * 0.4);
        ctx.quadraticCurveTo(x + w * 0.72 + sway1, baseY - fireH * 0.75, x + w * 0.78, baseY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#fff375";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.34, baseY);
        ctx.quadraticCurveTo(cx - 8, baseY - fireH * 0.55, cx + sway1 * 0.4, baseY - fireH * 0.62 * flk2);
        ctx.quadraticCurveTo(cx + 8, baseY - fireH * 0.55, x + w * 0.66, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (mech.steamParticles && mech.steamParticles.length > 0) {
        for (const sp of mech.steamParticles) {
          const a = Math.max(0, sp.life / sp.maxLife);
          const curR = sp.r * (1.8 - a * 0.8);
          const grad = ctx.createRadialGradient(sp.x, sp.y, curR * 0.15, sp.x, sp.y, curR);
          grad.addColorStop(0, `rgba(235, 240, 245, ${a * 0.78})`);
          grad.addColorStop(0.6, `rgba(180, 190, 200, ${a * 0.45})`);
          grad.addColorStop(1, "rgba(120, 130, 140, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, curR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  });
})();
