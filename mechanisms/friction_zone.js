// 檔案路徑：mechanisms/friction_zone.js

(function() {
  const DEFAULT_STAND_H = 132;
  const PHYS_CRAWL_H = 64;

  // 動態取得當前角色的站立碰撞高度，與主程式 getStandHeight() 保持一致
  function getDynamicStandHeight(ctxObj) {
    if (ctxObj && typeof ctxObj.getCharStats === "function") {
      const stats = ctxObj.getCharStats();
      if (stats && Number.isFinite(stats.standHeight)) return stats.standHeight;
    }
    if (typeof window.getStandHeight === "function") {
      const h = window.getStandHeight();
      if (Number.isFinite(h)) return h;
    }
    if (typeof window.getActiveCharStats === "function") {
      const stats = window.getActiveCharStats();
      if (stats && Number.isFinite(stats.standHeight)) return stats.standHeight;
    }
    return DEFAULT_STAND_H;
  }

  // 解析 ceiling_polyline 的完整節點，避免隔著天花板誤觸上層摩擦區
  function getCeilingPoints(ceilMech) {
    const pts = [];
    const sx = Number(ceilMech.x1 ?? ceilMech.x ?? 300);
    const sy = Number(ceilMech.y1 ?? ceilMech.y ?? 200);
    const ex = Number(ceilMech.x2 ?? (sx + (ceilMech.width || 240)));
    const ey = Number(ceilMech.y2 ?? sy);

    pts.push([sx, sy]);

    if (typeof ceilMech.midPoints === "string" && ceilMech.midPoints.trim() !== "") {
      const normalized = ceilMech.midPoints.replace(/；/g, ";").replace(/，/g, ",");
      const pairs = normalized.split(";");
      for (const pair of pairs) {
        const parts = pair.trim().split(",");
        if (parts.length >= 2) {
          const mx = Number(parts[0].trim());
          const my = Number(parts[1].trim());
          if (Number.isFinite(mx) && Number.isFinite(my)) {
            pts.push([mx, my]);
          }
        }
      }
    }

    pts.push([ex, ey]);
    return pts;
  }

  function getBlockingCeilingY(ctxObj, px, py, halfW) {
    const mechs = (ctxObj && Array.isArray(ctxObj.mechanisms))
      ? ctxObj.mechanisms
      : (Array.isArray(window.activeMechanisms) ? window.activeMechanisms : []);

    const sampleXs = [px - halfW + 2, px, px + halfW - 2];
    let bestY = null;

    for (const m of mechs) {
      if (!m || m.hidden || m.type !== "ceiling_polyline") continue;
      const pts = getCeilingPoints(m);
      for (const sx of sampleXs) {
        for (let i = 0; i < pts.length - 1; i++) {
          const x1 = pts[i][0], y1 = pts[i][1];
          const x2 = pts[i + 1][0], y2 = pts[i + 1][1];
          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          if (sx >= minX && sx <= maxX) {
            const y = (x2 === x1) ? Math.max(y1, y2) : y1 + ((sx - x1) / (x2 - x1)) * (y2 - y1);
            if (py > y + 4 && (bestY === null || y > bestY)) {
              bestY = y;
            }
          }
        }
      }
    }

    return bestY;
  }

  window.registerMechanismType("friction_zone", {
    solid: false,
    
    init: function(mech) {
      mech.x = mech.x ?? 0;
      mech.y = mech.y ?? 0;
      mech.width = mech.width ?? 100;
      mech.height = mech.height ?? 50;
      mech.zoneType = mech.zoneType ?? "stand";
      mech.frictionPower = mech.frictionPower ?? 5.0;
      mech.accumulateMode = mech.accumulateMode ?? "move_only";
      mech.intenseSparks = mech.intenseSparks ?? true;

      mech.playerInside = false;
    },

    // 💡 Hook：讓主程式呼叫，由外掛自行決定是否阻擋角色站起
    isHeadBlocked: function(mech, px, py) {
      if (mech.zoneType !== "crawl") return false;
      const standH = getDynamicStandHeight();
      const blockingCeilY = getBlockingCeilingY(null, px, py, 16);
      const rawStandTop = py - standH;
      const standTop = (blockingCeilY !== null) ? Math.max(rawStandTop, blockingCeilY) : rawStandTop;
      const standBot = py;
      // 判斷角色若以「站立姿態 (半寬 16)」在此座標，是否會與爬行摩擦區重疊
      const inX = px + 16 > mech.x && px - 16 < mech.x + mech.width;
      const inY = standTop < mech.y + mech.height && standBot > mech.y;
      return inX && inY;
    },

    update: function(mech, player, dt, ctxObj) {
      const standH = getDynamicStandHeight(ctxObj);
      const isLowStance = player.crawling || !!(player.customHitbox && player.customHitbox.isLow);
      const curHalfW = player.customHitbox?.halfW ?? (player.crawling ? 52 : 16);
      const curH = player.customHitbox?.height ?? (isLowStance ? PHYS_CRAWL_H : standH);

      // 檢查角色頭頂上方是否有天花板阻隔，避免穿透樓板誤觸上層摩擦區
      const blockingCeilY = getBlockingCeilingY(ctxObj, player.x, player.y, curHalfW);

      // =========================================================
      // 1. 爬行區邊緣阻擋邏輯 (站立時進不去，像撞牆一樣被推擠)
      // =========================================================
      if (mech.zoneType === "crawl" && !isLowStance) {
        const rawStandTop = player.y - standH;
        const standTop = (blockingCeilY !== null) ? Math.max(rawStandTop, blockingCeilY) : rawStandTop;
        
        if (standTop < mech.y + mech.height && player.y > mech.y) {
          const nextX = player.x + player.vx * dt;
          
          if (nextX + 16 > mech.x && nextX - 16 < mech.x + mech.width) {
            // 確保玩家是從外部試圖撞進去
            if (player.x + 16 <= mech.x) { 
              player.vx = 0; player.overrideVx = 0; player.x = mech.x - 16;
              if (ctxObj && ctxObj.addSparks && Math.random() < 0.4) ctxObj.addSparks(mech.x, standTop + 20, mech.intenseSparks);
            } else if (player.x - 16 >= mech.x + mech.width) { 
              player.vx = 0; player.overrideVx = 0; player.x = mech.x + mech.width + 16;
              if (ctxObj && ctxObj.addSparks && Math.random() < 0.4) ctxObj.addSparks(mech.x + mech.width, standTop + 20, mech.intenseSparks);
            }
          }
        }
      }

      // =========================================================
      // 2. 區域重疊判定與狀態控制
      // =========================================================
      const rawTop = player.y - curH;
      const pTop = (blockingCeilY !== null) ? Math.max(rawTop, blockingCeilY) : rawTop;
      const pBot = player.y;
      
      const inX = player.x + curHalfW > mech.x && player.x - curHalfW < mech.x + mech.width;
      const inY = pTop < mech.y + mech.height && pBot > mech.y;
      
      mech.playerInside = inX && inY;

      if (mech.playerInside) {
        // 如果在空中碰到摩擦區，強制取消向上速度
        if (player.vy < 0) player.vy = 0;

        if (mech.zoneType === "crawl") {
          // 在爬行區內，確保維持爬行姿態 (絕對不要去動 ctxObj.input)
          player.crawling = true;
          player.stanceT = 1;
        }

        // =========================================================
        // 3. 溫度累積計算
        // =========================================================
        let shouldAccumulate = false;
        
        if (mech.zoneType === "crawl" || (mech.zoneType === "stand" && !isLowStance)) {
            if (mech.accumulateMode === "always") {
               shouldAccumulate = true;
            } else if (mech.accumulateMode === "move_only") {
               if (Math.abs(player.vx) > 5 || Math.abs(player.vy) > 5) {
                   shouldAccumulate = true;
               }
            }
        }

        if (shouldAccumulate) {
            const mFact = (Math.abs(player.vx) + Math.abs(player.vy) * 0.5) / 200;
            const speedFactor = mech.accumulateMode === "always" ? Math.max(0.45, mFact) : mFact; 
            
            player.heat = Math.min(player.maxHeat, player.heat + mech.frictionPower * 26 * speedFactor * dt);
            
            if (player.heat >= player.maxHeat && !player.onFire) {
                player.onFire = true;
            }
            
            if (ctxObj && ctxObj.addSparks) {
               const sparkChance = mech.intenseSparks ? 0.85 : 0.55;
               if (Math.random() < sparkChance) {
                   ctxObj.addSparks(player.x, pTop + 8, mech.intenseSparks);
               }
            }
        }
      }
    },

    draw: function(ctx, mech, customImg) {
      if (!window.showDebugCollision && (typeof showDebugCollision === 'undefined' || !showDebugCollision)) return;
      ctx.save();
      const fillColor = mech.zoneType === "crawl" 
        ? (mech.intenseSparks ? "rgba(180, 0, 255, 0.28)" : "rgba(255, 190, 30, 0.22)") 
        : (mech.intenseSparks ? "rgba(255, 50, 20, 0.24)" : "rgba(255, 190, 30, 0.22)");
        
      const strokeColor = mech.zoneType === "crawl" 
        ? "#e056fd" 
        : (mech.intenseSparks ? "#ff3b1f" : "#ffca3a");

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;

      if (mech.zoneType === "crawl") ctx.setLineDash([6, 4]);
      ctx.fillRect(mech.x, mech.y, mech.width, mech.height);
      ctx.strokeRect(mech.x, mech.y, mech.width, mech.height);
      ctx.setLineDash([]);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 12px "Microsoft JhengHei"';
      ctx.textAlign = "center";
      const modeText = mech.accumulateMode === "always" ? "全時" : "移動";
      const typeText = mech.zoneType === "crawl" ? "爬行區" : "站立區";
      ctx.fillText(`🔥${typeText} [${modeText}|力:${mech.frictionPower}]`, mech.x + mech.width / 2, mech.y + 18);
      
      ctx.restore();
    }
  });
})();
