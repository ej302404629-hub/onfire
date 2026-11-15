// 檔案路徑：mechanisms/wood_pile.js
// ==========================================
// 模組化外掛機關：木材堆
// 支援：
// 1. igniteDelay：需被燃燒中角色/道具持續呼叫 ignite 燒烤指定秒數才會起火 (附進度條)
// 2. burnDuration：燃燒指定秒數後自動熄滅 (0/null 代表無限燃燒，支援非線性火勢衰減)
// 3. noPlayerDamage：設為 true 時，木柴堆架高在頭頂，角色站在下方不會被反燒扣血
// 4. 水球熄滅與自然時間熄滅的漸縮及 1.5 秒冷卻時間 (冷卻期間無法再次點燃)
// ==========================================
(function() {
  window.registerMechanismType("wood_pile", {
    
    editorConfig: {
      name: "木頭柴堆",
      icon: "🪵",
      params: [
        { key: "initialBurning", label: "初始是否燃燒 (initialBurning)", type: "boolean", default: false },
        { key: "noPlayerDamage", label: "取消對玩家反燒傷害 (noPlayerDamage)", type: "boolean", default: false },
        { key: "igniteDelay", label: "需要烤多久才會起火 (igniteDelay)", type: "number", default: 0, step: 0.5 },
        { key: "burnDuration", label: "燃燒多久後熄滅 (0為無限)", type: "number", default: 0, step: 1 }
      ]
    },

    solid: false,
    isForeground: false,

    init: function(mech) {
      mech.width = mech.width ?? 90;
      mech.height = mech.height ?? 50;
      mech.isBurning = !!mech.initialBurning;
      
      mech.burnDuration = mech.burnDuration; 
      mech.burnTimer = 0;
      mech.flameAnim = Math.random() * 100;

      mech.igniteDelay = mech.igniteDelay ?? 0;
      mech.igniteProgress = 0;
      mech.noPlayerDamage = !!mech.noPlayerDamage;

      mech.isExtinguishing = false;
      mech.extinguishTimer = 0;
      mech.extinguishDuration = 0.65;
      mech.coolingSmokeTimer = 0;
      mech.igniteGraceTimer = 0;
      mech.steamParticles = [];
      
      // 冷卻與受熱判定旗標
      mech.cooldownTimer = 0; 
      mech.receivedHeatThisFrame = false;

      mech.currentFlameScale = mech.isBurning ? 1.0 : 0;
      mech.currentDmgScale = mech.isBurning ? 1.0 : 0;
    },

    // 統一的被動點燃介面 (支援連續呼叫以累積熱量)
    ignite: function(mech, ctxObj, fromPlayer, dt = 0.016) {
      if (mech.cooldownTimer > 0) return; // 冷卻期間免疫點燃
      mech.receivedHeatThisFrame = true;  // 標記本幀有吸收到熱能，避免降溫

      if (!mech.isBurning && !mech.isExtinguishing) {
        if (mech.igniteDelay > 0) {
          mech.igniteProgress += dt;
          if (ctxObj && Math.random() < 0.45 && ctxObj.addSparks) {
            ctxObj.addSparks(mech.x + mech.width * 0.5, mech.y + mech.height * 0.85, false);
          }
          if (mech.igniteProgress >= mech.igniteDelay) {
            this._startBurning(mech, ctxObj, fromPlayer);
          }
        } else {
          this._startBurning(mech, ctxObj, fromPlayer);
        }
      } else if (mech.isBurning && !mech.isExtinguishing) {
        const actualBurnDuration = (!mech.burnDuration) ? Infinity : mech.burnDuration;
        if (actualBurnDuration !== Infinity) {
          mech.burnTimer = 0; // 已經在燒時被其他火源碰到，重置燃燒時間
        }
      }
    },

    _startBurning: function(mech, ctxObj, fromPlayer) {
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
      
      // 冷卻計時器倒數
      if (mech.cooldownTimer > 0) {
        mech.cooldownTimer = Math.max(0, mech.cooldownTimer - dt);
      }
      
      const actualBurnDuration = (!mech.burnDuration) ? Infinity : mech.burnDuration;

      let fScale = 1.0;
      let dmgScale = 1.0;
      
      if (mech.isBurning) {
        if (mech.isExtinguishing) {
          fScale = Math.max(0, 1 - (mech.extinguishTimer / mech.extinguishDuration));
          dmgScale = fScale;
        } else if (actualBurnDuration !== Infinity) {
          const p = mech.burnTimer / actualBurnDuration;
          if (p < 0.5) fScale = 1.0;
          else if (p < 0.99) {
            const t = (p - 0.5) / 0.49; 
            fScale = 1.0 - 0.9 * (t * t); 
          } else {
            const t = (p - 0.99) / 0.01;
            fScale = 0.1 * (1 - t); 
            dmgScale = Math.max(0, 1.0 - t); 
          }
        }
      } else {
        fScale = 0;
        dmgScale = 0;
      }
      
      mech.currentFlameScale = fScale;
      mech.currentDmgScale = dmgScale;

      // 如果本幀沒有被任何火源呼叫 ignite (沒被烤到)，進度條開始下降
      if (!mech.receivedHeatThisFrame && mech.igniteProgress > 0) {
        mech.igniteProgress = Math.max(0, mech.igniteProgress - dt * 0.5);
      }
      // 重置旗標，等待下一幀的火源呼叫
      mech.receivedHeatThisFrame = false;

      if (mech.igniteGraceTimer > 0) mech.igniteGraceTimer = Math.max(0, mech.igniteGraceTimer - dt);

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

      // 被水球撲滅的過程
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
          mech.cooldownTimer = 1.5; // 完全熄滅後進入 1.5 秒冷卻
        }
      }

      // 熄火後的冷卻冒煙
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

      // 燃燒狀態下的邏輯 (對玩家造成傷害 & 點燃道具)
      if (mech.isBurning && !mech.isExtinguishing) {
        if (actualBurnDuration !== Infinity) {
          mech.burnTimer += dt;
          if (mech.burnTimer >= actualBurnDuration) {
            mech.isBurning = false;
            mech.burnTimer = 0;
            mech.coolingSmokeTimer = 1.4; 
            mech.cooldownTimer = 1.5; // 自然熄滅後也進入 1.5 秒冷卻
            
            const cx = mech.x + mech.width * 0.5;
            const cy = mech.y + mech.height * 0.45;
            for (let i = 0; i < 8; i++) {
              mech.steamParticles.push({
                x: mech.x + mech.width * (0.2 + Math.random() * 0.6),
                y: cy + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 30,
                vy: -20 - Math.random() * 40,
                life: 0.5 + Math.random() * 0.6,
                maxLife: 1.1,
                r: 6 + Math.random() * 6
              });
            }
            if (ctxObj && ctxObj.addSmoke) ctxObj.addSmoke(cx, cy, false);
            return;
          }
        }

        if (!mech.noPlayerDamage && mech.currentDmgScale > 0) {
          const isLowStance = player.crawling || !!(player.customHitbox && player.customHitbox.isLow);
          const pHalfW = player.customHitbox?.halfW ?? (player.crawling ? 52 : 16);
          const pLeft = player.x - pHalfW;
          const pRight = player.x + pHalfW;
          const pTop = player.y - (player.customHitbox?.height ?? (isLowStance ? 64 : 132));
          const pBot = player.y;

          const fireTop = mech.y - mech.height * 0.85;
          const fireBot = mech.y + mech.height - 6;
          const inFlameZone = (pRight > mech.x + 6 && pLeft < mech.x + mech.width - 6 && pBot > fireTop && pTop < fireBot);

          if (inFlameZone && !player.dead && !player.dying && mech.igniteGraceTimer <= 0) {
            player.heat = player.maxHeat;
            player.onFire = true;
            player.hp = Math.max(0, player.hp - (95 * mech.currentDmgScale) * dt);
            if (player.hp <= 0) player.deathCause = 'fire';
            if (ctxObj && Math.random() < 0.55 * fScale) {
              if (ctxObj.addSparks) ctxObj.addSparks(player.x, player.y - 60, true);
              if (ctxObj.addSmoke) ctxObj.addSmoke(player.x, player.y - 90, false);
            }
          }
        }

        if (ctxObj && Math.random() < 0.22 * fScale && ctxObj.addSparks) {
          ctxObj.addSparks(mech.x + mech.width * (0.25 + Math.random() * 0.5), mech.y + mech.height * 0.35, false);
        }

        if (ctxObj && Array.isArray(ctxObj.particles) && Math.random() < 0.1 * fScale) {
          ctxObj.particles.push({
            type: 'smoke',
            x: mech.x + mech.width * (0.3 + Math.random() * 0.4),
            y: mech.y + mech.height * 0.15,
            vx: (Math.random() - 0.5) * 18,
            vy: -40 - Math.random() * 25,
            life: 0.45, maxLife: 0.45,
            r: 2.8 + Math.random() * 1.8
          });
        }

        // 雖然改為主動點燃制，木頭堆自己在燃燒時，理所當然也要主動去點燃經過的道具
        if (ctxObj && Array.isArray(ctxObj.items)) {
          for (const item of ctxObj.items) {
            if (item.hidden || (item.collected && !item.isHeld && !item.isThrown)) continue;
            const holdOffX = player.customHold?.x ?? 22;
            const holdOffY = player.customHold?.y ?? (player.crawling ? 18 : 64);
            const ix = item.isHeld ? (player.x + player.dir * holdOffX - item.width * 0.5) : item.x;
            const iy = item.isHeld ? (player.y - holdOffY - item.height * 0.5) : item.y;

            const hitFire = (ix + item.width >= mech.x - 10 && ix <= mech.x + mech.width + 10 &&
                             iy + item.height >= mech.y - 28 && iy <= mech.y + mech.height + 12);

            if (hitFire) {
              if (item.type === "water_ball") {
                const waterDef = window.GAME_ITEMS_REGISTRY["water_ball"];
                
                if (item.isHeld) {
                  // 1. 拿在手上的情況：來不及滅火就先被燒破
                  if (waterDef && typeof waterDef.explode === 'function') {
                    waterDef.explode(item, ctxObj, player); // 【修改】補上 player 參數
                    // 清空玩家手持狀態
                    if (player.holdingItem === item) {
                      player.holdingItem = null;
                    }
                  }
                } else {
                  // 2. 丟出去的情況：成功打中火堆，熄滅火源並破裂
                  this.onWaterHit(mech, item, ctxObj);
                  if (waterDef && typeof waterDef.explode === 'function') {
                    waterDef.explode(item, ctxObj);
                  }
                }
              } else {
                // 3. 其他一般道具的點燃邏輯
                const itemDef = window.GAME_ITEMS_REGISTRY[item.type];
                if (itemDef && typeof itemDef.ignite === 'function') {
                  itemDef.ignite(item, ctxObj, false, dt);
                } else if (!item.isBurning) {
                  item.isBurning = true;
                }
              }
            }
          }
        }
      }
    },

    draw: function(ctx, mech, customImg) {
      ctx.save();
      const x = mech.x, y = mech.y, w = mech.width, h = mech.height, cx = x + w * 0.5;
      const flameScale = mech.currentFlameScale ?? (mech.isBurning ? 1.0 : 0);

      if (flameScale > 0.02) {
        const glowR = Math.max(w, h) * 1.15 * (0.4 + 0.6 * flameScale);
        const glow = ctx.createRadialGradient(cx, y + h * 0.35, 6, cx, y + h * 0.35, glowR);
        glow.addColorStop(0, `rgba(255, 200, 60, ${0.65 * flameScale})`);
        glow.addColorStop(0.5, `rgba(255, 70, 15, ${0.3 * flameScale})`);
        glow.addColorStop(1, "rgba(255, 20, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, y + h * 0.35, glowR, 0, Math.PI * 2); ctx.fill();
      }

      if (!window.drawEntityTexture(ctx, mech, customImg)) {
        const isHot = flameScale > 0.2 || mech.igniteProgress > 0.2;
        const logColor1 = isHot ? "#4a2511" : "#6e3b1e";
        const logColor2 = isHot ? "#2e1508" : "#4d2712";
        const cutColor  = isHot ? "#ff7b29" : "#d4a373";

        const drawLog = (lx, ly, lw, lh, angle) => {
          ctx.save();
          ctx.translate(lx, ly); ctx.rotate(angle);
          const grad = ctx.createLinearGradient(0, -lh * 0.5, 0, lh * 0.5);
          grad.addColorStop(0, logColor1); grad.addColorStop(1, logColor2);
          ctx.fillStyle = grad; ctx.strokeStyle = "#170b04"; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.roundRect(-lw * 0.5, -lh * 0.5, lw, lh, lh * 0.35); ctx.fill(); ctx.stroke();
          ctx.fillStyle = cutColor; ctx.beginPath(); ctx.ellipse(-lw * 0.5 + lh * 0.3, 0, lh * 0.25, lh * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
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

      if (!mech.isBurning && mech.igniteDelay > 0 && mech.igniteProgress > 0) {
        const ratio = Math.min(1, mech.igniteProgress / mech.igniteDelay);
        const barW = Math.min(70, w * 0.9), barX = cx - barW * 0.5, barY = y - 16;
        ctx.fillStyle = "rgba(15, 10, 8, 0.85)"; ctx.strokeStyle = "#f39c12"; ctx.lineWidth = 1.5;
        ctx.fillRect(barX, barY, barW, 7); ctx.strokeRect(barX, barY, barW, 7);
        ctx.fillStyle = "#ff5252"; ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, 5);
      }

      if (flameScale > 0.02) {
        const t = mech.flameAnim;
        const sway1 = Math.sin(t * 9) * 7 * flameScale, sway2 = Math.cos(t * 12) * 6 * flameScale;
        const flk1 = 1 + Math.sin(t * 15) * 0.16, flk2 = 1 + Math.cos(t * 11) * 0.18;
        const baseY = y + h * 0.68, fireH = h * 1.35 * flameScale;

        ctx.save();
        ctx.globalAlpha = Math.min(1, flameScale * 1.15);

        ctx.fillStyle = "rgba(255, 45, 0, 0.9)"; ctx.strokeStyle = "#2b0500"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.12, baseY);
        ctx.quadraticCurveTo(x + w * 0.05, baseY - fireH * 0.5, x + w * 0.26 + sway1, baseY - fireH * 0.85 * flk1);
        ctx.lineTo(x + w * 0.38, baseY - fireH * 0.45);
        ctx.quadraticCurveTo(cx + sway2 * 0.5, baseY - fireH * 1.3 * flk2, cx + sway1, baseY - fireH * 1.18 * flk1);
        ctx.lineTo(x + w * 0.64, baseY - fireH * 0.5);
        ctx.quadraticCurveTo(x + w * 0.78 + sway2, baseY - fireH * 0.95 * flk2, x + w * 0.75 + sway2, baseY - fireH * 0.8 * flk2);
        ctx.quadraticCurveTo(x + w * 0.95, baseY - fireH * 0.4, x + w * 0.88, baseY);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        ctx.fillStyle = "rgba(255, 140, 0, 0.95)";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.22, baseY);
        ctx.quadraticCurveTo(x + w * 0.25, baseY - fireH * 0.6, x + w * 0.35 + sway2, baseY - fireH * 0.72 * flk2);
        ctx.lineTo(x + w * 0.45, baseY - fireH * 0.38);
        ctx.quadraticCurveTo(cx, baseY - fireH * 1.0, cx + sway2 * 0.6, baseY - fireH * 0.92 * flk1);
        ctx.lineTo(x + w * 0.62, baseY - fireH * 0.4);
        ctx.quadraticCurveTo(x + w * 0.72 + sway1, baseY - fireH * 0.75, x + w * 0.78, baseY);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = "#fff375";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.34, baseY);
        ctx.quadraticCurveTo(cx - 8, baseY - fireH * 0.55, cx + sway1 * 0.4, baseY - fireH * 0.62 * flk2);
        ctx.quadraticCurveTo(cx + 8, baseY - fireH * 0.55, x + w * 0.66, baseY);
        ctx.closePath(); ctx.fill();
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
          ctx.beginPath(); ctx.arc(sp.x, sp.y, curR, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  });
})();
