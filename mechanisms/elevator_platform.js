// ==========================================
// 模組化外掛機關：電梯移動平台 (mechanisms/elevator_platform.js)
// 修復：
// 1. 移除外掛內覆寫 mech.prevY / prevX 的錯誤，讓主引擎正確計算相對速度與落點
// 2. 新增「平順走上電梯 (Step-Up Assist)」機制，解決高度微差被側面當成牆壁往外推的問題
// 3. 關閉平台本體的側面推擠阻擋，改由頂部單向平台/微階梯平滑承接，徹底消除邊緣彈飛 Bug
// 4. 嚴格以「角色底部中心點 (player.x, player.y) 踩在電梯頂面上」作為啟動與計時條件
// ==========================================
window.registerMechanismType("elevator_platform", {
  
  // ===== 關卡編輯器讀取的參數定義區 =====
  editorConfig: {
    name: "電梯平台",
    icon: "🛗",
    hasWizard: true,
    params: {
      dir: {
        label: "移動方向 (dir)",
        type: "select",
        default: "up",
        options: [
          { value: "up", label: "往上 (up)" },
          { value: "down", label: "往下 (down)" },
          { value: "left", label: "往左 (left)" },
          { value: "right", label: "往右 (right)" }
        ]
      },
      distance: {
        label: "移動範圍 (distance)",
        type: "number",
        default: 160,
        step: 10
      },
      speed: {
        label: "移動速度 (speed)",
        type: "number",
        default: 90,
        step: 10
      },
      startDelay: {
        label: "啟動冷靜期/延遲秒數 (startDelay)",
        type: "number",
        default: 0.5,
        step: 0.1
      },
      oneWay: {
        label: "單向移動到底不返回 (oneWay)",
        type: "boolean",
        default: false
      },
      isLocked: {
        label: "預設鎖定需按鈕解鎖 (isLocked)",
        type: "select",
        default: false,
        options: [
          { value: false, label: "不鎖定 (false)" },
          { value: true, label: "鎖定 (true)" }
        ]
      }

    }
  },
  // =====================================

  // 💡 關鍵設定：將預設 solid 設為 false，不讓主引擎的「側面牆壁碰撞」與「半空抓邊」干擾角色走上電梯；
  // 平台頂部的踩踏與平順走上去的物理，由下方 update 精準控制！
  solid: false,

  init: function(mech) {
    mech.startX = mech.x;
    mech.startY = mech.y;

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

    mech.speed = mech.speed !== undefined ? mech.speed : 90;
    mech.startDelay = mech.startDelay !== undefined ? mech.startDelay : 0.5;
    mech.waitTime = mech.waitTime !== undefined ? mech.waitTime : 0.65;
    mech.oneWay = !!mech.oneWay;
    mech.resetDelayOnLeave = mech.resetDelayOnLeave !== undefined ? mech.resetDelayOnLeave : true;
    
    mech.isLocked = !!mech.isLocked; 
    mech.internalProgress = 0; 

    mech.activated = false;
    mech.standTimer = 0;
    mech.progress = 0;
    mech.forward = true;
    mech.waitTimer = 0;

    // 強制覆寫實例的 solid 為 false，徹底避開主引擎第 1250 行的側面推人 Bug
    mech.solid = false;
  },

  update: function(mech, player, dt) {
    // 確保實例不會觸發主引擎的側面牆壁推擠
    mech.solid = false;

    const bottomCenterX = player.x;
    const bottomCenterY = player.y;

    // =========================================================================
    // 1. 平順走上電梯與單向平台承接輔助 (Smooth Step-Up & Landing Assist)
    // =========================================================================
    // 當角色的底部中心點 X 已經進入電梯平台範圍內，且不在攀爬狀態時：
    const isCenterOnPlatformX = (bottomCenterX >= mech.x) && (bottomCenterX <= mech.x + mech.width);

    if (!player.climbing && !player.ledgeClimbing && !player.ledgeClimbingDown) {
      // (A) 平順走上電梯：若角色從旁邊地面走進電梯，就算電梯表面比地面稍微高一點 (例如 18px 內) 或略低 (12px 內)，
      // 只要角色沒有正在往上跳 (vy >= 0)，當中心點跨入電梯時就自動平順對齊到電梯表面，不會被擋住或跌落！
      if (isCenterOnPlatformX && player.vy >= 0) {
        const yDiff = bottomCenterY - mech.y; // 正數代表角色腳底比電梯表面低一點點 (電梯微凸)
        if (yDiff >= -10 && yDiff <= 18) {
          player.y = mech.y;
          player.vy = 0;
          player.grounded = true;
        }
      }
    }

    // =========================================================================
    // 2. 嚴格判定「角色底部中心點」是否在電梯平台上
    // =========================================================================
    const isCenterOnPlatformY = Math.abs(player.y - mech.y) <= 3;

    const isSteppedOn = (
      !player.climbing &&
      !player.ledgeClimbing &&
      !player.ledgeClimbingDown &&
      player.vy >= 0 &&
      isCenterOnPlatformX &&
      isCenterOnPlatformY
    );

    const isUnlocked = !mech.isLocked || mech.internalProgress > 0;

    // =========================================================================
    // 3. 處理「角色底部中心點在電梯上才啟動」的冷靜期計時
    // =========================================================================
    if (!mech.activated) {
      if (isSteppedOn && isUnlocked) {
        mech.standTimer += dt;
        if (mech.standTimer >= mech.startDelay) {
          mech.standTimer = mech.startDelay;
          mech.activated = true; 
        }
      } else if (mech.resetDelayOnLeave) {
        mech.standTimer = 0;
      }
      // 尚未啟動移動時，只要中心點在上面，依然維持穩固站立（防止主引擎重力把角色拉穿電梯）
      if (isSteppedOn) {
        player.y = mech.y;
        player.vy = 0;
        player.grounded = true;
      }
      return; 
    }

    // 端點停頓計時
    if (mech.waitTimer > 0) {
      mech.waitTimer -= dt;
      if (isSteppedOn) {
        player.y = mech.y;
        player.vy = 0;
        player.grounded = true;
      }
      return;
    }

    // =========================================================================
    // 4. 計算電梯移動軌跡與位移量 (deltaX, deltaY)
    // =========================================================================
    const totalDist = Math.hypot(mech.targetX - mech.startX, mech.targetY - mech.startY);
    if (totalDist < 1) return;

    const stepProgress = (mech.speed * dt) / totalDist;

    if (mech.forward) {
      mech.progress += stepProgress;
      if (mech.progress >= 1) {
        mech.progress = 1;
        if (!mech.oneWay) {
          mech.forward = false;
          mech.waitTimer = mech.waitTime;
        }
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

    const t = mech.smooth
      ? (mech.progress * mech.progress * (3 - 2 * mech.progress))
      : mech.progress;

    const oldX = mech.x;
    const oldY = mech.y;
    const nextX = mech.startX + (mech.targetX - mech.startX) * t;
    const nextY = mech.startY + (mech.targetY - mech.startY) * t;
    const deltaX = nextX - oldX;
    const deltaY = nextY - oldY;

    mech.x = nextX;
    mech.y = nextY;

    // ⚠️ 注意：絕對不要在這裡寫 mech.prevY = mech.y 或 mech.prevX = mech.x！
    // 因為 index_3d.html 在呼叫 update 前已經記錄了 m.prevX / m.prevY，留給主引擎自行處理。

    // =========================================================================
    // 5. 角色跟隨電梯移動與空中落下攔截
    // =========================================================================
    if (isSteppedOn) {
      // 角色原本就踩在電梯上：直接跟著電梯移動 X 與 Y
      player.x = Math.max(35, Math.min((window.CURRENT_WORLD_W || 2560) - 35, player.x + deltaX));
      player.y = mech.y;
      player.vy = 0;
      player.grounded = true;
    } else if (
      !player.climbing &&
      !player.ledgeClimbing &&
      !player.ledgeClimbingDown &&
      player.vy >= 0 &&
      (player.x >= mech.x && player.x <= mech.x + mech.width)
    ) {
      // 角色從空中跳下，或電梯往上迎面撞上正在落下的角色底部中心點
      const prevTop = oldY;
      const curTop = mech.y;
      const minTop = Math.min(prevTop, curTop) - 6;
      const maxTop = Math.max(prevTop, curTop) + 24;
      if (player.y >= minTop && player.y <= maxTop) {
        player.y = mech.y;
        player.vy = 0;
        player.grounded = true;
      }
    }
  },

  draw: function(ctx, mech, img) {
    ctx.save();
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
