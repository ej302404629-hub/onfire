// ==========================================
// 模組化外掛機關：電梯移動平台 (mechanisms/elevator_platform.js)
// 功能：支援設定移動速度(speed)、站上去延遲啟動秒數(startDelay)、來回停頓時間(waitTime)與任意方向距離
// 視覺：完全隱藏軌道、進度條與狀態燈號，不讓玩家預先察覺啟動時間與移動軌跡
// ==========================================
window.registerMechanismType("elevator_platform", {
  solid: true, // 實體可站立且可抓邊攀爬的平台

  init: function(mech) {
    mech.startX = mech.x;
    mech.startY = mech.y;

    // 1. 解析移動方向與距離
    let offsetX = 0;
    let offsetY = 0;
    const dist = mech.distance !== undefined ? mech.distance : 160;

    if (mech.moveX !== undefined || mech.moveY !== undefined) {
      offsetX = mech.moveX || 0;
      offsetY = mech.moveY || 0;
    } else if (mech.dir) {
      const d = String(mech.dir).toLowerCase();
      if (d === "up") offsetY = -dist;
      else if (d === "down") offsetY = dist;
      else if (d === "left") offsetX = -dist;
      else if (d === "right") offsetX = dist;
    } else {
      offsetY = -dist;
    }

    mech.targetX = mech.endX !== undefined ? mech.endX : (mech.startX + offsetX);
    mech.targetY = mech.endY !== undefined ? mech.endY : (mech.startY + offsetY);

    // 2. 速度與時間參數 (由 collision.js 傳入決定)
    mech.speed = mech.speed !== undefined ? mech.speed : 90;             // 移動速度 (像素/秒)
    mech.startDelay = mech.startDelay !== undefined ? mech.startDelay : 0; // 站上去後幾秒開始移動
    mech.waitTime = mech.waitTime !== undefined ? mech.waitTime : 0.65;  // 抵達端點後的停頓秒數
    mech.oneWay = !!mech.oneWay;                                         // 是否單程抵達終點即停止
    mech.resetDelayOnLeave = mech.resetDelayOnLeave !== undefined ? mech.resetDelayOnLeave : true;

    // 若有設定 startDelay (>0)，預設等玩家踩上去倒數完才啟動
    if (mech.autoStart === undefined) {
      mech.autoStart = (mech.startDelay <= 0);
    }

    mech.activated = mech.autoStart;
    mech.standTimer = 0;   // 記錄玩家站在上面的累積秒數 (隱藏不顯示)
    mech.progress = 0;     // 0 (起點) ~ 1 (終點)
    mech.forward = true;   // true: 往終點移動, false: 返回起點
    mech.waitTimer = 0;    // 兩端停頓計時器
  },

  update: function(mech, player, dt) {
    // 1. 檢查玩家當前是否正站在此電梯平台上
    const halfW = 16 * 0.8;
    const playerOnPlatform = (
      !player.climbing &&
      !player.ledgeClimbing &&
      player.vy >= 0 &&
      player.x + halfW >= mech.x &&
      player.x - halfW <= mech.x + mech.width &&
      Math.abs(player.y - mech.y) <= 8
    );

    // 2. 處理「站上去多久才開始移動 (startDelay)」的隱藏倒數計時
    if (!mech.activated) {
      if (playerOnPlatform) {
        mech.standTimer += dt;
        if (mech.standTimer >= mech.startDelay) {
          mech.standTimer = mech.startDelay;
          mech.activated = true;
        }
      } else if (mech.resetDelayOnLeave) {
        mech.standTimer = 0;
      }
      return;
    }

    // 3. 抵達端點時的停頓計時
    if (mech.waitTimer > 0) {
      mech.waitTimer -= dt;
      return;
    }

    // 4. 根據設定的移動速度 (speed) 計算推進量
    const totalDist = Math.hypot(mech.targetX - mech.startX, mech.targetY - mech.startY);
    if (totalDist < 1) return;

    const stepProgress = (mech.speed * dt) / totalDist;

    if (mech.forward) {
      mech.progress += stepProgress;
      if (mech.progress >= 1) {
        mech.progress = 1;
        if (mech.oneWay) return;
        mech.forward = false;
        mech.waitTimer = mech.waitTime;
      }
    } else {
      mech.progress -= stepProgress;
      if (mech.progress <= 0) {
        mech.progress = 0;
        mech.forward = true;
        mech.waitTimer = mech.waitTime;
        if (mech.retriggerAtStart) {
          mech.activated = false;
          mech.standTimer = 0;
        }
      }
    }

    // 平滑加減速或等速插值 (預設直接等速移動，不透露加減速前兆；若需平滑可於 collision.js 設 smooth: true)
    const t = mech.smooth
      ? (mech.progress * mech.progress * (3 - 2 * mech.progress))
      : mech.progress;

    const nextX = mech.startX + (mech.targetX - mech.startX) * t;
    const nextY = mech.startY + (mech.targetY - mech.startY) * t;
    const deltaY = nextY - mech.y;

    mech.x = nextX;
    mech.y = nextY;

    // 5. 垂直升降載人同步吸附補正
    if (playerOnPlatform) {
      player.y = mech.y;
      player.vy = 0;
      player.grounded = true;
    } else if (deltaY < 0) {
      if (
        !player.climbing &&
        player.vy >= 0 &&
        player.x + halfW >= mech.x &&
        player.x - halfW <= mech.x + mech.width &&
        player.y >= mech.y &&
        player.y <= mech.prevY + 14
      ) {
        player.y = mech.y;
        player.vy = 0;
        player.grounded = true;
      }
    }
  },

  draw: function(ctx, mech, img) {
    ctx.save();

    // 僅繪製乾淨的靜態平台外觀，不顯示任何軌道、進度條或燈號變化
    if (!window.drawEntityTexture(ctx, mech, img)) {
      const x = mech.x, y = mech.y, w = mech.width, h = mech.height;

      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, "#57606f");
      grad.addColorStop(1, "#2f3542");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#1e272e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
});
