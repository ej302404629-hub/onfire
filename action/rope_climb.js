// 檔案路徑：action/rope_climb.js
// ==========================================
// 模組化動作外掛：繩索攀爬與動態爬繩骨架動畫 (完美無縫連按、平滑滑手防閃現版)
// ==========================================
(function() {
  const ROPE_TURN_DURATION = 0.2;

  window.registerAction("rope_climb", {
    update: function(player, dt, pluginCtx) {
      if (player.onRope === undefined) player.onRope = false;
      if (player.ropeClimbAnimT === undefined) player.ropeClimbAnimT = 0;
      if (player.ropeCooldown === undefined) player.ropeCooldown = 0;
      if (player.ropeMoving === undefined) player.ropeMoving = false;
      if (player.ropeVisualTilt === undefined) player.ropeVisualTilt = 0;
      if (player.ropeLegLag === undefined) player.ropeLegLag = 0;
      if (player.nearRope === undefined) player.nearRope = false;
      if (player.ropeDropYOffset === undefined) player.ropeDropYOffset = 0;
      
      if (player.ropeGrabShiftTimer === undefined) player.ropeGrabShiftTimer = 0;

      if (player.ropeTurning === undefined) player.ropeTurning = false;
      if (player.ropeTurnTimer === undefined) player.ropeTurnTimer = 0;
      if (player.ropeTurnToDir === undefined) player.ropeTurnToDir = 1;
      if (player.ropeTurnFromDir === undefined) player.ropeTurnFromDir = 1;
      
      if (player.ropeLedgeClimbingUp === undefined) player.ropeLedgeClimbingUp = false;
      if (player.ropeLedgeClimbingDown === undefined) player.ropeLedgeClimbingDown = false;
      if (player.ropeLedgeAnimP === undefined) player.ropeLedgeAnimP = 0;

      if (player.ropeGrabShiftTimer > 0) player.ropeGrabShiftTimer = Math.max(0, player.ropeGrabShiftTimer - dt);
      if (player.ropeLandSquatTimer === undefined) player.ropeLandSquatTimer = 0;
      if (player.ropeLandSquatTimer > 0) player.ropeLandSquatTimer = Math.max(0, player.ropeLandSquatTimer - dt);
      if (player.ropeJustGrabbedTimer === undefined) player.ropeJustGrabbedTimer = 0;
      if (player.ropeJustGrabbedTimer > 0) player.ropeJustGrabbedTimer = Math.max(0, player.ropeJustGrabbedTimer - dt);
      if (player.ropeCooldown > 0) player.ropeCooldown = Math.max(0, player.ropeCooldown - dt);

      if (player.dead || player.dying || player.won) {
        player.onRope = false; player.nearRope = false; player.ropeTurning = false; player.ropeLedgeClimbingUp = false; player.ropeLedgeClimbingDown = false; player.ropeDropYOffset = 0;
        return;
      }

      const input = pluginCtx.input || {};
      const wasJustPressed = pluginCtx.wasJustPressed;
      const items = pluginCtx.items || [];
      const ropes = items.filter(it => it.type === "rope_segment" && !it.hidden && it.nodes && it.nodes.length >= 2);

      const isRopeSupported = function(rope) {
        if (!rope || rope.hidden || !rope.nodes || rope.nodes.length < 2) return false;
        const visited = new Set();
        const queue = [rope];
        while (queue.length > 0) {
          const cur = queue.shift();
          if (!cur || visited.has(cur.id)) continue;
          visited.add(cur.id);
          if ((cur.pinStart && !cur.startBroken) || (cur.pinEnd && !cur.endBroken)) return true;
          if (cur.attachStartTo && !cur.startBroken) { const t = ropes.find(r => r.id === cur.attachStartTo); if (t && !visited.has(t.id)) queue.push(t); }
          if (cur.attachEndTo && !cur.endBroken) { const t = ropes.find(r => r.id === cur.attachEndTo); if (t && !visited.has(t.id)) queue.push(t); }
          for (const other of ropes) {
            if (visited.has(other.id)) continue;
            if ((!other.startBroken && other.attachStartTo === cur.id) || (!other.endBroken && other.attachEndTo === cur.id)) queue.push(other);
          }
        }
        return false;
      };

      const checkBothEndsAnchored = function(rope) {
        if (!rope) return false;
        if (typeof window.isRopeChainBothEndsAnchored === "function") return window.isRopeChainBothEndsAnchored(rope, items);
        return Boolean(rope.pinStart && !rope.startBroken && rope.pinEnd && !rope.endBroken);
      };

      const checkGroundY = function(x, y) {
        if (!pluginCtx.sampleGroundY) return null;
        return pluginCtx.sampleGroundY(x, y);
      };

      // =============== 不在繩子上的狀態邏輯 ===============
      if (!player.onRope) {
        const gY = checkGroundY(player.x, player.y);
        const justDroppedFromLedge = (player.vy === 10 && !player.grounded);
        const isStandingOnGround = (player.grounded || (gY !== null && player.y >= gY - 6)) && !justDroppedFromLedge;
        player.nearRope = false;

        // 🚨 核心攔截區：在主程式判定往平台下爬之前，我們搶先偵測！
        if (input.down && isStandingOnGround && !player.lockDefaultMove && !player.crawling && !player.climbing) {
          const findLedge = () => {
            const polys = pluginCtx.groundPolylines || [];
            const mechs = pluginCtx.mechanisms || [];
            const hasFloorAtSide = (edgeX, edgeY, sideDir) => {
              if (!pluginCtx.samplePolylineY) return false;
              const testX = edgeX + sideDir * 5;
              for (const poly of polys) {
                const gy = pluginCtx.samplePolylineY(poly.pts, testX);
                if (gy !== null && gy <= edgeY + 12 && gy >= edgeY - 25) return true;
              }
              return false;
            };
            for (const poly of polys) {
              if (!poly.pts) continue;
              for (let i = 0; i < poly.pts.length; i++) {
                const ptX = poly.pts[i][0], ptY = poly.pts[i][1];
                if (Math.abs(player.y - ptY) > 24) continue;
                if (i < poly.pts.length - 1 && poly.pts[i + 1][0] > ptX && !hasFloorAtSide(ptX, ptY, -1)) {
                  if (player.x >= ptX - 18 && player.x <= ptX + 42) return { grabX: ptX, ledgeY: ptY, hangX: ptX - 18, targetY: ptY + 132, insideDir: 1 };
                }
                if (i > 0 && poly.pts[i - 1][0] < ptX && !hasFloorAtSide(ptX, ptY, 1)) {
                  if (player.x >= ptX - 42 && player.x <= ptX + 18) return { grabX: ptX, ledgeY: ptY, hangX: ptX + 18, targetY: ptY + 132, insideDir: -1 };
                }
              }
            }
            for (const m of mechs) {
              if (m.hidden) continue;
              const def = window.GAME_MECHANISMS_REGISTRY && window.GAME_MECHANISMS_REGISTRY[m.type];
              if (!(m.solid ?? (def && def.solid) ?? (m.type && m.type.includes('platform')))) continue;
              if (Math.abs(player.y - m.y) <= 24) {
                if (player.x >= m.x - 18 && player.x <= m.x + 42) return { grabX: m.x, ledgeY: m.y, hangX: m.x - 18, targetY: m.y + 132, insideDir: 1 };
                if (player.x >= m.x + m.width - 42 && player.x <= m.x + m.width + 18) return { grabX: m.x + m.width, ledgeY: m.y, hangX: m.x + m.width + 18, targetY: m.y + 132, insideDir: -1 };
              }
            }
            return null;
          };

          const ledge = findLedge();
          if (ledge) {
            let bestRope = null, bestDist = 60;
            // 掃描平台掛手處底下是否有繩子
            for (const r of ropes) {
              if (!isRopeSupported(r)) continue;
              const N = r.nodes.length;
              for (let i = 0; i < N - 1; i++) {
                const n0 = r.nodes[i], n1 = r.nodes[i+1], vx = n1.x - n0.x, vy = n1.y - n0.y, lenSq = vx*vx + vy*vy;
                let t = 0;
                if (lenSq > 0.0001) t = Math.max(0, Math.min(1, ((ledge.hangX - n0.x)*vx + ((ledge.targetY - 72) - n0.y)*vy)/lenSq));
                const px = n0.x + vx*t, py = n0.y + vy*t;
                const d = Math.hypot(px - ledge.hangX, py - (ledge.targetY - 72));
                if (d < bestDist) { bestDist = d; bestRope = r; }
              }
            }

            if (bestRope) {
              // 💡 成功攔截！【不清除 input.down】，藉由 lockDefaultMove 防止主程式反應
              // 這樣玩家按著的「下鍵」在動畫結束後能無縫繼續往下爬！
              player.onRope = true;
              player.currentRopeId = bestRope.id;
              
              player.ropeLedgeClimbingDown = true;
              player.ropeLedgeAnimP = 0;
              player.ropeLedgeStartX = player.x;
              player.ropeLedgeStartY = ledge.ledgeY;
              player.ropeLedgeGrabX = ledge.grabX;
              player.ropeLedgeTargetX = ledge.hangX;
              player.ropeLedgeTargetY = ledge.targetY;
              
              if (player.dir !== ledge.insideDir) {
                player.ropeTurning = true;
                player.ropeTurnTimer = ROPE_TURN_DURATION;
                player.ropeTurnFromDir = player.dir;
                player.ropeTurnToDir = ledge.insideDir;
              } else {
                player.ropeTurning = false;
              }
              player.vx = 0; player.vy = 0; player.lockDefaultMove = true;
              player.sliding = false; player.running = false; player.crawling = false;
              return;
            }
          }
        }

        if (player.ropeCooldown <= 0 && !player.climbing && !player.ledgeClimbing) {
          const pCenterX = player.x;
          const pGrabY = isStandingOnGround ? (player.y - 78) : (player.y - 72);
          let bestRope = null, bestProgress = 0, bestDist = justDroppedFromLedge ? 90 : 38;

          for (const r of ropes) {
            if (!isRopeSupported(r)) continue;
            const N = r.nodes.length;
            for (let i = 0; i < N - 1; i++) {
              const n0 = r.nodes[i], n1 = r.nodes[i + 1], vx = n1.x - n0.x, vy = n1.y - n0.y, lenSq = vx * vx + vy * vy;
              let t = 0;
              if (lenSq > 0.0001) t = Math.max(0, Math.min(1, ((pCenterX - n0.x) * vx + (pGrabY - n0.y) * vy) / lenSq));
              const px = n0.x + vx * t, py = n0.y + vy * t;
              if (isStandingOnGround && gY !== null && (py + 72 > gY - 2)) continue;

              const d = Math.hypot(px - pCenterX, py - pGrabY);
              if (d < bestDist) { bestDist = d; bestRope = r; bestProgress = (i + t) / (N - 1); }
            }
          }

          if (bestRope) {
            player.nearRope = true;
            const pressX = input.climb || (wasJustPressed && wasJustPressed("climb")) || justDroppedFromLedge;

            if (pressX) {
              if (input.climb !== undefined) input.climb = false;
              if (input.x !== undefined) input.x = false;
              if (input.interact !== undefined) input.interact = false;

              player.onRope = true;
              player.nearRope = false;
              player.currentRopeId = bestRope.id;

              let rLen = Math.max(20, bestRope.ropeLength || 100);
              bestProgress = Math.max(0, bestProgress - (5 / rLen));
              player.ropeProgress = bestProgress;
              player.ropeLedgeClimbingDown = false;
              player.ropeLedgeClimbingUp = false;
              player.ropeJustGrabbedTimer = 0.25;
              player.ropeTurning = false;
              player.ropeGrabShiftTimer = 0.1;
              player.ropeDropYOffset = 0;

              player.sliding = false; player.running = false; player.crawling = false;
              player.ropeMoving = false; player.ropeLandSquatTimer = 0; player.ropeVisualTilt = 0; player.ropeLegLag = 0;
            }
          }
        }
        return;
      }
      // ===================================================

      const curRope = ropes.find(r => r.id === player.currentRopeId);
      if (!curRope || !isRopeSupported(curRope)) {
        player.onRope = false; player.ropeTurning = false; player.ropeLedgeClimbingUp = false; player.ropeLedgeClimbingDown = false; player.ropeDropYOffset = 0;
        return;
      }

      player.fallStartY = player.y;

      // 處理往上爬到平台的動畫接管
      if (player.ropeLedgeClimbingUp) {
        const upDuration = 0.72;
        player.ropeLedgeAnimP += dt / upDuration;
        const p = player.ropeLedgeAnimP;
        const bestLedge = player.ropeLedgeTarget;
        const hangX = bestLedge.grabX - player.dir * 10;
        const hangY = Math.min(player.ropeLedgeStartY, bestLedge.targetY + 132 * 0.85);
        const pullUpEndX = hangX + (bestLedge.grabX - hangX) * 0.45;
        const midX = bestLedge.grabX + (bestLedge.targetX - bestLedge.grabX) * 0.55;
        
        if (p < 0.18) { const k = p / 0.18; player.x = player.ropeLedgeStartX + (hangX - player.ropeLedgeStartX) * k; player.y = player.ropeLedgeStartY + (hangY - player.ropeLedgeStartY) * k; } 
        else if (p < 0.45) { const k = (p - 0.18) / 0.27; const ease = 1 - Math.pow(1 - k, 2); player.x = hangX + (bestLedge.grabX - hangX) * (k * 0.45); player.y = hangY + ((bestLedge.targetY + 34) - hangY) * ease; } 
        else if (p < 0.68) { const k = (p - 0.45) / 0.23; player.x = pullUpEndX + (midX - pullUpEndX) * k; player.y = (bestLedge.targetY + 34) + ((bestLedge.targetY + 12) - (bestLedge.targetY + 34)) * k; } 
        else if (p < 0.86) { const k = (p - 0.68) / 0.18; player.x = midX + (bestLedge.targetX - midX) * k; player.y = (bestLedge.targetY + 12) + (bestLedge.targetY - (bestLedge.targetY + 12)) * k; } 
        else { player.x = bestLedge.targetX; player.y = bestLedge.targetY; }

        player.vx = 0; player.vy = 0; player.lockDefaultMove = true;
        player.ropeClimbAnimT += dt * 10;
        
        if (p >= 1) {
          player.ropeLedgeClimbingUp = false; player.onRope = false; player.grounded = true; player.ropeCooldown = 0.35;
          if (bestLedge.forceCrawl) player.crawling = true;
        }
        return; 
      }

      // 處理往下爬到繩子的動畫接管
      if (player.ropeLedgeClimbingDown) {
        if (player.ropeTurning) {
          player.ropeTurnTimer -= dt;
          player.x = player.ropeLedgeStartX; player.y = player.ropeLedgeStartY;
          player.vx = 0; player.vy = 0; player.lockDefaultMove = true;
          if (player.ropeTurnTimer <= 0) { player.dir = player.ropeTurnToDir; player.ropeTurning = false; }
          return;
        }
         
        const downDuration = 0.68;
        player.ropeLedgeAnimP = Math.min(1, player.ropeLedgeAnimP + dt / downDuration);
        const p = player.ropeLedgeAnimP;
         
        if (p < 0.25) { const k = p / 0.25; player.x = player.ropeLedgeStartX + (player.ropeLedgeTargetX - player.ropeLedgeStartX) * (k * 0.6); player.y = player.ropeLedgeStartY + 10 * k; } 
        else if (p < 0.92) { const k = (p - 0.25) / 0.67; const ease = k * k * (3 - 2 * k); player.x = player.ropeLedgeStartX + (player.ropeLedgeTargetX - player.ropeLedgeStartX) * (0.6 + 0.4 * Math.min(1, k * 2)); player.y = (player.ropeLedgeStartY + 10) + (player.ropeLedgeTargetY - (player.ropeLedgeStartY + 10)) * ease; } 
        else { player.x = player.ropeLedgeTargetX; player.y = player.ropeLedgeTargetY; }

        player.vx = 0; player.vy = 0; player.lockDefaultMove = true;
        player.ropeClimbAnimT += dt * 8;

        // 動畫結束，平滑銜接至正常爬繩
        if (p >= 1) {
          player.ropeLedgeClimbingDown = false;
          let bestProgress = 0, minDist = 999;
          // 💡 關鍵修正：抓取點就是角色當前身體應對的繩索高度 (正常抓繩點是 player.y - 72)
          const grabY = player.y - 72;
          for (let i = 0; i < curRope.nodes.length - 1; i++) {
            const n0 = curRope.nodes[i], n1 = curRope.nodes[i + 1], vx = n1.x - n0.x, vy = n1.y - n0.y, lenSq = vx * vx + vy * vy;
            let t = 0;
            if (lenSq > 0.0001) t = Math.max(0, Math.min(1, ((player.x - n0.x) * vx + (grabY - n0.y) * vy) / lenSq));
            const px = n0.x + vx * t, py = n0.y + vy * t, d = Math.hypot(px - player.x, py - grabY);
            if (d < minDist) { minDist = d; bestProgress = (i + t) / (curRope.nodes.length - 1); }
          }
          player.ropeProgress = bestProgress;
          
          // 💡 由於繩索運算會讓 player.y 瞬間切換到 ry + 72 (約 grabY + 72)
          // 為了避免人物座標瞬間閃跳 50 像素（導致攝影機急拉），我們計算並賦予平滑 Y 偏移量
          player.ropeDropYOffset = player.y - (grabY + 72);
          player.ropeJustGrabbedTimer = 0.2;
        }
        return;
      }

      const N = curRope.nodes.length;
      const fIdx = Math.max(0, Math.min(N - 1.0001, player.ropeProgress * (N - 1)));
      const idx0 = Math.floor(fIdx), idx1 = Math.min(N - 1, idx0 + 1);
      const nodeVx = ((curRope.nodes[idx0].x - curRope.nodes[idx0].oldX) + (curRope.nodes[idx1].x - curRope.nodes[idx1].oldX)) * 0.5 / 0.016;

      if (wasJustPressed && wasJustPressed("jump")) {
        player.onRope = false; player.ropeCooldown = 0.28; player.ropeTurning = false; player.ropeGrabShiftTimer = 0; player.ropeDropYOffset = 0; player.vy = -420;
        const jumpDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (jumpDir !== 0) { player.dir = jumpDir; player.vx = jumpDir * 220 + nodeVx * 0.5; } else { player.vx = nodeVx * 0.65; }
        return;
      }

      if (wasJustPressed && wasJustPressed("crawl")) {
        if (input.crawl !== undefined) input.crawl = false; if (input.b !== undefined) input.b = false;
        player.onRope = false; player.ropeCooldown = 0.25; player.ropeTurning = false; player.ropeGrabShiftTimer = 0; player.ropeDropYOffset = 0; player.vx = nodeVx * 0.5; player.vy = 0;
        return;
      }

      if (player.ropeTurning) {
        player.ropeTurnTimer -= dt;
        if (player.ropeTurnTimer <= 0) {
          player.dir = player.ropeTurnToDir; player.ropeTurning = false;
          if (player.ropeLedgeTurnTarget) {
            player.ropeLedgeClimbingUp = true;
            player.ropeLedgeAnimP = 0;
            player.ropeLedgeTarget = player.ropeLedgeTurnTarget;
            player.ropeLedgeStartX = player.x;
            player.ropeLedgeStartY = player.y;
            player.ropeLedgeTurnTarget = null;
            return;
          }
        }
      }

      const tx = curRope.nodes[idx1].x - curRope.nodes[idx0].x, ty = curRope.nodes[idx1].y - curRope.nodes[idx0].y, tLen = Math.hypot(tx, ty) || 1, ux = tx / tLen, uy = ty / tLen;
      let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0), iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

      if (player.ropeTurning) { ix = 0; iy = 0; } 
      else if (ix !== 0 && ix !== player.dir) { player.ropeTurning = true; player.ropeTurnTimer = ROPE_TURN_DURATION; player.ropeTurnFromDir = player.dir; player.ropeTurnToDir = ix; ix = 0; iy = 0; } 
      else if (ix !== 0) { player.dir = ix; }

      const bothEndsAnchored = checkBothEndsAnchored(curRope);
      let moveDir = 0;
      if (iy !== 0) { if (Math.abs(uy) > 0.15) { moveDir = (uy > 0) ? iy : -iy; } else { const globalDy = curRope.nodes[N - 1].y - curRope.nodes[0].y; if (Math.abs(globalDy) > 2) { moveDir = (globalDy > 0) ? iy : -iy; } else { moveDir = -iy; } } } 
      else if (ix !== 0 && bothEndsAnchored) { if (Math.abs(ux) > 0.15) { moveDir = (ux > 0) ? ix : -ix; } else { const globalDx = curRope.nodes[N - 1].x - curRope.nodes[0].x; moveDir = (globalDx >= 0) ? ix : -ix; } }

      const prevPlayerY = player.y, climbSpeed = 150, totalLen = Math.max(20, curRope.ropeLength || 100);
      if (moveDir !== 0) { player.ropeMoving = true; player.ropeProgress += (moveDir * climbSpeed * dt) / totalLen; player.ropeClimbAnimT += dt * 9.5 * moveDir; } else { player.ropeMoving = false; }

      if (player.ropeProgress < 0) {
        let switched = false;
        if (curRope.attachStartTo && !curRope.startBroken) { const nextR = ropes.find(r => r.id === curRope.attachStartTo && isRopeSupported(r)); if (nextR) { player.currentRopeId = nextR.id; player.ropeProgress = curRope.attachStartPoint === "start" ? 0.02 : 0.98; switched = true; } }
        if (!switched) { const childR = ropes.find(r => isRopeSupported(r) && ((!r.startBroken && r.attachStartTo === curRope.id && r.attachStartPoint === "start") || (!r.endBroken && r.attachEndTo === curRope.id && r.attachEndPoint === "start"))); if (childR) { player.currentRopeId = childR.id; player.ropeProgress = (childR.attachStartTo === curRope.id && childR.attachStartPoint === "start") ? 0.02 : 0.98; switched = true; } }
        if (!switched) player.ropeProgress = 0;
      } else if (player.ropeProgress > 1) {
        let switched = false;
        if (curRope.attachEndTo && !curRope.endBroken) { const nextR = ropes.find(r => r.id === curRope.attachEndTo && isRopeSupported(r)); if (nextR) { player.currentRopeId = nextR.id; player.ropeProgress = curRope.attachEndPoint === "start" ? 0.02 : 0.98; switched = true; } }
        if (!switched) { const childR = ropes.find(r => isRopeSupported(r) && ((!r.startBroken && r.attachStartTo === curRope.id && r.attachStartPoint === "end") || (!r.endBroken && r.attachEndTo === curRope.id && r.attachEndPoint === "end"))); if (childR) { player.currentRopeId = childR.id; player.ropeProgress = (childR.attachStartTo === curRope.id && childR.attachStartPoint === "end") ? 0.02 : 0.98; switched = true; } }
        if (!switched) player.ropeProgress = 1;
      }

      const activeRope = ropes.find(r => r.id === player.currentRopeId) || curRope;
      const aN = activeRope.nodes.length, aFloat = Math.max(0, Math.min(aN - 1.0001, player.ropeProgress * (aN - 1))), a0 = Math.floor(aFloat), a1 = Math.min(aN - 1, a0 + 1), frac = aFloat - a0;
      const rx = activeRope.nodes[a0].x + (activeRope.nodes[a1].x - activeRope.nodes[a0].x) * frac, ry = activeRope.nodes[a0].y + (activeRope.nodes[a1].y - activeRope.nodes[a0].y) * frac;

      const sIdx0 = Math.max(0, a0 - 2), sIdx1 = Math.min(aN - 1, Math.max(sIdx0 + 1, a1));
      let segDx = activeRope.nodes[sIdx1].x - activeRope.nodes[sIdx0].x, segDy = activeRope.nodes[sIdx1].y - activeRope.nodes[sIdx0].y;
      if (segDy < 0) { segDx = -segDx; segDy = -segDy; }

      let targetTilt = 0;
      const activeBothAnchored = checkBothEndsAnchored(activeRope);
      if (!activeBothAnchored) { const ropeSlopeAngle = -Math.atan2(segDx, Math.max(12, segDy)), swingInputTilt = (iy === 0 && ix !== 0) ? (-ix * 0.14) : 0, velTilt = Math.max(-0.22, Math.min(0.22, -nodeVx * 0.0009)); targetTilt = Math.max(-0.75, Math.min(0.75, ropeSlopeAngle * 0.92 + swingInputTilt + velTilt)); } 
      else { const isSteep = segDy > Math.abs(segDx) * 0.7; if (isSteep) { targetTilt = Math.max(-0.45, Math.min(0.45, -Math.atan2(segDx, Math.max(18, segDy)) * 0.65)); } else { targetTilt = -ix * 0.08; } }

      player.ropeVisualTilt += (targetTilt - player.ropeVisualTilt) * Math.min(1, dt * 14);
      player.ropeLegLag += ((!activeBothAnchored ? Math.max(-16, Math.min(16, -nodeVx * 0.045 + ix * 5.5)) : 0) - player.ropeLegLag) * Math.min(1, dt * 12);
      player.ropeAngle = Math.atan2(activeRope.nodes[a1].y - activeRope.nodes[a0].y, activeRope.nodes[a1].x - activeRope.nodes[a0].x);

      // 💡 應用平滑 Y 軸緩動，確保攝影機不跳，並在 drawBody 中相應扣除以維持視覺完美咬合繩子
      player.x = rx;
      const targetY = ry + 72;
      if (player.ropeDropYOffset) {
        player.ropeDropYOffset -= player.ropeDropYOffset * Math.min(1, dt * 12);
        if (Math.abs(player.ropeDropYOffset) < 0.5) player.ropeDropYOffset = 0;
      } else {
        player.ropeDropYOffset = 0;
      }
      player.y = targetY + player.ropeDropYOffset;
      
      if (player.ropeTurning) { player.vx = 0; player.vy = 0; player.overrideVx = 0; player.overrideVy = 0; player.lockDefaultMove = true; } 
      else { player.vx = 0; player.vy = 0; player.grounded = false; player.lockDefaultMove = true; player.overrideVx = 0; player.overrideVy = 0; }

      if (input.up && !player.ropeTurning) {
        const isAtStartEnd = (player.ropeProgress <= 0.12), isAtFinishEnd = (player.ropeProgress >= 0.88), startIsTop = activeRope.nodes[0].y <= activeRope.nodes[aN - 1].y + 15, finishIsTop = activeRope.nodes[aN - 1].y <= activeRope.nodes[0].y + 15, nearTopOfRope = (isAtStartEnd && startIsTop) || (isAtFinishEnd && finishIsTop) || (player.y < prevPlayerY - 0.05);

        if (nearTopOfRope) {
          const STAND_H = 132, CRAWL_H = 64, reachTopY = player.y - STAND_H - 28, reachBotY = player.y - 16;
          const groundPolys = pluginCtx.groundPolylines || [], solidWalls = pluginCtx.solidWalls || [], frictionZones = pluginCtx.frictionZones || [], mechs = pluginCtx.mechanisms || [], worldW = pluginCtx.WORLD_W || 2048, samplePolyY = pluginCtx.samplePolylineY;

          const hasWallBlockingCrawlSpace = (wx, wy) => { for (const w of solidWalls) { const wallX = w.x !== undefined ? w.x : ((w.x1 + w.x2) * 0.5); if (Math.abs(wx - wallX) <= 18 && w.yTop < wy - 6 && w.yBottom > wy - CRAWL_H) return true; } return false; };
          const shouldCrawlAfterClimb = (checkX, gY) => { for (const z of frictionZones) { if (z.requireCrawl && z.blockBot !== undefined && checkX >= z.x1 && checkX <= z.x2 && gY >= z.yMin && gY <= z.yMax) { if (gY - STAND_H < z.blockBot) return true; } } return false; };
          const isCeilingBlockedForCrawl = (checkX, gY) => { for (const z of frictionZones) { if (z.requireCrawl && z.blockBot !== undefined && checkX >= z.x1 && checkX <= z.x2 && gY >= z.yMin && gY <= z.yMax) { if (gY - CRAWL_H < z.blockBot) return true; } } return false; };
          const hasFloorAtSide = (edgeX, edgeY, sideDir) => { if (!samplePolyY) return false; const testX = edgeX + sideDir * 5; for (const poly of groundPolys) { const gy = samplePolyY(poly.pts, testX); if (gy !== null && gy <= edgeY + 12 && gy >= edgeY - 25) return true; } return false; };

          let bestLedge = null, bestLedgeDist = 48;
          for (const poly of groundPolys) {
            if (!poly.pts || poly.pts.length === 0) continue;
            for (let i = 0; i < poly.pts.length; i++) {
              const ptX = poly.pts[i][0], ptY = poly.pts[i][1];
              if (ptY < reachTopY || ptY > reachBotY) continue;
              const distX = Math.abs(player.x - ptX); if (distX > bestLedgeDist) continue;

              const isLeftEdge = (i < poly.pts.length - 1) && (poly.pts[i + 1][0] > ptX) && !hasFloorAtSide(ptX, ptY, -1);
              if (isLeftEdge && player.x <= ptX + 22 && (!input.left || input.right || player.dir === 1 || distX <= 38)) { const standX = Math.max(35, Math.min(worldW - 35, ptX + 16)), standY = samplePolyY ? (samplePolyY(poly.pts, standX) ?? ptY) : ptY; if (!hasWallBlockingCrawlSpace(ptX, ptY) && !hasWallBlockingCrawlSpace(standX, standY) && !isCeilingBlockedForCrawl(standX, standY)) { bestLedgeDist = distX; bestLedge = { grabX: ptX, targetX: standX, targetY: standY, dir: 1, forceCrawl: shouldCrawlAfterClimb(standX, standY) }; } }
              const isRightEdge = (i > 0) && (poly.pts[i - 1][0] < ptX) && !hasFloorAtSide(ptX, ptY, 1);
              if (isRightEdge && player.x >= ptX - 22 && (!input.right || input.left || player.dir === -1 || distX <= 38)) { const standX = Math.max(35, Math.min(worldW - 35, ptX - 16)), standY = samplePolyY ? (samplePolyY(poly.pts, standX) ?? ptY) : ptY; if (!hasWallBlockingCrawlSpace(ptX, ptY) && !hasWallBlockingCrawlSpace(standX, standY) && !isCeilingBlockedForCrawl(standX, standY)) { bestLedgeDist = distX; bestLedge = { grabX: ptX, targetX: standX, targetY: standY, dir: -1, forceCrawl: shouldCrawlAfterClimb(standX, standY) }; } }
            }
          }
          for (const m of mechs) {
            if (m.hidden) continue;
            const def = window.GAME_MECHANISMS_REGISTRY && window.GAME_MECHANISMS_REGISTRY[m.type], isSolid = m.solid ?? (def && def.solid) ?? (m.type && m.type.includes("platform"));
            if (!isSolid) continue;
            const mLeft = m.x, mRight = m.x + m.width, gY = m.y; if (gY < reachTopY || gY > reachBotY) continue;
            const distLeft = Math.abs(player.x - mLeft); if (distLeft <= bestLedgeDist && player.x <= mLeft + 22 && !hasWallBlockingCrawlSpace(mLeft, gY)) { bestLedgeDist = distLeft; bestLedge = { grabX: mLeft, targetX: mLeft + 16, targetY: gY, dir: 1, forceCrawl: shouldCrawlAfterClimb(mLeft + 16, gY) }; }
            const distRight = Math.abs(player.x - mRight); if (distRight <= bestLedgeDist && player.x >= mRight - 22 && !hasWallBlockingCrawlSpace(mRight, gY)) { bestLedgeDist = distRight; bestLedge = { grabX: mRight, targetX: mRight - 16, targetY: gY, dir: -1, forceCrawl: shouldCrawlAfterClimb(mRight - 16, gY) }; }
          }

          if (bestLedge) {
            if (player.dir !== bestLedge.dir) { player.ropeTurning = true; player.ropeTurnTimer = ROPE_TURN_DURATION; player.ropeTurnFromDir = player.dir; player.ropeTurnToDir = bestLedge.dir; player.ropeLedgeTurnTarget = bestLedge; } 
            else { player.ropeLedgeClimbingUp = true; player.ropeLedgeAnimP = 0; player.ropeLedgeTarget = bestLedge; player.ropeLedgeStartX = player.x; player.ropeLedgeStartY = player.y; }
            return;
          }
        }
      }

      const isGoingDown = input.down || (player.y > prevPlayerY + 0.1) || (!input.up && player.ropeJustGrabbedTimer <= 0);
      if (isGoingDown && player.ropeJustGrabbedTimer <= 0) {
        const groundY = checkGroundY(player.x, player.y);
        if (groundY !== null && player.y >= groundY - 4) {
          player.onRope = false; player.grounded = true; player.y = groundY; player.vy = 0; player.ropeCooldown = 0.25; player.overrideVx = null; player.overrideVy = null; player.customHold = null; player.lockDefaultMove = false; player.ropeTurning = false; player.ropeGrabShiftTimer = 0; player.ropeDropYOffset = 0; player.ropeLandSquatTimer = 0.7; player.ropeLandSquatDuration = 0.7;
          return;
        }
      }

      player.customHold = { x: 16, y: 68 };
    },

    onReset: function(player) {
      player.onRope = false; player.nearRope = false; player.currentRopeId = null; player.ropeProgress = 0; player.ropeMoving = false; player.ropeLandSquatTimer = 0; player.ropeJustGrabbedTimer = 0; player.ropeVisualTilt = 0; player.ropeLegLag = 0; player.ropeTurning = false; player.ropeTurnTimer = 0; player.ropeLedgeTurnTarget = null; player.ropeGrabShiftTimer = 0; player.ropeLedgeClimbingUp = false; player.ropeLedgeClimbingDown = false; player.ropeLedgeAnimP = 0; player.ropeDropYOffset = 0;
    },

    drawBody: function(ctx, player, c) {
      const drawTaperedSegment = (x1, y1, x2, y2, r1, r2, fillColor, strokeColor, lineW = 2.4) => { const dx = x2 - x1, dy = y2 - y1; const dist = Math.hypot(dx, dy); ctx.save(); ctx.fillStyle = fillColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = lineW; ctx.beginPath(); if (dist < 0.5) { ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2); } else { const angle = Math.atan2(dy, dx); ctx.arc(x1, y1, r1, angle + Math.PI * 0.5, angle - Math.PI * 0.5, false); ctx.arc(x2, y2, r2, angle - Math.PI * 0.5, angle + Math.PI * 0.5, false); ctx.closePath(); } ctx.fill(); ctx.stroke(); ctx.restore(); };
      const drawFist = (x, y, radius, dir, fillColor, strokeColor) => { ctx.save(); ctx.translate(x, y); ctx.fillStyle = fillColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.08, radius * 0.95, dir * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(dir * radius * 0.15, radius * 0.08, radius * 0.45, -Math.PI * 0.4, Math.PI * 0.65, false); ctx.stroke(); ctx.restore(); };
      const drawFoot = (x, y, rAnkle, dir, fillColor, strokeColor) => { ctx.save(); ctx.translate(x + dir * (rAnkle * 0.65), y - rAnkle * 0.2); ctx.fillStyle = fillColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(0, 0, rAnkle * 1.55, rAnkle * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); };
      const drawFullLimb = (x1, y1, jx, jy, x2, y2, lw, isArm, dir, fillColor, strokeColor) => { const rRoot = isArm ? lw * 0.72 : lw * 1.35; const rMid  = isArm ? lw * 0.50 : lw * 0.65; const rEnd  = isArm ? lw * 0.36 : lw * 0.40; drawTaperedSegment(x1, y1, jx, jy, rRoot, rMid, fillColor, strokeColor); drawTaperedSegment(jx, jy, x2, y2, rMid, rEnd, fillColor, strokeColor); if (isArm) drawFist(x2, y2, lw * 0.62, dir, fillColor, strokeColor); else drawFoot(x2, y2, lw * 0.55, dir, fillColor, strokeColor); };
      const drawShapedTorso = (cx, cy, bw, bh, tiltAngle, fillColor, strokeColor) => { ctx.save(); ctx.translate(cx, cy); ctx.rotate(tiltAngle); const topW = bw * 0.35, waistW = bw * 0.38, hipW = bw * 0.45, halfH = bh * 0.5; ctx.fillStyle = fillColor; ctx.strokeStyle = strokeColor; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(-topW, -halfH + 4); ctx.quadraticCurveTo(0, -halfH - 3, topW, -halfH + 4); ctx.quadraticCurveTo(waistW, 0, hipW, halfH - 4); ctx.quadraticCurveTo(0, halfH + 3, -hipW, halfH - 4); ctx.quadraticCurveTo(-waistW, 0, -topW, -halfH + 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); };

      if (!player.onRope) {
        if (player.nearRope) {
          ctx.save();
          const bh = c.bodyH || 30, r = c.headR || 12, headTopY = -(32 + bh) - (r * 2) - 4;
          ctx.translate(0, headTopY - 30); ctx.scale(1.6, 1.6); ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = "#0078D7"; ctx.fill(); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.lineCap = "round"; ctx.lineWidth = 2.5; ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
          ctx.restore();
        }

        const landTimer = player.ropeLandSquatTimer || 0;
        if (landTimer > 0) {
          const p = 1.0 - (landTimer / (player.ropeLandSquatDuration || 0.7)), squatCurve = Math.sin(p * Math.PI), squatAmount = squatCurve * 14, kneeBend = squatCurve * 10, r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW, d = player.dir, hipY = -32 + squatAmount, shY = -(32 + bh) + squatAmount, bodyCol = player.dying ? '#1a1a1a' : c.bodyColor, outCol = player.dying ? '#111' : '#080605', limbCol = player.dying ? '#141414' : '#2b211e';
          drawFullLimb(-3, hipY, -9 - kneeBend * 0.6, hipY + 16 - squatAmount * 0.4, -11, -2, lw, false, d, limbCol, outCol); drawFullLimb( 3, hipY,  9 + kneeBend * 0.6, hipY + 16 - squatAmount * 0.4,  11, -2, lw, false, d, limbCol, outCol);
          drawShapedTorso(0, shY + bh / 2, bw, bh, d * (0.12 + squatCurve * 0.08), bodyCol, outCol);
          const armSpread = squatCurve * 8; drawFullLimb(-2, shY + 6, -14 - armSpread * 0.6, shY + 20, -18 - armSpread, shY + 34, lw, true, d, limbCol, outCol); drawFullLimb( 2, shY + 6,  14 + armSpread * 0.6, shY + 20,  18 + armSpread, shY + 34, lw, true, d, limbCol, outCol);
          return { hx: d * (4 + squatCurve * 2), hy: shY - r - 4 };
        }
        return null;
      }

      const r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW, d = player.dir;
      const bodyCol = player.dying ? '#1a1a1a' : c.bodyColor, outCol = player.dying ? '#111' : '#080605', limbCol = player.dying ? '#141414' : '#2b211e';

      ctx.lineCap = ctx.lineJoin = "round";

      // 處理往上攀爬至平台的繪圖
      if (player.ropeLedgeClimbingUp) {
        ctx.save();
        let hx = 0, hy = 0;
        const p = player.ropeLedgeAnimP, bestLedge = player.ropeLedgeTarget, grabRelX = bestLedge.grabX - player.x, grabRelY = bestLedge.targetY - player.y;
        let hipX = 0, hipY = -32, bodyTilt = d * 0.15, lKneeX, lKneeY, lFootX, lFootY, rKneeX, rKneeY, rFootX, rFootY;
        if (p < 0.18) { const k = p / 0.18; hipY = -30 + Math.sin(k * Math.PI) * 4; bodyTilt = d * 0.08; lKneeX = -d * 5; lKneeY = hipY + 18; lFootX = -d * 8; lFootY = hipY + 34; rKneeX = d * 3; rKneeY = hipY + 19; rFootX = 0; rFootY = hipY + 35; }
        else if (p < 0.45) { const k = (p - 0.18) / 0.27; hipY = -30 - k * 8; bodyTilt = d * (0.12 + k * 0.25); lKneeX = d * (6 + k * 14); lKneeY = hipY + 16 - k * 14; lFootX = d * (2 + k * 12); lFootY = hipY + 32 - k * 18; rKneeX = -d * 4; rKneeY = hipY + 18 - k * 4; rFootX = -d * 8; rFootY = hipY + 34 - k * 5; }
        else if (p < 0.68) { const k = (p - 0.45) / 0.23; hipY = -38 + k * 12; bodyTilt = d * (0.38 + (1 - k) * 0.12); lFootX = grabRelX + d * (6 + k * 8); lFootY = grabRelY; lKneeX = (hipX + lFootX) * 0.5 + d * 10; lKneeY = Math.min(hipY, lFootY) - 10; rFootX = -d * (10 * (1 - k)) + grabRelX * k; rFootY = (hipY + 28) * (1 - k) + (grabRelY + 6) * k; rKneeX = (hipX + rFootX) * 0.5 - d * 4; rKneeY = (hipY + rFootY) * 0.5 - 6; }
        else if (p < 0.86) { const k = (p - 0.68) / 0.18; hipY = -26 + k * 4; bodyTilt = d * (0.42 * (1 - k * 0.4)); lFootX = d * 11; lFootY = grabRelY; lKneeX = d * 15; lKneeY = (hipY + lFootY) * 0.5 - 6; rFootX = -d * 7; rFootY = grabRelY; rKneeX = d * 4; rKneeY = (hipY + rFootY) * 0.5 - 4; }
        else { const k = (p - 0.86) / 0.14; hipY = -22 - k * 10; bodyTilt = d * (0.25 * (1 - k) + 0.12 * k); lFootX = d * (11 * (1 - k) + 9 * k); lFootY = -2; lKneeX = d * (14 * (1 - k) + 6 * k); lKneeY = hipY + 16; rFootX = -d * (7 * (1 - k) + 9 * k); rFootY = -2; rKneeX = -d * (2 * (1 - k) + 6 * k); rKneeY = hipY + 16; }

        const shX = hipX + Math.sin(bodyTilt) * bh, shY = hipY - Math.cos(bodyTilt) * bh;
        hx = shX + d * 5; hy = shY - r + 6;

        drawFullLimb(hipX - 2, hipY, rKneeX, rKneeY, rFootX, rFootY, lw, false, d, limbCol, outCol);
        drawFullLimb(hipX + 2, hipY, lKneeX, lKneeY, lFootX, lFootY, lw, false, d, limbCol, outCol);
        drawShapedTorso((hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, bodyTilt, bodyCol, outCol);

        if (p < 0.84) {
          const hand1X = grabRelX - d * 3, hand1Y = grabRelY, hand2X = grabRelX + d * 5, hand2Y = grabRelY;
          const elbowBend = (p >= 0.15 && p <= 0.75) ? 14 : 6;
          const elb1X = (shX + hand1X) * 0.5 - d * elbowBend, elb1Y = (shY + hand1Y) * 0.5 + 4;
          const elb2X = (shX + hand2X) * 0.5 + d * (elbowBend * 0.7), elb2Y = (shY + hand2Y) * 0.5 + 6;
          drawFullLimb(shX - 3, shY + 5, elb1X, elb1Y, hand1X, hand1Y, lw, true, d, limbCol, outCol);
          drawFullLimb(shX + 3, shY + 5, elb2X, elb2Y, hand2X, hand2Y, lw, true, d, limbCol, outCol);
        } else {
          const k = (p - 0.84) / 0.16;
          drawFullLimb(shX - 2, shY + 6, shX - 12, shY + 20, shX - 15, shY + 32 * k, lw, true, d, limbCol, outCol);
          drawFullLimb(shX + 2, shY + 6, shX + 12, shY + 20, shX + 15, shY + 32 * k, lw, true, d, limbCol, outCol);
        }
        ctx.restore();
        return { hx, hy };
      }

      // 處理從平台邊緣往下攀爬的繪圖
      if (player.ropeLedgeClimbingDown) {
        if (player.ropeTurning) {
          player.turning = true;
          player.turnTimer = Math.max(0, ROPE_TURN_DURATION - player.ropeTurnTimer);
          player.turnDuration = ROPE_TURN_DURATION;
          player.turnFromDir = player.ropeTurnFromDir;
          player.turnToDir = player.ropeTurnToDir;
          return null;
        }
        ctx.save();
        let hx = 0, hy = 0;
        const p = player.ropeLedgeAnimP, grabRelX = player.ropeLedgeGrabX - player.x, grabRelY = player.ropeLedgeStartY - player.y;
        let hipX = 0, hipY = -32, bodyTilt = d * 0.15;
        if (p < 0.25) { const k = p / 0.25; hipY = -30 + k * 8; bodyTilt = d * (0.15 + k * 0.35); }
        else { const k = Math.min(1, (p - 0.25) / 0.67); hipY = -22 - k * 10; bodyTilt = d * (0.5 * (1 - k) + 0.06 * k); }

        const shX = hipX + Math.sin(bodyTilt) * bh, shY = hipY - Math.cos(bodyTilt) * bh;
        hx = shX + d * 4; hy = shY - r + 6;

        drawFullLimb(hipX - 2, hipY, hipX - d * 5, hipY + 16, hipX - d * 3, -2, lw, false, d, limbCol, outCol);
        drawFullLimb(hipX + 2, hipY, hipX + d * 4, hipY + 16, hipX + d * 2, -2, lw, false, d, limbCol, outCol);
        drawShapedTorso((hipX + shX) * 0.5, (hipY + shY) * 0.5, bw, bh, bodyTilt, bodyCol, outCol);

        // 💡 平滑手部過渡：從平台邊緣滑降到胸前繩子抓取點 (-68)
        const handP = Math.max(0, (p - 0.3) / 0.7);
        const easeH = handP * handP * (3 - 2 * handP);
        
        const hand1X = (grabRelX - d * 3) * (1 - easeH) + (d * 2) * easeH;
        const hand1Y = grabRelY * (1 - easeH) + (-68) * easeH;
        const hand2X = (grabRelX + d * 4) * (1 - easeH) + (-d * 2) * easeH;
        const hand2Y = grabRelY * (1 - easeH) + (-68) * easeH;

        const elbowBend = (1 - p) * 14 + 3;
        const elb1X = (shX + hand1X) * 0.5 - d * elbowBend, elb1Y = (shY + hand1Y) * 0.5 - 4;
        const elb2X = (shX + hand2X) * 0.5 + d * (elbowBend * 0.6), elb2Y = (shY + hand2Y) * 0.5 - 2;
        
        drawFullLimb(shX - 3, shY + 5, elb1X, elb1Y, hand1X, hand1Y, lw, true, d, limbCol, outCol);
        drawFullLimb(shX + 3, shY + 5, elb2X, elb2Y, hand2X, hand2Y, lw, true, d, limbCol, outCol);
        
        ctx.restore();
        return { hx, hy };
      }

      // 標準爬繩子繪圖
      const phase = player.ropeClimbAnimT || 0;
      const tilt = player.ropeVisualTilt || 0;
      const legLag = player.ropeLegLag || 0;
      const hand1Reach = Math.sin(phase) * 13, hand2Reach = -hand1Reach, foot1Lift = Math.sin(phase) * 12, foot2Lift = -foot1Lift, bodyBob = Math.cos(phase * 2) * 2.0;
      
      // 💡 關鍵修正：若有 Y 軸平滑偏移量，繪圖基準點需反向扣除，確保角色雙手在視覺上仍死死黏在抓取點，不會閃現！
      const pivotY = -72 - (player.ropeDropYOffset || 0);

      ctx.save();
      let visualGrabShift = 0;
      if (player.ropeGrabShiftTimer > 0) { const pShift = player.ropeGrabShiftTimer / 0.1; visualGrabShift = Math.pow(pShift, 2) * 5; }
      ctx.translate(0, pivotY + visualGrabShift);
      ctx.rotate(tilt);

      let hxLocal = 0, hyLocal = 0;

      if (player.ropeTurning) {
        const turnP = Math.min(1, Math.max(0, 1 - (player.ropeTurnTimer / ROPE_TURN_DURATION))); 
        const easeTurn = turnP * turnP * (3 - 2 * turnP);
        const turnFaceD = player.ropeTurnFromDir * (1 - easeTurn) + player.ropeTurnToDir * easeTurn;
        const shX = -turnFaceD * 5, shY = 6 + bodyBob, hipX = -turnFaceD * 7, hipY = shY + bh;
        const stepLift = Math.sin(easeTurn * Math.PI) * 8;
        const footDir = Math.abs(turnFaceD) < 0.2 ? player.ropeTurnToDir : Math.sign(turnFaceD);
        const legSpread = 8 * turnFaceD;
        const lFootY = 54 + foot1Lift - stepLift, rFootY = 54 + foot2Lift + stepLift * 0.5;
        const armSpan = (bw * 0.45 + 12) * turnFaceD, elbowTwist = Math.sin(easeTurn * Math.PI) * 10, isFacingRight = turnFaceD >= 0;
        
        if (!isFacingRight) drawFullLimb(shX - bw * 0.35 * turnFaceD, shY + 6, shX - armSpan * 0.7 - elbowTwist, shY + 16, shX - armSpan * 0.9, shY + 28 - stepLift, lw, true, footDir, limbCol, outCol);
        else drawFullLimb(shX + bw * 0.35 * turnFaceD, shY + 6, shX + armSpan * 0.7 + elbowTwist, shY + 16, shX + armSpan * 0.9, shY + 28 + stepLift, lw, true, footDir, limbCol, outCol);
        drawFullLimb(hipX - 2 * turnFaceD, hipY, hipX - legSpread * 0.6, hipY + (lFootY - hipY)*0.5, hipX - legSpread * 0.85, lFootY, lw, false, footDir, limbCol, outCol);
        const turnTorsoW = bw * (1.12 - 0.12 * Math.abs(turnFaceD)), torsoAngle = Math.atan2(hipX - shX, hipY - shY);
        drawShapedTorso((hipX + shX) * 0.5, (hipY + shY) * 0.5, turnTorsoW, bh, -torsoAngle - turnFaceD * 0.04, bodyCol, outCol);
        drawFullLimb(hipX + 2 * turnFaceD, hipY, hipX + legSpread * 0.6, hipY + (rFootY - hipY)*0.5, hipX + legSpread * 0.85, rFootY, lw, false, footDir, limbCol, outCol);
        if (isFacingRight) drawFullLimb(shX - bw * 0.35 * turnFaceD, shY + 6, shX - armSpan * 0.7 - elbowTwist, shY + 16, shX - armSpan * 0.9, shY + 28 - stepLift, lw, true, footDir, limbCol, outCol);
        else drawFullLimb(shX + bw * 0.35 * turnFaceD, shY + 6, shX + armSpan * 0.7 + elbowTwist, shY + 16, shX + armSpan * 0.9, shY + 28 + stepLift, lw, true, footDir, limbCol, outCol);
        hxLocal = shX + turnFaceD * 4; hyLocal = shY - r + 6; 
      } 
      else {
        const shX = -d * 5, shY = 6 + bodyBob, hipX = -d * 7 + legLag * 0.22, hipY = shY + bh;
        const backHandX = 0, backHandY = hand2Reach, backElbX = (shX + backHandX) * 0.5 - d * 9, backElbY = (shY + backHandY) * 0.5 + 5;
        const backFootX = d * 2 + legLag, backFootY = 54 + foot2Lift - Math.abs(legLag) * 0.25, backKneeX = (hipX + backFootX) * 0.5 + d * 11 + legLag * 0.35, backKneeY = (hipY + backFootY) * 0.5 - 3;
        const frontHandX = 0, frontHandY = hand1Reach, frontElbX = (shX + frontHandX) * 0.5 + d * 6, frontElbY = (shY + frontHandY) * 0.5 + 7;
        const frontFootX = -d * 2 + legLag * 1.08, frontFootY = 54 + foot1Lift - Math.abs(legLag) * 0.25, frontKneeX = (hipX + frontFootX) * 0.5 + d * 14 + legLag * 0.35, frontKneeY = (hipY + frontFootY) * 0.5 - 5;

        drawFullLimb(shX, shY + 5, backElbX, backElbY, backHandX, backHandY, lw, true, d, limbCol, outCol);
        drawFullLimb(hipX, hipY, backKneeX, backKneeY, backFootX, backFootY, lw, false, d, limbCol, outCol);
        const torsoAngle = Math.atan2(hipX - shX, hipY - shY);
        drawShapedTorso((shX + hipX) * 0.5, (shY + hipY) * 0.5, bw, bh, -torsoAngle - d * 0.04, bodyCol, outCol);
        drawFullLimb(hipX, hipY, frontKneeX, frontKneeY, frontFootX, frontFootY, lw, false, d, limbCol, outCol);
        drawFullLimb(shX, shY + 5, frontElbX, frontElbY, frontHandX, frontHandY, lw, true, d, limbCol, outCol);

        ctx.fillStyle = "#080605"; ctx.beginPath(); ctx.arc(backHandX, backHandY, lw * 0.55, 0, Math.PI * 2); ctx.arc(frontHandX, frontHandY, lw * 0.55, 0, Math.PI * 2); ctx.fill();
        hxLocal = shX + d * 4; hyLocal = shY - r + 6;
      }

      ctx.restore();

      if (player.ropeTurning) { player.turning = true; player.turnTimer = Math.max(0, ROPE_TURN_DURATION - player.ropeTurnTimer); player.turnDuration = ROPE_TURN_DURATION; player.turnFromDir = player.ropeTurnFromDir; player.turnToDir = player.ropeTurnToDir; } 
      else { player.turning = false; }

      const cosT = Math.cos(tilt), sinT = Math.sin(tilt), hx = hxLocal * cosT - hyLocal * sinT, hy = pivotY + visualGrabShift + hxLocal * sinT + hyLocal * cosT; 
      return { hx, hy };
    }
  });
})();
