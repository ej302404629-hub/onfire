// ==========================================
// 模組化外掛機關：多房間傳送門系統 (mechanisms/room_door.js)
// 功能：支援同一關卡內多張背景圖 (走廊 <-> 房間2 <-> 房間3) 動態切換、淡入淡出轉場與碰撞區無縫替換
// ==========================================
window.registerMechanismType("room_door", {
  solid: false,
  isForeground: true, // 繪製在前景層，讓轉場黑幕與門框提示清晰呈現

  init: function(mech) {
    mech.currentRoomKey = mech.initialRoom || "corridor";
    mech.fadeState = "NONE"; // 'NONE' | 'FADE_OUT' | 'FADE_IN'
    mech.fadeAlpha = 0;
    mech.pendingDoor = null;
    mech.activeDoorHover = null;
    mech.roomBgCache = {};   // 快取各房間已載入的 Image 物件
    mech.currentRoomBg = null;
    mech.initializedRoom = false;
  },

  // 智慧預載與取得指定房間的背景圖片 (同時相容伺服器路徑與 Android 資料夾模式)
  getOrLoadRoomBg: function(mech, roomKey, roomData) {
    if (mech.roomBgCache[roomKey]) return mech.roomBgCache[roomKey];
    if (!roomData || !Array.isArray(roomData.bgCandidates)) return null;

    const img = new Image();
    mech.roomBgCache[roomKey] = img;

    // 取得當前關卡資料夾路徑
    let stagePath = "stage/stage01";
    let stageFolder = "stage01";
    if (typeof loadedStages !== "undefined" && typeof selectedStageIdx !== "undefined" && loadedStages[selectedStageIdx]) {
      stagePath = loadedStages[selectedStageIdx].path || stagePath;
      stageFolder = loadedStages[selectedStageIdx].folder || stageFolder;
    }

    // 依序嘗試候選檔名 (例如 room2.png, 1000001574.png)
    const tryLoadCandidate = (idx) => {
      if (idx >= roomData.bgCandidates.length) return;
      const fileName = roomData.bgCandidates[idx];

      if (typeof loadSmartImage === "function") {
        loadSmartImage(
          img,
          `${stagePath}/${fileName}`,
          () => { img._ready = true; },
          `${stageFolder}/${fileName}`
        ).then((ok) => {
          if (!ok) tryLoadCandidate(idx + 1);
        });
      } else {
        img.onload = () => { img._ready = true; };
        img.onerror = () => tryLoadCandidate(idx + 1);
        img.src = `${stagePath}/${fileName}`;
      }
    };

    tryLoadCandidate(0);
    return img;
  },

  // 執行房間物理碰撞資料與背景的無縫切換 (In-place 替換，無須修改主程式)
  applyRoomSwitch: function(mech, targetRoomKey, doorCfg, player, helpers) {
    const col = window.STAGE_COLLISION;
    if (!col || !col.rooms || !col.rooms[targetRoomKey]) return;

    const room = col.rooms[targetRoomKey];
    mech.currentRoomKey = targetRoomKey;

    // 1. 原地更新主程式的地面、牆壁、梯子、熱源區陣列內容
    if (helpers.groundPolylines && Array.isArray(room.groundPolylines)) {
      helpers.groundPolylines.length = 0;
      room.groundPolylines.forEach(p => helpers.groundPolylines.push(JSON.parse(JSON.stringify(p))));
    }
    if (helpers.solidWalls && Array.isArray(room.solidWalls)) {
      helpers.solidWalls.length = 0;
      room.solidWalls.forEach(w => helpers.solidWalls.push(JSON.parse(JSON.stringify(w))));
    }
    if (typeof LADDERS !== "undefined" && Array.isArray(room.ladders)) {
      LADDERS.length = 0;
      room.ladders.forEach(l => LADDERS.push(JSON.parse(JSON.stringify(l))));
    }
    if (helpers.frictionZones && Array.isArray(room.frictionZones)) {
      helpers.frictionZones.length = 0;
      room.frictionZones.forEach(z => helpers.frictionZones.push(JSON.parse(JSON.stringify(z))));
    }

    // 2. 同步更新關卡世界寬高與過關終點判定區
    if (room.worldWidth) WORLD_W = room.worldWidth;
    if (room.worldHeight) WORLD_H = room.worldHeight;
    if (room.goalArea && typeof GOAL_CONDITION !== "undefined") {
      GOAL_CONDITION = JSON.parse(JSON.stringify(room.goalArea));
    }

    // 3. 切換房間背景圖 (若目標為初始走廊則恢復預設 bg，否則載入新房間背景)
    if (targetRoomKey === (mech.initialRoom || "corridor") && mech._originalStageBg) {
      rawBgImg = mech._originalStageBg;
      isBgReady = true;
    } else {
      const newBg = this.getOrLoadRoomBg(mech, targetRoomKey, room);
      if (newBg) {
        rawBgImg = newBg;
        isBgReady = true;
      }
    }

    // 4. 若點開 resetStage 重來，確保切回初始房間
    if (doorCfg && player) {
      player.x = doorCfg.targetX ?? player.x;
      player.y = doorCfg.targetY ?? player.y;
      if (doorCfg.targetDir !== undefined) player.dir = doorCfg.targetDir;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
      player.climbing = false;
      player.ledgeClimbing = false;
    }
  },

  update: function(mech, player, dt, helpers) {
    const col = window.STAGE_COLLISION;
    if (!col || !col.rooms) return;

    // 初次進入關卡時：備份原始背景圖並預載所有子房間背景圖，確保進門瞬間 0 延遲
    if (!mech.initializedRoom) {
      mech.initializedRoom = true;
      mech._originalStageBg = rawBgImg;
      for (const rKey in col.rooms) {
        this.getOrLoadRoomBg(mech, rKey, col.rooms[rKey]);
      }
      this.applyRoomSwitch(mech, mech.currentRoomKey, null, null, helpers);
    }

    // 處理過場黑幕淡出與淡入動畫
    if (mech.fadeState === "FADE_OUT") {
      mech.fadeAlpha += dt / 0.25;
      player.vx = 0;
      if (mech.fadeAlpha >= 1) {
        mech.fadeAlpha = 1;
        if (mech.pendingDoor) {
          this.applyRoomSwitch(mech, mech.pendingDoor.targetRoom, mech.pendingDoor, player, helpers);
          mech.pendingDoor = null;
        }
        mech.fadeState = "FADE_IN";
      }
      return;
    }

    if (mech.fadeState === "FADE_IN") {
      mech.fadeAlpha -= dt / 0.25;
      if (mech.fadeAlpha <= 0) {
        mech.fadeAlpha = 0;
        mech.fadeState = "NONE";
      }
      return;
    }

    // 檢查玩家是否站在當前房間的任何一扇門前
    const curRoom = col.rooms[mech.currentRoomKey];
    mech.activeDoorHover = null;

    if (curRoom && Array.isArray(curRoom.doors)) {
      for (const d of curRoom.doors) {
        const doorCenterX = d.x + d.width * 0.5;
        const doorBotY = d.y + d.height;
        const inHoriz = Math.abs(player.x - doorCenterX) <= (d.width * 0.55 + 16);
        const inVert = Math.abs(player.y - doorBotY) <= 48;

        if (inHoriz && inVert && !player.ledgeClimbing) {
          mech.activeDoorHover = d;
          // 僅限按下「方向鍵 ▲ (Up)」進入門內 (移除 X 鍵觸發)
          if (helpers.wasJustPressed("up")) {
            mech.pendingDoor = d;
            mech.fadeState = "FADE_OUT";
            mech.fadeAlpha = 0;
            player.vy = 0;
            player.grounded = true;
            break;
          }
        }
      }
    }
  },

  draw: function(ctx, mech) {
    const col = window.STAGE_COLLISION;
    if (!col || !col.rooms) return;
    const curRoom = col.rooms[mech.currentRoomKey];

    ctx.save();

    // 1. 若開啟「📐 碰撞:開」除錯模式，標示出當前房間所有門的感應框
    if (typeof showDebugCollision !== "undefined" && showDebugCollision && curRoom && Array.isArray(curRoom.doors)) {
      for (const d of curRoom.doors) {
        ctx.fillStyle = "rgba(241, 196, 15, 0.22)";
        ctx.strokeStyle = "#f1c40f";
        ctx.lineWidth = 3;
        ctx.fillRect(d.x, d.y, d.width, d.height);
        ctx.strokeRect(d.x, d.y, d.width, d.height);
        ctx.fillStyle = "#ffea00";
        ctx.font = 'bold 15px "Microsoft JhengHei"';
        ctx.textAlign = "center";
        ctx.fillText(`🚪 ${d.promptText || d.targetRoom}`, d.x + d.width * 0.5, d.y - 8);
      }
    }

    // 2. 當玩家站在門前時，在門上方繪製「[▲] 進入房間」發光互動提示
    if (mech.activeDoorHover && mech.fadeState === "NONE") {
      const d = mech.activeDoorHover;
      const cx = d.x + d.width * 0.5;
      const bob = Math.sin(performance.now() * 0.006) * 4;
      const cy = d.y - 24 + bob;
      const label = `[▲] ${d.promptText || "進入"}`;

      ctx.font = '900 17px "Microsoft JhengHei"';
      const tw = ctx.measureText(label).width;
      const bw = tw + 32;
      const bh = 34;

      ctx.fillStyle = "rgba(18, 14, 24, 0.92)";
      ctx.strokeStyle = "#f5b041";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(cx - bw * 0.5, cy - bh * 0.5, bw, bh, 17);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffca6b";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, cx, cy + 1);
    }

    // 3. 繪製過場淡入淡出全螢幕黑幕
    if (mech.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(8, 6, 12, ${Math.min(1, mech.fadeAlpha)})`;
      ctx.fillRect(-500, -500, (WORLD_W || 2560) + 1000, (WORLD_H || 1200) + 1000);
    }

    ctx.restore();
  }
});
