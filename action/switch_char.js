window.registerAction('switch_char', {
  name: '雙擊換角',
  triggerKey: 'y', // 對應遊戲中的 Y 鍵 (拍打鍵)
  lastPressTime: 0,
  
  onTrigger: function(player, pluginCtx) {
    const now = performance.now();
    
    // 判斷兩次按下時間差是否小於 400 毫秒 (雙擊)
    if (now - this.lastPressTime < 400) {
      
      // 💡 【新增判斷】檢查是否為第四關(含)以後
      // 從主程式的全域變數中取得當前關卡資訊
      if (typeof loadedStages !== 'undefined' && loadedStages.length > 0) {
        const currentStage = loadedStages[selectedStageIdx];
        if (currentStage && currentStage.stageNum < 3) {
          // 如果關卡編號小於 4，直接中斷執行，不給換角
          return;
        }
      }

      // 確保遊戲中有載入兩個以上的角色
      if (typeof loadedCharacters !== 'undefined' && loadedCharacters.length > 1) {
        
        // 1. 切換至下一個角色 (循環切換)
        selectedCharIdx = (selectedCharIdx + 1) % loadedCharacters.length;
        
        // 2. 產生類似「變身」的視覺特效
        pluginCtx.addSmoke(player.x, player.y - 30, true);
        for(let i = 0; i < 8; i++) {
          pluginCtx.addSparks(player.x, player.y - 30, true);
        }
        
        // 3. 通知主程式刷新畫面的狀態列 (頭像與能力值)
        if (typeof updateHudStatus === 'function') {
          updateHudStatus();
        }
        
        // 4. 更新新角色的熱量上限 (避免切換到耐熱低的角色時瞬間著火)
        const c = loadedCharacters[selectedCharIdx].stats;
        player.maxHeat = c.ignition * 25;
        if (player.heat > player.maxHeat) {
          player.heat = player.maxHeat;
        }
        
        // 重置時間，避免玩家連按三下時連續切換兩次
        this.lastPressTime = 0; 
      }
    } else {
      // 若不是雙擊，則記錄本次按下的時間
      this.lastPressTime = now;
    }
  }
});
