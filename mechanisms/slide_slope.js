// 檔案路徑：mechanisms/slide_slope.js

(function() {
  // =========================================================================
  // 💡 核心解法：註冊一個隱藏的「斜坡伴隨外掛」 (z_slope_physics_manager)
  // 在主引擎 (index_3d.html) 每幀清空物理覆寫值後，重新奪回角色的物理控制權
  // =========================================================================
  window.registerAction("z_slope_physics_manager", {
    update: function(player, dt) {
        if (player.dead || player.dying) {
            player.activeSlope = null;
            player.slopeJumpTimer = 0;
            return;
        }

        // 1. 如果角色正在斜坡上，奪回物理控制權
        if (player.activeSlope) {
            player.lockDefaultMove = true;
            
            if (player.slopeVx !== undefined) {
                player.overrideVx = player.slopeVx;
            }
            if (player.slopeVy !== undefined) {
                // 預先扣除主程式會強制加上的重力 (1450 * dt)
                player.overrideVy = player.slopeVy - (1450 * dt);
            }
        }
        // 2. 如果角色剛從斜坡起跳，給予短暫的 X 軸強制慣性
        else if (player.slopeJumpTimer > 0) {
            player.slopeJumpTimer -= dt;
            if (player.slopeJumpVx !== undefined) player.overrideVx = player.slopeJumpVx;
        }
    }
  });

  // =========================================================================
  // 真正的斜坡機關本體
  // =========================================================================
  window.registerMechanismType("slide_slope", {
    solid: false,
    passable: true,
    
    init: function(mech) {
      let px1 = mech.x1 ?? 1380;
      let py1 = mech.y1 ?? 490;
      let px2 = mech.x2 ?? 1500;
      let py2 = mech.y2 ?? 620;

      // 強制讓 p1 在左邊 (X較小)，p2 在右邊 (X較大)
      if (px1 > px2) {
         let tx = px1, ty = py1;
         px1 = px2; py1 = py2;
         px2 = tx; py2 = ty;
      }
      
      mech.p1 = { x: px1, y: py1 };
      mech.p2 = { x: px2, y: py2 };
      
      mech.x = px1;
      mech.y = Math.min(py1, py2);
      mech.width = px2 - px1 || 10;
      mech.height = Math.abs(py2 - py1) || 10;

      mech.slideDir = (py2 > py1) ? 1 : -1;
      mech.slopeDX = px2 - px1;
      mech.slopeDY = py2 - py1;
      
      mech.speedX = 350;
      mech.speedY = mech.speedX * (Math.abs(mech.slopeDY) / mech.slopeDX);
    },

    update: function(mech, player, dt, ctxObj) {
      if (player.dead || player.dying || player.won || player.onRope || player.climbing) {
          this.releasePlayer(mech, player);
          return;
      }

      if (player.slopeJumpCooldown > 0) player.slopeJumpCooldown -= dt;
      if (player.slopeReentryCooldown > 0) player.slopeReentryCooldown -= dt;

      // 檢查是否在 X 軸範圍內
      let inXRange = (player.x >= mech.p1.x && player.x <= mech.p2.x);

      if (inXRange) {
        // =====================================================================
        // 💡 底部精準判定 & 軌跡線段交叉判定 (皆以角色底部中點為基準)
        // =====================================================================
        let prevX = player.x - (player.vx || 0) * dt;
        let prevY = player.y - (player.vy || 0) * dt;
        let currX = player.x;
        let currY = player.y;

        let p1x = mech.p1.x, p1y = mech.p1.y;
        let p2x = mech.p2.x, p2y = mech.p2.y;

        // 1. 一般接觸判定
        let currSlopeY = p1y + (mech.slopeDX !== 0 ? ((currX - p1x) / mech.slopeDX) * mech.slopeDY : 0);
        let normalTouch = (currY >= currSlopeY - 15) && (currY <= currSlopeY + 25);

        // 2. 軌跡交叉判定
        let cp1 = (currX - prevX) * (p1y - prevY) - (currY - prevY) * (p1x - prevX);
        let cp2 = (currX - prevX) * (p2y - prevY) - (currY - prevY) * (p2x - prevX);
        let cp3 = (p2x - p1x) * (prevY - p1y) - (p2y - p1y) * (prevX - p1x);
        let cp4 = (p2x - p1x) * (currY - p1y) - (p2y - p1y) * (currX - p1x);
        let crossTouch = (cp1 * cp2 <= 0) && (cp3 * cp4 <= 0);

        // 💡 取消 vy >= -10 限制，加入跳躍脫離冷卻判定
        let isTouchingSlope = false;
        if (player.activeSlope === mech) {
            isTouchingSlope = true; // 原本就在這塊斜坡上，持續吸附
        } else if ((normalTouch || crossTouch) && (!player.slopeReentryCooldown || player.slopeReentryCooldown <= 0)) {
            isTouchingSlope = true; // 只要底部碰到或切過去，且不在起跳免控期，一律強制吸附！
        }

        if (isTouchingSlope) {
          if (player.activeSlope !== mech) {
              player.activeSlope = mech;
              player.slopeJumpCooldown = 0.2; // 剛踩到斜坡 0.2 秒不能跳
          }

          // 1. 強制把 X 鎖在線段內，並完美貼合 Y 軸
          player.x = Math.max(p1x, Math.min(p2x, player.x));
          let ratio = (player.x - p1x) / mech.slopeDX;
          
          player.y = p1y + ratio * mech.slopeDY; 
          player.fallStartY = player.y;

          // 2. 設定強制滑行動畫
          player.sliding = true;
          player.crawling = false;
          player.running = false;
          player.slideTimer = 0.3;
          player.dir = mech.slideDir;

          // 3. 將滑行速度交給外掛接管
          player.slopeVx = mech.slideDir * mech.speedX;
          player.slopeVy = mech.speedY; 

          // 4. 處理斜坡跳躍
          if (ctxObj && ctxObj.wasJustPressed && ctxObj.wasJustPressed('jump')) {
              if (player.slopeJumpCooldown <= 0) {
                  this.releasePlayer(mech, player);
                  
                  player.vy = -450;
                  player.grounded = false;
                  player.sliding = false;
                  
                  // 設定起跳慣性
                  player.slopeJumpTimer = 0.35;
                  player.slopeJumpVx = mech.slideDir * 420;
                  
                  // 💡 賦予 0.25 秒的脫離免控期，防止一跳起來就被斜坡立刻吸回去
                  player.slopeReentryCooldown = 0.25;
                  
                  if (ctxObj.input) ctxObj.input.jump = false;
                  return; // 跳躍後本幀不再執行後續特效
              } else {
                  if (ctxObj.input) ctxObj.input.jump = false;
              }
          } else if (ctxObj && ctxObj.input) {
              ctxObj.input.jump = false; 
          }

          // 5. 滑行沙塵特效
          if (Math.random() < 0.4 && ctxObj && ctxObj.particles) {
              ctxObj.particles.push({
                  type: "smoke",
                  x: player.x - mech.slideDir * 12,
                  y: player.y,
                  vx: -mech.slideDir * (20 + Math.random() * 20),
                  vy: -10 - Math.random() * 15,
                  life: 0.3, maxLife: 0.3,
                  r: 3 + Math.random() * 2
              });
          }
        }
      } else {
        // 如果脫離斜坡 X 範圍
        if (player.activeSlope === mech) {
            this.releasePlayer(mech, player);
            
            // 順著滑到底部平地時給予自動起身的過渡動畫
            if (player.y >= Math.max(mech.p1.y, mech.p2.y) - 10) {
                player.sliding = true;
                player.slideTimer = 0.72; 
            } else {
                player.sliding = false;
            }
        }
      }
    },

    releasePlayer: function(mech, player) {
        if (player.activeSlope === mech) {
            player.activeSlope = null;
        }
    },

    draw: function(ctx, mech) {
        if (typeof showDebugCollision === 'undefined' || !showDebugCollision) return;
        
        ctx.save();
        ctx.strokeStyle = "#00e5ff"; 
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(mech.p1.x, mech.p1.y);
        ctx.lineTo(mech.p2.x, mech.p2.y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255, 255, 0, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(mech.x, mech.y, mech.width, mech.height);
        ctx.restore();
    }
  });
})();
