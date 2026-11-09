// ==========================================
// 模組化外掛機關：地板按鈕 (mechanisms/floor_button.js)
// ==========================================
window.registerMechanismType("floor_button", {
  solid: false, 
  isPlatform: true, // 告訴物理引擎這是可以走上去的平台，不會擋住左右移動

  // 讓關卡編輯器自動讀取這些設定
  editorConfig: {
    name: "地板按鈕",
    icon: "🔘",
    params: [
      { key: "targetId", label: "連動目標 ID (targetId)", type: "string", default: "" },
      { key: "speed", label: "按壓速度 (speed)", type: "number", default: 3.5, step: 0.1 },
      { key: "setPropKey", label: "修改目標變數名稱 (setPropKey)", type: "string", default: "" },
      { key: "setPropVal", label: "修改目標變數數值 (setPropVal)", type: "string", default: "" },
      { key: "colorNormal", label: "原始顏色 (colorNormal)", type: "color", default: "#e74c3c" },
      { key: "colorPressed", label: "按下顏色 (colorPressed)", type: "color", default: "#27ae60" },
      { key: "rebound", label: "是否回彈 (rebound)", type: "boolean", default: true }
    ]
  },


  init: function(mech) {
    mech.baseY = mech.y;
    mech.baseHeight = mech.height || 16;
    mech.width = mech.width || 48;
    mech.isPressed = false;
    mech.pressProgress = 0; 
    mech.speed = mech.speed || 3.5; 
    mech.colorNormal = mech.colorNormal || '#e74c3c';
    mech.colorPressed = mech.colorPressed || '#27ae60';
    mech.rebound = mech.rebound !== undefined ? mech.rebound : true; // 預設為 true (會回彈)
  },

  update: function(mech, player, dt, ctx) {
    // 檢查目標是否有效 (不是 _locked_ 且場上有這個 ID)
    const hasValidTarget = mech.targetId && 
                           mech.targetId !== "_locked_" && 
                           (ctx.mechanisms || []).some(m => m.id === mech.targetId);

    const px = player.x;
    const py = player.y;
    
    // 判斷是否踩中
    const isStepped = (
      px > mech.x && 
      px < mech.x + mech.width && 
      py >= mech.baseY - 18 && 
      py <= mech.baseY + 28
    );

    if (isStepped && hasValidTarget) {
      mech.isPressed = true;
    } else if (mech.rebound !== false) { 
      // 若設定不回彈 (rebound 為 false)，離開時就不會變回 false
      mech.isPressed = false;
    }
    
    // 處理按鈕本身的視覺下壓/回彈動畫
    if (mech.isPressed) {
      mech.pressProgress = Math.min(1, mech.pressProgress + dt * mech.speed * 1.5); 
    } else {
      mech.pressProgress = Math.max(0, mech.pressProgress - dt * mech.speed * 0.5); 
    }

    const pressAmount = mech.baseHeight * 0.7 * mech.pressProgress;
    mech.y = mech.baseY + pressAmount;
    mech.height = mech.baseHeight - pressAmount;

    // 如果有綁定有效目標，執行連動
    if (hasValidTarget) {
      for (const target of ctx.mechanisms) {
        if (target.id === mech.targetId) {
          // 1. 預設的自動門控制邏輯
          if (target.type === 'auto_gate') {
             // 👇 修正點：改為傳遞嚴格的邏輯狀態 (0 或 1)，而非帶有殘留動畫的 pressProgress
             target.internalProgress = mech.isPressed ? 1 : 0;
          }
          // 2. 萬用變數修改邏輯 (支援 setPropKey)
          if (mech.setPropKey && mech.isPressed) {
             target[mech.setPropKey] = mech.setPropVal;
          }
        }
      }
    }
  },

  draw: function(ctx, mech, img) {
    ctx.save();
    if (!window.drawEntityTexture(ctx, mech, img)) {
      ctx.fillStyle = '#2d3436';
      ctx.fillRect(mech.x - 4, mech.baseY + mech.baseHeight - 6, mech.width + 8, 6);
      
      ctx.fillStyle = mech.isPressed ? mech.colorPressed : mech.colorNormal;
      ctx.strokeStyle = '#1e272e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mech.x, mech.y, mech.width, mech.height, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
});
