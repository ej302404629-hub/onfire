// ==========================================
// 模組化外掛機關：死亡陷阱 (mechanisms/death_trap.js)
// 特色：完美複製主引擎死亡動畫，自動適應不同角色外觀，且無須修改主程式
// ==========================================
window.registerMechanismType("death_trap", {
  
  editorConfig: {
    name: "死亡陷阱",
    icon: "💀",
    hasWizard: false,
    defaultWidth: 120,
    defaultHeight: 120,
    params: {
      deathType: {
        label: "死亡方式 (deathType)",
        type: "select",
        default: "burned",
        options: [
          { value: "burned", label: "🔥 燒死 (burned)" }
          // 日後新增死法直接加在這裡，例如：
          // { value: "spikes", label: "⚔️ 刺死 (spikes)" }
        ]
      }
    }
  },

  solid: false,

  init: function(mech) {
    mech.width = mech.width !== undefined ? mech.width : 120;
    mech.height = mech.height !== undefined ? mech.height : 120;
    mech.deathType = mech.deathType || "burned";
    mech.isKilling = false;
    mech.killAnimTimer = 0;
  },

  update: function(mech, player, dt, pluginCtx) {
    // 1. 如果正在執行處決動畫，則負責產生與主引擎一模一樣的灰燼與濃煙粒子
    if (mech.isKilling && mech.victim) {
      mech.killAnimTimer += dt;
      
      // 模擬主引擎在 1.0 秒內的濃煙與飛灰效果
      if (mech.killAnimTimer <= 1.0 && mech.deathType === "burned") {
        for (let k = 0; k < 4; k++) {
          pluginCtx.particles.push({
            type: 'death_ash',
            x: player.x + (Math.random() - 0.5) * 20,
            y: player.y - 30 + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 280,
            vy: -150 - Math.random() * 200,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1.0,
            color: Math.random() > 0.5 ? '#1a1a1a' : '#333333',
            r: 2 + Math.random() * 3
          });
        }
        if (Math.random() < 0.4) {
          pluginCtx.particles.push({
            type: 'death_smoke',
            x: player.x + (Math.random() - 0.5) * 20,
            y: player.y - 40,
            vx: (Math.random() - 0.5) * 100,
            vy: -100 - Math.random() * 100,
            life: 0.6 + Math.random() * 0.4,
            maxLife: 1.0,
            r: 10 + Math.random() * 15
          });
        }
      }
      return; // 已經在處決中，跳過碰撞偵測
    }

    // 2. 尚未處決，進行防高速穿透的 AABB 碰撞偵測
    if (player.dead || player.dying) return;

    const px = player.x;
    const py = player.y;
    const prevY = player.prevY !== undefined ? player.prevY : py;

    const inX = (px >= mech.x - 15 && px <= mech.x + mech.width + 15);
    const inY = (py >= mech.y && py <= mech.y + mech.height) || 
                (prevY <= mech.y && py >= mech.y + mech.height); 

    if (inX && inY) {
      // 💥 觸發死亡 💥
      mech.isKilling = true;
      mech.killAnimTimer = 0;
      mech.victim = player;
      mech.charStats = pluginCtx.getCharStats(); // 取得當前角色的外觀數據！
      
      player.hp = 0;
      player.dying = true;
      player.deathTimer = 1.01; // 立刻隱藏主引擎的火柴人，由本外掛接手繪製
      player.vx = 0;
      player.vy = 0;
      player.lockDefaultMove = true;
      player.deathCause = 'fire';
    }
  },

  draw: function(ctx, mech, img) {
    // 專屬死亡動畫渲染區
    if (mech.isKilling && mech.victim && mech.charStats) {
      const p = Math.max(0, Math.min(1, mech.killAnimTimer / 1.0));
      if (p >= 1) return; // 1秒後燒成灰燼，完全消失

      const px = mech.victim.x;
      const py = mech.victim.y;
      const c = mech.charStats; // 自動套用當前遊玩角色的身材與顏色
      const d = mech.victim.dir || 1;
      
      ctx.save();
      ctx.translate(px, py);

      // --- 複製主程式：逐漸變成焦黑並縮水 ---
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.scale(1 - p * 0.4, 1 + p * 0.2);
      ctx.filter = `grayscale(100%) brightness(${Math.max(10, 100 - p * 250)}%)`;

      const r = c.headR;
      const bw = c.bodyW;
      const bh = c.bodyH;
      const lw = c.limbW;
      const hy = -(bh + r + 28); // 準確計算頭部高度

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = lw;

      // 1. 畫後方手腳
      ctx.strokeStyle = '#2b211e';
      ctx.beginPath(); ctx.moveTo(-3, -32); ctx.lineTo(-12, -16); ctx.lineTo(-14, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, hy + r + 6); ctx.lineTo(-14, hy + r + 20); ctx.lineTo(-18, hy + r + 34); ctx.stroke();

      // 2. 畫身體 (倒梯形)
      ctx.fillStyle = c.bodyColor;
      ctx.strokeStyle = '#080605';
      ctx.lineWidth = 3.2;
      const topW = bw * 0.35, hipW = bw * 0.45;
      ctx.beginPath();
      ctx.moveTo(-topW, hy + r + 4);
      ctx.lineTo(topW, hy + r + 4);
      ctx.lineTo(hipW, -36);
      ctx.lineTo(-hipW, -36);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // 3. 畫前方手腳
      ctx.lineWidth = lw;
      ctx.strokeStyle = '#2b211e';
      ctx.beginPath(); ctx.moveTo(3, -32); ctx.lineTo(12, -16); ctx.lineTo(14, -2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, hy + r + 6); ctx.lineTo(14, hy + r + 20); ctx.lineTo(18, hy + r + 34); ctx.stroke();

      // 4. 畫頭部與馬尾
      ctx.translate(d * 4, hy + 6);
      if (c.ponytail) {
        const tailDir = -d;
        ctx.save();
        ctx.translate(tailDir * (r * 0.72), -r * 0.5);
        ctx.fillStyle = '#c92a2a'; ctx.strokeStyle = '#080605'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(tailDir*20, -20, tailDir*32, -4); ctx.quadraticCurveTo(tailDir*30, 18, 0, 10); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      const hGrad = ctx.createRadialGradient(-d * r * 0.25, -r * 0.25, r * 0.15, 0, 0, r);
      hGrad.addColorStop(0, c.headColor);
      hGrad.addColorStop(0.75, '#b82020');
      hGrad.addColorStop(1, '#7a1212');
      ctx.fillStyle = hGrad;
      ctx.strokeStyle = '#080605';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // 5. 複製主程式：猛烈燃燒的火焰特效 (完全移植)
      if (mech.deathType === "burned") {
        const now = performance.now();
        const flk1 = 1.0 + Math.sin(now * 0.032) * 0.22;
        const flk2 = 1.0 + Math.cos(now * 0.045) * 0.25;
        const sway = Math.sin(now * 0.02) * 8;

        ctx.save();
        ctx.translate(0, -r * 0.5);
        
        // 橘黃色光暈
        const fireGlow = ctx.createRadialGradient(0, -r * 1.2, r * 0.2, 0, -r * 1.2, r * 4.2);
        fireGlow.addColorStop(0, 'rgba(255, 220, 80, 0.75)');
        fireGlow.addColorStop(0.45, 'rgba(255, 65, 15, 0.45)');
        fireGlow.addColorStop(1, 'rgba(255, 20, 0, 0)');
        ctx.fillStyle = fireGlow;
        ctx.beginPath(); ctx.arc(0, -r * 1.2, r * 4.2, 0, Math.PI * 2); ctx.fill();

        // 外層紅色火焰
        ctx.fillStyle = '#ff2a00'; ctx.strokeStyle = '#1a0500'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-r * 1.35, r * 0.3);
        ctx.quadraticCurveTo(-r * 1.85, -r * 1.2, -r * 1.15 + sway * 0.5, -r * 2.5 * flk1);
        ctx.lineTo(-r * 0.55, -r * 1.5);
        ctx.quadraticCurveTo(-r * 0.4, -r * 2.8, sway, -r * 3.7 * flk2);
        ctx.quadraticCurveTo(r * 0.4, -r * 2.8, r * 0.55, -r * 1.5);
        ctx.lineTo(r * 1.15 + sway * 0.5, -r * 2.4 * flk2);
        ctx.quadraticCurveTo(r * 1.85, -r * 1.2, r * 1.35, r * 0.3);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 中層橘色火焰
        ctx.fillStyle = '#ff7b00';
        ctx.beginPath();
        ctx.moveTo(-r * 1.0, r * 0.25);
        ctx.quadraticCurveTo(-r * 1.3, -r * 1.0, -r * 0.7 + sway * 0.4, -r * 2.0 * flk2);
        ctx.lineTo(-r * 0.25, -r * 1.2);
        ctx.quadraticCurveTo(0, -r * 2.3, sway * 0.7, -r * 2.9 * flk1);
        ctx.quadraticCurveTo(r * 0.25, -r * 2.1, r * 0.3, -r * 1.2);
        ctx.lineTo(r * 0.75 + sway * 0.4, -r * 1.9 * flk1);
        ctx.quadraticCurveTo(r * 1.3, -r * 1.0, r * 1.0, r * 0.25);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // 內層黃色火焰
        ctx.fillStyle = '#fff375';
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, r * 0.2);
        ctx.quadraticCurveTo(-r * 0.7, -r * 0.9, 0 + sway * 0.3, -r * 1.95 * flk1);
        ctx.quadraticCurveTo(r * 0.7, -r * 0.9, r * 0.6, r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  }
});
