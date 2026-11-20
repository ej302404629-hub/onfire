window.CURRENT_CHAR_DATA = {
  id: "BB",
  name: "BB",
  order: 3,
  title: "重裝壯漢",
  stats: { speed: 2, ignition: 6, resist: 45, extinguish: 3 },
  dynamicResist: {
    max: 45,        // 初始與最高耐熱度
    min: 15,        // 衰減後的最低固定耐熱度
    delay: 6,       // 點燃幾秒後開始衰減
    decayTime: 4,   // 從 max 衰減到 min 需花費幾秒（決定衰減速率）
    recoverTime: 5  // 熄火後從 min 恢復到 max 需花費幾秒（決定恢復速率）
  },
  appearance: { headRadius: 33, bodyWidth: 32, bodyHeight: 50, limbWidth: 11.5, hasPonytail: false, headColor: "#e03131", bodyColor: "#d99b38" }
};
