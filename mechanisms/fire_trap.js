// ==========================================
// 模組化外掛機關：噴火機關 (mechanisms/fire_trap.js)
// 包含：多層動態火焰 -> 觸碰觸發3秒灰燼死亡動畫 -> 水球命中漸進熄滅
// ==========================================
window.registerMechanismType("fire_trap", {
  solid: false,

  init: function(mech) {
    mech.active = mech.active !== undefined ? mech.active : true;
    mech.isExtinguishing = false;
    mech.extinguishProgress = 0;
    mech.flameHeight = mech.flameHeight || 72;
    mech.steamParticles = [];
  },

  onWaterHit: function(mech, waterBall, helpers) {
    if (!mech.active || mech.isExtinguishing) return false;

    mech.isExtinguishing = true;
    mech.extinguishProgress = 0;

    const cx = mech.x + mech.width * 0.5;
    for (let i = 0; i < 14; i++) {
      mech.steamParticles.push({
        x: cx + (Math.random() - 0.5) * mech.width * 0.9,
        y: mech.y - Math.random() * 25,
        vx: (Math.random() - 0.5) * 90,
        vy: -70 - Math.random() * 110,
        r: 8 + Math.random() * 10,
        alpha: 0.95
      });
    }
    return true;
  },

  update: function(mech, player, dt, helpers) {
    const cx = mech.x + mech.width * 0.5;

    if (mech.active && !mech.isExtinguishing) {
      if (Math.random() < 0.22 && helpers && typeof helpers.addSparks === "function") {
        helpers.addSparks(cx + (Math.random() - 0.5) * mech.width * 0.6, mech.y - mech.flameHeight * 0.5, false);
      }

      const isLowStance = player.crawling || !!(player.customHitbox && player.customHitbox.isLow);
      const playerH = player.customHitbox?.height ?? (isLowStance ? 64 : 132);
      const playerHalfW = player.customHitbox?.halfW ?? (player.crawling ? 52 : 16);

      const pTop = player.y - playerH;
      const pBot = player.y;
      const flameTop = mech.y - mech.flameHeight + 10;
      const flameBot = mech.y + mech.height;

      // 碰到火焰，且尚未死亡/瀕死時，觸發 3 秒燒焦灰燼動畫
      if (!player.dying && !player.dead && !player.won &&
          player.x + playerHalfW > mech.x + 4 && player.x - playerHalfW < mech.x + mech.width - 4 &&
          pBot > flameTop && pTop < flameBot) {
        
        player.hp = 0;
        player.dying = true;       // 啟動主程式內建的 3 秒燒焦灰燼動畫
        player.deathTimer = 0;     // 重置動畫計時器
        player.deathCause = 'fire';// 設定死因
        player.onFire = true;
        player.heat = player.maxHeat;

        if (helpers && typeof helpers.addSparks === "function") {
          helpers.addSparks(player.x, player.y - 45, true);
        }
      }
    }

    if (mech.isExtinguishing) {
      mech.extinguishProgress += dt / 0.75;

      if (Math.random() < 0.85) {
        mech.steamParticles.push({
          x: cx + (Math.random() - 0.5) * mech.width * 0.8,
          y: mech.y - (1 - mech.extinguishProgress) * mech.flameHeight * 0.5,
          vx: (Math.random() - 0.5) * 65,
          vy: -60 - Math.random() * 80,
          r: 7 + Math.random() * 9,
          alpha: 0.85
        });
      }

      if (mech.extinguishProgress >= 1) {
        mech.extinguishProgress = 1;
        mech.active = false;
        mech.isExtinguishing = false;
      }
    }

    for (let i = mech.steamParticles.length - 1; i >= 0; i--) {
      const sp = mech.steamParticles[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.r += 18 * dt;
      sp.alpha -= 1.15 * dt;
      if (sp.alpha <= 0) mech.steamParticles.splice(i, 1);
    }
  },

  draw: function(ctx, mech, img) {
    ctx.save();
    const cx = mech.x + mech.width * 0.5;
    const baseY = mech.y;

    if (mech.active) {
      const now = performance.now();
      const remain = mech.isExtinguishing ? Math.max(0, 1 - mech.extinguishProgress) : 1;
      const struggleSway = mech.isExtinguishing
        ? Math.sin(now * 0.06) * 14 * remain
        : Math.sin(now * 0.018) * 5;
      const flicker = 0.92 + Math.sin(now * 0.03) * 0.12;
      const curFlameH = mech.flameHeight * remain * flicker;
      const halfW = (mech.width * 0.44) * (0.4 + 0.6 * remain);

      ctx.save();
      ctx.globalAlpha = Math.min(1, remain * 1.15);

      const glow = ctx.createRadialGradient(cx, baseY - curFlameH * 0.4, 4, cx, baseY - curFlameH * 0.4, curFlameH * 1.1);
      glow.addColorStop(0, "rgba(255, 180, 40, 0.65)");
      glow.addColorStop(0.5, "rgba(255, 50, 10, 0.35)");
      glow.addColorStop(1, "rgba(255, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, baseY - curFlameH * 0.4, curFlameH * 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff2a00";
      ctx.beginPath();
      ctx.moveTo(cx - halfW, baseY + 4);
      ctx.quadraticCurveTo(cx - halfW * 1.25, baseY - curFlameH * 0.55, cx + struggleSway, baseY - curFlameH);
      ctx.quadraticCurveTo(cx + halfW * 1.25, baseY - curFlameH * 0.55, cx + halfW, baseY + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ff8800";
      ctx.beginPath();
      ctx.moveTo(cx - halfW * 0.72, baseY + 4);
      ctx.quadraticCurveTo(cx - halfW * 0.85, baseY - curFlameH * 0.45, cx + struggleSway * 0.7, baseY - curFlameH * 0.78);
      ctx.quadraticCurveTo(cx + halfW * 0.85, baseY - curFlameH * 0.45, cx + halfW * 0.72, baseY + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#fff68f";
      ctx.beginPath();
      ctx.moveTo(cx - halfW * 0.38, baseY + 4);
      ctx.quadraticCurveTo(cx - halfW * 0.4, baseY - curFlameH * 0.3, cx + struggleSway * 0.4, baseY - curFlameH * 0.5);
      ctx.quadraticCurveTo(cx + halfW * 0.4, baseY - curFlameH * 0.3, cx + halfW * 0.38, baseY + 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    if (!window.drawEntityTexture(ctx, mech, img)) {
      const baseGrad = ctx.createLinearGradient(mech.x, mech.y, mech.x, mech.y + mech.height);
      baseGrad.addColorStop(0, mech.active ? "#6e2c1b" : "#4b5563");
      baseGrad.addColorStop(1, "#1f2937");
      ctx.fillStyle = baseGrad;
      ctx.strokeStyle = mech.active ? "#ff6b35" : "#374151";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(mech.x, mech.y, mech.width, mech.height, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = mech.active ? "#ffae00" : "#111827";
      const holeCount = 3;
      const step = mech.width / (holeCount + 1);
      for (let i = 1; i <= holeCount; i++) {
        ctx.beginPath();
        ctx.arc(mech.x + step * i, mech.y + mech.height * 0.5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (mech.steamParticles.length > 0) {
      for (const sp of mech.steamParticles) {
        ctx.fillStyle = `rgba(235, 245, 255, ${Math.max(0, sp.alpha * 0.75)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
});
