// ==========================================
// 餐廳與廚房大逃亡 - 排煙管右緣對齊與廚師手臂地板擴充版 (collision.js)
// 對應截圖：IMG_20261024_155616.jpg (2560 x 620)
// 新增：右上方排煙管區 (DUCT_PURPLE_TUNNEL) 自動趴下爬行輔助器
// ==========================================

window.registerMechanismType("duct_auto_crawl_helper", {
  solid: false,
  update: function(mech, player) {
    if (player.climbing || player.ledgeClimbing || player.dead || player.dying || player.won) return;

    // 當角色跳向或進入右上方排煙管區域 (含管口右側緩衝區 X: 1600 ~ 2115, Y: 35 ~ 170) 時，
    // 自動切換為爬行狀態，讓角色站立起跳也能順暢鑽進排煙管，不會被擋在管外！
    if (player.x >= 1600 && player.x <= 2115 && player.y >= 35 && player.y <= 170) {
      player.crawling = true;
    }
  },
  draw: function() {}
});

window.STAGE_COLLISION = {
  worldWidth: 2560,
  worldHeight: 620,

  // 玩家初始起點：最右側梯子上方的方形黑色通風口平台
  playerSpawn: { x: 2450, y: 215, dir: -1 },

  // 終點過關判定區 (左側 EXIT 大門與 GOAL 搖鈴區)
  goalArea: { xMin: 40, xMax: 290, yMin: 100, yMax: 580 },

  // 4. 🟢 綠色：行走地面與多層平台折線 (groundPolylines)
  groundPolylines: [
    // --- 【右上：最右側方形通風口下方平台】 ---
    {
      pts: [
        [2345, 222],
        [2532, 210]
      ]
    },

    // --- 【右上：儲物架兩層綠線】 ---
    {
      pts: [
        [2118, 190],
        [2348, 160]
      ]
    },
    {
      pts: [
        [2135, 240],
        [2348, 235]
      ]
    },

    // --- 【上層：排煙管內部綠色底線 (右端延長至 X:2082 對齊管子最右緣)】 ---
    {
      pts: [
        [1515, 145],
        [1635, 145],
        [1820, 154],
        [2082, 156]
      ]
    },

    // --- 【中左：排煙管短梯下方的瓦斯爐上方平台】 ---
    {
      pts: [
        [1352, 382],
        [1442, 382],
        [1455, 356],
        [1535, 356],
        [1582, 416]
      ]
    },

    // --- 【下層右段：廚師背部綠線、廚師手臂/手掌綠線 & 右下角主地面綠線】 ---
    {
      pts: [
        [2015, 470],
        [2115, 460],
        [2180, 478]
      ]
    },
    // 🆕 廚師向前伸出的手臂與手掌地板 (讓角色可以站在廚師手上)
    {
      pts: [
        [2180, 534],
        [2265, 552]
      ]
    },
    {
      pts: [
        [2275, 550],
        [2325, 550]
      ]
    },
    {
      pts: [
        [2015, 590],
        [2532, 590]
      ]
    },

    // --- 【下層中右：中島流理台頂面綠線 & 兩鍋上方小綠線】 ---
    {
      pts: [
        [1745, 385],
        [1830, 385]
      ]
    },
    {
      pts: [
        [1865, 382],
        [1938, 382]
      ]
    },
    {
      pts: [
        [1700, 425],
        [2015, 425]
      ]
    },
    {
      pts: [
        [1565, 574],
        [1700, 574]
      ]
    },

    // --- 【下層中左：藍色圓圈處修改 - 牆壁改為綠色地板連起來，形成桌面下通道】 ---
    {
      pts: [
        [1200, 548],
        [1700, 574]
      ]
    },

    // --- 【餐廳吧台碎盤區高低階梯綠線】 ---
    {
      pts: [
        [1135, 485],
        [1175, 490],
        [1200, 515],
        [1235, 515],
        [1308, 500]
      ]
    },
    {
      pts: [
        [1075, 535],
        [1135, 535]
      ]
    },
    {
      pts: [
        [968, 482],
        [1075, 470]
      ]
    },
    {
      pts: [
        [912, 546],
        [968, 546]
      ]
    },

    // --- 【下層左段：服務生餐車平台、小圓凳與 EXIT 大門走廊綠線】 ---
    {
      pts: [
        [752, 404],
        [912, 398]
      ]
    },
    {
      pts: [
        [235, 558],
        [635, 556],
        [752, 556]
      ]
    },
  ],

  // 5. 🔵 藍色：梯子判定區 (ladders)
  ladders: [
    {
      x1: 2348,
      x2: 2405,
      yTop: 222,
      yBottom: 591,
      topCenterX: 2376,
      botCenterX: 2376,
      exitNudgeX: -18
    },
    {
      x1: 1525,
      x2: 1635,
      yTop: 145,
      yBottom: 205,
      topCenterX: 1580,
      botCenterX: 1565,
      exitNudgeX: -16
    }
  ],

  // 6. 🔴 紅色：單線零厚度實心牆體 (solidWalls)
  solidWalls: [
    { x: 1515, yTop: 20, yBottom: 145 },
    { x: 2532, yTop: 32, yBottom: 590 },
    { x: 2325, yTop: 550, yBottom: 600 },
    { x: 2275, yTop: 550, yBottom: 600 },
    // 廚師肩膀與手臂左側銜接牆 (yBottom 接在廚師手臂地板 544 上)
    { x: 2180, yTop: 478, yBottom: 534 },
    // 廚師手掌前端短牆 (接在手掌最右端 2265 至地面 570)
    { x: 2265, yTop: 552, yBottom: 570 },
    { x: 2015, yTop: 425, yBottom: 576 },
    { x: 1700, yTop: 425, yBottom: 574 },
    { x: 1745, yTop: 385, yBottom: 412 },
    { x: 1830, yTop: 385, yBottom: 410 },
    { x: 1865, yTop: 382, yBottom: 409 },
    { x: 1938, yTop: 382, yBottom: 407 },
    { x: 1308, yTop: 500, yBottom: 546 },
    { x: 1135, yTop: 484, yBottom: 535 },
    { x: 1075, yTop: 470, yBottom: 535 },
    { x: 968,  yTop: 482, yBottom: 546 },
    { x: 912,  yTop: 398, yBottom: 546 },
    { x: 752,  yTop: 404, yBottom: 556 },
//    { x: 635,  yTop: 466, yBottom: 556 },
//    { x: 590,  yTop: 469, yBottom: 556 }
  ],

  // 7. 🟡 黃色 (累積熱度區) 與 🟣 紫色排煙管內壓頂爬行判定 (frictionZones)
  frictionZones: [
    // 🟣 紫色排煙管內部：低矮管道強制爬行區 (右端同步對齊至 2082)
    {
      id: 'DUCT_PURPLE_TUNNEL',
      x1: 1600,
      x2: 2082,
      yMin: 38,
      yMax: 162,
      blockTop: 35,
      blockBot: 102,
      requireCrawl: true,
      crawlFriction: 0.3,
      standFriction: 1.2,
      intenseSparks: false
    },

    // 桌面下方強制爬行區
    {
      id: 'TABLE_UNDER_CRAWL',
      x1: 1450,
      x2: 1605,
      yMin: 420,
      yMax: 574,
      blockTop: 370,
      blockBot: 480,
      requireCrawl: true,
      crawlFriction: 0.5,
      standFriction: 1.5,
      intenseSparks: false
    },

    // 🟡 黃色熱度區 1：左爐台火源區
    {
      id: 'YELLOW_HEAT_STOVE',
      x1: 1390,
      x2: 1585,
      yMin: 415,
      yMax: 455,
      requireCrawl: false,
      crawlFriction: 2.5,
      standFriction: 2.5,
      intenseSparks: false
    },

    // 🟡 黃色熱度區 2：中島左鍋熱氣框
    {
      id: 'YELLOW_HEAT_POT_LEFT',
      x1: 1742,
      x2: 1832,
      yMin: 280,
      yMax: 392,
      requireCrawl: false,
      crawlFriction: 4.0,
      standFriction: 4.0,
      intenseSparks: true
    },

    // 🟡 黃色熱度區 3：中島右鍋熱氣框
    {
      id: 'YELLOW_HEAT_POT_RIGHT',
      x1: 1860,
      x2: 1945,
      yMin: 268,
      yMax: 390,
      requireCrawl: false,
      crawlFriction: 5.0,
      standFriction: 5.0,
      intenseSparks: true
    }
  ],

  // 8. 🟣 機關配置 (排煙管自動爬行輔助 + 排煙管前景遮罩 + 服務生餐車上的噴火機關)
  mechanisms: [
    {
      type: "duct_auto_crawl_helper",
      id: "duct_auto_crawl"
    },
    {
      type: "foreground_mask",
      id: "duct_purple_mask",
      layer: "foreground",
      x: 1600,
      y: 38,
      width: 482,
      height: 122,
      opacityWhenInside: 0.88
    },
    // 🔥 噴火機關：放置在服務生前方的餐車頂部平台上
    {
      type: "fire_trap",
      id: "waiter_cart_fire",
      x: 800,
      y: 386,
      width: 64,
      height: 16,
      flameHeight: 75,
      heatRate: 85
    }
  ],

  // 9. 🎁 道具配置 (水球：丟出破掉後會在原位置自動重生新水球)
  items: [
    {
      type: "water_ball",
      id: "corner_water_ball",
      x: 2480,
      y: 530,
      width: 28,
      height: 28,
      respawn: true
    }
  ]
};
