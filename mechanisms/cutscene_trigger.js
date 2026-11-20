window.registerMechanismType("cutscene_trigger", {
  // ====== 關卡編輯器專屬設定區 ======
  editorConfig: {
    name: "過場動畫觸發",
    icon: "🎬",
    defaultWidth: 100,
    defaultHeight: 100, 
    params: [
      { key: "triggerType", label: "觸發時機", type: "select", default: "on_start", options: [ { value: "on_start", label: "關卡起始" }, { value: "on_condition", label: "滿足條件" }, { value: "on_win", label: "觸發過關" } ] },
      { key: "videoUrl", label: "指定過場動畫路徑", type: "string", default: "intro.mp4" },
      { key: "targetObjectId", label: "目標 ID", type: "string", default: "" },
      { key: "targetParam", label: "檢查參數", type: "string", default: "isBurning" },
      { key: "targetValue", label: "觸發狀態", type: "string", default: "true" }
    ]
  },
  // =====================================

  getPlayedStore: function() {
    if (!(window._CUTSCENE_PLAYED_KEYS instanceof Set)) {
      window._CUTSCENE_PLAYED_KEYS = new Set();
    }
    return window._CUTSCENE_PLAYED_KEYS;
  },

  getPlayKey: function(mech) {
    if (mech.id) return mech.id;
    return `${mech.triggerType || ""}_${mech.videoUrl || ""}_${mech.x || 0}_${mech.y || 0}`;
  },

  init: function(mech) {
    mech.hidden = false; 

    if (mech.videoUrl && !mech.videoUrl.includes('/')) {
        mech.videoUrl = "video/" + mech.videoUrl;
    }

    const reg = window.GAME_MECHANISMS_REGISTRY["cutscene_trigger"] || this;
    const playedStore = reg.getPlayedStore();
    const playKey = reg.getPlayKey(mech);
    const isCheckpointRespawn = (typeof hasCheckpointSnapshot !== 'undefined' && hasCheckpointSnapshot);

    if (isCheckpointRespawn) {
      // 從存檔點快照重生時保留已播放狀態，避免重複觸發
      mech.hasPlayed = playedStore.has(playKey);
    } else {
      // 正常進入關卡或重新開始關卡時清除紀錄
      playedStore.delete(playKey);
      mech.hasPlayed = false;
    }
  },

  // 獨立出共用的播放邏輯，讓 update 和 draw 都能安全呼叫
  triggerVideo: async function(mech, playerRef) {
    const reg = window.GAME_MECHANISMS_REGISTRY["cutscene_trigger"] || this;
    const playKey = reg.getPlayKey(mech);

    mech.hasPlayed = true;
    reg.getPlayedStore().add(playKey);

    const unlockPlayer = () => {
      if (playerRef) {
        playerRef.lockDefaultMove = false;
        playerRef.overrideVx = null;
        playerRef.overrideVy = null;
      }
    };

    if (playerRef) {
      playerRef.lockDefaultMove = true; 
      playerRef.overrideVx = 0;
      playerRef.overrideVy = 0; 
    }

    let finalVideoUrl = mech.videoUrl;
    let shouldRevokeUrl = false;

    const cleanPath = (mech.videoUrl || "").split(/[?#]/)[0].toLowerCase();
    const isMp4 = cleanPath.endsWith(".mp4");
    const is4pm = cleanPath.endsWith(".4pm");
    
    if (typeof window.findVirtualFile === 'function') {
      const vFile = window.findVirtualFile(mech.videoUrl);
      if (vFile) {
        if (is4pm) {
          // 副檔名為 .4pm 時，強制封裝為 video/mp4 Blob 播放
          const mp4Blob = new Blob([vFile], { type: "video/mp4" });
          finalVideoUrl = URL.createObjectURL(mp4Blob);
        } else {
          // .mp4 或其他格式維持原本的播放方式
          finalVideoUrl = URL.createObjectURL(vFile);
        }
        shouldRevokeUrl = true;
      } else {
        alert(`⚠️ 找不到過場動畫！\n路徑: ${mech.videoUrl}\n請確認 video 資料夾內有此檔案。`);
        unlockPlayer();
        return; 
      }
    } else if (is4pm) {
      // 網頁正式環境下讀取 .4pm 檔案，於記憶體轉為 video/mp4 Blob URL 播放
      try {
        const res = await fetch(mech.videoUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const rawBlob = await res.blob();
        const mp4Blob = new Blob([rawBlob], { type: "video/mp4" });
        finalVideoUrl = URL.createObjectURL(mp4Blob);
        shouldRevokeUrl = true;
      } catch (err) {
        console.error("載入 .4pm 過場動畫失敗:", err);
        alert(`⚠️ 無法載入過場動畫！\n路徑: ${mech.videoUrl}\n請確認檔案存在且路徑正確。`);
        unlockPlayer();
        return;
      }
    } else if (isMp4) {
      // .mp4 直接使用原路徑正常播放
      finalVideoUrl = mech.videoUrl;
    }

    if (window.playStageCutscene) {
      window.playStageCutscene(finalVideoUrl, function onComplete() {
        if (shouldRevokeUrl) URL.revokeObjectURL(finalVideoUrl);
        unlockPlayer();
      });
    } else {
      if (shouldRevokeUrl) URL.revokeObjectURL(finalVideoUrl);
      unlockPlayer();
    }
  },
  
  update: function(mech, p, dt, pluginCtx) {
    const reg = window.GAME_MECHANISMS_REGISTRY["cutscene_trigger"] || this;
    const playKey = reg.getPlayKey(mech);

    if (mech.hasPlayed || reg.getPlayedStore().has(playKey)) {
      mech.hasPlayed = true;
      return;
    }

    let shouldPlay = false;

    // 一般的 on_start 和 on_condition 照舊在 update 處理
    if (mech.triggerType === 'on_start') {
      shouldPlay = true;
    } 
    else if (mech.triggerType === 'on_condition') {
      if (mech.targetObjectId && mech.targetParam) {
        const allEntities = [...pluginCtx.mechanisms, ...pluginCtx.items];
        const targetObj = allEntities.find(ent => ent.id === mech.targetObjectId);
        
        if (targetObj && targetObj[mech.targetParam] !== undefined) {
          let expectedValue = mech.targetValue;
          if (expectedValue === "true") expectedValue = true;
          if (expectedValue === "false") expectedValue = false;
          
          if (targetObj[mech.targetParam] === expectedValue) {
            shouldPlay = true;
          }
        }
      }
    }

    if (shouldPlay) {
      reg.triggerVideo(mech, p);
    }
  },

  draw: function(ctx, mech, customImg) {
    // 👉 神奇的攔截點：因為 draw 是在主程式宣告 player.won = true 之後才執行的
    // 我們在這裡可以輕鬆抓到過關的瞬間，並把動畫強制插播進去！
    const reg = window.GAME_MECHANISMS_REGISTRY["cutscene_trigger"] || this;
    const playKey = reg.getPlayKey(mech);

    if (mech.triggerType === 'on_win' && !mech.hasPlayed && !reg.getPlayedStore().has(playKey)) {
      if (typeof player !== 'undefined' && player.won) {
        reg.triggerVideo(mech, player);
      }
    }

    // Debug 模式繪圖
    if (window.showDebugCollision) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.fillRect(mech.x, mech.y, mech.width, mech.height);
      ctx.strokeRect(mech.x, mech.y, mech.width, mech.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`🎬 ${mech.triggerType}`, mech.x + 4, mech.y + 16);
      ctx.restore();
    }
  }
});
