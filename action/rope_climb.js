// 檔案路徑：action/rope_climb.js
// ==========================================
// 模組化動作外掛：繩索攀爬與動態爬繩骨架動畫
// 支援：兩端固定橫向/斜向倒吊爬行、上下繩過場動畫、移動時頭部看向移動方向、同步旋轉碰撞框
// ==========================================
(function() {
  const ROPE_TURN_DURATION = 0.2;
  const INVERTED_MOUNT_DURATION = 0.42;      // 上繩過場總時長（先雙手抓繩，再雙腳勾上）
  const INVERTED_DISMOUNT_DURATION = 0.38;   // 下繩過場總時長（先雙腳放下，再雙手鬆開）
  const INVERTED_HEAD_TURN_DURATION = 0.16;  // 倒吊時頭部轉向看往移動方向的過渡時間

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

      if (player.ropeInverted === undefined) player.ropeInverted = false;
      if (player.ropeInvertedHeadDir === undefined) player.ropeInvertedHeadDir = -1;
      if (player.ropeInvertedLookDir === undefined) player.ropeInvertedLookDir = -1;
      if (player.ropeInvertedTravelDir === undefined) player.ropeInvertedTravelDir = 0;
      if (player.ropeHeadTurnTimer === undefined) player.ropeHeadTurnTimer = 0;
      if (player.ropeHeadTurnFromDir === undefined) player.ropeHeadTurnFromDir = -1;
      if (player.ropeMountState === undefined) player.ropeMountState = "none"; // "none" | "mounting" | "climbing" | "dismounting"
      if (player.ropeMountTimer === undefined) player.ropeMountTimer = 0;
      if (player.ropeMountDuration === undefined) player.ropeMountDuration = INVERTED_MOUNT_DURATION;
      if (player.ropeInvertedMoveMode === undefined) player.ropeInvertedMoveMode = "idle"; // "idle" | "forward" | "backward"
      if (player.ropeBodyAngle === undefined) player.ropeBodyAngle = 0;
      if (player.ropePivotRelY === undefined) player.ropePivotRelY = -72;
      if (player.bodyAngle === undefined) player.bodyAngle = 0;

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

      const clearInvertedState = function() {
        player.ropeInverted = false;
        player.ropeInvertedTravelDir = 0;
        player.ropeHeadTurnTimer = 0;
        player.ropeMountState = "none";
        player.ropeMountTimer = 0;
        player.ropeInvertedMoveMode = "idle";
        player.ropeBodyAngle = 0;
        player.bodyAngle = 0;
      };

      if (player.dead || player.dying || player.won) {
        player.onRope = false;
        player.nearRope = false;
        player.ropeTurning = false;
        player.ropeLedgeClimbingUp = false;
        player.ropeLedgeClimbingDown = false;
        player.ropeDropYOffset = 0;
        clearInvertedState();
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

      // 從指定繩節的某一端（"start" 或 "end"）向外追蹤整條相連繩索，確認該側是否存在固定節點
      const isRopeEndAnchored = function(seg, endSide, visitedPairs = new Set()) {
        if (!seg || seg.hidden) return false;
        const visitKey = `${seg.id}:${endSide}`;
        if (visitedPairs.has(visitKey)) return false;
        visitedPairs.add(visitKey);

        if (endSide === "start") {
          if (seg.startBroken) return false;
          if (seg.pinStart) return true;
        } else {
          if (seg.endBroken) return false;
          if (seg.pinEnd) return true;
        }

        const targetId = (endSide === "start") ? seg.attachStartTo : seg.attachEndTo;
        const targetPoint = (endSide === "start") ? (seg.attachStartPoint || "end") : (seg.attachEndPoint || "start");
        if (targetId) {
          const targetSeg = ropes.find(r => r.id === targetId && !r.hidden);
          if (targetSeg) {
            const targetDirectPinned = (targetPoint === "start")
              ? (targetSeg.pinStart && !targetSeg.startBroken)
              : (targetSeg.pinEnd && !targetSeg.endBroken);
            if (targetDirectPinned) return true;
            const targetBrokenAtEntry = (targetPoint === "start") ? targetSeg.startBroken : targetSeg.endBroken;
            if (!targetBrokenAtEntry) {
              const oppositeSide = (targetPoint === "start") ? "end" : "start";
              if (isRopeEndAnchored(targetSeg, oppositeSide, visitedPairs)) return true;
            }
          }
        }

        for (const other of ropes) {
          if (other.id === seg.id || other.hidden) continue;
          if (!other.startBroken && other.attachStartTo === seg.id && (other.attachStartPoint || "end") === endSide) {
            if (other.pinStart) return true;
            if (isRopeEndAnchored(other, "end", visitedPairs)) return true;
          }
          if (!other.endBroken && other.attachEndTo === seg.id && (other.attachEndPoint || "start") === endSide) {
            if (other.pinEnd) return true;
            if (isRopeEndAnchored(other, "start", visitedPairs)) return true;
          }
        }

        return false;
      };

      // 從抓住的繩節位置往兩邊檢查，確認是否兩側皆有固定節點
      const checkBothSidesAnchored = function(rope) {
        if (!rope) return false;
        const startAnchored = isRopeEndAnchored(rope, "start", new Set());
        const endAnchored = isRopeEndAnchored(rope, "end", new Set());
        if (startAnchored && endAnchored) return true;
        if (typeof window.isRopeChainBothEndsAnchored === "function") {
          return window.isRopeChainBothEndsAnchored(rope, items);
        }
        return false;
      };

      // 計算指定斜度與過場比例（hangFactor: 0=直立垂吊, 1=水平倒吊）下的旋轉碰撞框
      const computeInvertedRopeHitbox = function(rx, ry, slopeAngle, hangFactor = 1.0) {
        const boxW = 32 + (112 - 32) * hangFactor; // 隨雙腳勾上過程從直立寬度平滑展開為橫向身體長度
        const boxH = 104 + (44 - 104) * hangFactor; // 隨雙腳勾上過程從直立高度收合為倒吊厚度
        const cosA = Math.cos(slopeAngle);
        const sinA = Math.sin(slopeAngle);
        const halfW = boxW * 0.5;

        const localCorners = [
          [-halfW, 0],
          [ halfW, 0],
          [ halfW, boxH],
          [-halfW, boxH]
        ];

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const [lx, ly] of localCorners) {
          const wx = rx + lx * cosA - ly * sinA;
          const wy = ry + lx * sinA + ly * cosA;
          if (wx < minX) minX = wx;
          if (wx > maxX) maxX = wx;
          if (wy < minY) minY = wy;
          if (wy > maxY) maxY = wy;
        }

        const centerX = rx - sinA * (boxH * 0.5);
        const centerY = ry + cosA * (boxH * 0.5);

        return {
          isLow: hangFactor >= 0.45,
          halfW: Math.max(16, (maxX - minX) * 0.5),
          height: Math.max(28, maxY - minY),
          angle: slopeAngle * hangFactor,
          width: boxW,
          thickness: boxH,
          centerX: centerX,
          centerY: centerY,
          pivotX: rx,
          pivotY: ry,
          minX: minX,
          maxX: maxX,
          minY: minY,
          maxY: maxY
        };
      };

      const checkGroundY = function(x, y) {
        if (!pluginCtx.sampleGroundY) return null;
        return pluginCtx.sampleGroundY(x, y);
      };

      // =============== 不在繩子上的狀態邏輯 ===============
      if (!player.onRope) {
        clearInvertedState();

        const gY = checkGroundY(player.x, player.y);
        const justDroppedFromLedge = (player.vy === 10 && !player.grounded);
        const isStandingOnGround = (player.grounded || (gY !== null && player.y >= gY - 6)) && !justDroppedFromLedge;
        player.nearRope = false;

        // 在主程式判定往平台下爬之前搶先偵測平台下方是否有繩索
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
            for (const r of ropes) {
              if (!isRopeSupported(r)) continue;
              const N = r.nodes.length;
              for (let i = 0; i < N - 1; i++) {
                const n0 = r.nodes[i], n1 = r.nodes[i + 1], vx = n1.x - n0.x, vy = n1.y - n0.y, lenSq = vx * vx + vy * vy;
                let t = 0;
                if (lenSq > 0.0001) t = Math.max(0, Math.min(1, ((ledge.hangX - n0.x) * vx + ((ledge.targetY - 72) - n0.y) * vy) / lenSq));
                const px = n0.x + vx * t, py = n0.y + vy * t;
                const d = Math.hypot(px - ledge.hangX, py - (ledge.targetY - 72));
                if (d < bestDist) { bestDist = d; bestRope = r; }
              }
            }

            if (bestRope) {
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
              if (isStandingOnGround && gY !== null && (py + 44 > gY - 2)) continue;

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

              const standDir = player.dir || 1;
              player.onRope = true;
              player.nearRope = false;
              player.currentRopeId = bestRope.id;

              const bN = bestRope.nodes.length;
              const bFloat = Math.max(0, Math.min(bN - 1.0001, bestProgress * (bN - 1)));
              const b0 = Math.floor(bFloat), b1 = Math.min(bN - 1, b0 + 1), bFrac = bFloat - b0;
              const grabRy = bestRope.nodes[b0].y + (bestRope.nodes[b1].y - bestRope.nodes[b0].y) * bFrac;

              let rdx = bestRope.nodes[bN - 1].x - bestRope.nodes[0].x;
              let rdy = bestRope.nodes[bN - 1].y - bestRope.nodes[0].y;
              if (rdx < 0) { rdx = -rdx; rdy = -rdy; }
              const initSlope = Math.atan2(rdy, Math.max(0.001, rdx));
              const startInverted = checkBothSidesAnchored(bestRope) && Math.abs(initSlope) <= Math.PI * 0.42;

              if (!startInverted) {
                const rLen = Math.max(20, bestRope.ropeLength || 100);
                bestProgress = Math.max(0, bestProgress - (5 / rLen));
                player.ropeDropYOffset = 0;
                clearInvertedState();
              } else {
                // 站立朝右(1) -> 雙腳順勢向前(右)勾上 -> 頭在左(-1)；站立朝左(-1) -> 頭在右(1)
                player.ropeInverted = true;
                player.ropeInvertedHeadDir = -standDir;
                player.ropeInvertedLookDir = standDir;
                player.ropeHeadTurnFromDir = standDir;
                player.ropeHeadTurnTimer = 0;
                player.ropeInvertedTravelDir = 0;
                player.ropeMountState = "mounting";
                player.ropeMountTimer = 0;
                player.ropeMountDuration = INVERTED_MOUNT_DURATION;
                player.ropeInvertedMoveMode = "idle";
                player.ropeBodyAngle = initSlope;
                player.bodyAngle = 0;

                const hbInit = computeInvertedRopeHitbox(player.x, grabRy, initSlope, 0.0);
                player.ropeDropYOffset = player.y - hbInit.maxY;
                player.ropePivotRelY = grabRy - player.y;
              }

              player.ropeProgress = bestProgress;
              player.ropeLedgeClimbingDown = false;
              player.ropeLedgeClimbingUp = false;
              player.ropeJustGrabbedTimer = 0.25;
              player.ropeTurning = false;
              player.ropeGrabShiftTimer = 0.1;

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
        player.onRope = false;
        player.ropeTurning = false;
        player.ropeLedgeClimbingUp = false;
        player.ropeLedgeClimbingDown = false;
        player.ropeDropYOffset = 0;
        clearInvertedState();
        return;
      }

      player.fallStartY = player.y;

      // 處理往上攀爬到平台的動畫接管
      if (player.ropeLedgeClimbingUp) {
        clearInvertedState();
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
        clearInvertedState();
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

        if (p >= 1) {
          player.ropeLedgeClimbingDown = false;
          let bestProgress = 0, minDist = 999;
          const grabY = player.y - 72;
          for (let i = 0; i < curRope.nodes.length - 1; i++) {
            const n0 = curRope.nodes[i], n1 = curRope.nodes[i + 1], vx = n1.x - n0.x, vy = n1.y - n0.y, lenSq = vx * vx + vy * vy;
            let t = 0;
            if (lenSq > 0.0001) t = Math.max(0, Math.min(1, ((player.x - n0.x) * vx + (grabY - n0.y) * vy) / lenSq));
            const px = n0.x + vx * t, py = n0.y + vy * t, d = Math.hypot(px - player.x, py - grabY);
            if (d < minDist) { minDist = d; bestProgress = (i + t) / (curRope.nodes.length - 1); }
          }
          player.ropeProgress = bestProgress;
          player.ropeDropYOffset = player.y - (grabY + 72);
          player.ropeJustGrabbedTimer = 0.2;
        }
        return;
      }

      const N = curRope.nodes.length;
      const fIdx = Math.max(0, Math.min(N - 1.0001, player.ropeProgress * (N - 1)));
      const idx0 = Math.floor(fIdx), idx1 = Math.min(N - 1, idx0 + 1);
      const nodeVx = ((curRope.nodes[idx0].x - curRope.nodes[idx0].oldX) + (curRope.nodes[idx1].x - curRope.nodes[idx1].oldX)) * 0.5 / 0.016;

      // 按 A 跳離繩索
      if (wasJustPressed && wasJustPressed("jump")) {
        const jumpDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const exitDir = jumpDir !== 0 ? jumpDir : (player.ropeInverted ? -player.ropeInvertedHeadDir : player.dir);
        player.onRope = false;
        player.ropeCooldown = 0.28;
        player.ropeTurning = false;
        player.ropeGrabShiftTimer = 0;
        player.ropeDropYOffset = 0;
        clearInvertedState();
        player.dir = exitDir;
        player.vy = -420;
        if (jumpDir !== 0) { player.vx = jumpDir * 220 + nodeVx * 0.5; } else { player.vx = nodeVx * 0.65; }
        return;
      }

      // 按 B 放開繩索（若為倒吊狀態，先啟動「雙腳先放下、雙手再鬆開」的下繩過場動畫）
      if (wasJustPressed && wasJustPressed("crawl")) {
        if (input.crawl !== undefined) input.crawl = false;
        if (input.b !== undefined) input.b = false;

        if (player.ropeInverted) {
          if (player.ropeMountState !== "dismounting") {
            player.ropeMountState = "dismounting";
            player.ropeMountTimer = 0;
            player.ropeMountDuration = INVERTED_DISMOUNT_DURATION;
            player.ropeInvertedMoveMode = "idle";
            player.ropeInvertedTravelDir = 0;
            player.ropeMoving = false;
          }
        } else {
          player.onRope = false;
          player.ropeCooldown = 0.25;
          player.ropeTurning = false;
          player.ropeGrabShiftTimer = 0;
          player.ropeDropYOffset = 0;
          clearInvertedState();
          player.vx = nodeVx * 0.5;
          player.vy = 0;
          return;
        }
      }

      const tx = curRope.nodes[idx1].x - curRope.nodes[idx0].x;
      const ty = curRope.nodes[idx1].y - curRope.nodes[idx0].y;
      const tLen = Math.hypot(tx, ty) || 1;
      const ux = tx / tLen;
      const uy = ty / tLen;

      let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

      const bothEndsAnchored = checkBothSidesAnchored(curRope);

      // 轉向控制：倒吊爬繩模式「身體不轉向」，僅在一般垂直爬繩時才轉向
      if (!player.ropeInverted) {
        if (player.ropeTurning) {
          player.ropeTurnTimer -= dt;
          if (player.ropeTurnTimer <= 0) {
            player.dir = player.ropeTurnToDir;
            player.ropeTurning = false;
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

        if (player.ropeTurning) {
          ix = 0;
          iy = 0;
        } else if (ix !== 0 && ix !== player.dir) {
          player.ropeTurning = true;
          player.ropeTurnTimer = ROPE_TURN_DURATION;
          player.ropeTurnFromDir = player.dir;
          player.ropeTurnToDir = ix;
          ix = 0;
          iy = 0;
        } else if (ix !== 0) {
          player.dir = ix;
        }
      } else {
        player.ropeTurning = false;
        // 上下繩過場期間鎖定橫向移動，確保手抓與放腳過場平順完成
        if (player.ropeMountState === "mounting" || player.ropeMountState === "dismounting") {
          ix = 0;
          iy = 0;
        }
      }

      let moveDir = 0;
      if (bothEndsAnchored) {
        if (ix !== 0) {
          if (Math.abs(ux) > 0.15) {
            moveDir = (ux >= 0) ? ix : -ix;
          } else {
            const globalDx = curRope.nodes[N - 1].x - curRope.nodes[0].x;
            moveDir = (globalDx >= 0) ? ix : -ix;
          }
        } else if (iy !== 0) {
          if (Math.abs(uy) > 0.18) {
            moveDir = (uy > 0) ? iy : -iy;
          } else {
            const globalDy = curRope.nodes[N - 1].y - curRope.nodes[0].y;
            if (Math.abs(globalDy) > 2) moveDir = (globalDy > 0) ? iy : -iy;
            else moveDir = -iy;
          }
        }
      } else {
        if (iy !== 0) {
          if (Math.abs(uy) > 0.15) { moveDir = (uy > 0) ? iy : -iy; }
          else { const globalDy = curRope.nodes[N - 1].y - curRope.nodes[0].y; if (Math.abs(globalDy) > 2) { moveDir = (globalDy > 0) ? iy : -iy; } else { moveDir = -iy; } }
        }
      }

      const prevPlayerY = player.y, climbSpeed = 150, totalLen = Math.max(20, curRope.ropeLength || 100);
      if (moveDir !== 0) {
        player.ropeMoving = true;
        player.ropeProgress += (moveDir * climbSpeed * dt) / totalLen;

        if (player.ropeInverted) {
          // 判斷世界 X 移動方向與頭部位置方向的關係：往頭部方向移為「前進」，往腳部方向移為「倒退」
          const headDir = player.ropeInvertedHeadDir || -1;
          const travelSignX = ix !== 0 ? ix : (Math.abs(ux) > 0.05 ? Math.sign(moveDir * ux) : headDir);
          player.ropeInvertedTravelDir = travelSignX;
          if (travelSignX === headDir) {
            player.ropeInvertedMoveMode = "forward";
            player.ropeClimbAnimT += dt * 10.5;
          } else {
            player.ropeInvertedMoveMode = "backward";
            player.ropeClimbAnimT -= dt * 10.5;
          }
        } else {
          player.ropeInvertedMoveMode = "idle";
          player.ropeInvertedTravelDir = 0;
          player.ropeClimbAnimT += dt * 9.5 * moveDir;
        }
      } else {
        player.ropeMoving = false;
        player.ropeInvertedMoveMode = "idle";
        player.ropeInvertedTravelDir = 0;
      }

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
      const aN = activeRope.nodes.length;
      const aFloat = Math.max(0, Math.min(aN - 1.0001, player.ropeProgress * (aN - 1)));
      const a0 = Math.floor(aFloat);
      const a1 = Math.min(aN - 1, a0 + 1);
      const frac = aFloat - a0;
      const rx = activeRope.nodes[a0].x + (activeRope.nodes[a1].x - activeRope.nodes[a0].x) * frac;
      const ry = activeRope.nodes[a0].y + (activeRope.nodes[a1].y - activeRope.nodes[a0].y) * frac;

      // 計算繩索切線斜度（正規化至 -PI/2 ~ +PI/2，確保角色永遠倒吊在繩索下方）
      const slopeIdx0 = Math.max(0, a0 - 1);
      const slopeIdx1 = Math.min(aN - 1, Math.max(slopeIdx0 + 1, a1 + 1));
      let rdx = activeRope.nodes[slopeIdx1].x - activeRope.nodes[slopeIdx0].x;
      let rdy = activeRope.nodes[slopeIdx1].y - activeRope.nodes[slopeIdx0].y;
      if (rdx < 0) {
        rdx = -rdx;
        rdy = -rdy;
      }
      const rawSlopeAngle = Math.atan2(rdy, Math.max(0.001, rdx));

      const activeBothAnchored = checkBothSidesAnchored(activeRope);
      const isInvertedMode = activeBothAnchored && Math.abs(rawSlopeAngle) <= Math.PI * 0.42;

      player.ropeAngle = Math.atan2(activeRope.nodes[a1].y - activeRope.nodes[a0].y, activeRope.nodes[a1].x - activeRope.nodes[a0].x);

      if (isInvertedMode) {
        if (!player.ropeInverted) {
          const prevDir = player.dir || 1;
          player.ropeInverted = true;
          player.ropeInvertedHeadDir = -prevDir;
          player.ropeInvertedLookDir = prevDir;
          player.ropeHeadTurnFromDir = prevDir;
          player.ropeHeadTurnTimer = 0;
          player.ropeMountState = "mounting";
          player.ropeMountTimer = 0;
          player.ropeMountDuration = INVERTED_MOUNT_DURATION;
        }

        // 平滑追蹤繩索斜度
        if (Math.abs(player.ropeBodyAngle - rawSlopeAngle) > Math.PI * 0.5) {
          player.ropeBodyAngle = rawSlopeAngle;
        } else {
          player.ropeBodyAngle += (rawSlopeAngle - player.ropeBodyAngle) * Math.min(1, dt * 18);
        }

        // 計算上繩／下繩過場進度與懸掛展開係數（hangFactor: 0=直立垂吊, 1=平行倒吊）
        let hangFactor = 1.0;
        let handReleaseDrop = 0;
        if (player.ropeMountState === "mounting") {
          player.ropeMountTimer += dt;
          const mp = Math.min(1, player.ropeMountTimer / (player.ropeMountDuration || INVERTED_MOUNT_DURATION));
          if (mp < 0.42) {
            hangFactor = 0.0; // 前半段：雙手先伸上去抓住繩子，雙腳仍在下方
          } else {
            const k2 = (mp - 0.42) / 0.58;
            hangFactor = k2 * k2 * (3 - 2 * k2); // 後半段：雙腳順勢向上擺動勾住繩子
          }
          if (mp >= 1) {
            player.ropeMountState = "climbing";
            hangFactor = 1.0;
          }
        } else if (player.ropeMountState === "dismounting") {
          player.ropeMountTimer += dt;
          const dp = Math.min(1, player.ropeMountTimer / (player.ropeMountDuration || INVERTED_DISMOUNT_DURATION));
          if (dp < 0.62) {
            const k1 = dp / 0.62;
            hangFactor = 1.0 - (k1 * k1 * (3 - 2 * k1)); // 前半段：雙腳先從繩上放下來，雙手仍抓緊繩子
          } else {
            hangFactor = 0.0;
            const k2 = (dp - 0.62) / 0.38;
            handReleaseDrop = 22 * k2 * k2; // 後半段：雙手再鬆開，身體開始往下落
          }
          if (dp >= 1) {
            const restoreDir = -player.ropeInvertedHeadDir;
            player.onRope = false;
            player.grounded = false;
            player.ropeCooldown = 0.25;
            player.ropeTurning = false;
            player.ropeGrabShiftTimer = 0;
            player.ropeDropYOffset = 0;
            clearInvertedState();
            player.dir = restoreDir;
            player.vx = nodeVx * 0.4;
            player.vy = 130;
            player.fallStartY = player.y;
            return;
          }
        }

        // 決定頭部視線朝向：倒吊移動時看向移動方向（前進或後退皆然），靜止時看回頭部前方
        const headDir = player.ropeInvertedHeadDir || -1;
        const footDir = -headDir;
        let desiredLookDir = (hangFactor >= 0.5) ? headDir : footDir;
        if (player.ropeMountState === "climbing" && player.ropeInvertedMoveMode !== "idle" && player.ropeInvertedTravelDir !== 0) {
          desiredLookDir = player.ropeInvertedTravelDir;
        }

        if (desiredLookDir !== player.ropeInvertedLookDir) {
          player.ropeHeadTurnFromDir = player.dir || player.ropeInvertedLookDir;
          player.ropeInvertedLookDir = desiredLookDir;
          player.ropeHeadTurnTimer = INVERTED_HEAD_TURN_DURATION;
        }

        if (player.ropeHeadTurnTimer > 0) {
          player.ropeHeadTurnTimer = Math.max(0, player.ropeHeadTurnTimer - dt);
          const turnElapsed = INVERTED_HEAD_TURN_DURATION - player.ropeHeadTurnTimer;
          player.turning = true;
          player.turnFromDir = player.ropeHeadTurnFromDir;
          player.turnToDir = player.ropeInvertedLookDir;
          player.turnDuration = INVERTED_HEAD_TURN_DURATION;
          player.turnTimer = turnElapsed;
          player.dir = (turnElapsed >= INVERTED_HEAD_TURN_DURATION * 0.5)
            ? player.ropeInvertedLookDir
            : player.ropeHeadTurnFromDir;
          if (player.ropeHeadTurnTimer <= 0) {
            player.turning = false;
            player.dir = player.ropeInvertedLookDir;
          }
        } else {
          player.turning = false;
          player.dir = player.ropeInvertedLookDir;
        }

        player.bodyAngle = player.ropeBodyAngle * hangFactor;
        player.ropeVisualTilt = 0;
        player.ropeLegLag = 0;

        // 計算隨繩索斜度同步旋轉的碰撞框
        const hb = computeInvertedRopeHitbox(rx, ry, player.ropeBodyAngle, hangFactor);
        player.x = rx;
        const targetY = hb.maxY + handReleaseDrop;
        if (player.ropeDropYOffset) {
          player.ropeDropYOffset -= player.ropeDropYOffset * Math.min(1, dt * 14);
          if (Math.abs(player.ropeDropYOffset) < 0.5) player.ropeDropYOffset = 0;
        } else {
          player.ropeDropYOffset = 0;
        }
        player.y = targetY + player.ropeDropYOffset;
        // 精準錨定繩索抓取點相對於 player.y 的位置，確保雙手始終緊握繩子不偏移
        player.ropePivotRelY = ry - player.y;

        player.customHitbox = {
          isLow: hb.isLow,
          halfW: hb.halfW,
          height: hb.height,
          angle: hb.angle,
          width: hb.width,
          thickness: hb.thickness,
          centerX: hb.centerX,
          centerY: hb.centerY + handReleaseDrop + (player.ropeDropYOffset || 0),
          pivotX: rx,
          pivotY: ry
        };
      } else {
        clearInvertedState();

        const sIdx0 = Math.max(0, a0 - 2), sIdx1 = Math.min(aN - 1, Math.max(sIdx0 + 1, a1));
        let segDx = activeRope.nodes[sIdx1].x - activeRope.nodes[sIdx0].x, segDy = activeRope.nodes[sIdx1].y - activeRope.nodes[sIdx0].y;
        if (segDy < 0) { segDx = -segDx; segDy = -segDy; }

        let targetTilt = 0;
        if (!activeBothAnchored) {
          const ropeSlopeAngle = -Math.atan2(segDx, Math.max(12, segDy));
          const swingInputTilt = (iy === 0 && ix !== 0) ? (-ix * 0.14) : 0;
          const velTilt = Math.max(-0.22, Math.min(0.22, -nodeVx * 0.0009));
          targetTilt = Math.max(-0.75, Math.min(0.75, ropeSlopeAngle * 0.92 + swingInputTilt + velTilt));
        } else {
          const isSteep = segDy > Math.abs(segDx) * 0.7;
          if (isSteep) { targetTilt = Math.max(-0.45, Math.min(0.45, -Math.atan2(segDx, Math.max(18, segDy)) * 0.65)); }
          else { targetTilt = -ix * 0.08; }
        }

        player.ropeVisualTilt += (targetTilt - player.ropeVisualTilt) * Math.min(1, dt * 14);
        player.ropeLegLag += ((!activeBothAnchored ? Math.max(-16, Math.min(16, -nodeVx * 0.045 + ix * 5.5)) : 0) - player.ropeLegLag) * Math.min(1, dt * 12);

        player.x = rx;
        const targetY = ry + 72;
        if (player.ropeDropYOffset) {
          player.ropeDropYOffset -= player.ropeDropYOffset * Math.min(1, dt * 12);
          if (Math.abs(player.ropeDropYOffset) < 0.5) player.ropeDropYOffset = 0;
        } else {
          player.ropeDropYOffset = 0;
        }
        player.y = targetY + player.ropeDropYOffset;
        player.ropePivotRelY = -72 - (player.ropeDropYOffset || 0);
      }

      if (player.ropeTurning) {
        player.vx = 0; player.vy = 0; player.overrideVx = 0; player.overrideVy = 0; player.lockDefaultMove = true;
      } else {
        player.vx = 0; player.vy = 0; player.grounded = false; player.lockDefaultMove = true; player.overrideVx = 0; player.overrideVy = 0;
      }

      if (input.up && !player.ropeTurning && !player.ropeInverted) {
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
      if (isGoingDown && player.ropeJustGrabbedTimer <= 0 && player.ropeMountState !== "mounting") {
        const groundY = checkGroundY(player.x, player.y);
        if (groundY !== null && player.y >= groundY - 4) {
          const restoreDir = player.ropeInverted ? -player.ropeInvertedHeadDir : player.dir;
          player.onRope = false;
          player.grounded = true;
          player.y = groundY;
          player.vy = 0;
          player.ropeCooldown = 0.25;
          player.overrideVx = null;
          player.overrideVy = null;
          player.customHold = null;
          player.lockDefaultMove = false;
          player.ropeTurning = false;
          player.ropeGrabShiftTimer = 0;
          player.ropeDropYOffset = 0;
          clearInvertedState();
          player.dir = restoreDir;
          player.ropeLandSquatTimer = 0.7;
          player.ropeLandSquatDuration = 0.7;
          return;
        }
      }

      player.customHold = { x: 16, y: 68 };
    },

    onReset: function(player) {
      player.onRope = false;
      player.nearRope = false;
      player.currentRopeId = null;
      player.ropeProgress = 0;
      player.ropeMoving = false;
      player.ropeLandSquatTimer = 0;
      player.ropeJustGrabbedTimer = 0;
      player.ropeVisualTilt = 0;
      player.ropeLegLag = 0;
      player.ropeTurning = false;
      player.ropeTurnTimer = 0;
      player.ropeLedgeTurnTarget = null;
      player.ropeGrabShiftTimer = 0;
      player.ropeLedgeClimbingUp = false;
      player.ropeLedgeClimbingDown = false;
      player.ropeLedgeAnimP = 0;
      player.ropeDropYOffset = 0;
      player.ropeInverted = false;
      player.ropeInvertedHeadDir = -1;
      player.ropeInvertedLookDir = -1;
      player.ropeInvertedTravelDir = 0;
      player.ropeHeadTurnTimer = 0;
      player.ropeHeadTurnFromDir = -1;
      player.ropeMountState = "none";
      player.ropeMountTimer = 0;
      player.ropeInvertedMoveMode = "idle";
      player.ropeBodyAngle = 0;
      player.ropePivotRelY = -72;
      player.bodyAngle = 0;
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

      // =============== 兩端固定繩索：上繩過場 -> 倒吊平行爬行（移動時頭看向移動方向） -> 下繩過場 ===============
      if (player.ropeInverted) {
        const phase = player.ropeClimbAnimT || 0;
        const slopeAngle = player.ropeBodyAngle || 0;
        const pivotY = player.ropePivotRelY;
        const headDir = player.ropeInvertedHeadDir || -1; // 頭所在的水平方向 (-1=左, +1=右)
        const footDir = -headDir;                         // 腳所在的水平方向（原站立面向方向）
        const mountState = player.ropeMountState || "climbing";

        let hangFactor = 1.0;     // 0.0 = 雙手抓繩垂直懸掛, 1.0 = 雙腳勾上平行倒吊
        let handBaseY = 0;        // 0 = 緊握在繩子上, >0 = 伸手前/鬆手後
        let bodyDropY = 0;
        let fistGripAlpha = 1.0;

        if (mountState === "mounting") {
          const mp = Math.min(1, player.ropeMountTimer / (player.ropeMountDuration || INVERTED_MOUNT_DURATION));
          if (mp < 0.42) {
            const k1 = mp / 0.42;
            const easeOut = 1 - Math.pow(1 - k1, 3);
            hangFactor = 0.0;
            handBaseY = 18 * (1 - easeOut); // 雙手先由下往上伸出抓住繩子
            fistGripAlpha = easeOut;
          } else {
            const k2 = (mp - 0.42) / 0.58;
            hangFactor = k2 * k2 * (3 - 2 * k2); // 雙手已抓牢，雙腳順勢向上勾住繩子
            handBaseY = 0;
            fistGripAlpha = 1.0;
          }
        } else if (mountState === "dismounting") {
          const dp = Math.min(1, player.ropeMountTimer / (player.ropeMountDuration || INVERTED_DISMOUNT_DURATION));
          if (dp < 0.62) {
            const k1 = dp / 0.62;
            hangFactor = 1.0 - (k1 * k1 * (3 - 2 * k1)); // 雙腳先從繩子上放下來，雙手仍抓緊繩子
            handBaseY = 0;
            fistGripAlpha = 1.0;
          } else {
            const k2 = (dp - 0.62) / 0.38;
            hangFactor = 0.0;
            handBaseY = 16 * k2;            // 雙腳垂穩後，雙手再鬆開往下收
            bodyDropY = 22 * k2 * k2;
            fistGripAlpha = Math.max(0, 1 - k2 * 1.6);
          }
        }

        // 手腳肢體的解剖朝向維持跟隨身體姿勢（不隨頭部轉看方向而翻轉）
        const bodyLimbDir = (hangFactor >= 0.5) ? headDir : footDir;

        const isActiveClimbing = (mountState === "climbing");
        const moveMode = isActiveClimbing ? (player.ropeInvertedMoveMode || "idle") : "idle";

        // 前進（往頭的方向）時手部先導、身體微向頭側前傾；倒退（往腳的方向）時腳部先導、身體微向腳側後傾
        let handPhase = phase;
        let footPhase = phase;
        let leadLean = 0;
        if (moveMode === "forward") {
          handPhase = phase;
          footPhase = phase - 0.85;
          leadLean = headDir * 2.5;
        } else if (moveMode === "backward") {
          footPhase = phase;
          handPhase = phase - 0.85;
          leadLean = footDir * 2.5;
        }

        const handSwing = isActiveClimbing ? Math.sin(handPhase) * 11 * hangFactor : 0;
        const footSwing = isActiveClimbing ? Math.sin(footPhase) * 11 * hangFactor : 0;
        const handLift = isActiveClimbing ? Math.max(0, Math.cos(handPhase)) * 3.5 * hangFactor : 0;
        const footLift = isActiveClimbing ? Math.max(0, Math.cos(footPhase)) * 3.5 * hangFactor : 0;
        const bodyBob = isActiveClimbing ? Math.cos(phase * 2) * 1.4 * hangFactor : 0;

        ctx.save();
        ctx.translate(0, pivotY);
        ctx.rotate(slopeAngle * hangFactor);

        // 本地座標系：(0, 0) 即為繩索抓取點，+y 為繩索下方
        const shX = headDir * (bh * 0.42) * hangFactor + leadLean;
        const shY = 18 * (1 - hangFactor) + (17 + bodyBob) * hangFactor + bodyDropY;

        // 軀幹以肩膀為支點隨 hangFactor 從直立垂掛 (0 rad) 平滑擺動至平行倒吊 (0.48 * PI rad)
        const swingAng = hangFactor * (Math.PI * 0.48);
        const hipX = shX + footDir * Math.sin(swingAng) * bh;
        const hipY = shY + Math.cos(swingAng) * bh;

        // 雙手位置：從直立抓繩 (0, handBaseY) 平滑過渡到倒吊握繩 (headDir * ..., 0)
        const invHandCenterX = headDir * (bh * 0.54 + 12);
        const handCenterX = invHandCenterX * hangFactor;
        const idleHandSpread = 3 * (1 - hangFactor);

        const backHandX = handCenterX - idleHandSpread - handSwing;
        const backHandY = handBaseY + (moveMode === "forward" ? handLift : 0);
        const frontHandX = handCenterX + idleHandSpread + handSwing;
        const frontHandY = handBaseY + (moveMode === "backward" ? handLift : 0);

        // 雙腳位置：從直立垂在下方平滑弧線勾上繩索 (footDir * ..., 0)
        const vertFootX = hipX + footDir * 3;
        const vertFootY = hipY + 32;
        const invFootCenterX = footDir * (bh * 0.58 + 18);
        const tuckLift = Math.sin(hangFactor * Math.PI) * 7;

        const baseFootX = vertFootX * (1 - hangFactor) + invFootCenterX * hangFactor;
        const baseFootY = vertFootY * (1 - hangFactor) - tuckLift;

        const backFootX = baseFootX - footSwing;
        const backFootY = baseFootY + (moveMode === "backward" ? footLift : 0);
        const frontFootX = baseFootX + footSwing;
        const frontFootY = baseFootY + (moveMode === "forward" ? footLift : 0);

        // 手肘與膝蓋關節位置
        const backElbX = (shX + backHandX) * 0.5 - headDir * (3 * hangFactor) - footDir * (5 * (1 - hangFactor));
        const backElbY = (shY + backHandY) * 0.5 + 3 + bodyDropY * 0.3;
        const frontElbX = (shX + frontHandX) * 0.5 + headDir * (3 * hangFactor) + footDir * (5 * (1 - hangFactor));
        const frontElbY = (shY + frontHandY) * 0.5 + 2 + bodyDropY * 0.3;

        const kneeBendArc = Math.sin(hangFactor * Math.PI) * 10;
        const backKneeX = (hipX + backFootX) * 0.5 + headDir * (3 * hangFactor) + footDir * (4 * (1 - hangFactor) + kneeBendArc);
        const backKneeY = (hipY + backFootY) * 0.5 + 4 * hangFactor;
        const frontKneeX = (hipX + frontFootX) * 0.5 - headDir * (3 * hangFactor) + footDir * (6 * (1 - hangFactor) + kneeBendArc);
        const frontKneeY = (hipY + frontFootY) * 0.5 + 3 * hangFactor;

        // 1. 後側手臂與後側腿
        drawFullLimb(shX, shY, backElbX, backElbY, backHandX, backHandY, lw, true, bodyLimbDir, limbCol, outCol);
        drawFullLimb(hipX, hipY, backKneeX, backKneeY, backFootX, backFootY, lw, false, bodyLimbDir, limbCol, outCol);

        // 2. 隨過場角度旋轉的軀幹
        const torsoAngle = Math.atan2(hipX - shX, hipY - shY);
        drawShapedTorso((shX + hipX) * 0.5, (shY + hipY) * 0.5, bw, bh, -torsoAngle, bodyCol, outCol);

        // 3. 前側手臂與前側腿
        drawFullLimb(hipX, hipY, frontKneeX, frontKneeY, frontFootX, frontFootY, lw, false, bodyLimbDir, limbCol, outCol);
        drawFullLimb(shX, shY, frontElbX, frontElbY, frontHandX, frontHandY, lw, true, bodyLimbDir, limbCol, outCol);

        // 4. 握繩拳頭節點強化
        if (fistGripAlpha > 0.05) {
          ctx.save();
          ctx.globalAlpha = fistGripAlpha;
          ctx.fillStyle = "#080605";
          ctx.beginPath();
          ctx.arc(backHandX, backHandY, lw * 0.52, 0, Math.PI * 2);
          ctx.arc(frontHandX, frontHandY, lw * 0.52, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 頭部位置由直立上方平滑過渡至頭側水平位置；倒退移動轉頭看向腳側時微微低頭讓視線清楚露出
        const lookingTowardFeet = (d === footDir) ? 1 : 0;
        const vertHx = shX + footDir * 4;
        const vertHy = shY - r + 6;
        const invHx = shX + headDir * (r * 0.72 + 4);
        const invHy = shY + 2 + 3 * lookingTowardFeet;
        const hxLocal = vertHx * (1 - hangFactor) + invHx * hangFactor;
        const hyLocal = vertHy * (1 - hangFactor) + invHy * hangFactor;

        ctx.restore();

        const effSlope = slopeAngle * hangFactor;
        const cosA = Math.cos(effSlope);
        const sinA = Math.sin(effSlope);
        const hx = hxLocal * cosA - hyLocal * sinA;
        const hy = pivotY + hxLocal * sinA + hyLocal * cosA;
        return { hx, hy };
      }

      // =============== 標準垂直爬繩子繪圖 ===============
      const phase = player.ropeClimbAnimT || 0;
      const tilt = player.ropeVisualTilt || 0;
      const legLag = player.ropeLegLag || 0;
      const hand1Reach = Math.sin(phase) * 13, hand2Reach = -hand1Reach, foot1Lift = Math.sin(phase) * 12, foot2Lift = -foot1Lift, bodyBob = Math.cos(phase * 2) * 2.0;

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
        drawFullLimb(hipX - 2 * turnFaceD, hipY, hipX - legSpread * 0.6, hipY + (lFootY - hipY) * 0.5, hipX - legSpread * 0.85, lFootY, lw, false, footDir, limbCol, outCol);
        const turnTorsoW = bw * (1.12 - 0.12 * Math.abs(turnFaceD)), torsoAngle = Math.atan2(hipX - shX, hipY - shY);
        drawShapedTorso((hipX + shX) * 0.5, (hipY + shY) * 0.5, turnTorsoW, bh, -torsoAngle - turnFaceD * 0.04, bodyCol, outCol);
        drawFullLimb(hipX + 2 * turnFaceD, hipY, hipX + legSpread * 0.6, hipY + (rFootY - hipY) * 0.5, hipX + legSpread * 0.85, rFootY, lw, false, footDir, limbCol, outCol);
        if (isFacingRight) drawFullLimb(shX - bw * 0.35 * turnFaceD, shY + 6, shX - armSpan * 0.7 - elbowTwist, shY + 16, shX - armSpan * 0.9, shY + 28 - stepLift, lw, true, footDir, limbCol, outCol);
        else drawFullLimb(shX + bw * 0.35 * turnFaceD, shY + 6, shX + armSpan * 0.7 + elbowTwist, shY + 16, shX + armSpan * 0.9, shY + 28 + stepLift, lw, true, footDir, limbCol, outCol);
        hxLocal = shX + turnFaceD * 4; hyLocal = shY - r + 6;
      } else {
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
