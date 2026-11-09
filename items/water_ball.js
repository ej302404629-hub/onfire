// 檔案路徑：items/water_ball.js
(function() {
  window.registerItemType("water_ball", {
    promptText: "拾取水球 (按X)",
    interactionRange: 55,

    init: function(item) {
      item.width = item.width ?? 28;
      item.height = item.height ?? 28;
      item.baseW = item.width;
      item.baseH = item.height;

      item.spawnX = item.spawnX ?? item.x;
      item.spawnY = item.spawnY ?? item.y;
      item.hasSpawnedNext = false;
      item.respawnDelay = item.respawnDelay ?? 1.5;
      item.respawnTimer = null;

      item.collected = false;
      item.isHeld = false;
      item.isThrown = false;
      item.hidden = false;
      item.exploded = false;

      // 蓄力系統參數
      item.isCharging = false;
      item.chargeTime = 0;
      item.maxChargeTime = 0.5; 

      item.vx = 0;
      item.vy = 0;
      
      item.splashes = [];
    },

    onInteract: function(player, item, ctxObj) {
      if (item.hidden || item.exploded || player.holdingItem) return;
      item.collected = true;
      item.isHeld = true;
      item.isThrown = false;
      item.isCharging = false;
      item.vx = 0;
      item.vy = 0;
      player.holdingItem = item;
    },

    onUse: function(player, item, ctxObj) {
      if (!item.isHeld) return;
      if (!item.isCharging) {
        item.isCharging = true;
        item.chargeTime = 0;
      }
    },

    explode: function(item, ctxObj) {
      if (item.exploded) return;
      item.exploded = true;
      item.isHeld = false;
      item.isThrown = false;
      item.collected = true;
      item.isCharging = false;
      item.alwaysDraw = true; // 強制主程式繼續呼叫 draw，才能畫出水花特效

      // 1. 產生水花特效
      const cx = item.x + item.width * 0.5;
      const cy = item.y + item.height * 0.5;
      for (let i = 0; i < 15; i++) {
        item.splashes.push({
          x: cx + (Math.random() - 0.5) * 16,
          y: cy + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 200,
          vy: -80 - Math.random() * 120,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          r: 2 + Math.random() * 3.5
        });
      }

      // 2. 破掉時才啟動重生倒數
      if ((item.respawn ?? true) && !item.hasSpawnedNext && item.respawnTimer === null) {
        item.respawnTimer = item.respawnDelay;
      }
    },

    update: function(item, player, dt, ctxObj) {
      // 水花動畫更新
      if (item.splashes && item.splashes.length > 0) {
        for (let i = item.splashes.length - 1; i >= 0; i--) {
          let sp = item.splashes[i];
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vy += 800 * dt; 
          sp.life -= dt;
          if (sp.life <= 0) item.splashes.splice(i, 1);
        }
      }

      // 重生計時邏輯
      if (item.respawnTimer !== null) {
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          item.respawnTimer = null;
          item.hasSpawnedNext = true;

          if (ctxObj && Array.isArray(ctxObj.items)) {
            const newBall = {
              type: "water_ball",
              id: (item.id || "water_ball") + "_" + Date.now(),
              x: item.spawnX,
              y: item.spawnY,
              spawnX: item.spawnX,
              spawnY: item.spawnY,
              width: item.baseW,
              height: item.baseH,
              respawn: true,
              respawnDelay: item.respawnDelay,
              _img: item._img
            };
            const def = window.GAME_ITEMS_REGISTRY["water_ball"];
            if (def && typeof def.init === 'function') def.init(newBall);
            
            newBall.respawn = true;
            ctxObj.items.push(newBall);
          }
        }
      }

      if (item.hidden || item.exploded) return;

      if (item.isHeld) {
        const holdOffsetX = player.customHold?.x ?? 22;
        const holdOffsetY = player.customHold?.y ?? (player.crawling ? 18 : 64);

        item.x = player.x + player.dir * holdOffsetX - item.width * 0.5;
        item.y = player.y - holdOffsetY - item.height * 0.5;

        if (item.isCharging) {
          if (ctxObj.input.climb) {
            item.chargeTime = Math.min(item.maxChargeTime, item.chargeTime + dt);
          } else {
            item.isCharging = false;
            item.isHeld = false;
            item.isThrown = true;
            player.holdingItem = null;

            const chargeRatio = Math.min(1.0, item.chargeTime / item.maxChargeTime); 
            
            // 隨蓄力同時提升「投擲力道」與「投擲仰角」(由原本初始角度漸變至滿力 45 度)
            const isLowStance = player.crawling || player.customHitbox?.isLow;
            const minVx = 80;
            const minVyMag = isLowStance ? 40 : 80;

            const minSpeed = Math.hypot(minVx, minVyMag);
            const maxSpeed = isLowStance ? 420 : 620;
            const speed = minSpeed + (maxSpeed - minSpeed) * chargeRatio;

            const minAngle = Math.atan2(minVyMag, minVx); // 原本的起始仰角
            const maxAngle = Math.PI / 4;                 // 按滿時為斜上方 45 度
            const throwAngle = minAngle + (maxAngle - minAngle) * chargeRatio;

            item.vx = player.dir * (speed * Math.cos(throwAngle)) + player.vx * 0.35;
            item.vy = -speed * Math.sin(throwAngle);

            if (ctxObj.triggerArmPose) ctxObj.triggerArmPose('throw', 0.32);
          }
        }
      }

      if (!item.isHeld && (item.isThrown || !item.collected)) {
        if (item.isThrown || Math.abs(item.vx) > 1 || Math.abs(item.vy) > 1) {
          const prevBottom = item.y + item.height;
          item.vy += 1100 * dt; 
          item.x += item.vx * dt;
          item.y += item.vy * dt;

          const cx = item.x + item.width * 0.5;
          const cy = item.y + item.height * 0.5;
          let hitSomething = false;

          // A. 機關碰撞
          if (ctxObj && ctxObj.mechanisms) {
            for (const m of ctxObj.mechanisms) {
              if (m.hidden) continue;
              const def = window.GAME_MECHANISMS_REGISTRY[m.type];
              const isSolid = m.solid ?? (def && def.solid);
              
              const mTop = m.type === "fire_trap" ? (m.y - (m.flameHeight || 72) * 0.8) : m.y;
              const mBot = m.y + m.height;

              if (item.x + item.width >= m.x && item.x <= m.x + m.width &&
                  item.y + item.height >= mTop && item.y <= mBot) {
                
                if (m.type === "fire_trap") {
                   if (def && typeof def.onWaterHit === 'function') {
                       def.onWaterHit(m, item, ctxObj);
                       hitSomething = true;
                   }
                } else if (isSolid || (m.type === "wood_pile" && m.isBurning)) {
                   hitSomething = true;
                }
              }
            }
          }

          // B. 地板碰撞
          if (!hitSomething && ctxObj && ctxObj.groundPolylines) {
            for (const poly of ctxObj.groundPolylines) {
              const gY = ctxObj.samplePolylineY(poly.pts, cx);
              if (gY !== null && prevBottom <= gY + 24 && (item.y + item.height) >= gY && item.vy >= 0) {
                hitSomething = true;
                break;
              }
            }
          }

          // C. 牆壁碰撞
          if (!hitSomething && ctxObj && ctxObj.solidWalls) {
            for (const w of ctxObj.solidWalls) {
              const wallX = w.x !== undefined ? w.x : ((w.x1 + w.x2) * 0.5);
              if (item.y + item.height > w.yTop && item.y < w.yBottom) {
                if ((item.vx > 0 && item.x + item.width >= wallX && item.x < wallX) ||
                    (item.vx < 0 && item.x <= wallX && item.x + item.width > wallX)) {
                  hitSomething = true;
                  break;
                }
              }
            }
          }

          if (hitSomething) {
            this.explode(item, ctxObj);
          }
        }
      }
    },

    _renderBall: function(ctx, item, customImg, cx, cy) {
      const r = Math.min(item.baseW || item.width, item.baseH || item.height) * 0.5;
      ctx.save();
      ctx.translate(cx, cy);

      if (item.isThrown) {
        const speed = Math.hypot(item.vx, item.vy);
        const angle = Math.atan2(item.vy, item.vx);
        const stretch = Math.min(1.4, 1 + speed / 800);
        ctx.rotate(angle);
        ctx.scale(stretch, 1 / stretch);
        ctx.rotate(-angle);
      }

      if (customImg && customImg.complete && customImg.naturalWidth > 0) {
        ctx.drawImage(customImg, -r, -r, r * 2, r * 2);
      } else {
        const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
        grad.addColorStop(0, "rgba(235, 250, 255, 0.95)");
        grad.addColorStop(0.5, "rgba(80, 190, 255, 0.85)");
        grad.addColorStop(1, "rgba(20, 100, 220, 0.7)");

        ctx.fillStyle = grad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.3, r * 0.15, -0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    draw: function(ctx, item, customImg) {
      if (item.splashes && item.splashes.length > 0) {
        ctx.save();
        for (let sp of item.splashes) {
          const alpha = Math.max(0, sp.life / sp.maxLife);
          ctx.fillStyle = sp.color ? sp.color.replace(/[\d.]+\)$/g, `${alpha})`) : `rgba(100, 200, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (item.hidden || item.isHeld || item.exploded) return;
      const cx = item.x + item.width * 0.5;
      const cy = item.y + item.height * 0.5;
      this._renderBall(ctx, item, customImg, cx, cy);
    },

    drawHeld: function(ctx, player, item, customImg) {
      if (item.hidden || item.exploded) return;

      const holdOffsetX = player.customHold?.x ?? 22;
      const holdOffsetY = player.customHold?.y ?? (player.crawling ? 18 : 64);

      const handX = player.dir * holdOffsetX;
      const handY = -holdOffsetY;
      this._renderBall(ctx, item, customImg, handX, handY);

      if (item.isCharging) {
        ctx.save();
        const p = Math.min(1.0, item.chargeTime / item.maxChargeTime);
        const isLowStance = player.crawling || player.customHitbox?.isLow;
        const minVx = 80;
        const minVyMag = isLowStance ? 40 : 80;
        const minAngle = Math.atan2(minVyMag, minVx);
        const maxAngle = Math.PI / 4; // 45度
        const curAngle = minAngle + (maxAngle - minAngle) * p;
        const deg = Math.round((curAngle * 180) / Math.PI);

        // 繪製動態投擲角度與力道瞄準線
        const arrowLen = 26 + p * 38;
        const ax = handX + player.dir * Math.cos(curAngle) * arrowLen;
        const ay = handY - Math.sin(curAngle) * arrowLen;
        ctx.strokeStyle = 'rgba(100, 210, 255, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.setLineDash([]);

        // 繪製箭頭尖端
        const headAng = Math.atan2(ay - handY, ax - handX);
        ctx.fillStyle = 'rgba(100, 210, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(headAng - 0.45) * 9, ay - Math.sin(headAng - 0.45) * 9);
        ctx.lineTo(ax - Math.cos(headAng + 0.45) * 9, ay - Math.sin(headAng + 0.45) * 9);
        ctx.closePath();
        ctx.fill();

        const barW = 46;
        const barH = 8;
        const bx = -barW / 2;
        const currentHeight = player.customHitbox?.height ?? (player.crawling ? 64 : 132);
        const by = -currentHeight - 22;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, barW, barH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(50, 180, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(bx + 1, by + 1, Math.max(0, (barW - 2) * p), barH - 2, 3);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px "Microsoft JhengHei"';
        ctx.textAlign = 'center';
        ctx.fillText(`💧 ${Math.floor(p * 100)}% (${deg}°)`, 0, by - 6);
        ctx.restore();
      }
    }
  });
})();
