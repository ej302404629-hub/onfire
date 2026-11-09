// ==========================================
// Stage 08：地下熔岩與傳送洞穴關卡 (stage03/collision.js)
// ==========================================

window.registerMechanismType("stage03_controller", {
  solid: false,
  init: function(mech) {
    if (!window._stage03_TRUE_ORIGINAL_BG && typeof rawBgImg !== "undefined" && rawBgImg) {
      window._stage03_TRUE_ORIGINAL_BG = rawBgImg;
    }
    if (window._stage03_TRUE_ORIGINAL_BG && typeof rawBgImg !== "undefined") {
      rawBgImg = window._stage03_TRUE_ORIGINAL_BG;
      isBgReady = true;
    }

    const col = window.STAGE_COLLISION;
    if (col && col.rooms && col.rooms.corridor) {
      const r = col.rooms.corridor;
      col.groundPolylines = JSON.parse(JSON.stringify(r.groundPolylines));
      col.solidWalls = JSON.parse(JSON.stringify(r.solidWalls));
      col.ladders = JSON.parse(JSON.stringify(r.ladders));
      col.frictionZones = JSON.parse(JSON.stringify(r.frictionZones));
      col.ceilingPolylines = JSON.parse(JSON.stringify(r.ceilingPolylines || []));
      col.goalArea = JSON.parse(JSON.stringify(r.goalArea));
      if (typeof GROUND_POLYLINES !== "undefined") {
        GROUND_POLYLINES.length = 0;
        r.groundPolylines.forEach(p => GROUND_POLYLINES.push(JSON.parse(JSON.stringify(p))));
      }
      if (typeof SOLID_WALLS !== "undefined") {
        SOLID_WALLS.length = 0;
        r.solidWalls.forEach(w => SOLID_WALLS.push(JSON.parse(JSON.stringify(w))));
      }
      if (typeof LADDERS !== "undefined") {
        LADDERS.length = 0;
        r.ladders.forEach(l => LADDERS.push(JSON.parse(JSON.stringify(l))));
      }
      if (typeof FRICTION_ZONES !== "undefined") {
        FRICTION_ZONES.length = 0;
        r.frictionZones.forEach(z => FRICTION_ZONES.push(JSON.parse(JSON.stringify(z))));
      }
      if (typeof GOAL_CONDITION !== "undefined") {
        GOAL_CONDITION = JSON.parse(JSON.stringify(r.goalArea));
      }
    }
  },

  update: function(mech, player, dt, helpers) {
    const col = window.STAGE_COLLISION;
    if (!col || !col.rooms) return;

    const doorMech = helpers.mechanisms.find(m => m.type === "room_door");
    const curRoomKey = doorMech ? doorMech.currentRoomKey : "corridor";

    if (doorMech && window._stage03_TRUE_ORIGINAL_BG) {
      doorMech._originalStageBg = window._stage03_TRUE_ORIGINAL_BG;
      if (curRoomKey === "corridor" && rawBgImg !== window._stage03_TRUE_ORIGINAL_BG) {
        rawBgImg = window._stage03_TRUE_ORIGINAL_BG;
        isBgReady = true;
      }
    }

    // 1. 根據所在房間切換機關顯示/隱藏
    for (const m of helpers.mechanisms) {
      if (m.room) {
        m.hidden = (m.room !== curRoomKey);
      }
    }

    // 2. 跨房間水球狀態維持
    for (const it of helpers.items) {
      if (it.room) {
        const isActiveWithPlayer = (
          it.isHeld ||
          it.isThrown ||
          it.state === "PICKING" ||
          it.state === "HELD" ||
          it.state === "THROWN" ||
          it.state === "SPLASHING"
        );

        if (isActiveWithPlayer) {
          it.hidden = false;
        } else {
          if (it.state === "RESPAWNING") {
            it.animTimer = (it.animTimer || 0) + dt / 0.32;
            if (it.animTimer >= 1) {
              it.spawnScale = 1;
              it.state = "IDLE";
              it.collected = false;
              it.isHeld = false;
              it.isThrown = false;
              it.alwaysDraw = false;
            }
          }
          it.hidden = (it.room !== curRoomKey);
        }
      }
    }

    // 3. 🛡️ 【天花板折線限高碰撞核心物理】：
    // 當角色起跳 (vy < 0) 且頭頂觸碰天花板折線時，壓制在天花板下緣並自然下墜
    if (curRoomKey === "corridor" && player.vy < 0 && !player.climbing && !player.ledgeClimbing) {
      const curRoom = col.rooms.corridor;
      if (curRoom && Array.isArray(curRoom.ceilingPolylines)) {
        const curH = player.crawling ? 64 : 132;
        const headY = player.y - curH;

        for (const poly of curRoom.ceilingPolylines) {
          if (!poly.pts || poly.pts.length < 2) continue;
          const ceilY = helpers.samplePolylineY(poly.pts, player.x);
          if (ceilY !== null && headY <= ceilY + 6 && headY >= ceilY - 40) {
            player.y = ceilY + curH; // 頭頂壓在天花板線下
            player.vy = 0;           // 垂直速度歸零，直接下墜
            if (typeof helpers.addSparks === "function" && Math.random() < 0.6) {
              helpers.addSparks(player.x, ceilY, false);
            }
            break;
          }
        }
      }
    }

    // 4. 下墜電梯 (main_falling_elevator_3)
    const fallLift = helpers.mechanisms.find(m => m.id === "main_falling_elevator_3");
    if (fallLift && !fallLift.hidden && !fallLift.activated) {
      const halfW = 16 * 0.8;
      const onFallLift = (
        !player.climbing &&
        !player.ledgeClimbing &&
        player.vy >= 0 &&
        player.x + halfW >= fallLift.x &&
        player.x - halfW <= fallLift.x + fallLift.width &&
        Math.abs(player.y - fallLift.y) <= 10
      );
      if (onFallLift) {
        fallLift._latched = true;
      }
      if (fallLift._latched) {
        if (!onFallLift) {
          fallLift.standTimer = (fallLift.standTimer || 0) + dt;
        }
        if (fallLift.standTimer >= fallLift.startDelay) {
          fallLift.standTimer = fallLift.startDelay;
          fallLift.activated = true;
        }
      }
    }

    // 5. 洞穴內部「藍色 2 電梯」
    const caveLift = helpers.mechanisms.find(m => m.id === "cave_elevator_2");
    if (caveLift && !caveLift.hidden) {
      const halfW = 16 * 0.8;
      const onLift = (
        !player.climbing &&
        !player.ledgeClimbing &&
        player.vy >= 0 &&
        player.x + halfW >= caveLift.x &&
        player.x - halfW <= caveLift.x + caveLift.width &&
        Math.abs(player.y - caveLift.y) <= 10
      );
      if (onLift) {
        caveLift.activated = true;
        caveLift.forward = true;
        caveLift.waitTimer = 0;
      } else if (caveLift.activated) {
        caveLift.forward = false;
        caveLift.waitTimer = 0;
      }
    }

    // 6. 熔岩致死判定
    if (!player.won && !player.dead && !player.dying) {
      const curRoom = col.rooms[curRoomKey];
      if (curRoom && Array.isArray(curRoom.lavaZones)) {
        for (const lv of curRoom.lavaZones) {
          if (player.x >= lv.x1 && player.x <= lv.x2 && player.y >= lv.yMin && player.y <= lv.yMax) {
            player.hp = 0;
            player.onFire = true;
            player.heat = player.maxHeat;
            if (helpers && typeof helpers.addSparks === "function") {
              helpers.addSparks(player.x, player.y - 30, true);
            }
            break;
          }
        }
      }
    }
  },

  draw: function(ctx) {
    if (typeof showDebugCollision !== "undefined" && showDebugCollision) {
      const col = window.STAGE_COLLISION;
      const curRoom = (col && col.rooms) ? col.rooms.corridor : null;
      if (curRoom && Array.isArray(curRoom.ceilingPolylines)) {
        ctx.save();
        ctx.strokeStyle = "#00d2d3";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 4]);
        for (const poly of curRoom.ceilingPolylines) {
          if (!poly.pts || poly.pts.length < 2) continue;
          ctx.beginPath();
          poly.pts.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
          });
          ctx.stroke();
          for (const p of poly.pts) {
            ctx.fillStyle = "#54a0ff";
            ctx.beginPath();
            ctx.arc(p[0], p[1], 4.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  }
});

window.STAGE_COLLISION = {
  worldWidth: 2560,
  worldHeight: 580,

  playerSpawn: { x: 2460, y: 450, dir: -1 },

  goalArea: { xMin: 10, xMax: 150, yMin: 180, yMax: 325 },
  groundPolylines: [],
  ceilingPolylines: [],
  ladders: [],
  solidWalls: [],
  frictionZones: [],

  rooms: {
    corridor: {
      worldWidth: 2560,
      worldHeight: 580,
      bgCandidates: ["bg.jpg", "bg.png", "bg.webp"],

      goalArea: { xMin: 10, xMax: 150, yMin: 180, yMax: 325 },

      // 🟢 地板折線
      groundPolylines: [
        // 1. 左上「終點」高台
        { pts: [[0, 315], [195, 315]] },

        // 2. 左下底座 -> 石階上坡 -> 左吊橋 -> 下坡
        { pts: [[0, 490], [340, 490], [585, 345], [685, 345], [815, 365], [960, 365], [1100, 420]] },

        // 3. 中左地面 (長梯底部，配合紫圈3高台右移50px，也將右端延伸至 1305)
        { pts: [[900, 470], [1305, 470]] },

        // 4. 中央長梯頂部平台 (紫圈3：原本為 1145~1255，往右平移50px改為 1195~1305)
        { pts: [[1160, 145], [1283, 145]] },

        // 5. 中央噴火孔石柱頂部平台 (紫圈2：原本為 1405~1515，往右平移大約25px改為 1430~1540)
        { pts: [[1420, 225], [1535, 225]] },

        // 6. 電梯 2 下方木箱平台
        { pts: [[1495, 385], [1740, 385]] },

        // 7. 右吊橋左端 -> 吊橋V型谷底 -> 爬梯頂部平台 (Y: 255)
        { pts: [[1625, 290], [1770, 290], [1930, 305], [2090, 290], [2105, 255], [2285, 255]] },

        // 8. 右側爬梯下方平台
        { pts: [[2080, 485], [2120, 425], [2295, 425]] },

        // 9. 爬梯頂部右側凹槽地面 (Y: 305)
        { pts: [[2285, 305], [2385, 305]] },

        // 10. 凹槽右方石台 (Y: 278)
        { pts: [[2385, 278], [2550, 278]] },

        // 11. 白石底座頂部平台
        { pts: [[2445, 222], [2535, 222]] },

        // 12. 小石雕像頂部 (X: 2486 ~ 2516, Y: 172)
        { pts: [[2486, 172], [2516, 172]] },

        // 13. 傳送門金黃色橫樑頂部平台 (X: 2250 ~ 2462, Y: 142)
        { pts: [[2250, 142], [2462, 142]] },

        // 14. 右下角「起點」木牌地面
        { pts: [[2295, 455], [2560, 455]] }
      ],

      // 🔵 天花板折線限高
      ceilingPolylines: [
        // 1. 【紫圈 1 天花板限高】：從爬梯頂端平台 (Y: 255) 開始算起
        { pts: [[2105, 110], [2250, 95], [2462, 50]] },

        // 2. 【紫圈 2 天花板限高】：中段白色天花板右上方斜坡輪廓 (X: 1020 ~ 1145)
        { pts: [[1020, 265], [1070, 205], [1145, 95]] },

        // 3. 【紫圈 4 調整（左側終點上方）】：右邊原本太低，全部往上平移至 160 左右改成平緩的
        { pts: [[280, 170], [360, 175], [450, 180], [580, 180]] }
      ],

      // 🟣 爬梯
      ladders: [
        { x1: 145, x2: 205, yTop: 315, yBottom: 490, topCenterX: 175, botCenterX: 175, exitNudgeX: -18 },
        // 紫圈3：原本 (1100~1185, topX: 1145, botX: 1120) 往右平移大約45px以貼合圖片：
        { x1: 1145, x2: 1235, yTop: 145, yBottom: 470, topCenterX: 1192, botCenterX: 1167, exitNudgeX: 18 },
        { x1: 2175, x2: 2230, yTop: 255, yBottom: 425, topCenterX: 2202, botCenterX: 2202, exitNudgeX: -16 }
      ],

      // 🔴 實心牆
      solidWalls: [
        { x: 10, yTop: 0, yBottom: 580 },
        { x: 2550, yTop: 100, yBottom: 580 },

        // 左側熔岩坑左右壁
        { x: 580, yTop: 345, yBottom: 580 },
        { x: 900, yTop: 470, yBottom: 580 },

        // 中央長梯與石柱牆壁
        // 紫圈3：原梯平台右牆 X=1255 往右改到 1305
        { x: 1283, yTop: 145, yBottom: 470 },
        // 紫圈2：原高台左右牆 1405 與 1515 往右平移 25px 改到 1430 與 1540
        { x: 1430, yTop: 225, yBottom: 470 },
        { x: 1540, yTop: 225, yBottom: 385 },

        // 右吊橋熔岩坑左壁
        { x: 1740, yTop: 385, yBottom: 580 },

        // 爬梯下方平台左緣向上紅牆 + 熔岩坑右壁
        // { x: 2120, yTop: 345, yBottom: 580 },

        // 爬梯下方平台右緣垂直紅牆
        { x: 2295, yTop: 425, yBottom: 456 },

        // 爬梯頂部平台右緣垂直紅牆
        { x: 2285, yTop: 255, yBottom: 305 },

        // 凹槽右緣垂直紅牆
        { x: 2385, yTop: 278, yBottom: 305 },

        // 白石底座左緣與右緣垂直紅牆
        { x: 2445, yTop: 222, yBottom: 278 },
        { x: 2535, yTop: 222, yBottom: 278 },

        // 小石雕像左右兩側垂直紅牆 (連接 172 與 222)
        { x: 2486, yTop: 172, yBottom: 222 },
        { x: 2516, yTop: 172, yBottom: 222 },

        // 傳送門左側柱面微短紅牆
        { x: 2250, yTop: 50, yBottom: 142 },

        // 世界頂部封頂牆
        { x: 350, yTop: 0, yBottom: 160 },
        { x: 900, yTop: 0, yBottom: 180 }
      ],

      // 🟡 強制爬行摩擦區
      frictionZones: [
        {
          id: "ROOF_LEFT_BRIDGE",
          x1: 580, x2: 1020,
          yMin: 180, yMax: 430,
          requireCrawl: true,
          blockTop: 160,
          blockBot: 265,
          standFriction: 4.5,
          crawlFriction: 1.8,
          intenseSparks: true
        },
        {
          id: "ROOF_RIGHT_BRIDGE",
          x1: 1750, x2: 2170,
          yMin: 150, yMax: 335,
          requireCrawl: true,
          blockTop: 150,
          blockBot: 235,
          standFriction: 4.8,
          crawlFriction: 2.0,
          intenseSparks: true
        }
      ],

      // 🔵 藍色傳送門
      doors: [
        {
          x: 2255, y: 52, width: 80, height: 90,
          promptText: "進入深邃洞穴",
          targetRoom: "room_cave",
          targetX: 2310, targetY: 275, targetDir: -1
        }
      ],

      lavaZones: [
        { x1: 580, x2: 895, yMin: 505, yMax: 580 },
        { x1: 1230, x2: 1480, yMin: 445, yMax: 580 },
        { x1: 1745, x2: 2115, yMin: 475, yMax: 580 }
      ]
    },

    room_cave: {
      worldWidth: 2560,
      worldHeight: 580,
      bgCandidates: ["room1.jpg", "room1.png", "room1.webp"],

      goalArea: { xMin: -9999, xMax: -9990, yMin: -9999, yMax: -9990 },

      groundPolylines: [
        { pts: [[65, 245], [765, 245], [795, 235], [975, 235]] },
        { pts: [[2100, 420], [2440, 450]] },
        { pts: [
          [495, 445], [660, 445],
          [715, 420], [920, 420],
          [1125, 385], [1310, 385],
          [1475, 315], [1825, 315],
          [1980, 320], [2165, 275],
          [2440, 275]
        ] }
      ],

      ceilingPolylines: [],

      ladders: [
        { x1: 2210, x2: 2270, yTop: 275, yBottom: 435, topCenterX: 2240, botCenterX: 2230, exitNudgeX: -15 }
      ],

      solidWalls: [
        { x: 65, yTop: 0, yBottom: 250 },
        { x: 495, yTop: 340, yBottom: 460 },
        { x: 2440, yTop: 0, yBottom: 580 }
      ],

      frictionZones: [],

      doors: [
        {
          x: 2260, y: 155, width: 145, height: 120,
          promptText: "返回主洞窟",
          targetRoom: "corridor",
          targetX: 2295, targetY: 142, targetDir: 1
        }
      ],

      lavaZones: [
        { x1: 0, x2: 2560, yMin: 475, yMax: 580 }
      ]
    }
  },

  mechanisms: [
    {
      type: "stage03_controller",
      id: "stage03_ctrl"
    },
    {
      type: "room_door",
      id: "room_door_mgr",
      initialRoom: "corridor"
    },
    {
      type: "elevator_platform",
      id: "main_elevator_2",
      room: "corridor",
      // 紫圈1：將寬度從原來的 95 縮短為 65，稍微向右靠緊右側岩壁（X 中心設在 1535 左右，x=x_center - width/2）
      x: 1535,
      y: 350,
      width: 65,
      height: 20,
      dir: "up",
      distance: 125,
      speed: 95,
      startDelay: 0,
      waitTime: 0.75
    },
    {
      type: "elevator_platform",
      id: "main_falling_elevator_3",
      room: "corridor",
      // 紫圈3：原本 (1297.5, width: 65) 配合高台右移 50px 而對應平移為 1347.5：
      x: 1347.5,
      y: 185,
      width: 65,
      height: 22,
      dir: "down",
      distance: 340,
      speed: 550,
      startDelay: 0.3,
      oneWay: true,
      retriggerAtStart: false,
      resetDelayOnLeave: false
    },
    {
      type: "fire_trap",
      id: "main_pillar_fire",
      room: "corridor",
      // 紫圈2：平台右移後，原 X: 1430 的噴火孔也往右移至 X: 1455，置於高台新中心
      x: 1455,
      y: 210,
      width: 60,
      height: 16,
      flameHeight: 85
    },
    {
      type: "elevator_platform",
      id: "cave_elevator_2",
      room: "room_cave",
      x: 680,
      y: 420,
      width: 100,
      height: 20,
      dir: "up",
      distance: 185,
      speed: 115,
      startDelay: 0.2,
      waitTime: 9999,
      resetDelayOnLeave: true
    }
  ],

  items: [
    {
      type: "water_ball",
      id: "cave_water_ball_3",
      room: "room_cave",
      x: 165,
      y: 205,
      width: 28,
      height: 28,
      respawn: true
    }
  ]
};

window.STAGE_COLLISION.groundPolylines = JSON.parse(JSON.stringify(window.STAGE_COLLISION.rooms.corridor.groundPolylines));
window.STAGE_COLLISION.ceilingPolylines = JSON.parse(JSON.stringify(window.STAGE_COLLISION.rooms.corridor.ceilingPolylines));
window.STAGE_COLLISION.ladders = JSON.parse(JSON.stringify(window.STAGE_COLLISION.rooms.corridor.ladders));
window.STAGE_COLLISION.solidWalls = JSON.parse(JSON.stringify(window.STAGE_COLLISION.rooms.corridor.solidWalls));
window.STAGE_COLLISION.frictionZones = JSON.parse(JSON.stringify(window.STAGE_COLLISION.rooms.corridor.frictionZones));
