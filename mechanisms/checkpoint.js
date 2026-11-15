// ==========================================
// 模組化外掛機關：重生記錄點 (mechanisms/checkpoint.js)
// ==========================================
window.registerMechanismType("checkpoint", {
  
  // ===== 關卡編輯器讀取的參數定義區 =====
  editorConfig: {
    name: "重生記錄點",
    icon: "💾",
    params: [
      { 
        key: "spawnDir", 
        label: "重生後面向 (spawnDir)", 
        type: "select", 
        default: 1, 
        options: [
          { value: 1, label: "向右 (1)" },
          { value: -1, label: "向左 (-1)" }
        ] 
      },
      { 
        key: "texture", 
        label: "貼圖路徑 (texture)", 
        type: "string", 
        default: "image/flag.png" 
      }
    ]
  },
  // =====================================

  solid: false, // 這是虛擬觸發區，玩家可以直接穿過去

  init: function(mech) {
    mech.width = mech.width || 40;
    mech.height = mech.height || 80;
    mech.activated = false; // 紀錄是否已經被踩過
    mech.spawnDir = mech.spawnDir || 1;
  },

  update: function(mech, player, dt, ctx) {
    // 如果已經踩過，就不需要重複觸發
    if (mech.activated) return;

    // 判斷玩家的中心點是否進入了這個記錄點的範圍
    const hit = player.x >= mech.x && player.x <= mech.x + mech.width &&
                player.y >= mech.y - 20 && player.y <= mech.y + mech.height + 20;

    if (hit) {
      mech.activated = true;

      const newSpawnX = mech.x + (mech.width / 2);
      const newSpawnY = mech.y + mech.height;
      player.spawnX = newSpawnX;
      player.spawnY = newSpawnY;
      if (player.dir !== undefined) {
         player.spawnDir = mech.spawnDir;
      }
      if (window.STAGE_COLLISION && window.STAGE_COLLISION.playerSpawn) {
         window.STAGE_COLLISION.playerSpawn.x = newSpawnX;
         window.STAGE_COLLISION.playerSpawn.y = newSpawnY;
         window.STAGE_COLLISION.playerSpawn.dir = mech.spawnDir;
      }
      
      // 👇 呼叫主程式儲存當前世界快照 👇
      if (typeof saveStageSnapshot === 'function') {
          hasCheckpointSnapshot = true;
          saveStageSnapshot();
      }
      
      console.log("💾 已記錄新的重生點並儲存世界快照！");
    }
  },

  draw: function(ctx, mech, img) {
    ctx.save();
    
    // 如果有指定圖片，優先畫圖片
    if (img && img.complete && img.naturalWidth !== 0) {
      // 沒踩過時半透明，踩過後變實體亮色
      ctx.globalAlpha = mech.activated ? 1.0 : 0.5;
      ctx.drawImage(img, mech.x, mech.y, mech.width, mech.height);
    } else {
      // 預設的圖形標記：畫一根旗子
      
      // 旗桿
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(mech.x + 4, mech.y, 4, mech.height);
      
      // 旗幟 (未踩過是灰色，踩過變亮綠色)
      ctx.fillStyle = mech.activated ? '#2ecc71' : '#bdc3c7';
      ctx.beginPath();
      ctx.moveTo(mech.x + 8, mech.y + 4);
      ctx.lineTo(mech.x + 36, mech.y + 16);
      ctx.lineTo(mech.x + 8, mech.y + 28);
      ctx.fill();
    }
    
    ctx.restore();
  }
});
