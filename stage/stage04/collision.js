// 由火柴棒大逃亡：視覺化關卡設計工具自動生成
window.STAGE_COLLISION = {
  "worldWidth": 2800,
  "worldHeight": 1000,
  "actions": [
    "run_and_slide",
    "rope_climb",
    "switch_char",
    "ignite_item"
  ],
  "playerSpawn": {
    "x": 186,
    "y": 731,
    "dir": 1
  },
  "goalArea": {
    "xMin": 2569,
    "xMax": 2689,
    "yMin": 239,
    "yMax": 409
  },
  "stageHelp": [
    "找到藍色按鈕，解鎖木門開關。",
    "適時切換不同角色，發揮他們的特長。",
    "火柴人著火時可以點燃木頭堆。",
    "固定的繩子可以用火燒斷。"
  ],
  "groundPolylines": [
    {
      "pts": [
        [
          -60,
          804
        ],
        [
          2764,
          807
        ]
      ]
    },
    {
      "pts": [
        [
          426,
          671
        ],
        [
          699,
          671
        ]
      ]
    },
    {
      "pts": [
        [
          699,
          559
        ],
        [
          1053,
          559
        ]
      ]
    },
    {
      "pts": [
        [
          40,
          420
        ],
        [
          888,
          425
        ]
      ]
    },
    {
      "pts": [
        [
          40,
          380
        ],
        [
          140,
          380
        ]
      ]
    },
    {
      "pts": [
        [
          1043,
          488
        ],
        [
          1389,
          491
        ],
        [
          1505,
          620
        ],
        [
          1802,
          624
        ]
      ]
    },
    {
      "pts": [
        [
          1041,
          312
        ],
        [
          1385,
          314
        ]
      ]
    },
    {
      "pts": [
        [
          1706,
          413
        ],
        [
          1816,
          413
        ]
      ]
    },
    {
      "pts": [
        [
          2232,
          408
        ],
        [
          2760,
          408
        ]
      ]
    }
  ],
  "ladders": [
    {
      "x1": 1122,
      "x2": 1175,
      "yTop": 310,
      "yBottom": 492,
      "topCenterX": 1149,
      "botCenterX": 1149,
      "exitNudgeX": 18
    },
    {
      "x1": 1578,
      "x2": 1632,
      "yTop": 619,
      "yBottom": 805,
      "topCenterX": 1605,
      "botCenterX": 1605,
      "exitNudgeX": 18
    }
  ],
  "solidWalls": [
    {
      "id": "wall_left_bound",
      "x": 40,
      "yTop": 0,
      "yBottom": 850
    },
    {
      "id": "wall_right_bound",
      "x": 2760,
      "yTop": 0,
      "yBottom": 850
    },
    {
      "id": "wall_a_step",
      "x": 140,
      "yTop": 380,
      "yBottom": 420
    },
    {
      "id": "wall_a_step",
      "x": 699,
      "yTop": 559,
      "yBottom": 671
    },
    {
      "id": "wall_a_top_left",
      "x": 411,
      "yTop": 143,
      "yBottom": 343
    },
    {
      "id": "wall_a_top_mid",
      "x": 595,
      "yTop": 144,
      "yBottom": 297
    },
    {
      "id": "wall_a_top_right",
      "x": 816,
      "yTop": 141,
      "yBottom": 291
    },
    {
      "id": "wall_above_gate",
      "x": 1027,
      "yTop": -13,
      "yBottom": 554
    },
    {
      "id": "wall_above_gate",
      "x": 1038,
      "yTop": 11,
      "yBottom": 671
    },
    {
      "id": "wall_bc_divider",
      "x": 1802,
      "yTop": 135,
      "yBottom": 624
    },
    {
      "id": "wall_462",
      "x": 102,
      "yTop": 475,
      "yBottom": 803
    },
    {
      "id": "wall_629",
      "x": 1279,
      "yTop": 539,
      "yBottom": 651
    },
    {
      "id": "wall_864",
      "x": 1098,
      "yTop": 5,
      "yBottom": 486
    }
  ],
  "frictionZones": [],
  "mechanisms": [
    {
      "type": "floor_button",
      "id": "btn_speed_gate",
      "targetId": "_locked_",
      "x": 562,
      "y": 784,
      "width": 52,
      "height": 18,
      "speed": 0.9
    },
    {
      "type": "slide_slope",
      "id": "b_purple_slope",
      "x1": 1389,
      "y1": 491,
      "x2": 1505,
      "y2": 620
    },
    {
      "type": "wood_pile",
      "id": "wood_pile_1",
      "x": 1325,
      "y": 607,
      "width": 75,
      "height": 62
    },
    {
      "type": "wood_pile",
      "id": "wood_pile_2",
      "x": 2492,
      "y": 748,
      "width": 107,
      "height": 61
    },
    {
      "type": "fire_trap",
      "id": "fire_trap_guard",
      "x": 2355,
      "y": 368,
      "width": 44,
      "height": 32,
      "flameHeight": 75,
      "active": true
    },
    {
      "type": "friction_zone",
      "id": "a_crawl_zone",
      "x": 419,
      "y": 309,
      "width": 172,
      "height": 118,
      "zoneType": "crawl",
      "frictionPower": 2.8,
      "accumulateMode": "move_only",
      "intenseSparks": true
    },
    {
      "type": "friction_zone",
      "id": "a_stand_zone",
      "x": 595,
      "y": 310,
      "width": 220,
      "height": 114,
      "zoneType": "stand",
      "frictionPower": 2.8,
      "accumulateMode": "move_only",
      "intenseSparks": true
    },
    {
      "width": 210,
      "height": 135,
      "zoneType": "stand",
      "frictionPower": 2.3,
      "accumulateMode": "move_only",
      "intenseSparks": true,
      "type": "friction_zone",
      "id": "friction_zone_4690",
      "x": 1069,
      "y": 666
    },
    {
      "width": 56,
      "height": 16,
      "targetId": "btn_speed_gate",
      "speed": 3.5,
      "closeDelay": 0,
      "setPropKey": "targetId",
      "setPropVal": "auto_gate_157",
      "colorNormal": "#54a0ff",
      "colorPressed": "#54a0ff",
      "rebound": false,
      "type": "floor_button",
      "id": "floor_button_1676",
      "x": 62,
      "y": 362
    },
    {
      "type": "auto_gate",
      "id": "auto_gate_157",
      "x": 1042,
      "y": 601,
      "width": 24,
      "height": 200,
      "openDir": "up",
      "openDistance": 200,
      "texture": "image/wood01.png",
      "gateSpeed": 1.6,
      "closeDelay": 0,
      "gateSpeedClose": 0.7
    }
  ],
  "items": [
    {
      "type": "oil_ball",
      "id": "oil_ball_key",
      "x": 1269,
      "y": 280,
      "width": 30,
      "height": 30,
      "respawnOnPickup": true,
      "respawnDelay": 1.2
    },
    {
      "type": "water_ball",
      "id": "water_spawner_main",
      "x": 1490,
      "y": 769,
      "width": 28,
      "height": 28,
      "respawn": true,
      "respawnDelay": 1.5
    },
    {
      "type": "rope_segment",
      "id": "swing_rope_1",
      "x1": 1600,
      "y1": 140,
      "x2": 1600,
      "y2": 250,
      "pinStart": true,
      "pinEnd": false,
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "swing_rope_2",
      "x1": 1600,
      "y1": 250,
      "x2": 1600,
      "y2": 360,
      "pinStart": false,
      "pinEnd": false,
      "attachStartTo": "swing_rope_1",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "b_plat_edge_rope",
      "x1": 1707,
      "y1": 414,
      "x2": 1707,
      "y2": 564,
      "pinStart": true,
      "pinEnd": false,
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "bridge_rope_1",
      "x1": 2231,
      "y1": 408,
      "x2": 2161,
      "y2": 496,
      "pinStart": true,
      "pinEnd": false,
      "ropeLength": 112,
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "bridge_rope_2",
      "x1": 2161,
      "y1": 496,
      "x2": 2060,
      "y2": 560,
      "pinStart": false,
      "pinEnd": false,
      "attachStartTo": "bridge_rope_1",
      "attachStartPoint": "end",
      "ropeLength": 125,
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "bridge_rope_3",
      "x1": 2060,
      "y1": 560,
      "x2": 1920,
      "y2": 590,
      "pinStart": false,
      "pinEnd": true,
      "attachStartTo": "bridge_rope_2",
      "attachStartPoint": "end",
      "ropeLength": 125,
      "texture": "image/rope01.png"
    }
  ]
};
