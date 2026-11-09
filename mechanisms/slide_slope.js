// 檔案路徑：mechanisms/slide_slope.js

(function() {
  window.registerMechanismType("slide_slope", {
    solid: false,
    
    init: function(mech) {
      // 預設兩點座標
      mech.x1 = mech.x1 ?? 1380;
      mech.y1 = mech.y1 ?? 490;
      mech.x2 = mech.x2 ?? 1500;
      mech.y2 = mech.y2 ?? 620;
      
      // 💡 補上這四行：計算機關的基礎座標與寬高，讓主程式的預設除錯框能正常包覆它
      mech.x = Math.min(mech.x1, mech.x2);
      mech.y = Math.min(mech.y1, mech.y2);
      mech.width = Math.abs(mech.x2 - mech.x1) || 10;
      mech.height = Math.abs(mech.y2 - mech.y1) || 10;
      
      // 計算方向與斜率
      mech.slideDir = mech.x2 >= mech.x1 ? 1 : -1;
      mech.minX = mech.x;
      mech.maxX = mech.x + mech.width;
      mech.dx = mech.x2 - mech.x1;
      mech.dy = mech.y2 - mech.y1;
      
      // 設定固定滑行速度 (X軸速度固定，Y軸依斜率計算)
      mech.slopeSpeedX = 330;
      mech.slopeSpeedY = mech.slopeSpeedX * (mech.dy / (Math.abs(mech.dx) || 1));
    },

    update: function(mech, player, dt, ctxObj) {
      if (player.dead || player.dying || player.won || player.onRope || player.climbing) {
        // 如果玩家離開狀態，重置斜坡相關屬性
        if (player.activeSlope === mech) {
            player.activeSlope = null;
            player.onSlopeSliding = false;
        }
        return;
      }

      // 如果玩家正在這段斜坡的 X 範圍內
      if (player.x >= mech.minX - 8 && player.x < mech.maxX - 2) {
        
        // 取得斜坡對應的 Y 座標
        const t = Math.max(0, Math.min(1, (player.x - mech.x1) / (mech.dx || 1)));
        const slopeY = mech.y1 + t * mech.dy;
        
        // 檢查玩家是否貼近斜坡 (從上走下或從下走上都會觸發)
        // 排除已經起跳離開斜坡的狀態 (利用 player.vy < -60 判斷)
        if (player.y >= slopeY - 24 && player.y <= slopeY + 28 && player.vy >= -60 && !player.jumpCooldown) {
          
          // 如果是剛進入斜坡，將控制權交給此斜坡
          if (player.activeSlope !== mech) {
            player.activeSlope = mech;
            player.onSlopeSliding = true;
          }

          if (player.activeSlope === mech) {
            // -------------------------------------------------------------
            // 1. 強制進入滑壘姿態與方向
            // -------------------------------------------------------------
            player.dir = mech.slideDir;
            player.y = slopeY;
            player.grounded = true;
            player.crawling = false;
            player.running = false;
            
            player.sliding = true;
            // 讓動畫保持在滑壘中段 (0.3s 左右的後仰帥氣姿勢)
            player.slideTimer = 0.3;
            player.slideDuration = 1.0;

            // -------------------------------------------------------------
            // 2. 鎖定移動，強制給予斜坡向量速度
            // -------------------------------------------------------------
            player.lockDefaultMove = true;
            player.overrideVx = mech.slideDir * mech.slopeSpeedX;
            player.overrideVy = mech.slopeSpeedY;

            // -------------------------------------------------------------
            // 3. 跳躍處理 (朝前上方 45 度跳躍)
            // -------------------------------------------------------------
            if (ctxObj && ctxObj.wasJustPressed && ctxObj.wasJustPressed('jump')) {
              // 觸發斜坡跳躍
              player.lockDefaultMove = false; // 解除鎖定讓一般物理接管
              player.overrideVx = null;
              player.overrideVy = null;
              
              player.onSlopeSliding = false;
              player.activeSlope = null;
              player.sliding = false;
              
              // 向上及向前的衝力 (前上方 45 度左右)
              player.vy = -450;
              player.vx = mech.slideDir * 380; 
              player.grounded = false;
              
              // 設定起跳冷卻，避免剛跳起來又馬上被斜坡吸住 (0.3秒)
              player.jumpCooldown = 0.3;
              
              if (ctxObj.input) ctxObj.input.jump = false; // 消耗掉跳躍按鍵
              
              return; // 跳躍後本幀不再執行滑行邏輯
            } else if (ctxObj && ctxObj.input) {
               // 如果沒跳，強制消耗掉跳躍以外的所有操作
               ctxObj.input.jump = false; 
            }

            // -------------------------------------------------------------
            // 4. 產生滑壘煙塵特效
            // -------------------------------------------------------------
            if (Math.random() < 0.5 && ctxObj && Array.isArray(ctxObj.particles)) {
              ctxObj.particles.push({
                type: "smoke",
                x: player.x - mech.slideDir * 14,
                y: player.y - 2,
                vx: -mech.slideDir * (30 + Math.random() * 25),
                vy: -20 - Math.random() * 15,
                life: 0.28,
                maxLife: 0.28,
                r: 3 + Math.random() * 1.8
              });
            }
          }
        } else if (player.activeSlope === mech) {
           // 角色在斜坡 X 範圍內，但 Y 已經遠離 (例如跳起來了)
           player.activeSlope = null;
           player.onSlopeSliding = false;
        }
      } else {
        // -------------------------------------------------------------
        // 5. 角色離開此斜坡的 X 範圍
        // -------------------------------------------------------------
        if (player.activeSlope === mech) {
          player.activeSlope = null;
          player.onSlopeSliding = false;
          
          // 如果角色是順著滑出斜坡，並且到達了平地 (y >= y2)
          // 讓動畫過渡到自動起身階段
          if (player.y >= mech.y2 - 10) {
            player.sliding = true;
            player.slideTimer = 0.72; // 進入 0.65~1.0 的起身階段
            player.slideDuration = 1.0;
          }
        }
      }

      // 更新跳躍冷卻計時
      if (player.jumpCooldown > 0) {
          player.jumpCooldown -= dt;
      }
    },

    draw: function(ctx, mech, customImg) {
      // 💡 關鍵修改：檢查主程式的除錯變數，如果沒開啟除錯模式，就直接中斷繪製 (完全隱形)
      if (typeof showDebugCollision === 'undefined' || !showDebugCollision) return;

      ctx.save();
      
      // 只有在開啟除錯模式 (📐 碰撞:開) 時，才會畫出這條紫色的斜坡輔助線
      ctx.strokeStyle = "#a55eea";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mech.x1, mech.y1);
      ctx.lineTo(mech.x2, mech.y2);
      ctx.stroke();

      // 虛線裝飾
      ctx.strokeStyle = "#d1d8e0";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(mech.x1, mech.y1 - 3);
      ctx.lineTo(mech.x2, mech.y2 - 3);
      ctx.stroke();
      
      ctx.restore();
    }
  });
})();
