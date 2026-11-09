// 檔案路徑：items/rope_segment.js
// ==========================================
// 模組化外掛道具：單節物理繩索 (純 30px 範圍判定 + 排除繩索自身誤判火源版)
// ==========================================
(function() {
  function isChainBothAnchored(item, allItems) {
    if (!item || item.hidden) return false;
    const ropes = Array.isArray(allItems) ? allItems.filter(it => it.type === "rope_segment" && !it.hidden) : [item];
    const visited = new Set();
    const queue = [item];
    let anchoredCount = 0;

    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur || visited.has(cur.id)) continue;
      visited.add(cur.id);

      if (cur.pinStart && !cur.startBroken) anchoredCount++;
      if (cur.pinEnd && !cur.endBroken) anchoredCount++;

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
    return anchoredCount >= 2;
  }

  function isPlayerOnSameChain(item, player, allItems) {
    if (!player || !player.onRope || !player.currentRopeId) return false;
    if (player.currentRopeId === item.id) return true;
    const ropes = Array.isArray(allItems) ? allItems.filter(it => it.type === "rope_segment" && !it.hidden) : [];
    const visited = new Set();
    const queue = [item];

    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur || visited.has(cur.id)) continue;
      if (cur.id === player.currentRopeId) return true;
      visited.add(cur.id);

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
  }

  function getChainTopAnchor(item, player, allItems) {
    const ropes = Array.isArray(allItems) ? allItems.filter(it => it.type === "rope_segment" && !it.hidden) : [item];
    const visited = new Set();
    const queue = [item];
    let topAnchor = { x: item.x1, y: item.y1 };
    let foundAnchor = false;

    while (queue.length > 0) {
      const cur = queue.shift();
      if (!cur || visited.has(cur.id)) continue;
      visited.add(cur.id);

      if (!foundAnchor) {
        if (cur.pinStart && !cur.startBroken) {
          topAnchor = { x: cur.x1, y: cur.y1 };
          foundAnchor = true;
        } else if (cur.pinEnd && !cur.endBroken) {
          topAnchor = { x: cur.x2, y: cur.y2 };
          foundAnchor = true;
        }
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
    return topAnchor;
  }

  window.isRopeChainBothEndsAnchored = isChainBothAnchored;

  window.registerItemType("rope_segment", {
    promptText: "",
    interactionRange: 0,

    init: function(item) {
      item.alwaysDraw = true;
      item.collected = true;
      item.isBurning = false; // 確保繩索本身絕不會被當成燃燒道具火源

      item._explicitPinStart = item.pinStart;
      item._explicitPinEnd = item.pinEnd;
      item._autoLinkChecked = false;

      item.x1 = item.x1 ?? item.x ?? 100;
      item.y1 = item.y1 ?? item.y ?? 100;
      item.x2 = item.x2 ?? (item.x1 + (item.width || 120));
      item.y2 = item.y2 ?? item.y1;

      item.width = Math.max(20, Math.abs(item.x2 - item.x1));
      item.height = Math.max(20, Math.abs(item.y2 - item.y1));

      item.attachStartTo = item.attachStartTo || null;
      item.attachStartPoint = item.attachStartPoint || "end";
      item.attachEndTo = item.attachEndTo || null;
      item.attachEndPoint = item.attachEndPoint || "start";

      item.pinStart = item.pinStart ?? (item.attachStartTo ? false : true);
      item.pinEnd = item.pinEnd ?? (item.attachEndTo ? false : true);

      const dist = Math.hypot(item.x2 - item.x1, item.y2 - item.y1);
      const isMostlyVertical = Math.abs(item.x2 - item.x1) < Math.abs(item.y2 - item.y1) * 0.35;
      const defaultSlack = isMostlyVertical ? 1.0 : 1.02;
      item.ropeLength = item.ropeLength ?? Math.max(28, dist * (item.slack ?? defaultSlack));
      item.nodeCount = item.nodeCount ?? Math.max(6, Math.min(20, Math.round(item.ropeLength / 14)));
      item.segLen = item.ropeLength / (item.nodeCount - 1);

      item.nodes = [];
      const dirX = (item.x2 - item.x1) / (dist || 1);
      const dirY = (item.y2 - item.y1) / (dist || 1);
      for (let i = 0; i < item.nodeCount; i++) {
        const t = i / (item.nodeCount - 1);
        let nx, ny;
        if (item.pinStart && item.pinEnd && !item.attachStartTo && !item.attachEndTo) {
          nx = item.x1 + (item.x2 - item.x1) * t;
          const sag = isMostlyVertical ? 0 : Math.sin(t * Math.PI) * (item.ropeLength * 0.03);
          ny = item.y1 + (item.y2 - item.y1) * t + sag;
        } else {
          nx = item.x1 + dirX * (i * item.segLen);
          ny = item.y1 + dirY * (i * item.segLen);
        }
        item.nodes.push({ x: nx, y: ny, oldX: nx, oldY: ny });
      }

      item.startBroken = false;
      item.endBroken = false;
      item.startBurnTimer = 0;
      item.endBurnTimer = 0;
      item.fireParticles = [];
      item.bothEndsAnchored = false;
    },

    breakEndpoint: function(item, whichEnd, cause, ctxObj) {
      if (whichEnd === "start" && !item.startBroken) {
        item.startBroken = true;
        item.pinStart = false;
        item.attachStartTo = null;
        const n = item.nodes[0];
        if (cause === "fire") {
          item.startBurnTimer = 1.0;
          this._spawnBurnBurst(item, n.x, n.y);
        } else if (ctxObj && ctxObj.addSparks) {
          ctxObj.addSparks(n.x, n.y, false);
        }
      } else if (whichEnd === "end" && !item.endBroken) {
        item.endBroken = true;
        item.pinEnd = false;
        item.attachEndTo = null;
        const n = item.nodes[item.nodes.length - 1];
        if (cause === "fire") {
          item.endBurnTimer = 1.0;
          this._spawnBurnBurst(item, n.x, n.y);
        } else if (ctxObj && ctxObj.addSparks) {
          ctxObj.addSparks(n.x, n.y, false);
        }
      }
    },

    _spawnBurnBurst: function(item, x, y) {
      for (let i = 0; i < 14; i++) {
        item.fireParticles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 65,
          vy: -35 - Math.random() * 75,
          life: 0.35 + Math.random() * 0.45,
          maxLife: 0.8,
          r: 3.5 + Math.random() * 4.5
        });
      }
    },

    // 💡 嚴格 30 像素物理半徑偵測，並強制排除 rope_segment 本身被誤當成火源
    _checkFireNearPoint: function(px, py, player, ctxObj) {
      const maxDist = 30;

      // 1. 檢查玩家著火 (火源中心在身體中央)
      if (player && player.onFire && !player.dead) {
        const pH = player.customHitbox?.height ?? (player.crawling ? 64 : 132);
        const pCenterY = player.y - pH * 0.5;
        if (Math.hypot(player.x - px, pCenterY - py) <= maxDist) {
          return true;
        }
      }

      // 2. 檢查噴火台與木頭堆
      if (ctxObj && Array.isArray(ctxObj.mechanisms)) {
        for (const m of ctxObj.mechanisms) {
          if (m.hidden) continue;
          if (m.type === "fire_trap" && m.active && !m.isExtinguishing) {
            const fTop = m.y - (m.flameHeight || 72);
            if (px >= m.x - 10 && px <= m.x + (m.width || 48) + 10 && py >= fTop && py <= m.y) {
              return true;
            }
          } else if (m.type === "wood_pile" && m.isBurning) {
            const wx = m.x + (m.width || 85) * 0.5;
            const wy = m.y + (m.height || 50) * 0.5;
            if (Math.hypot(wx - px, wy - py) <= maxDist + 15) {
              return true;
            }
          }
        }
      }

      // 3. 檢查其他著火道具 (如油球)，嚴格排除 rope_segment 避免繩子燒自己！
      if (ctxObj && Array.isArray(ctxObj.items)) {
        for (const other of ctxObj.items) {
          if (other.hidden || !other.isBurning || other.type === "rope_segment") continue;
          const ox = other.x + (other.width || 30) * 0.5;
          const oy = other.y + (other.height || 30) * 0.5;
          if (Math.hypot(ox - px, oy - py) <= maxDist) {
            return true;
          }
        }
      }

      return false;
    },

    update: function(item, player, dt, ctxObj) {
      if (item.hidden || !item.nodes || item.nodes.length === 0) return;
      item.isBurning = false; // 雙重保險：防止外部道具誤將繩索設為 isBurning = true
      const safeDt = 0.016;

      if (!item._autoLinkChecked && ctxObj && Array.isArray(ctxObj.items)) {
        item._autoLinkChecked = true;
        const allRopes = ctxObj.items.filter(it => it.type === "rope_segment" && it.id !== item.id);
        const hasChildAtEnd = allRopes.some(r =>
          (r.attachStartTo === item.id && (r.attachStartPoint || "end") === "end") ||
          (r.attachEndTo === item.id && (r.attachEndPoint || "start") === "end")
        );
        const hasChildAtStart = allRopes.some(r =>
          (r.attachStartTo === item.id && r.attachStartPoint === "start") ||
          (r.attachEndTo === item.id && r.attachEndPoint === "start")
        );
        if (hasChildAtEnd && item._explicitPinEnd === undefined) {
          item.pinEnd = false;
        }
        if (hasChildAtStart && item._explicitPinStart === undefined) {
          item.pinStart = false;
        }
      }

      const firstNode = item.nodes[0];
      const lastNode = item.nodes[item.nodes.length - 1];

      if (item.forceBreakStart) {
        item.forceBreakStart = false;
        this.breakEndpoint(item, "start", "force", ctxObj);
      }
      if (item.forceBreakEnd) {
        item.forceBreakEnd = false;
        this.breakEndpoint(item, "end", "force", ctxObj);
      }

      // 純 30px 範圍判定：燒哪裡就斷哪裡
      if (!item.startBroken && (item.pinStart || item.attachStartTo)) {
        if (this._checkFireNearPoint(firstNode.x, firstNode.y, player, ctxObj)) {
          this.breakEndpoint(item, "start", "fire", ctxObj);
        }
      }
      if (!item.endBroken && (item.pinEnd || item.attachEndTo)) {
        if (this._checkFireNearPoint(lastNode.x, lastNode.y, player, ctxObj)) {
          this.breakEndpoint(item, "end", "fire", ctxObj);
        }
      }

      if (ctxObj && Array.isArray(ctxObj.items)) {
        if (item.attachStartTo) {
          const target = ctxObj.items.find(it => it.id === item.attachStartTo && it.type === "rope_segment");
          if (!target || target.hidden) item.attachStartTo = null;
        }
        if (item.attachEndTo) {
          const target = ctxObj.items.find(it => it.id === item.attachEndTo && it.type === "rope_segment");
          if (!target || target.hidden) item.attachEndTo = null;
        }
      }

      item.bothEndsAnchored = isChainBothAnchored(item, ctxObj ? ctxObj.items : null);

      if (item.startBurnTimer > 0) {
        item.startBurnTimer = Math.max(0, item.startBurnTimer - dt);
        if (item.startBurnTimer > 0.25 && Math.random() < 0.75) {
          item.fireParticles.push({
            x: firstNode.x + (Math.random() - 0.5) * 8,
            y: firstNode.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 40,
            vy: -30 - Math.random() * 50,
            life: 0.2 + Math.random() * 0.2,
            maxLife: 0.4,
            r: 2.5 + Math.random() * 3.5 * (item.startBurnTimer)
          });
        }
      }

      if (item.endBurnTimer > 0) {
        item.endBurnTimer = Math.max(0, item.endBurnTimer - dt);
        if (item.endBurnTimer > 0.25 && Math.random() < 0.75) {
          item.fireParticles.push({
            x: lastNode.x + (Math.random() - 0.5) * 8,
            y: lastNode.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 40,
            vy: -30 - Math.random() * 50,
            life: 0.2 + Math.random() * 0.2,
            maxLife: 0.4,
            r: 2.5 + Math.random() * 3.5 * (item.endBurnTimer)
          });
        }
      }

      for (let i = item.fireParticles.length - 1; i >= 0; i--) {
        const fp = item.fireParticles[i];
        fp.x += fp.vx * dt;
        fp.y += fp.vy * dt;
        fp.life -= dt;
        if (fp.life <= 0) item.fireParticles.splice(i, 1);
      }

      const onSingleAnchoredChain = !item.bothEndsAnchored && isPlayerOnSameChain(item, player, ctxObj ? ctxObj.items : null);
      const isPlayerDirectlyOnThisSegment = Boolean(player && player.onRope && player.currentRopeId === item.id);
      const N = item.nodes.length;
      const gripIdx = isPlayerDirectlyOnThisSegment
        ? Math.max(1, Math.min(N - 1, Math.round((player.ropeProgress || 0) * (N - 1))))
        : -1;

      const swingDir = (onSingleAnchoredChain && ctxObj && ctxObj.input)
        ? ((ctxObj.input.right ? 1 : 0) - (ctxObj.input.left ? 1 : 0))
        : 0;

      const topAnchor = onSingleAnchoredChain
        ? getChainTopAnchor(item, player, ctxObj ? ctxObj.items : null)
        : { x: item.x1, y: item.y1 };

      const gravity = onSingleAnchoredChain ? 780 : 500;
      const maxStepVel = 18;

      for (let i = 0; i < N; i++) {
        if ((i === 0 && item.pinStart && !item.startBroken) ||
            (i === N - 1 && item.pinEnd && !item.endBroken)) {
          continue;
        }
        const n = item.nodes[i];

        let isBelowGrip = false;
        if (onSingleAnchoredChain) {
          if (isPlayerDirectlyOnThisSegment) {
            isBelowGrip = (i > gripIdx);
          }
        }

        let nodeDamping = 0.93;
        if (onSingleAnchoredChain) {
          nodeDamping = isBelowGrip ? 0.965 : 0.996;
        }

        let vx = (n.x - n.oldX) * nodeDamping;
        let vy = (n.y - n.oldY) * nodeDamping;

        if (!onSingleAnchoredChain) {
          if (Math.abs(vx) < 0.012) vx = 0;
          if (Math.abs(vy) < 0.012) vy = 0;
        }

        if (onSingleAnchoredChain && isPlayerDirectlyOnThisSegment && i === gripIdx && swingDir !== 0) {
          const rx = n.x - topAnchor.x;
          const ry = Math.max(16, n.y - topAnchor.y);
          const rLen = Math.hypot(rx, ry) || 1;
          const tanX = (ry / rLen) * swingDir;
          const tanY = (-rx / rLen) * swingDir;

          const curTanVel = vx * tanX + vy * tanY;
          const pumpStrength = (curTanVel >= -0.15) ? 0.48 : 0.08;

          vx += tanX * pumpStrength;
          vy += tanY * pumpStrength;
        }

        vx = Math.max(-maxStepVel, Math.min(maxStepVel, vx));
        vy = Math.max(-maxStepVel, Math.min(maxStepVel, vy));

        n.oldX = n.x;
        n.oldY = n.y;
        n.x += vx;
        n.y += vy + gravity * safeDt * safeDt;
      }

      const iterations = 40;

      for (let iter = 0; iter < iterations; iter++) {
        if (item.attachStartTo && !item.startBroken && ctxObj && Array.isArray(ctxObj.items)) {
          const target = ctxObj.items.find(it => it.id === item.attachStartTo && it.type === "rope_segment");
          if (target && target.nodes && target.nodes.length > 0) {
            const tIdx = item.attachStartPoint === "start" ? 0 : target.nodes.length - 1;
            const tNode = target.nodes[tIdx];
            const isTargetPinned = (tIdx === 0 && target.pinStart && !target.startBroken) ||
                                   (tIdx === target.nodes.length - 1 && target.pinEnd && !target.endBroken);
            if (isTargetPinned) {
              firstNode.x = tNode.x;
              firstNode.y = tNode.y;
              firstNode.oldX = tNode.x;
              firstNode.oldY = tNode.y;
            } else {
              const mx = (firstNode.x + tNode.x) * 0.5;
              const my = (firstNode.y + tNode.y) * 0.5;
              firstNode.x = tNode.x = mx;
              firstNode.y = tNode.y = my;
            }
          }
        }

        if (item.attachEndTo && !item.endBroken && ctxObj && Array.isArray(ctxObj.items)) {
          const target = ctxObj.items.find(it => it.id === item.attachEndTo && it.type === "rope_segment");
          if (target && target.nodes && target.nodes.length > 0) {
            const tIdx = item.attachEndPoint === "start" ? 0 : target.nodes.length - 1;
            const tNode = target.nodes[tIdx];
            const isTargetPinned = (tIdx === 0 && target.pinStart && !target.startBroken) ||
                                   (tIdx === target.nodes.length - 1 && target.pinEnd && !target.endBroken);
            if (isTargetPinned) {
              lastNode.x = tNode.x;
              lastNode.y = tNode.y;
              lastNode.oldX = tNode.x;
              lastNode.oldY = tNode.y;
            } else {
              const mx = (lastNode.x + tNode.x) * 0.5;
              const my = (lastNode.y + tNode.y) * 0.5;
              lastNode.x = tNode.x = mx;
              lastNode.y = tNode.y = my;
            }
          }
        }

        for (let i = 0; i < N - 1; i++) {
          const n1 = item.nodes[i];
          const n2 = item.nodes[i + 1];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const d = Math.hypot(dx, dy) || 0.0001;
          const diff = (d - item.segLen) / d;

          const p1Pinned = (i === 0 && item.pinStart && !item.startBroken);
          const p2Pinned = (i + 1 === N - 1 && item.pinEnd && !item.endBroken);

          if (p1Pinned && p2Pinned) continue;
          if (p1Pinned) {
            n2.x -= dx * diff;
            n2.y -= dy * diff;
          } else if (p2Pinned) {
            n1.x += dx * diff;
            n1.y += dy * diff;
          } else {
            if (isPlayerDirectlyOnThisSegment && !item.bothEndsAnchored && i === gripIdx) {
              n1.x += dx * diff * 0.35;
              n1.y += dy * diff * 0.35;
              n2.x -= dx * diff * 0.65;
              n2.y -= dy * diff * 0.65;
            } else {
              n1.x += dx * diff * 0.5;
              n1.y += dy * diff * 0.5;
              n2.x -= dx * diff * 0.5;
              n2.y -= dy * diff * 0.5;
            }
          }
        }

        if (ctxObj) {
          const polys = ctxObj.groundPolylines || [];
          const mechs = ctxObj.mechanisms || [];
          const walls = ctxObj.solidWalls || [];
          const zones = ctxObj.frictionZones || [];
          const sampleY = ctxObj.samplePolylineY;

          for (let i = 0; i < N; i++) {
            if ((i === 0 && item.pinStart && !item.startBroken) ||
                (i === N - 1 && item.pinEnd && !item.endBroken)) {
              continue;
            }
            const n = item.nodes[i];
            const isGripNode = (isPlayerDirectlyOnThisSegment && i === gripIdx);
            const headTopOffset = isGripNode ? 26 : 0;

            if (sampleY) {
              for (const poly of polys) {
                const gY = sampleY(poly.pts, n.x);
                if (gY !== null && n.y >= gY - 3 && n.oldY <= gY + 8) {
                  n.y = gY - 3;
                  if (n.oldY > n.y) n.oldY = n.y;
                  n.oldX = n.x - (n.x - n.oldX) * 0.7;
                }
              }
            }

            for (const z of zones) {
              if (z.blockBot !== undefined && n.x >= z.x1 && n.x <= z.x2) {
                const ceilY = z.blockBot + headTopOffset + 2;
                if (n.y < ceilY && n.oldY >= ceilY - 16) {
                  n.y = ceilY;
                  if (n.oldY < n.y) n.oldY = n.y;
                }
              }
            }

            for (const m of mechs) {
              if (m.hidden) continue;
              const def = window.GAME_MECHANISMS_REGISTRY && window.GAME_MECHANISMS_REGISTRY[m.type];
              const isSolid = m.solid ?? (def && def.solid) ?? (m.type && m.type.includes("platform"));
              if (isSolid && n.x >= m.x && n.x <= m.x + m.width) {
                const mBottom = m.y + (m.height || 32) + headTopOffset + 2;
                if (n.y >= m.y - 3 && n.oldY <= m.y + 8) {
                  n.y = m.y - 3;
                  if (n.oldY > n.y) n.oldY = n.y;
                  n.oldX = n.x - (n.x - n.oldX) * 0.7;
                } else if (n.y < mBottom && n.oldY >= mBottom - 16) {
                  n.y = mBottom;
                  if (n.oldY < n.y) n.oldY = n.y;
                }
              }
            }

            for (const w of walls) {
              const wallX = w.x !== undefined ? w.x : ((w.x1 + w.x2) * 0.5);
              if (n.y > w.yTop && n.y < w.yBottom) {
                if (n.oldX >= wallX - 2 && n.x < wallX + 3) {
                  n.x = wallX + 3;
                  n.oldX = n.x;
                } else if (n.oldX <= wallX + 2 && n.x > wallX - 3) {
                  n.x = wallX - 3;
                  n.oldX = n.x;
                }
              }
            }
          }
        }

        if (item.pinStart && !item.startBroken) {
          firstNode.x = item.x1;
          firstNode.y = item.y1;
          firstNode.oldX = item.x1;
          firstNode.oldY = item.y1;
        }
        if (item.pinEnd && !item.endBroken) {
          lastNode.x = item.x2;
          lastNode.y = item.y2;
          lastNode.oldX = item.x2;
          lastNode.oldY = item.y2;
        }
      }

      item.x = Math.min(firstNode.x, lastNode.x) - 20;
      item.y = Math.min(firstNode.y, lastNode.y) - 20;
    },

    _drawEndpointBurn: function(ctx, x, y, timer) {
      const p = 1.0 - timer;
      const flameScale = p < 0.25 ? (p / 0.25) : Math.max(0, 1.0 - (p - 0.25) / 0.75);

      ctx.save();
      ctx.translate(x, y);

      if (flameScale > 0.02) {
        const r = 16 * flameScale;
        const glow = ctx.createRadialGradient(0, -r * 0.3, 2, 0, -r * 0.3, r * 2.1);
        glow.addColorStop(0, `rgba(255, 240, 110, ${0.95 * flameScale})`);
        glow.addColorStop(0.5, `rgba(255, 90, 10, ${0.65 * flameScale})`);
        glow.addColorStop(1, "rgba(255, 20, 0, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, -r * 0.3, r * 2.1, 0, Math.PI * 2);
        ctx.fill();

        const sway = Math.sin(performance.now() * 0.04) * 5 * flameScale;
        ctx.fillStyle = "#ff3b00";
        ctx.beginPath();
        ctx.moveTo(-r * 0.65, r * 0.2);
        ctx.quadraticCurveTo(-r * 0.85, -r * 0.9, sway, -r * 1.9);
        ctx.quadraticCurveTo(r * 0.85, -r * 0.9, r * 0.65, r * 0.2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffe66d";
        ctx.beginPath();
        ctx.arc(0, -r * 0.2, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p > 0.45) {
        const smokeAlpha = Math.max(0, (1.0 - p) / 0.55);
        const smokeUp = (p - 0.45) * 32;
        ctx.fillStyle = `rgba(90, 90, 95, ${smokeAlpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(-3, -smokeUp, 4 + p * 5, 0, Math.PI * 2);
        ctx.arc(4, -smokeUp * 1.2, 3 + p * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    draw: function(ctx, item, customImg) {
      if (item.hidden || !item.nodes || item.nodes.length < 2) return;

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const ropeImg = customImg || item._img;
      if (ropeImg && ropeImg.complete && ropeImg.naturalWidth !== 0) {
        for (let i = 0; i < item.nodes.length - 1; i++) {
          const n1 = item.nodes[i];
          const n2 = item.nodes[i + 1];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const segDist = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx);

          ctx.save();
          ctx.translate(n1.x, n1.y);
          ctx.rotate(angle);
          ctx.drawImage(ropeImg, 0, -4, segDist, 8);
          ctx.restore();
        }
      } else {
        ctx.strokeStyle = "#3b2313";
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        ctx.moveTo(item.nodes[0].x, item.nodes[0].y);
        for (let i = 1; i < item.nodes.length; i++) {
          ctx.lineTo(item.nodes[i].x, item.nodes[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = "#c89b62";
        ctx.lineWidth = 5;
        ctx.stroke();

        ctx.fillStyle = "#8c5e32";
        for (let i = 1; i < item.nodes.length - 1; i++) {
          ctx.beginPath();
          ctx.arc(item.nodes[i].x, item.nodes[i].y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const nStart = item.nodes[0];
      const nEnd = item.nodes[item.nodes.length - 1];

      ctx.fillStyle = item.startBroken ? "#1e1b18" : (item.pinStart ? "#576574" : "#a3703a");
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nStart.x, nStart.y, item.pinStart ? 5.5 : 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = item.endBroken ? "#1e1b18" : (item.pinEnd ? "#576574" : "#a3703a");
      ctx.beginPath();
      ctx.arc(nEnd.x, nEnd.y, item.pinEnd ? 5.5 : 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (item.startBurnTimer > 0) {
        this._drawEndpointBurn(ctx, nStart.x, nStart.y, item.startBurnTimer);
      }
      if (item.endBurnTimer > 0) {
        this._drawEndpointBurn(ctx, nEnd.x, nEnd.y, item.endBurnTimer);
      }

      if (item.fireParticles && item.fireParticles.length > 0) {
        for (const fp of item.fireParticles) {
          const alpha = Math.max(0, fp.life / fp.maxLife);
          ctx.fillStyle = alpha > 0.4 ? `rgba(255, 160, 30, ${alpha})` : `rgba(80, 80, 80, ${alpha})`;
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fp.r * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  });
})();
