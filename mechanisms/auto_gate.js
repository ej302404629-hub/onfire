// ==========================================
// 模組化外掛機關：自動升降閘門 (mechanisms/auto_gate.js)
// ==========================================
window.registerMechanismType("auto_gate", {
  
  // ===== 關卡編輯器讀取的參數定義區 =====
  editorConfig: {
    name: "自動升降門",
    icon: "🚧",
    hasWizard: true, // 標示此機關有專屬建立精靈
    params: {
      openDir: {
        label: "開門方向 (openDir)",
        type: "select",
        default: "up",
        options: [
          { value: "up", label: "往上開 (up)" },
          { value: "down", label: "往下開 (down)" }
        ]
      },
      openDistance: {
        label: "開啟距離 (openDistance)",
        type: "number",
        default: 200,
        step: 10
      },
      gateSpeed: {
        label: "開門速度倍率 (gateSpeed)",
        type: "number",
        default: 2.0,
        step: 0.2
      },
      gateSpeedClose: {
        label: "關門速度倍率 (gateSpeedClose)",
        type: "number",
        default: 2.0,
        step: 0.2
      },
      closeDelay: {
        label: "延遲關門秒數 (closeDelay)",
        type: "number",
        default: 1.2,
        step: 0.2
      },
      texture: {
        label: "貼圖路徑 (texture)",
        type: "string",
        default: "image/wood01.png"
      }
    }
  },
  // =====================================

  solid: true, // 門本身是一道實心牆

  init: function(mech) {
    mech.baseX = mech.x;
    mech.baseY = mech.y;
    mech.baseWidth = mech.width || 32;
    mech.baseHeight = mech.height || 160;
    
    const dir = String(mech.openDir || 'up').toLowerCase();
    mech.openDist = mech.openDistance || mech.baseHeight;
    mech.openDir = dir;
    
    mech.internalProgress = 0; // 用來接收按鈕傳來的訊號
    mech.visualProgress = 0;   // 木門獨立的物理移動進度，防止被按鈕綁架
    mech.currentCloseTimer = 0; // 關門延遲計時器
  },

  update: function(mech, player, dt, ctx) {
    // 外部（按鈕）會每幀持續覆寫 internalProgress，
    // 我們只把它當作「是否有被觸發」的開關訊號 (大於 0 即代表踩下)
    const shouldOpen = (mech.internalProgress > 0);

    // 讀取編輯器設定的速度與延遲參數
    const speedMultiplierOpen = (mech.gateSpeed !== undefined) ? mech.gateSpeed : 2.0;
    const speedMultiplierClose = (mech.gateSpeedClose !== undefined) ? mech.gateSpeedClose : speedMultiplierOpen;
    const delaySetting = (mech.closeDelay !== undefined) ? mech.closeDelay : 1.2;

    // 讓木門用自己的 visualProgress 來移動，徹底擺脫按鈕動畫干擾
    if (shouldOpen) {
      // 玩家踩著按鈕：重置延遲計時器，並以開門速度打開
      mech.currentCloseTimer = delaySetting;
      mech.visualProgress = Math.min(1, mech.visualProgress + dt * speedMultiplierOpen);
    } else {
      // 玩家離開按鈕：先倒數延遲計時器
      if (mech.currentCloseTimer > 0) {
        mech.currentCloseTimer -= dt;
      } else {
        // 時間到：以關門速度關閉
        mech.visualProgress = Math.max(0, mech.visualProgress - dt * speedMultiplierClose);
      }
    }

    // 依據當前進度計算開啟的實際像素距離
    const currentOpenDist = mech.openDist * mech.visualProgress;

    // 更新實體座標以產生位移效果
    if (mech.openDir === 'up') {
      mech.y = mech.baseY - currentOpenDist;
    } else {
      mech.height = mech.baseHeight - currentOpenDist;
    }

    // 防呆處理，避免高度變為負數
    if (mech.height < 0) mech.height = 0;
  },

  draw: function(ctx, mech, img) {
    ctx.save();
    // 優先使用主程式透過 texture 屬性預載並傳入的圖片 (img)
    if (img && img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, mech.x, mech.y, mech.width, mech.height);
    } else if (!window.drawEntityTexture(ctx, mech, img)) {
      ctx.fillStyle = '#4b6584';
      ctx.strokeStyle = '#3867d6';
      ctx.lineWidth = 3;
      ctx.fillRect(mech.x, mech.y, mech.width, mech.height);
      ctx.strokeRect(mech.x, mech.y, mech.width, mech.height);
      
      ctx.beginPath();
      ctx.rect(mech.x, mech.y, mech.width, mech.height);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 6;
      for(let y = mech.y - 20; y < mech.y + mech.height + 20; y += 18) {
         ctx.beginPath();
         ctx.moveTo(mech.x, y);
         ctx.lineTo(mech.x + mech.width, y + 12);
         ctx.stroke();
      }
    }
    ctx.restore();
  }
});
