// 檔案路徑：mechanisms/ceiling_polyline.js
(function() {
  const DEFAULT_STAND_H = 132;
  const PHYS_CRAWL_H = 64;

  // 動態取得當前角色的站立碰撞高度，與主程式 getStandHeight() 保持一致
  function getDynamicStandHeight(pluginCtx) {
    if (pluginCtx && typeof pluginCtx.getCharStats === "function") {
      const stats = pluginCtx.getCharStats();
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

  // 解析完整天花板節點陣列：[[x1, y1], ...midPoints, [x2, y2]]
  function getCeilingPoints(mech) {
    const pts = [];
    const sx = Number(mech.x1 ?? mech.x ?? 300);
    const sy = Number(mech.y1 ?? mech.y ?? 200);
    const ex = Number(mech.x2 ?? (sx + (mech.width || 240)));
    const ey = Number(mech.y2 ?? sy);

    pts.push([sx, sy]);

    if (typeof mech.midPoints === "string" && mech.midPoints.trim() !== "") {
      const normalized = mech.midPoints.replace(/；/g, ";").replace(/，/g, ",");
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

  // 在指定 X 座標上，找出位於角色腳底「正上方」且最接近的天花板 Y 高度
  function sampleCeilingY(pts, x, playerFeetY) {
    let bestY = null;
    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = pts[i][0], y1 = pts[i][1];
      const x2 = pts[i + 1][0], y2 = pts[i + 1][1];
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      if (x >= minX && x <= maxX) {
        const y = (x2 === x1) ? Math.max(y1, y2) : y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
        // 僅判定腳底確實位於天花板線下方（y + 4）的情況，避免干擾站在上層地板的角色
        if (playerFeetY > y + 4) {
          if (bestY === null || y > bestY) {
            bestY = y;
          }
        }
      }
    }
    return bestY;
  }

  // 註冊輔助動作外掛：在每幀物理移動前再次攔截向上的 overrideVy（例如風洞往上吹時）
  if (typeof window.registerAction === "function" && !window.GAME_ACTIONS_REGISTRY["ceiling_polyline_guard"]) {
    window.registerAction("ceiling_polyline_guard", {
      onReset: function(player) {
        player._ceilSafeX = null;
        player._ceilClampMinY = null;
      },
      update: function(player, dt) {
        if (player._ceilClampMinY !== null && player._ceilClampMinY !== undefined) {
          if (player.y < player._ceilClampMinY) {
            player.y = player._ceilClampMinY;
          }
          if (player.vy < 0) {
            player.vy = 0;
          }
          if (player.overrideVy !== null && player.overrideVy !== undefined && player.overrideVy < 0) {
            player.overrideVy = 0;
          }
          player._ceilClampMinY = null;
        }
      }
    });
  }

  window.registerMechanismType("ceiling_polyline", {
    solid: false,

    // ====== 關卡編輯器專屬設定區 ======
    editorConfig: {
      name: "天花板",
      icon: "🧱",
      isLine: true,
      params: [
        {
          key: "midPoints",
          label: "增加中間節點 (格式: x,y; x,y)",
          type: "string",
          default: ""
        },
        {
          key: "thickness",
          label: "天花板防穿透厚度 (像素)",
          type: "number",
          default: 36,
          step: 4,
          min: 12
        }
      ]
    },

    init: function(mech) {
      mech.midPoints = mech.midPoints ?? "";
      mech.thickness = Number(mech.thickness) || 36;
      mech._ceilSafeX = null;
    },

    // 提供給主程式 isHeadBlockedToStand() 呼叫：低矮天花板下禁止爬行時站立
    isHeadBlocked: function(mech, px, py) {
      const pts = getCeilingPoints(mech);
      const thickness = Number(mech.thickness) || 36;
      const standH = getDynamicStandHeight();
      const checkXs = [px - 12, px, px + 12];
      for (const cx of checkXs) {
        const ceilY = sampleCeilingY(pts, cx, py);
        if (ceilY !== null && py - standH < ceilY && py - PHYS_CRAWL_H > ceilY - thickness - 24) {
          return true;
        }
      }
      return false;
    },

    update: function(mech, player, dt, pluginCtx) {
      if (player.dying || player.dead || player.ledgeClimbing || player.ledgeClimbingDown) {
        mech._ceilSafeX = null;
        return;
      }

      const pts = getCeilingPoints(mech);
      const thickness = Number(mech.thickness) || 36;
      const standH = getDynamicStandHeight(pluginCtx);
      const isLow = player.crawling || !!(player.customHitbox && player.customHitbox.isLow);
      const curH = player.customHitbox?.height ?? (isLow ? PHYS_CRAWL_H : standH);
      const curHalfW = player.customHitbox?.halfW ?? (player.crawling ? 40 : 14);

      const sampleXs = [player.x - curHalfW + 2, player.x, player.x + curHalfW - 2];
      let hitCeilY = null;
      for (const sx of sampleXs) {
        const cy = sampleCeilingY(pts, sx, player.y);
        if (cy !== null && (hitCeilY === null || cy > hitCeilY)) {
          hitCeilY = cy;
        }
      }

      if (hitCeilY === null) {
        mech._ceilSafeX = player.x;
        return;
      }

      const headY = player.y - curH;
      const nextHeadY = headY + (player.vy || 0) * dt;

      // 只有在頭頂真正進入天花板界線帶，或上升中的下一幀即將撞到界線時才阻擋
      const hitNow = headY < hitCeilY && headY >= hitCeilY - thickness;
      const willHitRising = player.vy < 0 && headY >= hitCeilY && nextHeadY < hitCeilY;

      if (hitNow || willHitRising) {
        const minAllowedY = hitCeilY + curH;

        if (player.grounded && headY < hitCeilY - 4) {
          if (mech._ceilSafeX !== null && mech._ceilSafeX !== undefined) {
            player.x = mech._ceilSafeX;
            player.vx = 0;
          }
        } else if (player.vy <= 0) {
          // 僅在上升或靜止時阻擋頭頂，碰到界線才歸零 vy
          if (willHitRising && !hitNow) {
            player.y = minAllowedY;
          } else {
            player.y = Math.max(player.y, minAllowedY);
          }
          if (player.vy < 0) player.vy = 0;
          player._ceilClampMinY = Math.max(player._ceilClampMinY || 0, minAllowedY);
        }
      } else {
        mech._ceilSafeX = player.x;
      }
    },

    draw: function(ctx, mech) {
      // 遊戲中完全不顯示實體形狀，僅在開啟碰撞除錯模式時繪製淺藍色參考線
      if (!window.showDebugCollision) return;
      const pts = getCeilingPoints(mech);
      if (pts.length < 2) return;

      ctx.save();
      ctx.strokeStyle = "#74b9ff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]));
      ctx.stroke();

      for (const p of pts) {
        ctx.fillStyle = "#74b9ff";
        ctx.beginPath();
        ctx.arc(p[0], p[1], 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  });
})();
