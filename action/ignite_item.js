// 檔案路徑：action/ignite_item.js
// ==========================================
// 模組化動作外掛：手持道具靠近火源 (80px內) 顯示「Y點火」
// 按住 Y 鍵手會持續伸向火源 (自動分辨前/斜上/正上)，放開 Y 鍵手才縮回；是否著火完全交由道具自身物理判斷
// ==========================================
(function() {
  window.registerAction("ignite_item", {
    update: function(player, dt, pluginCtx) {
      if (player.ignitingItem === undefined) player.ignitingItem = false;
      if (player.igniteReachK === undefined) player.igniteReachK = 0;
      if (player.nearFireTarget === undefined) player.nearFireTarget = null;
      if (player.igniteTargetWorld === undefined) player.igniteTargetWorld = null;

      // 角色死亡、過關或正在進行其他鎖定動作時重置狀態
      if (player.dead || player.dying || player.won || player.ledgeClimbing || player.ledgeClimbingDown) {
        if (player.ignitingItem || player.igniteReachK > 0) {
          player.ignitingItem = false;
          player.igniteReachK = 0;
          player.customHold = null;
        }
        player.nearFireTarget = null;
        return;
      }

      const input = pluginCtx.input;
      const wasJustPressed = pluginCtx.wasJustPressed;
      const item = player.holdingItem;
      const hasValidHeldItem = Boolean(item && !item.exploded && !item.hidden);

      // 若手上已經沒有道具（例如已投出或燒盡消失），立即歸位
      if (!hasValidHeldItem) {
        if (player.ignitingItem || player.igniteReachK > 0) {
          player.ignitingItem = false;
          player.igniteReachK = 0;
          player.customHold = null;
        }
        player.nearFireTarget = null;
        return;
      }

      // 角色肩膀基準世界座標 (站立約在 y-72，爬行約在 y-22)
      const shWorldX = player.x;
      const shWorldY = player.y - (player.crawling ? 22 : 72);
      const REACH_DIST = 80; // 💡 嚴格設定：距離火源 80px 內才能觸發

      // ==========================================
      // 1. 搜尋身邊 80px 內的最近火源點 (支援前、斜上、正上方)
      // ==========================================
      let bestFire = null;
      let bestDist = REACH_DIST;

      if (!player.sliding && !player.onRope) {
        const checkFireBox = (fx1, fy1, fx2, fy2) => {
          // 計算肩膀到火源矩形邊界的最近距離 (用於 80px 觸發判定)
          const edgeX = Math.max(fx1, Math.min(fx2, shWorldX));
          const edgeY = Math.max(fy1, Math.min(fy2, shWorldY));
          const dist = Math.hypot(edgeX - shWorldX, edgeY - shWorldY);

          if (dist <= bestDist && edgeY <= player.y + 8) {
            bestDist = dist;
            // 目標點稍微往火源內部偏移，確保伸手時手上的道具能確實進入火源的碰撞判定區
            const cx = (fx1 + fx2) * 0.5;
            const cy = (fy1 + fy2) * 0.5;
            bestFire = {
              x: edgeX * 0.65 + cx * 0.35,
              y: edgeY * 0.65 + cy * 0.35
            };
          }
        };

        // (A) 檢查機關火源 (噴火器 fire_trap、燃燒中的木柴堆 wood_pile)
        if (Array.isArray(pluginCtx.mechanisms)) {
          for (const m of pluginCtx.mechanisms) {
            if (m.hidden) continue;
            if (m.type === "fire_trap" && m.active !== false && !m.extinguished && !m.isCooling && !m.isExtinguishing) {
              const fTop = m.y - (m.flameHeight || 72);
              checkFireBox(m.x, fTop, m.x + (m.width || 44), m.y + (m.height || 32));
            } else if (m.type === "wood_pile" && m.isBurning) {
              checkFireBox(m.x, m.y - 28, m.x + (m.width || 80), m.y + (m.height || 50));
            }
          }
        }

        // (B) 檢查道具火源 (地面燃燒中的其他道具、燃燒中的繩索端點)
        if (Array.isArray(pluginCtx.items)) {
          for (const it of pluginCtx.items) {
            if (!it || it === item || it.hidden) continue;
            if (it.isBurning) {
              const iw = it.width || 30, ih = it.height || 30;
              checkFireBox(it.x, it.y - 12, it.x + iw, it.y + ih);
            } else if (it.type === "rope_segment" && it.nodes && it.nodes.length >= 2) {
              if (it.startBurnTimer > 0) {
                const n0 = it.nodes[0];
                checkFireBox(n0.x - 10, n0.y - 18, n0.x + 10, n0.y + 8);
              }
              if (it.endBurnTimer > 0) {
                const nEnd = it.nodes[it.nodes.length - 1];
                checkFireBox(nEnd.x - 10, nEnd.y - 18, nEnd.x + 10, nEnd.y + 8);
              }
            }
          }
        }
      }

      player.nearFireTarget = bestFire;

      // ==========================================
      // 2. 偵測按住 Y 鍵 (input.slap) 持續伸手，放開 Y 鍵才縮回
      // ==========================================
      if (player.nearFireTarget && !player.onFire) {
        // 只要在火源範圍內剛按下 Y，或原本已經在伸手且持續按住 Y
        if ((wasJustPressed && wasJustPressed('slap')) || (player.ignitingItem && input.slap)) {
          player.ignitingItem = true;
          player.igniteTargetWorld = { x: player.nearFireTarget.x, y: player.nearFireTarget.y };
          player.running = false;

          // 若火源在明顯的左或右側，自動轉身面向火源
          const dx = player.igniteTargetWorld.x - player.x;
          if (Math.abs(dx) > 6) {
            player.dir = dx >= 0 ? 1 : -1;
          }
        } else if (!input.slap) {
          player.ignitingItem = false;
        }
      } else {
        // 離開火源範圍或放開按鈕時，結束伸手狀態
        if (!input.slap || !player.nearFireTarget || player.onFire) {
          player.ignitingItem = false;
        }
      }

      // ==========================================
      // 3. 推進伸手/縮回平滑過渡，並更新手持座標 (customHold)
      //    (不強制設定道具著火，完全交由道具自身的物理碰撞去判斷是否會被點燃)
      // ==========================================
      const reachSpeed = 6.0;   // 伸手速度 (約 0.16 秒伸到底)
      const retractSpeed = 5.5; // 放開按鈕後縮回速度

      if (player.ignitingItem && input.slap) {
        player.igniteReachK = Math.min(1, player.igniteReachK + dt * reachSpeed);
      } else {
        player.igniteReachK = Math.max(0, player.igniteReachK - dt * retractSpeed);
      }

      if (player.igniteReachK > 0) {
        // 平滑曲線 (Smoothstep)
        const k = player.igniteReachK;
        const reachK = k * k * (3 - 2 * k);

        // 按住伸手期間鎖定移動，放開縮回至一半以下時即可恢復移動
        if (player.ignitingItem || player.igniteReachK > 0.35) {
          player.lockDefaultMove = true;
          player.overrideVx = 0;
        }

        const baseHoldX = 22;
        const baseHoldY = player.crawling ? 18 : 64;
        const shY = player.crawling ? 22 : 72;

        const targetW = player.igniteTargetWorld || { x: player.x + player.dir * 55, y: player.y - shY };
        const rawDx = targetW.x - player.x;
        const rawDy = targetW.y - (player.y - shY);
        const rawDist = Math.hypot(rawDx, rawDy) || 1;

        // 限制最大伸手半徑為 80px 內，讓手臂與道具能準確伸入火源碰撞區
        const maxArmReach = Math.min(76, Math.max(28, rawDist));
        const ux = rawDx / rawDist;
        const uy = rawDy / rawDist;

        // 轉換為相對於角色腳底 (player.x, player.y) 的目標點
        const targetRelX = ux * maxArmReach;
        const targetHeightFromFeet = shY - uy * maxArmReach;

        const curRelX = (player.dir * baseHoldX) * (1 - reachK) + targetRelX * reachK;
        const curHoldY = baseHoldY * (1 - reachK) + targetHeightFromFeet * reachK;

        // 儲存給 drawBody 繪製雙手骨架使用
        player._igniteHandRelX = curRelX;
        player._igniteHandRelY = -curHoldY;
        player._igniteVisualK = reachK;

        // 💡 同步更新 customHold 讓手持道具 (oil_ball / water_ball 等) 完全跟著伸出的手移動到火源處！
        player.customHold = {
          x: curRelX * player.dir,
          y: curHoldY
        };
      } else {
        player._igniteVisualK = 0;
        if (!player.sliding && !player.onRope) {
          player.customHold = null;
        }
      }
    },

    onReset: function(player) {
      player.ignitingItem = false;
      player.igniteReachK = 0;
      player._igniteVisualK = 0;
      player.nearFireTarget = null;
      player.igniteTargetWorld = null;
      player.customHold = null;
    },

    drawBody: function(ctx, player, c) {
      const r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW, d = player.dir;
      const reachK = player._igniteVisualK || 0;

      // ==========================================
      // A. 只要手上有拿著道具且在火源 80px 範圍內 (尚未按住伸手時) -> 頭頂顯示「[Y] 點火」提示框
      // ==========================================
      if (reachK === 0 && player.nearFireTarget && player.holdingItem && !player.holdingItem.exploded && !player.holdingItem.hidden && !player.onFire) {
        const promptY = player.crawling ? -(r * 2 + 52) : -(bh + r * 2 + 68);
        ctx.save();
        ctx.font = '900 15px "Microsoft JhengHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(24, 18, 12, 0.92)';
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-52, promptY - 14, 104, 28, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffdd59';
        ctx.fillText('[Y] 點火', 0, promptY + 1);
        ctx.restore();
        return null; // 交還給預設骨架繪製身體
      }

      // ==========================================
      // B. 按住 Y 伸手或放開縮回期間：繪製朝火源方向 (前/斜上/正上) 伸展的雙手與身體微傾骨架
      // ==========================================
      if (reachK <= 0.001) return null;

      ctx.lineCap = ctx.lineJoin = 'round';
      const handX = player._igniteHandRelX ?? (d * 22);
      const handY = player._igniteHandRelY ?? -64;

      if (player.crawling) {
        // 爬行姿態下伸手
        const hx = d * (bh * 0.68 + r * 0.6);
        const hy = -(r + 14) + Math.min(0, (handY + 22) * 0.15 * reachK);

        ctx.strokeStyle = player.dying ? '#111' : '#080605';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(-d * bh * 0.4, -20); ctx.lineTo(-d * bh * 0.85, -10); ctx.lineTo(-d * bh * 1.15, -2);
        ctx.moveTo(d * bh * 0.35, -22); ctx.lineTo(d * bh * 0.65, -10); ctx.lineTo(d * bh * 0.55, -2);
        ctx.stroke();

        ctx.save();
        ctx.translate(0, -22);
        ctx.rotate(d * 1.32);
        ctx.fillStyle = player.dying ? '#1a1a1a' : c.bodyColor;
        ctx.strokeStyle = player.dying ? '#111' : '#080605';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const shX = d * bh * 0.35, shY = -20;
        const elbX = (shX + handX) * 0.5;
        const elbY = (shY + handY) * 0.5 + 4 * (1 - reachK);
        ctx.strokeStyle = player.dying ? '#111' : '#080605';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(-d * bh * 0.4, -18); ctx.lineTo(-d * bh * 0.75, -8); ctx.lineTo(-d * bh * 1.05, -2);
        ctx.moveTo(shX, shY); ctx.lineTo(elbX, elbY); ctx.lineTo(handX, handY);
        ctx.stroke();

        return { hx, hy };
      }

      // 站立姿態下伸手 (根據火源在前方、斜上或正上方，自動微調身體傾角與抬頭高度)
      const hipY = -32;
      const forwardLean = ((handX * d) / 60) * 0.16 * reachK;
      const bodyTilt = d * (0.10 + forwardLean);
      const shX = Math.sin(bodyTilt) * bh;
      const shY = hipY - Math.cos(bodyTilt) * bh;

      // 若往上方伸手，頭部也微幅仰望火源
      const lookUpOffset = Math.max(-6, Math.min(6, (handY - shY) * 0.08 * reachK));
      const hx = shX + d * (4 + reachK * 3);
      const hy = shY - r - 4 + lookUpOffset;

      // 1. 雙腿穩穩站立
      ctx.strokeStyle = player.dying ? '#111' : '#080605';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-3, hipY); ctx.lineTo(-9, hipY + 16); ctx.lineTo(-12, -2);
      ctx.moveTo(3, hipY);  ctx.lineTo(9, hipY + 16);  ctx.lineTo(12, -2);
      ctx.stroke();

      // 2. 軀幹
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

      // 3. 雙臂準確伸向火源座標 (handX, handY)
      const armStartX = shX;
      const armStartY = shY + 6;
      const dx = handX - armStartX;
      const dy = handY - armStartY;
      const dist = Math.hypot(dx, dy) || 1;
      const bend = Math.max(2, (1 - reachK * 0.75) * 12);
      const nx = -dy / dist * d;
      const ny = dx / dist * d;

      const elb1X = armStartX + dx * 0.5 + nx * bend * 0.6;
      const elb1Y = armStartY + dy * 0.5 + ny * bend * 0.6;
      const elb2X = armStartX + dx * 0.5 + nx * bend;
      const elb2Y = armStartY + dy * 0.5 + ny * bend;

      ctx.strokeStyle = player.dying ? '#111' : '#080605';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(armStartX - bw * 0.35, armStartY);
      ctx.lineTo(elb1X, elb1Y);
      ctx.lineTo(handX - d * 2, handY);

      ctx.moveTo(armStartX + bw * 0.35, armStartY);
      ctx.lineTo(elb2X, elb2Y);
      ctx.lineTo(handX + d * 2, handY);
      ctx.stroke();

      return { hx, hy };
    }
  });
})();
