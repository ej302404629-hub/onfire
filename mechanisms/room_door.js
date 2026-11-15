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

  // 智慧預載與取得指定房間的背景圖片
  getOrLoadRoomBg: function(mech, roomKey, roomData) {
    if (mech.roomBgCache[roomKey]) return mech.roomBgCache[roomKey];
    if (!roomData || !Array.isArray(roomData.bgCandidates)) return null;

    const img = new Image();
    mech.roomBgCache[roomKey] = img;

    let stagePath = "stage/stage01";
    let stageFolder = "stage01";
    if (typeof loadedStages !== "undefined" && typeof selectedStageIdx !== "undefined" && loadedStages[selectedStageIdx]) {
      stagePath = loadedStages[selectedStageIdx].path || stagePath;
      stageFolder = loadedStages[selectedStageIdx].folder || stageFolder;
    }

    const tryLoadCandidate = (idx) => {
      if (idx >= roomData.bgCandidates.length) return;
      const fileName = roomData.bgCandidates[idx];

      if (typeof loadSmartImage === "function") {
        loadSmartImage(img, `${stagePath}/${fileName}`, () => { img._ready = true; }, `${stageFolder}/${fileName}`)
          .then((ok) => { if (!ok) tryLoadCandidate(idx + 1); });
      } else {
        img.onload = () => { img._ready = true; };
        img.onerror = () => tryLoadCandidate(idx + 1);
        img.src = `${stagePath}/${fileName}`;
      }
    };
    tryLoadCandidate(0);
    return img;
  },

  // 執行房間物理碰撞資料、背景與機關的無縫切換
  applyRoomSwitch: function(mech, targetRoomKey, doorCfg, player, helpers) {
    const col = window.STAGE_COLLISION;
    if (!col || !col.rooms || !col.rooms[targetRoomKey]) return;

    const room = col.rooms[targetRoomKey];
    mech.currentRoomKey = targetRoomKey;

    // 1. 原地更新主程式的地形與判定區
    if (helpers.groundPolylines && Array.isArray(room.groundPolylines)) {
      helpers.groundPolylines.length = 0;
      room.groundPolylines.forEach(p => helpers.groundPolylines.push(JSON.parse(JSON.stringify(p))));
    }
    if (helpers.solidWalls && Array.isArray(room.solidWalls)) {
      helpers.solidWalls.length = 0;
      room.solidWalls.forEach(w => helpers.solidWalls.push(JSON.parse(JSON.stringify(w))));
    }
    // 支援天花板陣列替換 (若引擎有實裝)
    if (helpers.ceilings && Array.isArray(room.ceilings)) {
      helpers.ceilings.length = 0;
      room.ceilings.forEach(c => helpers.ceilings.push(JSON.parse(JSON.stringify(c))));
    }
    if (typeof LADDERS !== "undefined" && Array.isArray(room.ladders)) {
      LADDERS.length = 0;
      room.ladders.forEach(l => LADDERS.push(JSON.parse(JSON.stringify(l))));
    }
    if (helpers.frictionZones && Array.isArray(room.frictionZones)) {
      helpers.frictionZones.length = 0;
      room.frictionZones.forEach(z => helpers.frictionZones.push(JSON.parse(JSON.stringify(z))));
    }

    // 2. ★ 替換機關與道具 (從全域快取實體中挑選出屬於目標房間的物件，保留引擎的 methods)
    if (helpers.mechanisms && mech.allInstantiatedMechanisms) {
      helpers.mechanisms.length = 0;
      mech.allInstantiatedMechanisms.forEach(m => {
        // 全局管理員、無房標記或屬於新房間的機關才放入執行陣列
        if (!m.room || m.room === targetRoomKey || m.id === "room_door_manager" || m.alwaysDraw) {
          helpers.mechanisms.push(m);
        }
      });
    }

    if (helpers.items && mech.allInstantiatedItems) {
      helpers.items.length = 0;
      mech.allInstantiatedItems.forEach(it => {
        // 加入 it.isHeld 條件，確保玩家手上的道具過門時會被保留
        if (!it.room || it.room === targetRoomKey || it.isHeld) {
          helpers.items.push(it);
        }
      });
    }


    // 3. 同步更新關卡世界寬高與過關終點判定區
    if (room.worldWidth) WORLD_W = room.worldWidth;
    if (room.worldHeight) WORLD_H = room.worldHeight;
    if (room.goalArea && typeof GOAL_CONDITION !== "undefined") {
      GOAL_CONDITION = JSON.parse(JSON.stringify(room.goalArea));
    }

    // 4. 切換房間背景圖
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

    // 5. 確保玩家落點
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

    // 初次進入關卡時：快取實體、備份背景圖
    if (!mech.initializedRoom) {
      mech.initializedRoom = true;
      mech._originalStageBg = rawBgImg;

      // ★ 在第 1 幀，把已經被引擎成功初始化的所有機關與道具「快取」起來
      mech.allInstantiatedMechanisms = helpers.mechanisms ? helpers.mechanisms.slice() : [];
      mech.allInstantiatedItems = helpers.items ? helpers.items.slice() : [];

      for (const rKey in col.rooms) {
        this.getOrLoadRoomBg(mech, rKey, col.rooms[rKey]);
      }
      
      // 立即套用房間過濾，關閉其他房間的實體
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
  
  _drawUpArrowIcon: function(ctx, cx, cy, radius) {
    ctx.save();
    const grad = ctx.createRadialGradient(cx - radius * 0.28, cy - radius * 0.28, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, '#383542');
    grad.addColorStop(0.65, '#191720');
    grad.addColorStop(1, '#0d0c12');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#b7950b'; 
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 繪製與主程式 D-Pad 相同的向上三角形符號
    ctx.fillStyle = '#ffca6b';
    ctx.font = `900 ${Math.round(radius * 1.35)}px "Segoe UI Symbol", "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▲', cx, cy + 1);

    ctx.restore();


  },

  draw: function(ctx, mech) {
    const col = window.STAGE_COLLISION;
    if (!col || !col.rooms) return;
    const curRoom = col.rooms[mech.currentRoomKey];

    ctx.save();
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

    if (mech.activeDoorHover && mech.fadeState === "NONE") {
      const d = mech.activeDoorHover;
      const cx = d.x + d.width * 0.5;
      const bob = Math.sin(performance.now() * 0.006) * 4;
      const promptScale = 1.6;
      const promptRadius = 11 * promptScale;
      const cy = d.y - promptRadius - 15 + bob;
      this._drawUpArrowIcon(ctx, cx, cy, promptRadius);
    }

    if (mech.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(8, 6, 12, ${Math.min(1, mech.fadeAlpha)})`;
      ctx.fillRect(-500, -500, (WORLD_W || 2560) + 1000, (WORLD_H || 1200) + 1000);
    }

    ctx.restore();
  }
});
