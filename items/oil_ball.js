// 檔案路徑：items/oil_ball.js
(function() {
  window.registerItemType("oil_ball", {
    promptText: "拾取油球 (按X)",
    interactionRange: 55,

    init: function(item) {
      item.width = item.width ?? 30;
      item.height = item.height ?? 30;
      item.baseW = item.width;
      item.baseH = item.height;

      item.spawnX = item.spawnX ?? item.x;
      item.spawnY = item.spawnY ?? item.y;
      item.hasSpawnedNext = false;

      item.respawnDelay = item.respawnDelay ?? 1.0;
      item.respawnTimer = null;

      item.collected = false;
      item.isHeld = false;
      item.isThrown = false;
      item.hidden = false;

      item.isCharging = false;
      item.chargeTime = 0;
      item.maxChargeTime = 0.4;

      item.vx = 0;
      item.vy = 0;

      item.isBurning = !!item.initialBurning;
      item.burnTimer = 0;
      item.witherStartTime = item.witherStartTime ?? 3.0;
      item.burnOutTime = item.burnOutTime ?? 5.0;
    },

    ignite: function(item, ctxObj) {
      if (item.hidden || item.isBurning) return;
      item.isBurning = true;
      item.burnTimer = 0;
      if (ctxObj && ctxObj.addSparks) {
        ctxObj.addSparks(item.x + item.width * 0.5, item.y + item.height * 0.5, true);
      }
    },

    onInteract: function(player, item, ctxObj) {
      if (item.hidden || player.holdingItem) return;
      item.collected = true;
      item.isHeld = true;
      item.isThrown = false;
      item.isCharging = false;
      item.vx = 0;
      item.vy = 0;
      player.holdingItem = item;

      if (item.respawnOnPickup && !item.hasSpawnedNext && item.respawnTimer === null) {
        item.respawnTimer = item.respawnDelay;
      }

      if (player.onFire) {
        this.ignite(item, ctxObj);
      }
    },

    onUse: function(player, item, ctxObj) {
      if (!item.isHeld) return;
      if (!item.isCharging) {
        item.isCharging = true;
        item.chargeTime = 0;
      }
    },

    update: function(item, player, dt, ctxObj) {
      if (item.respawnTimer !== null) {
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          item.respawnTimer = null;
          item.hasSpawnedNext = true;

          if (ctxObj && Array.isArray(ctxObj.items)) {
            const newBall = {
              type: "oil_ball",
              id: (item.id || "oil_ball") + "_" + Date.now(),
              x: item.spawnX,
              y: item.spawnY,
              spawnX: item.spawnX,
              spawnY: item.spawnY,
              width: item.baseW,
              height: item.baseH,
              respawnOnPickup: true,
              respawnDelay: item.respawnDelay,
              witherStartTime: item.witherStartTime,
              burnOutTime: item.burnOutTime,
              _img: item._img
            };
            this.init(newBall);
            ctxObj.items.push(newBall);
          }
        }
      }

      if (item.hidden) return;

      if (item.isHeld) {
        // 1. 道具完全解耦：自動讀取外掛宣告座標
        const holdOffsetX = player.customHold?.x ?? 22;
        const holdOffsetY = player.customHold?.y ?? (player.crawling ? 18 : 64);
        
        item.x = player.x + player.dir * holdOffsetX - item.width * 0.5;
        item.y = player.y - holdOffsetY - item.height * 0.5;

        if (player.onFire && !item.isBurning) {
          this.ignite(item, ctxObj);
        }

        if (item.isCharging) {
          if (ctxObj.input.climb) {
            item.chargeTime = Math.min(item.maxChargeTime, item.chargeTime + dt);
          } else {
            item.isCharging = false;
            item.isHeld = false;
            item.isThrown = true;
            player.holdingItem = null;

            const chargeRatio = Math.min(1.0, item.chargeTime / item.maxChargeTime);
            
            // 2. 隨蓄力同時提升「投擲力道」與「投擲仰角」(由原本初始角度漸變至滿力 45 度)
            const isLowStance = player.crawling || player.customHitbox?.isLow;
            const minVx = 110;
            const minVyMag = isLowStance ? 45 : 90;

            const minSpeed = Math.hypot(minVx, minVyMag);
            const maxSpeed = isLowStance ? 420 : 600;
            const speed = minSpeed + (maxSpeed - minSpeed) * chargeRatio;

            const minAngle = Math.atan2(minVyMag, minVx); // 原本的起始仰角
            const maxAngle = Math.PI / 4;                 // 按滿時為斜上方 45 度
            const throwAngle = minAngle + (maxAngle - minAngle) * chargeRatio;

            item.x = player.x - item.width * 0.5;
            item.y = player.y - holdOffsetY - item.height * 0.5;

            item.vx = player.dir * (speed * Math.cos(throwAngle)) + player.vx * 0.35;
            item.vy = -speed * Math.sin(throwAngle);

            if (ctxObj.triggerArmPose) ctxObj.triggerArmPose('throw', 0.32);
          }
        }
      }

      if (!item.isHeld && (item.isThrown || !item.collected)) {
        if (item.isThrown || Math.abs(item.vx) > 1 || Math.abs(item.vy) > 1) {
          const prevX = item.x;
          const prevY = item.y;
          const prevCX = prevX + item.width * 0.5;
          const prevBottom = prevY + item.height;

          item.vy += 1200 * dt;
          const moveX = item.vx * dt;
          const moveY = item.vy * dt;

          item.x += moveX;
          item.y += moveY;

          const sweepX = Math.min(prevX, item.x);
          const sweepY = Math.min(prevY, item.y);
          const sweepW = item.width + Math.abs(moveX);
          const sweepH = item.height + Math.abs(moveY);

          if (ctxObj && ctxObj.mechanisms) {
            for (const m of ctxObj.mechanisms) {
              if (m.hidden) continue;
              const def = window.GAME_MECHANISMS_REGISTRY[m.type];
              const isSolid = m.solid ?? (def && def.solid);

              if (isSolid) {
                if (sweepX + sweepW >= m.x && sweepX <= m.x + m.width &&
                    sweepY + sweepH >= m.y && sweepY <= m.y + m.height) {

                  const wasHorizontallyInside = (prevX + item.width > m.x + 2) && (prevX < m.x + m.width - 2);
                  if (wasHorizontallyInside && prevBottom <= m.y + 14 && item.vy >= 0) {
                    item.y = m.y - item.height - 0.5;
                    item.vy = -item.vy * 0.3;
                    item.vx *= 0.85;
                    if (Math.abs(item.vx) < 12 && Math.abs(item.vy) < 30) {
                      item.vx = 0;
                      item.vy = 0;
                      item.isThrown = false;
                      item.collected = false;
                    }
                  } else {
                    const mCX = m.x + m.width * 0.5;
                    const bounceSpeed = Math.max(50, Math.abs(item.vx) * 0.3);
                    if (prevCX <= mCX) {
                      item.x = m.x - item.width - 2;
                      item.vx = -bounceSpeed;
                    } else {
                      item.x = m.x + m.width + 2;
                      item.vx = bounceSpeed;
                    }
                  }
                }
              }
            }
          }

          if (ctxObj && ctxObj.solidWalls) {
            for (const w of ctxObj.solidWalls) {
              const wallX = w.x !== undefined ? w.x : ((w.x1 + w.x2) * 0.5);
              if (sweepY + sweepH > w.yTop && sweepY < w.yBottom) {
                const bounceSpeed = Math.max(50, Math.abs(item.vx) * 0.3);
                if (prevCX <= wallX && (item.x + item.width) >= wallX && item.vx > 0) {
                  item.x = wallX - item.width - 2;
                  item.vx = -bounceSpeed;
                } else if (prevCX >= wallX && item.x <= wallX && item.vx < 0) {
                  item.x = wallX + 2;
                  item.vx = bounceSpeed;
                }
              }
            }
          }

          const curCX = item.x + item.width * 0.5;
          if (ctxObj && ctxObj.groundPolylines) {
            for (const poly of ctxObj.groundPolylines) {
              const gY = ctxObj.samplePolylineY(poly.pts, curCX);
              if (gY !== null && prevBottom <= gY + 24 && (item.y + item.height) >= gY && item.vy >= 0) {
                item.y = gY - item.height;
                if (Math.abs(item.vy) > 130) {
                  item.vy = -item.vy * 0.35;
                } else {
                  item.vy = 0;
                }
                item.vx *= 0.86;
                if (Math.abs(item.vx) < 12 && Math.abs(item.vy) < 15) {
                  item.vx = 0;
                  item.vy = 0;
                  item.isThrown = false;
                  item.collected = false;
                }
                break;
              }
            }
          }
        }
      }

      const cx = item.x + item.width * 0.5;
      const cy = item.y + item.height * 0.5;
      const isIdleAtSpawner = item.respawnOnPickup && !item.hasSpawnedNext && !item.isHeld && !item.isThrown;

      if (!item.isBurning && !isIdleAtSpawner) {
        if (player.onFire && !player.dead && !player.dying) {
          const isLowStance = player.crawling || !!(player.customHitbox && player.customHitbox.isLow);
          const pHalfW = player.customHitbox?.halfW ?? (player.crawling ? 52 : 16);
          const pH = player.customHitbox?.height ?? (isLowStance ? 64 : 132);
          if (cx >= player.x - pHalfW - 14 && cx <= player.x + pHalfW + 14 &&
              cy >= player.y - pH - 14 && cy <= player.y + 10) {
            this.ignite(item, ctxObj);
          }
        }

        if (ctxObj && ctxObj.mechanisms) {
          for (const m of ctxObj.mechanisms) {
            if (m.hidden) continue;
            const mActiveFire =
              (m.type === "wood_pile" && m.isBurning) ||
              (m.type === "fire_trap" && !m.extinguished && !m.isCooling && m.active !== false);

            if (mActiveFire) {
              if (item.x + item.width >= m.x - 8 && item.x <= m.x + m.width + 8 &&
                  item.y + item.height >= m.y - 24 && item.y <= m.y + m.height + 8) {
                this.ignite(item, ctxObj);
                break;
              }
            }
          }
        }
      }

      if (item.isBurning) {
        item.burnTimer += dt;
        const isWithering = item.burnTimer >= item.witherStartTime;

        if (ctxObj && Math.random() < 0.25 && ctxObj.addSparks) {
          ctxObj.addSparks(cx, cy, false);
        }

        if (ctxObj && Array.isArray(ctxObj.particles)) {
          const smokeChance = isWithering ? 0.16 : 0.08;
          if (Math.random() < smokeChance) {
            ctxObj.particles.push({
              type: 'smoke',
              x: cx + (Math.random() - 0.5) * 8,
              y: item.y - 2,
              vx: (Math.random() - 0.5) * 16,
              vy: -35 - Math.random() * 25,
              life: 0.45,
              maxLife: 0.45,
              r: 2.5 + Math.random() * 1.5
            });
          }
        }

        if (ctxObj && ctxObj.mechanisms) {
          for (const m of ctxObj.mechanisms) {
            if (m.hidden) continue;
            if (m.type === "wood_pile" && !m.isBurning) {
              if (item.x + item.width >= m.x - 8 && item.x <= m.x + m.width + 8 &&
                  item.y + item.height >= m.y - 12 && item.y <= m.y + m.height + 12) {
                const mDef = window.GAME_MECHANISMS_REGISTRY[m.type];
                if (mDef && typeof mDef.ignite === 'function') mDef.ignite(m, ctxObj);
                else m.isBurning = true;
              }
            }
          }
        }

        // 💡 關鍵修正：絕對不可將 rope_segment 標記為 isBurning = true，否則整條繩子會變成巨大火源燒斷自己另一端！
        if (ctxObj && ctxObj.items) {
          for (const other of ctxObj.items) {
            if (other === item || other.hidden || other.isBurning || other.type === "rope_segment") continue;
            const otherIdleSpawner = other.respawnOnPickup && !other.hasSpawnedNext && !other.isHeld && !other.isThrown;
            if (otherIdleSpawner) continue;
            if (Math.hypot((other.x + other.width * 0.5) - cx, (other.y + other.height * 0.5) - cy) <= (item.width + other.width) * 0.65) {
              const oDef = window.GAME_ITEMS_REGISTRY[other.type];
              if (oDef && typeof oDef.ignite === 'function') oDef.ignite(other, ctxObj);
            }
          }
        }

        if (item.burnTimer >= item.burnOutTime) {
          if (item.isHeld && player.holdingItem === item) {
            player.holdingItem = null;
          }
          item.isHeld = false;
          item.isThrown = false;
          item.collected = true;
          item.hidden = true;

          if (ctxObj && Array.isArray(ctxObj.particles)) {
            for (let i = 0; i < 3; i++) {
              ctxObj.particles.push({
                type: 'smoke',
                x: cx + (Math.random() - 0.5) * 10,
                y: cy + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 35,
                vy: -30 - Math.random() * 20,
                life: 0.4,
                maxLife: 0.4,
                r: 3.0 + Math.random() * 1.5
              });
            }
          }
        }
      }
    },

    _renderBall: function(ctx, item, customImg, cx, cy) {
      let scale = 1.0;
      let shakeX = 0, shakeY = 0;
      let witherProgress = 0;

      if (item.isBurning && item.burnTimer >= item.witherStartTime) {
        const span = Math.max(0.1, item.burnOutTime - item.witherStartTime);
        witherProgress = Math.min(1, (item.burnTimer - item.witherStartTime) / span);
        scale = Math.max(0.18, 1 - witherProgress * 0.82);
        shakeX = (Math.random() - 0.5) * 5 * witherProgress;
        shakeY = (Math.random() - 0.5) * 5 * witherProgress;
      }

      ctx.save();
      ctx.translate(cx + shakeX, cy + shakeY);
      ctx.scale(scale, scale);

      const r = Math.min(item.baseW || item.width, item.baseH || item.height) * 0.5;
      const now = performance.now() * 0.015;

      if (item.isBurning) {
        const glow = ctx.createRadialGradient(0, -r * 0.3, r * 0.2, 0, -r * 0.3, r * 2.8);
        glow.addColorStop(0, "rgba(255, 230, 90, 0.85)");
        glow.addColorStop(0.5, "rgba(255, 80, 10, 0.45)");
        glow.addColorStop(1, "rgba(255, 20, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, -r * 0.3, r * 2.8, 0, Math.PI * 2);
        ctx.fill();

        const sway = Math.sin(now * 2) * 5;
        ctx.fillStyle = witherProgress > 0.5 ? "#d63031" : "#ff3b00";
        ctx.beginPath();
        ctx.moveTo(-r * 1.15, r * 0.2);
        ctx.quadraticCurveTo(-r * 1.4, -r * 1.2, -r * 0.4 + sway, -r * 2.2);
        ctx.lineTo(0, -r * 1.4);
        ctx.quadraticCurveTo(r * 0.3 - sway, -r * 2.6, r * 0.5 + sway, -r * 2.1);
        ctx.quadraticCurveTo(r * 1.4, -r * 1.0, r * 1.15, r * 0.2);
        ctx.arc(0, 0, r * 1.15, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ff9f1a";
        ctx.beginPath();
        ctx.arc(0, -r * 0.15, r * 0.95, 0, Math.PI * 2);
        ctx.fill();
      }

      if (customImg && customImg.complete && customImg.naturalWidth > 0) {
        ctx.drawImage(customImg, -r, -r, r * 2, r * 2);
      } else {
        const ballGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        if (item.isBurning) {
          ballGrad.addColorStop(0, witherProgress > 0.3 ? "#ff7b00" : "#fff275");
          ballGrad.addColorStop(0.55, witherProgress > 0.3 ? "#b32400" : "#ff4500");
          ballGrad.addColorStop(1, "#1e0d08");
        } else {
          ballGrad.addColorStop(0, "#7f6a48");
          ballGrad.addColorStop(0.45, "#3b3020");
          ballGrad.addColorStop(1, "#17120b");
        }

        ctx.fillStyle = ballGrad;
        ctx.strokeStyle = item.isBurning ? "#ffbe76" : "#0a0805";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (!item.isBurning) {
          ctx.fillStyle = "rgba(255, 235, 190, 0.45)";
          ctx.beginPath();
          ctx.ellipse(-r * 0.32, -r * 0.32, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        if (witherProgress > 0) {
          ctx.strokeStyle = "#ffea79";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-r * 0.5, -r * 0.2);
          ctx.lineTo(0, r * 0.1);
          ctx.lineTo(r * 0.45, -r * 0.35);
          ctx.moveTo(0, r * 0.1);
          ctx.lineTo(-r * 0.2, r * 0.6);
          ctx.stroke();
        }
      }

      ctx.restore();
    },

    draw: function(ctx, item, customImg) {
      if (item.hidden || item.isHeld) return;
      const cx = item.x + item.width * 0.5;
      const cy = item.y + item.height * 0.5;
      this._renderBall(ctx, item, customImg, cx, cy);
    },

    drawHeld: function(ctx, player, item, customImg) {
      if (item.hidden) return;
      
      const holdOffsetX = player.customHold?.x ?? 22;
      const holdOffsetY = player.customHold?.y ?? (player.crawling ? 18 : 64);
      
      const handX = player.dir * holdOffsetX;
      const handY = -holdOffsetY;
      this._renderBall(ctx, item, customImg, handX, handY);

      if (item.isCharging) {
        ctx.save();
        const p = Math.min(1.0, item.chargeTime / item.maxChargeTime);
        const isLowStance = player.crawling || player.customHitbox?.isLow;
        const minVx = 110;
        const minVyMag = isLowStance ? 45 : 90;
        const minAngle = Math.atan2(minVyMag, minVx);
        const maxAngle = Math.PI / 4; // 45度
        const curAngle = minAngle + (maxAngle - minAngle) * p;
        const deg = Math.round((curAngle * 180) / Math.PI);

        // 繪製動態投擲角度與力道瞄準線
        const arrowLen = 26 + p * 38;
        const ax = handX + player.dir * Math.cos(curAngle) * arrowLen;
        const ay = handY - Math.sin(curAngle) * arrowLen;
        ctx.strokeStyle = 'rgba(255, 180, 70, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.setLineDash([]);

        // 繪製箭頭尖端
        const headAng = Math.atan2(ay - handY, ax - handX);
        ctx.fillStyle = 'rgba(255, 180, 70, 0.95)';
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

        ctx.fillStyle = 'rgba(255, 120, 50, 0.95)'; 
        ctx.beginPath();
        ctx.roundRect(bx + 1, by + 1, Math.max(0, (barW - 2) * p), barH - 2, 3);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 12px "Microsoft JhengHei"';
        ctx.textAlign = 'center';
        ctx.fillText(`🛢️ ${Math.floor(p * 100)}% (${deg}°)`, 0, by - 6);
        ctx.restore();
      }
    }
  });
})();
