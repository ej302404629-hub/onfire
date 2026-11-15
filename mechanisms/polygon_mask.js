// ==========================================
// 模組化外掛機關：自訂多邊形前景遮罩 (polygon_mask)
// 支援自由拖曳多個頂點，形成任意形狀遮罩
// ==========================================
window.registerMechanismType("polygon_mask", {
  editorConfig: {
    name: "多邊形遮罩",
    icon: "💎",
    isPoly: true, // 標示給編輯器知道這是多邊形物件
    params: {
      opacityWhenInside: { label: "進入時透明度 (0~1)", type: "number", default: 0.5, step: 0.1, min: 0, max: 1 },
      texture: { label: "自訂貼圖路徑 (留空用原背景)", type: "string", default: "" }
    }
  },

  solid: false,
  isForeground: true,

  init: function(mech) {
    mech.playerInside = false;
    mech.opacityWhenInside = mech.opacityWhenInside !== undefined ? mech.opacityWhenInside : 0.5;
    
    // 如果沒有節點資料，預設給定一個倒三角形
    if (!mech.pts || !Array.isArray(mech.pts)) {
      mech.pts = [
        [mech.x || 300, (mech.y || 300) - 60],
        [(mech.x || 300) + 60, (mech.y || 300) + 60],
        [(mech.x || 300) - 60, (mech.y || 300) + 60]
      ];
    }
  },

  update: function(mech, player, dt) {
    if (!mech.pts || mech.pts.length < 3) return;

    // 1. 自動計算外包圍盒 (Bounding Box)，相容主程式底層與F12除錯框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of mech.pts) {
      minX = Math.min(minX, pt[0]); minY = Math.min(minY, pt[1]);
      maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]);
    }
    mech.x = minX; mech.y = minY;
    mech.width = maxX - minX; mech.height = maxY - minY;

    // 2. 射線法 (Ray-casting) 判斷角色是否在多邊形內
    const px = player.x;
    const py = player.y - 30; // 判斷點對準角色身體中央
    
    let inside = false;
    for (let i = 0, j = mech.pts.length - 1; i < mech.pts.length; j = i++) {
      const xi = mech.pts[i][0], yi = mech.pts[i][1];
      const xj = mech.pts[j][0], yj = mech.pts[j][1];
      
      const intersect = ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    mech.playerInside = inside;
  },

  draw: function(ctx, mech, customImg) {
    if (!mech.pts || mech.pts.length < 3) return;
    
    ctx.save();
    ctx.globalAlpha = mech.playerInside ? mech.opacityWhenInside : 1.0;
    
    // 建立多邊形路徑並裁切 (Clip)
    ctx.beginPath();
    ctx.moveTo(mech.pts[0][0], mech.pts[0][1]);
    for (let i = 1; i < mech.pts.length; i++) {
      ctx.lineTo(mech.pts[i][0], mech.pts[i][1]);
    }
    ctx.closePath();
    ctx.clip(); 

    // 繪製背景或貼圖
    if (customImg && customImg.complete && customImg.naturalWidth > 0) {
      ctx.drawImage(customImg, mech.x, mech.y, mech.width, mech.height);
    } else if (window.CURRENT_STAGE_BG && window.CURRENT_STAGE_BG.complete && window.CURRENT_STAGE_BG.naturalWidth > 0) {
      const bg = window.CURRENT_STAGE_BG;
      const scaleX = bg.naturalWidth / (window.CURRENT_WORLD_W || 2560);
      const scaleY = bg.naturalHeight / (window.CURRENT_WORLD_H || 620);
      ctx.drawImage(bg, mech.x * scaleX, mech.y * scaleY, mech.width * scaleX, mech.height * scaleY, mech.x, mech.y, mech.width, mech.height);
    } else {
      const grad = ctx.createLinearGradient(0, mech.y, 0, mech.y + mech.height);
      grad.addColorStop(0, '#576574'); 
      grad.addColorStop(1, '#222f3e');
      ctx.fillStyle = grad; 
      ctx.fillRect(mech.x, mech.y, mech.width, mech.height);
    }
    ctx.restore();
  }
});
