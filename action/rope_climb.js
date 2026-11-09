// 檔案路徑：action/rope_climb.js
// ==========================================
// 模組化動作外掛：繩索攀爬與動態爬繩骨架動畫 (極端邊界防護與完美換繩版)
// ==========================================
(function() {
  window.registerAction("rope_climb", {
    update: function(player, dt, pluginCtx) {
      if (player.onRope === undefined) player.onRope = false;
      if (player.ropeClimbAnimT === undefined) player.ropeClimbAnimT = 0;
      if (player.ropeCooldown === undefined) player.ropeCooldown = 0;
      if (player.ropeMoving === undefined) player.ropeMoving = false;
      if (player.ropeVisualTilt === undefined) player.ropeVisualTilt = 0;
      if (player.ropeLegLag === undefined) player.ropeLegLag = 0;

      if (player.ropeLandSquatTimer === undefined) player.ropeLandSquatTimer = 0;
      if (player.ropeLandSquatTimer > 0) {
        player.ropeLandSquatTimer = Math.max(0, player.ropeLandSquatTimer - dt);
      }

      if (player.ropeJustGrabbedTimer === undefined) player.ropeJustGrabbedTimer = 0;
      if (player.ropeJustGrabbedTimer > 0) {
        player.ropeJustGrabbedTimer = Math.max(0, player.ropeJustGrabbedTimer - dt);
      }

      if (player.ropeCooldown > 0) {
        player.ropeCooldown = Math.max(0, player.ropeCooldown - dt);
      }

      // 💡 修正 4：死掉或過關時確實清除自定義控制權[span_0](start_span)[span_0](end_span)
      if (player.dead || player.dying || player.won) {
        player.onRope = false;
        player.overrideVx = null;
        player.overrideVy = null;
        player.customHold = null;
        return;
      }

      const input = pluginCtx.input;
      const wasJustPressed = pluginCtx.wasJustPressed;
      const items = pluginCtx.items || [];
      const ropes = items.filter(it => it.type === "rope_segment" && !it.hidden && it.nodes && it.nodes.length >= 2);

      // 💡 修正 2：檢查整條相連的繩鏈是否至少還有 1 個有效固定端點[span_1](start_span)[span_1](end_span)[span_2](start_span)[span_2](end_span)
      const isRopeSupported = function(rope) {
        if (!rope || rope.hidden || !rope.nodes || rope.nodes.length < 2) return false;
        const visited = new Set();
        const queue = [rope];
        while (queue.length > 0) {
          const cur = queue.shift();
          if (!cur || visited.has(cur.id)) continue;
          visited.add(cur.id);
          if ((cur.pinStart && !cur.startBroken) || (cur.pinEnd && !cur.endBroken)) {
            return true;
          }
          if (cur.attachStartTo && !cur.startBroken) {
            const t = ropes.find(r => r.id === cur.attachStartTo);
            if (t && !visited.has(t.id)) queue.push(t);
          }
          if (cur.attachEndTo && !cur.endBroken) {
            const t = ropes.find(r => r.id === cur.attachEndTo);
            if (t && !visited.has(t.id)) queue.push(t);
          }
          for (const other of ropes) {
            if (visited.has(other.id)) continue;
            if ((!other.startBroken && other.attachStartTo === cur.id) ||
                (!other.endBroken && other.attachEndTo === cur.id)) {
              queue.push(other);
            }
          }
        }
        return false;
      };

      const checkBothEndsAnchored = function(rope) {
        if (!rope) return false;
        if (typeof window.isRopeChainBothEndsAnchored === "function") {
          return window.isRopeChainBothEndsAnchored(rope, items);
        }
        return Boolean(rope.pinStart && !rope.startBroken && rope.pinEnd && !rope.endBroken);
      };

      const checkGroundY = function(x, y) {
        if (!pluginCtx.sampleGroundY) return null;
        return pluginCtx.sampleGroundY(x, y);
      };

      if (!player.onRope) {
        const gY = checkGroundY(player.x, player.y);
        const isStandingOnGround = player.grounded || (gY !== null && player.y >= gY - 6);

        const canGrab = isStandingOnGround ? input.up : (input.up || input.down);

        if (player.ropeCooldown <= 0 && !player.climbing && !player.ledgeClimbing && canGrab) {
          const pCenterX = player.x;
          const pGrabY = isStandingOnGround ? (player.y - 78) : (player.y - 72);

          let bestRope = null;
          let bestProgress = 0;
          let bestDist = 38;

          for (const r of ropes) {
            if (!isRopeSupported(r)) continue;
            const N = r.nodes.length;
            for (let i = 0; i < N - 1; i++) {
              const n0 = r.nodes[i];
              const n1 = r.nodes[i + 1];
              const vx = n1.x - n0.x;
              const vy = n1.y - n0.y;
              const lenSq = vx * vx + vy * vy;
              let t = 0;
              if (lenSq > 0.0001) {
                t = ((pCenterX - n0.x) * vx + (pGrabY - n0.y) * vy) / lenSq;
                t = Math.max(0, Math.min(1, t));
              }
              const px = n0.x + vx * t;
              const py = n0.y + vy * t;

              if (isStandingOnGround && gY !== null && (py + 72 > gY - 2)) {
                continue;
              }

              const d = Math.hypot(px - pCenterX, py - pGrabY);
              if (d < bestDist) {
                bestDist = d;
                bestRope = r;
                bestProgress = (i + t) / (N - 1);
              }
            }
          }

          if (bestRope) {
            player.onRope = true;
            player.currentRopeId = bestRope.id;
            player.ropeProgress = bestProgress;
            player.sliding = false;
            player.running = false;
            player.crawling = false;
            player.ropeMoving = false;
            player.ropeLandSquatTimer = 0;
            player.ropeJustGrabbedTimer = 0.25;
            player.ropeVisualTilt = 0;
            player.ropeLegLag = 0;
          }
        }
        return;
      }

      const curRope = ropes.find(r => r.id === player.currentRopeId);
      if (!curRope || !isRopeSupported(curRope)) {
        player.onRope = false;
        player.overrideVx = null;
        player.overrideVy = null;
        player.customHold = null;
        return;
      }

      player.fallStartY = player.y;

      const N = curRope.nodes.length;
      const fIdx = Math.max(0, Math.min(N - 1.0001, player.ropeProgress * (N - 1)));
      const idx0 = Math.floor(fIdx);
      const idx1 = Math.min(N - 1, idx0 + 1);

      const nodeVx = ((curRope.nodes[idx0].x - curRope.nodes[idx0].oldX) + (curRope.nodes[idx1].x - curRope.nodes[idx1].oldX)) * 0.5 / 0.016;

      if (wasJustPressed("jump")) {
        player.onRope = false;
        player.ropeCooldown = 0.28;
        player.overrideVx = null;
        player.overrideVy = null;
        player.customHold = null;
        player.vy = -420;
        const jumpDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        if (jumpDir !== 0) {
          player.dir = jumpDir;
          player.vx = jumpDir * 220 + nodeVx * 0.5;
        } else {
          player.vx = nodeVx * 0.65;
        }
        return;
      }

      if (wasJustPressed("crawl")) {
        player.onRope = false;
        player.ropeCooldown = 0.25;
        player.overrideVx = null;
        player.overrideVy = null;
        player.customHold = null;
        player.vx = nodeVx * 0.5;
        player.vy = 0;
        return;
      }

      const tx = curRope.nodes[idx1].x - curRope.nodes[idx0].x;
      const ty = curRope.nodes[idx1].y - curRope.nodes[idx0].y;
      const tLen = Math.hypot(tx, ty) || 1;
      const ux = tx / tLen;
      const uy = ty / tLen;

      let ix = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let iy = (input.down ? 1 : 0) - (input.up ? 1 : 0);

      if (ix !== 0) player.dir = ix;

      const bothEndsAnchored = checkBothEndsAnchored(curRope);

      let moveDir = 0;
      if (iy !== 0) {
        if (Math.abs(uy) > 0.15) {
          moveDir = (uy > 0) ? iy : -iy;
        } else {
          const globalDy = curRope.nodes[N - 1].y - curRope.nodes[0].y;
          if (Math.abs(globalDy) > 2) {
            moveDir = (globalDy > 0) ? iy : -iy;
          } else {
            moveDir = -iy;
          }
        }
      } else if (ix !== 0 && bothEndsAnchored) {
        if (Math.abs(ux) > 0.15) {
          moveDir = (ux > 0) ? ix : -ix;
        } else {
          const globalDx = curRope.nodes[N - 1].x - curRope.nodes[0].x;
          moveDir = (globalDx >= 0) ? ix : -ix;
        }
      }

      const prevPlayerY = player.y;
      const climbSpeed = 150;
      const totalLen = Math.max(20, curRope.ropeLength || 100);

      if (moveDir !== 0) {
        player.ropeMoving = true;
        player.ropeProgress += (moveDir * climbSpeed * dt) / totalLen;
        player.ropeClimbAnimT += dt * 9.5 * moveDir;
      } else {
        player.ropeMoving = false;
      }

      // 💡 修正 3：加入 isRopeSupported(r) 防止跨節換到已經斷裂的繩段
      if (player.ropeProgress < 0) {
        let switched = false;
        if (curRope.attachStartTo && !curRope.startBroken) {
          const nextR = ropes.find(r => r.id === curRope.attachStartTo && isRopeSupported(r));
          if (nextR) {
            player.currentRopeId = nextR.id;
            player.ropeProgress = curRope.attachStartPoint === "start" ? 0.02 : 0.98;
            switched = true;
          }
        }
        if (!switched) {
          const childR = ropes.find(r =>
            isRopeSupported(r) &&
            ((!r.startBroken && r.attachStartTo === curRope.id && r.attachStartPoint === "start") ||
            (!r.endBroken && r.attachEndTo === curRope.id && r.attachEndPoint === "start"))
          );
          if (childR) {
            const atStart = (childR.attachStartTo === curRope.id && childR.attachStartPoint === "start");
            player.currentRopeId = childR.id;
            player.ropeProgress = atStart ? 0.02 : 0.98;
            switched = true;
          }
        }
        if (!switched) player.ropeProgress = 0;
      } else if (player.ropeProgress > 1) {
        let switched = false;
        if (curRope.attachEndTo && !curRope.endBroken) {
          const nextR = ropes.find(r => r.id === curRope.attachEndTo && isRopeSupported(r));
          if (nextR) {
            player.currentRopeId = nextR.id;
            player.ropeProgress = curRope.attachEndPoint === "start" ? 0.02 : 0.98;
            switched = true;
          }
        }
        if (!switched) {
          const childR = ropes.find(r =>
            isRopeSupported(r) &&
            ((!r.startBroken && r.attachStartTo === curRope.id && r.attachStartPoint === "end") ||
            (!r.endBroken && r.attachEndTo === curRope.id && r.attachEndPoint === "end"))
          );
          if (childR) {
            const atStart = (childR.attachStartTo === curRope.id && childR.attachStartPoint === "end");
            player.currentRopeId = childR.id;
            player.ropeProgress = atStart ? 0.02 : 0.98;
            switched = true;
          }
        }
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

      // 💡 修正 1：陣列越界存取防護，確保 sIdx1 不會超出 aN - 1
      const sIdx0 = Math.max(0, a0 - 2);
      const sIdx1 = Math.min(aN - 1, Math.max(sIdx0 + 1, a1));
      let segDx = activeRope.nodes[sIdx1].x - activeRope.nodes[sIdx0].x;
      let segDy = activeRope.nodes[sIdx1].y - activeRope.nodes[sIdx0].y;
      if (segDy < 0) {
        segDx = -segDx;
        segDy = -segDy;
      }

      let targetTilt = 0;
      const activeBothAnchored = checkBothEndsAnchored(activeRope);
      if (!activeBothAnchored) {
        const ropeSlopeAngle = -Math.atan2(segDx, Math.max(12, segDy));
        const swingInputTilt = (iy === 0 && ix !== 0) ? (-ix * 0.14) : 0;
        const velTilt = Math.max(-0.22, Math.min(0.22, -nodeVx * 0.0009));
        targetTilt = Math.max(-0.75, Math.min(0.75, ropeSlopeAngle * 0.92 + swingInputTilt + velTilt));
      } else {
        const isSteep = segDy > Math.abs(segDx) * 0.7;
        if (isSteep) {
          targetTilt = Math.max(-0.45, Math.min(0.45, -Math.atan2(segDx, Math.max(18, segDy)) * 0.65));
        } else {
          targetTilt = -ix * 0.08;
        }
      }

      player.ropeVisualTilt += (targetTilt - player.ropeVisualTilt) * Math.min(1, dt * 14);
      const targetLegLag = !activeBothAnchored
        ? Math.max(-16, Math.min(16, -nodeVx * 0.045 + ix * 5.5))
        : 0;
      player.ropeLegLag += (targetLegLag - player.ropeLegLag) * Math.min(1, dt * 12);

      player.ropeAngle = Math.atan2(
        activeRope.nodes[a1].y - activeRope.nodes[a0].y,
        activeRope.nodes[a1].x - activeRope.nodes[a0].x
      );

      player.x = rx;
      player.y = ry + 72;
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      player.lockDefaultMove = true;
      player.overrideVx = 0;
      player.overrideVy = 0;

      if (input.up) {
        const isAtStartEnd = (player.ropeProgress <= 0.12);
        const isAtFinishEnd = (player.ropeProgress >= 0.88);
        const startIsTop = activeRope.nodes[0].y <= activeRope.nodes[aN - 1].y + 15;
        const finishIsTop = activeRope.nodes[aN - 1].y <= activeRope.nodes[0].y + 15;
        const nearTopOfRope = (isAtStartEnd && startIsTop) || (isAtFinishEnd && finishIsTop) || (player.y < prevPlayerY - 0.05);

        if (nearTopOfRope) {
          const STAND_H = 132, CRAWL_H = 64;
          const reachTopY = player.y - STAND_H - 28;
          const reachBotY = player.y - 16;
          const groundPolys = pluginCtx.groundPolylines || [];
          const solidWalls = pluginCtx.solidWalls || [];
          const frictionZones = pluginCtx.frictionZones || [];
          const mechs = pluginCtx.mechanisms || [];
          const worldW = pluginCtx.WORLD_W || 2048;
          const samplePolyY = pluginCtx.samplePolylineY;

          const hasWallBlockingCrawlSpace = (wx, wy) => {
            for (const w of solidWalls) {
              const wallX = w.x !== undefined ? w.x : ((w.x1 + w.x2) * 0.5);
              if (Math.abs(wx - wallX) <= 18 && w.yTop < wy - 6 && w.yBottom > wy - CRAWL_H) return true;
            }
            return false;
          };

          const shouldCrawlAfterClimb = (checkX, gY) => {
            for (const z of frictionZones) {
              if (z.requireCrawl && z.blockBot !== undefined && checkX >= z.x1 && checkX <= z.x2 && gY >= z.yMin && gY <= z.yMax) {
                if (gY - STAND_H < z.blockBot) return true;
              }
            }
            return false;
          };

          const isCeilingBlockedForCrawl = (checkX, gY) => {
            for (const z of frictionZones) {
              if (z.requireCrawl && z.blockBot !== undefined && checkX >= z.x1 && checkX <= z.x2 && gY >= z.yMin && gY <= z.yMax) {
                if (gY - CRAWL_H < z.blockBot) return true;
              }
            }
            return false;
          };

          const hasFloorAtSide = (edgeX, edgeY, sideDir) => {
            if (!samplePolyY) return false;
            const testX = edgeX + sideDir * 5;
            for (const poly of groundPolys) {
              const gy = samplePolyY(poly.pts, testX);
              if (gy !== null && gy <= edgeY + 12 && gy >= edgeY - 25) return true;
            }
            return false;
          };

          let bestLedge = null;
          let bestLedgeDist = 48;

          for (const poly of groundPolys) {
            if (!poly.pts || poly.pts.length === 0) continue;
            for (let i = 0; i < poly.pts.length; i++) {
              const ptX = poly.pts[i][0];
              const ptY = poly.pts[i][1];
              if (ptY < reachTopY || ptY > reachBotY) continue;
              const distX = Math.abs(player.x - ptX);
              if (distX > bestLedgeDist) continue;

              const isLeftEdge = (i < poly.pts.length - 1) && (poly.pts[i + 1][0] > ptX) && !hasFloorAtSide(ptX, ptY, -1);
              if (isLeftEdge && player.x <= ptX + 22 && (!input.left || input.right || player.dir === 1 || distX <= 38)) {
                const standX = Math.max(35, Math.min(worldW - 35, ptX + 16));
                const standY = samplePolyY ? (samplePolyY(poly.pts, standX) ?? ptY) : ptY;
                if (!hasWallBlockingCrawlSpace(ptX, ptY) && !hasWallBlockingCrawlSpace(standX, standY) && !isCeilingBlockedForCrawl(standX, standY)) {
                  bestLedgeDist = distX;
                  bestLedge = { grabX: ptX, targetX: standX, targetY: standY, dir: 1, forceCrawl: shouldCrawlAfterClimb(standX, standY) };
                }
              }

              const isRightEdge = (i > 0) && (poly.pts[i - 1][0] < ptX) && !hasFloorAtSide(ptX, ptY, 1);
              if (isRightEdge && player.x >= ptX - 22 && (!input.right || input.left || player.dir === -1 || distX <= 38)) {
                const standX = Math.max(35, Math.min(worldW - 35, ptX - 16));
                const standY = samplePolyY ? (samplePolyY(poly.pts, standX) ?? ptY) : ptY;
                if (!hasWallBlockingCrawlSpace(ptX, ptY) && !hasWallBlockingCrawlSpace(standX, standY) && !isCeilingBlockedForCrawl(standX, standY)) {
                  bestLedgeDist = distX;
                  bestLedge = { grabX: ptX, targetX: standX, targetY: standY, dir: -1, forceCrawl: shouldCrawlAfterClimb(standX, standY) };
                }
              }
            }
          }

          for (const m of mechs) {
            if (m.hidden) continue;
            const def = window.GAME_MECHANISMS_REGISTRY && window.GAME_MECHANISMS_REGISTRY[m.type];
            const isSolid = m.solid ?? (def && def.solid) ?? (m.type && m.type.includes("platform"));
            if (!isSolid) continue;
            const mLeft = m.x, mRight = m.x + m.width, gY = m.y;
            if (gY < reachTopY || gY > reachBotY) continue;

            const distLeft = Math.abs(player.x - mLeft);
            if (distLeft <= bestLedgeDist && player.x <= mLeft + 22 && !hasWallBlockingCrawlSpace(mLeft, gY)) {
              bestLedgeDist = distLeft;
              bestLedge = { grabX: mLeft, targetX: mLeft + 16, targetY: gY, dir: 1, forceCrawl: shouldCrawlAfterClimb(mLeft + 16, gY) };
            }

            const distRight = Math.abs(player.x - mRight);
            if (distRight <= bestLedgeDist && player.x >= mRight - 22 && !hasWallBlockingCrawlSpace(mRight, gY)) {
              bestLedgeDist = distRight;
              bestLedge = { grabX: mRight, targetX: mRight - 16, targetY: gY, dir: -1, forceCrawl: shouldCrawlAfterClimb(mRight - 16, gY) };
            }
          }

          if (bestLedge) {
            player.onRope = false;
            player.ropeCooldown = 0.35;
            player.overrideVx = null;
            player.overrideVy = null;
            player.customHold = null;
            player.lockDefaultMove = false;

            player.dir = bestLedge.dir;
            player.raisingHands = true;
            player.ledgeClimbing = true;
            player.ledgeProgress = 0;
            player.ledgeStartX = player.x;
            player.ledgeStartY = player.y;
            player.ledgeGrabX = bestLedge.grabX;
            player.ledgeTargetX = bestLedge.targetX;
            player.ledgeTargetY = bestLedge.targetY;
            player.ledgeForceCrawl = !!bestLedge.forceCrawl;
            player.vx = 0;
            player.vy = 0;
            player.fallStartY = null;
            return;
          }
        }
      }

      const isGoingDown = input.down || (player.y > prevPlayerY + 0.1) || (!input.up && player.ropeJustGrabbedTimer <= 0);
      if (isGoingDown && player.ropeJustGrabbedTimer <= 0) {
        const groundY = checkGroundY(player.x, player.y);
        if (groundY !== null && player.y >= groundY - 4) {
          player.onRope = false;
          player.grounded = true;
          player.y = groundY;
          player.vy = 0;
          player.ropeCooldown = 0.25;
          player.overrideVx = null;
          player.overrideVy = null;
          player.customHold = null;
          player.lockDefaultMove = false;

          player.ropeLandSquatTimer = 0.7;
          player.ropeLandSquatDuration = 0.7;
          return;
        }
      }

      player.customHold = { x: 16, y: 68 };
    },

    onReset: function(player) {
      player.onRope = false;
      player.currentRopeId = null;
      player.ropeProgress = 0;
      player.ropeMoving = false;
      player.ropeLandSquatTimer = 0;
      player.ropeJustGrabbedTimer = 0;
      player.ropeVisualTilt = 0;
      player.ropeLegLag = 0;
    },

    drawBody: function(ctx, player, c) {
      const landTimer = player.ropeLandSquatTimer || 0;
      if (!player.onRope && landTimer > 0) {
        const p = 1.0 - (landTimer / (player.ropeLandSquatDuration || 0.7));
        const squatCurve = Math.sin(p * Math.PI);
        const squatAmount = squatCurve * 14; 
        const kneeBend = squatCurve * 10;

        const r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW, d = player.dir;
        const hipY = -32 + squatAmount;
        const shY = -(32 + bh) + squatAmount;

        ctx.lineCap = ctx.lineJoin = "round";

        ctx.strokeStyle = player.dying ? "#111" : "#080605";
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(-3, hipY);
        ctx.lineTo(-9 - kneeBend * 0.6, hipY + 16 - squatAmount * 0.4);
        ctx.lineTo(-11, -2);
        ctx.moveTo(3, hipY);
        ctx.lineTo(9 + kneeBend * 0.6, hipY + 16 - squatAmount * 0.4);
        ctx.lineTo(11, -2);
        ctx.stroke();

        ctx.save();
        ctx.translate(0, shY + bh / 2);
        ctx.rotate(d * (0.12 + squatCurve * 0.08));
        ctx.fillStyle = player.dying ? "#1a1a1a" : c.bodyColor;
        ctx.strokeStyle = player.dying ? "#111" : "#080605";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const armSpread = squatCurve * 8;
        ctx.strokeStyle = player.dying ? "#111" : "#080605";
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(-2, shY + 6);
        ctx.lineTo(-14 - armSpread * 0.6, shY + 20);
        ctx.lineTo(-18 - armSpread, shY + 34);
        ctx.moveTo(2, shY + 6);
        ctx.lineTo(14 + armSpread * 0.6, shY + 20);
        ctx.lineTo(18 + armSpread, shY + 34);
        ctx.stroke();

        const hx = d * (4 + squatCurve * 2);
        const hy = shY - r - 4;
        return { hx, hy };
      }

      if (!player.onRope) return null;

      const r = c.headR, bw = c.bodyW, bh = c.bodyH, lw = c.limbW, d = player.dir;
      const phase = player.ropeClimbAnimT || 0;
      const tilt = player.ropeVisualTilt || 0;
      const legLag = player.ropeLegLag || 0;

      ctx.lineCap = ctx.lineJoin = "round";

      const pivotY = -72;
      const hand1Reach = Math.sin(phase) * 13;
      const hand2Reach = -hand1Reach;
      const foot1Lift = Math.sin(phase) * 12;
      const foot2Lift = -foot1Lift;

      const bodyBob = Math.cos(phase * 2) * 2.0;
      const shX = -d * 5;
      const shY = 6 + bodyBob; 
      const hipX = -d * 7 + legLag * 0.22;
      const hipY = shY + bh;

      const backHandX = 0;
      const backHandY = hand2Reach;
      const backElbX = (shX + backHandX) * 0.5 - d * 9;
      const backElbY = (shY + backHandY) * 0.5 + 5;

      const backFootX = d * 2 + legLag;
      const backFootY = 54 + foot2Lift - Math.abs(legLag) * 0.25;
      const backKneeX = (hipX + backFootX) * 0.5 + d * 11 + legLag * 0.35;
      const backKneeY = (hipY + backFootY) * 0.5 - 3;

      const frontHandX = 0;
      const frontHandY = hand1Reach;
      const frontElbX = (shX + frontHandX) * 0.5 + d * 6;
      const frontElbY = (shY + frontHandY) * 0.5 + 7;

      const frontFootX = -d * 2 + legLag * 1.08;
      const frontFootY = 54 + foot1Lift - Math.abs(legLag) * 0.25;
      const frontKneeX = (hipX + frontFootX) * 0.5 + d * 14 + legLag * 0.35;
      const frontKneeY = (hipY + frontFootY) * 0.5 - 5;

      ctx.save();
      ctx.translate(0, pivotY);
      ctx.rotate(tilt);

      ctx.strokeStyle = player.dying ? "#111" : "#080605";
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(shX, shY + 5); ctx.lineTo(backElbX, backElbY); ctx.lineTo(backHandX, backHandY);
      ctx.moveTo(hipX, hipY);   ctx.lineTo(backKneeX, backKneeY); ctx.lineTo(backFootX, backFootY);
      ctx.stroke();

      const torsoAngle = Math.atan2(hipX - shX, hipY - shY);
      ctx.save();
      ctx.translate((shX + hipX) * 0.5, (shY + hipY) * 0.5);
      ctx.rotate(-torsoAngle - d * 0.04);
      ctx.fillStyle = player.dying ? "#1a1a1a" : c.bodyColor;
      ctx.strokeStyle = player.dying ? "#111" : "#080605";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = player.dying ? "#111" : "#080605";
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);   ctx.lineTo(frontKneeX, frontKneeY); ctx.lineTo(frontFootX, frontFootY);
      ctx.moveTo(shX, shY + 5); ctx.lineTo(frontElbX, frontElbY);   ctx.lineTo(frontHandX, frontHandY);
      ctx.stroke();

      ctx.fillStyle = "#080605";
      ctx.beginPath();
      ctx.arc(backHandX, backHandY, lw * 0.55, 0, Math.PI * 2);
      ctx.arc(frontHandX, frontHandY, lw * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const localHx = shX + d * 4;
      const localHy = shY - r - 4;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const hx = localHx * cosT - localHy * sinT;
      const hy = pivotY + localHx * sinT + localHy * cosT;

      return { hx, hy };
    }
  });
})();
