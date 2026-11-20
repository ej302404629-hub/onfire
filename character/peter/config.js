window.CURRENT_CHAR_DATA = {
  id: "peter",
  name: "Peter",
  order: 1,
  title: "均衡型男生",
  stats: { speed: 5, ignition: 4, resist: 5, extinguish: 1.5 },
  abilities: {
    canSelfIgnite: true,     // 按住 Y 自主摩擦頭部起火
    fallDamageMul: 0.4,      // 墜落傷害為其他人的 2/5
    rollOnHardLanding: true, // 超過 1.5 倍身高落地時前滾翻化解衝擊
    fireJumpHeightMul: 1.6   // 著火時跳躍高度為平常 1.6 倍
  },
  appearance: { headRadius: 25, bodyWidth: 18, bodyHeight: 44, limbWidth: 6.5, hasPonytail: false, headColor: "#e03131", bodyColor: "#d99b38" }
};
