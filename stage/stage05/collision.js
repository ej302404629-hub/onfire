// 由火柴棒大逃亡：視覺化關卡設計工具自動生成
window.STAGE_COLLISION = {
  "worldWidth": 2048,
  "worldHeight": 1004,
  "actions": [
    "run_and_slide",
    "rope_climb",
    "switch_char",
    "ignite_item",
    "z_slope_physics_manager",
    "wind_tunnel_pose",
    "ceiling_polyline_guard"
  ],
  "playerSpawn": {
    "x": 123,
    "y": 691,
    "dir": 1
  },
  "goalArea": {
    "xMin": 1284,
    "xMax": 1464,
    "yMin": 605,
    "yMax": 805
  },
  "stageHelp": [],
  "groundPolylines": [
    {
      "pts": [
        [
          51,
          802
        ],
        [
          2027,
          799
        ]
      ]
    },
    {
      "pts": [
        [
          639,
          261
        ],
        [
          793,
          260
        ]
      ]
    },
    {
      "pts": [
        [
          328,
          649
        ],
        [
          639,
          650
        ]
      ]
    },
    {
      "pts": [
        [
          1435,
          137
        ],
        [
          1629,
          138
        ]
      ]
    },
    {
      "pts": [
        [
          1150,
          575
        ],
        [
          644,
          573
        ]
      ]
    },
    {
      "pts": [
        [
          1653,
          470
        ],
        [
          1829,
          468
        ]
      ]
    },
    {
      "pts": [
        [
          288,
          175
        ],
        [
          367,
          175
        ]
      ]
    },
    {
      "pts": [
        [
          15,
          483
        ],
        [
          493,
          482
        ]
      ]
    },
    {
      "pts": [
        [
          1085,
          363
        ],
        [
          1274,
          362
        ]
      ]
    },
    {
      "pts": [
        [
          1829,
          577
        ],
        [
          2011,
          578
        ]
      ]
    },
    {
      "pts": [
        [
          1829,
          186
        ],
        [
          2009,
          187
        ]
      ]
    },
    {
      "pts": [
        [
          463,
          168
        ],
        [
          516,
          167
        ]
      ]
    }
  ],
  "ladders": [
    {
      "x1": 1901,
      "x2": 1956,
      "yTop": 185,
      "yBottom": 578,
      "topCenterX": 1929,
      "botCenterX": 1929,
      "exitNudgeX": 18
    }
  ],
  "solidWalls": [
    {
      "id": "wall_left",
      "x": 43,
      "yTop": 3,
      "yBottom": 1007
    },
    {
      "id": "wall_right",
      "x": 2008,
      "yTop": 0,
      "yBottom": 1004
    },
    {
      "id": "wall_395",
      "x": 639,
      "yTop": 261,
      "yBottom": 650
    },
    {
      "id": "wall_484",
      "x": 793,
      "yTop": 7,
      "yBottom": 260
    },
    {
      "id": "wall_236",
      "x": 1653,
      "yTop": 470,
      "yBottom": 598
    },
    {
      "id": "wall_430",
      "x": 498,
      "yTop": 175,
      "yBottom": 504
    },
    {
      "id": "wall_201",
      "x": 1275,
      "yTop": 599,
      "yBottom": 802
    },
    {
      "id": "wall_250",
      "x": 1085,
      "yTop": 363,
      "yBottom": 573
    },
    {
      "id": "wall_409",
      "x": 1829,
      "yTop": 186,
      "yBottom": 468
    },
    {
      "id": "wall_936",
      "x": 637,
      "yTop": 1,
      "yBottom": 61
    },
    {
      "id": "wall_192",
      "x": 1629,
      "yTop": 11,
      "yBottom": 138
    }
  ],
  "frictionZones": [
    {
      "id": "friction_zone_3178",
      "x1": 333,
      "x2": 496,
      "yMin": 521,
      "yMax": 645,
      "requireCrawl": false,
      "standFriction": 5,
      "intenseSparks": true
    },
    {
      "id": "friction_zone_6666",
      "x1": 1825,
      "x2": 2005,
      "yMin": 690,
      "yMax": 800,
      "requireCrawl": false,
      "standFriction": 5,
      "intenseSparks": true
    }
  ],
  "mechanisms": [
    {
      "type": "room_door",
      "id": "room_door_manager",
      "initialRoom": "main",
      "x": 0,
      "y": 0,
      "width": 10,
      "height": 10
    },
    {
      "width": 162,
      "height": 49,
      "triggerType": "on_condition",
      "videoUrl": "test01.4pm",
      "targetObjectId": "checkpoint_4419",
      "targetParam": "activated",
      "targetValue": "true",
      "hasPlayed": false,
      "type": "cutscene_trigger",
      "id": "cutscene_trigger_7528",
      "x": -5,
      "y": -1
    },
    {
      "width": 620,
      "height": 137,
      "angle": -90,
      "windStrength": 420,
      "blowDuration": 10000,
      "pauseDuration": 1.5,
      "startDelay": 0,
      "isBlowing": true,
      "type": "wind_tunnel",
      "id": "wind_tunnel_0854",
      "x": 260,
      "y": 258,
      "active": false
    },
    {
      "width": 627,
      "height": 224,
      "angle": 179,
      "windStrength": 420,
      "blowDuration": 3,
      "pauseDuration": 0,
      "startDelay": 0,
      "isBlowing": true,
      "type": "wind_tunnel",
      "id": "wind_tunnel_5247",
      "x": 655,
      "y": 577
    },
    {
      "x1": 1041,
      "y1": 262,
      "x2": 1435,
      "y2": 137,
      "slopeSpeedX": 330,
      "slopeDX": 140,
      "slopeDY": 0,
      "speedX": 350,
      "speedY": 0,
      "type": "slide_slope",
      "id": "slide_slope_5624"
    },
    {
      "width": 479,
      "height": 22,
      "deathType": "burned",
      "isKilling": false,
      "killAnimTimer": 0,
      "type": "death_trap",
      "id": "death_trap_9224",
      "x": 1175,
      "y": 574
    },
    {
      "x1": 680,
      "y1": 846,
      "x2": 820,
      "y2": 846,
      "midPoints": "",
      "thickness": 36,
      "showInGame": false,
      "lineColor": "#95a5a6",
      "type": "ceiling_polyline",
      "id": "ceiling_polyline_3934"
    },
    {
      "x1": 405,
      "y1": 13,
      "x2": 853,
      "y2": 12,
      "midPoints": "",
      "thickness": 36,
      "showInGame": false,
      "lineColor": "#95a5a6",
      "type": "ceiling_polyline",
      "id": "ceiling_polyline_4383"
    },
    {
      "x1": 651,
      "y1": 594,
      "x2": 1653,
      "y2": 598,
      "midPoints": "",
      "thickness": 36,
      "showInGame": false,
      "lineColor": "#95a5a6",
      "type": "ceiling_polyline",
      "id": "ceiling_polyline_8584"
    },
    {
      "x1": 10,
      "y1": 502,
      "x2": 493,
      "y2": 504,
      "midPoints": "",
      "thickness": 36,
      "type": "ceiling_polyline",
      "id": "ceiling_polyline_8767"
    },
    {
      "type": "elevator_platform",
      "id": "elevator_429",
      "x": 198,
      "y": 472,
      "width": 76,
      "height": 18,
      "dir": "up",
      "distance": 301,
      "speed": 90,
      "startDelay": 1,
      "waitTime": 0.65,
      "oneWay": false
    },
    {
      "width": 163,
      "height": 124,
      "zoneType": "stand",
      "frictionPower": 5,
      "accumulateMode": "move_only",
      "intenseSparks": true,
      "type": "friction_zone",
      "id": "friction_zone_3178",
      "x": 333,
      "y": 521
    },
    {
      "type": "floor_button",
      "id": "btn_gate_626",
      "targetId": "auto_gate_626",
      "x": 64,
      "y": 466,
      "width": 64,
      "height": 16,
      "speed": 2,
      "closeDelay": 8
    },
    {
      "type": "auto_gate",
      "id": "auto_gate_626",
      "x": 639,
      "y": 62,
      "width": 24,
      "height": 200,
      "openDir": "down",
      "openDistance": 200,
      "texture": "image/wood01.png",
      "closeDelay": 8
    },
    {
      "width": 56,
      "height": 16,
      "targetId": "wind_tunnel_0854",
      "speed": 3.5,
      "closeDelay": 0,
      "setPropKey": "active",
      "setPropVal": true,
      "colorNormal": "#e74c3c",
      "colorPressed": "#54a0ff",
      "rebound": false,
      "type": "floor_button",
      "id": "floor_button_8752",
      "x": 1160,
      "y": 787
    },
    {
      "width": 64,
      "height": 64,
      "spawnDir": -1,
      "texture": "image/flag.png",
      "type": "checkpoint",
      "id": "checkpoint_4419",
      "x": 295,
      "y": 106
    },
    {
      "width": 64,
      "height": 64,
      "spawnDir": 1,
      "texture": "image/flag.png",
      "type": "checkpoint",
      "id": "checkpoint_7249",
      "x": 1136,
      "y": 302
    },
    {
      "width": 94,
      "height": 51,
      "isBurning": false,
      "initialBurning": false,
      "noPlayerDamage": false,
      "igniteDelay": 0,
      "burnDuration": 0,
      "flameAnim": 48.80678778327658,
      "igniteProgress": 0,
      "extinguishTimer": 0,
      "extinguishDuration": 0.65,
      "coolingSmokeTimer": 0,
      "igniteGraceTimer": 0,
      "cooldownTimer": 0,
      "receivedHeatThisFrame": false,
      "currentFlameScale": 0,
      "currentDmgScale": 0,
      "type": "wood_pile",
      "id": "wood_pile_9789",
      "x": 1601,
      "y": 634
    },
    {
      "width": 180,
      "height": 110,
      "zoneType": "stand",
      "frictionPower": 5,
      "accumulateMode": "move_only",
      "intenseSparks": true,
      "type": "friction_zone",
      "id": "friction_zone_6666",
      "x": 1825,
      "y": 690
    },
    {
      "x1": 853,
      "y1": 12,
      "x2": 2008,
      "y2": 0,
      "midPoints": "",
      "thickness": 36,
      "type": "ceiling_polyline",
      "id": "ceiling_polyline_8056"
    },
    {
      "width": 150,
      "height": 49,
      "triggerType": "on_condition",
      "videoUrl": "test02.mp4",
      "targetObjectId": "checkpoint_7249",
      "targetParam": "activated",
      "targetValue": "true",
      "hasPlayed": false,
      "type": "cutscene_trigger",
      "id": "cutscene_trigger_9890",
      "x": -9,
      "y": 51
    },
    {
      "x1": 328,
      "y1": 660,
      "x2": 640,
      "y2": 660,
      "midPoints": "",
      "thickness": 36,
      "type": "ceiling_polyline",
      "id": "ceiling_polyline_4544"
    },
    {
      "x1": 926,
      "y1": 334,
      "x2": 789,
      "y2": 410,
      "slopeSpeedX": 330,
      "slopeDX": 140,
      "slopeDY": 0,
      "speedX": 350,
      "speedY": 0,
      "type": "slide_slope",
      "id": "slide_slope_7760"
    },
    {
      "x1": 644,
      "y1": 438,
      "x2": 910,
      "y2": 568,
      "slopeSpeedX": 330,
      "slopeDX": 140,
      "slopeDY": 0,
      "speedX": 350,
      "speedY": 0,
      "type": "slide_slope",
      "id": "slide_slope_3803"
    }
  ],
  "items": [
    {
      "type": "rope_segment",
      "id": "rope_551_1",
      "x1": 405,
      "y1": 13,
      "x2": 408,
      "y2": 87,
      "pinStart": true,
      "pinEnd": false,
      "ropeLength": 74,
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_551_2",
      "x1": 408,
      "y1": 87,
      "x2": 393,
      "y2": 154,
      "pinStart": false,
      "pinEnd": false,
      "ropeLength": 69,
      "attachStartTo": "rope_551_1",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_551_3",
      "x1": 393,
      "y1": 154,
      "x2": 374,
      "y2": 228,
      "pinStart": false,
      "pinEnd": false,
      "ropeLength": 76,
      "attachStartTo": "rope_551_2",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_551_4",
      "x1": 374,
      "y1": 228,
      "x2": 440,
      "y2": 227,
      "pinStart": false,
      "pinEnd": false,
      "ropeLength": 49,
      "attachStartTo": "rope_551_3",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_551_5",
      "x1": 440,
      "y1": 227,
      "x2": 439,
      "y2": 152,
      "pinStart": false,
      "pinEnd": false,
      "ropeLength": 85,
      "attachStartTo": "rope_551_4",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_551_6",
      "x1": 439,
      "y1": 152,
      "x2": 471,
      "y2": 85,
      "pinStart": false,
      "pinEnd": true,
      "ropeLength": 74,
      "texture": "image/rope01.png",
      "attachStartTo": "rope_551_5"
    },
    {
      "type": "rope_segment",
      "id": "rope_143_1",
      "x1": 1255,
      "y1": 273,
      "x2": 1372,
      "y2": 310,
      "pinStart": true,
      "pinEnd": false,
      "ropeLength": 123,
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_143_2",
      "x1": 1372,
      "y1": 310,
      "x2": 1482,
      "y2": 344,
      "pinStart": false,
      "pinEnd": false,
      "ropeLength": 115,
      "attachStartTo": "rope_143_1",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_143_3",
      "x1": 1482,
      "y1": 344,
      "x2": 1600,
      "y2": 357,
      "pinStart": false,
      "pinEnd": false,
      "ropeLength": 119,
      "attachStartTo": "rope_143_2",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "rope_segment",
      "id": "rope_143_4",
      "x1": 1600,
      "y1": 357,
      "x2": 1702,
      "y2": 372,
      "pinStart": false,
      "pinEnd": true,
      "ropeLength": 106,
      "attachStartTo": "rope_143_3",
      "attachStartPoint": "end",
      "texture": "image/rope01.png"
    },
    {
      "type": "oil_ball",
      "id": "oil_ball_711",
      "x": 1927,
      "y": 765,
      "width": 30,
      "height": 30,
      "respawnOnPickup": true,
      "respawnDelay": 1.2,
      "witherStartTime": 8,
      "burnOutTime": 10
    }
  ],
  "rooms": {
    "main": {
      "worldWidth": 2048,
      "worldHeight": 1004,
      "bgCandidates": [
        "bg",
        "bg.png"
      ],
      "goalArea": {
        "xMin": 1284,
        "xMax": 1464,
        "yMin": 605,
        "yMax": 805
      },
      "stageHelp": [],
      "groundPolylines": [
        {
          "pts": [
            [
              51,
              802
            ],
            [
              2027,
              799
            ]
          ]
        },
        {
          "pts": [
            [
              639,
              261
            ],
            [
              793,
              260
            ]
          ]
        },
        {
          "pts": [
            [
              328,
              649
            ],
            [
              639,
              650
            ]
          ]
        },
        {
          "pts": [
            [
              1435,
              137
            ],
            [
              1629,
              138
            ]
          ]
        },
        {
          "pts": [
            [
              1150,
              575
            ],
            [
              644,
              573
            ]
          ]
        },
        {
          "pts": [
            [
              1653,
              470
            ],
            [
              1829,
              468
            ]
          ]
        },
        {
          "pts": [
            [
              288,
              175
            ],
            [
              367,
              175
            ]
          ]
        },
        {
          "pts": [
            [
              15,
              483
            ],
            [
              493,
              482
            ]
          ]
        },
        {
          "pts": [
            [
              1085,
              363
            ],
            [
              1274,
              362
            ]
          ]
        },
        {
          "pts": [
            [
              1829,
              577
            ],
            [
              2011,
              578
            ]
          ]
        },
        {
          "pts": [
            [
              1829,
              186
            ],
            [
              2009,
              187
            ]
          ]
        },
        {
          "pts": [
            [
              463,
              168
            ],
            [
              516,
              167
            ]
          ]
        }
      ],
      "ladders": [
        {
          "x1": 1901,
          "x2": 1956,
          "yTop": 185,
          "yBottom": 578,
          "topCenterX": 1929,
          "botCenterX": 1929,
          "exitNudgeX": 18
        }
      ],
      "solidWalls": [
        {
          "id": "wall_left",
          "x": 43,
          "yTop": 3,
          "yBottom": 1007
        },
        {
          "id": "wall_right",
          "x": 2008,
          "yTop": 0,
          "yBottom": 1004
        },
        {
          "id": "wall_395",
          "x": 639,
          "yTop": 261,
          "yBottom": 650
        },
        {
          "id": "wall_484",
          "x": 793,
          "yTop": 7,
          "yBottom": 260
        },
        {
          "id": "wall_236",
          "x": 1653,
          "yTop": 470,
          "yBottom": 598
        },
        {
          "id": "wall_430",
          "x": 498,
          "yTop": 175,
          "yBottom": 504
        },
        {
          "id": "wall_201",
          "x": 1275,
          "yTop": 599,
          "yBottom": 802
        },
        {
          "id": "wall_250",
          "x": 1085,
          "yTop": 363,
          "yBottom": 573
        },
        {
          "id": "wall_409",
          "x": 1829,
          "yTop": 186,
          "yBottom": 468
        },
        {
          "id": "wall_936",
          "x": 637,
          "yTop": 1,
          "yBottom": 61
        },
        {
          "id": "wall_192",
          "x": 1629,
          "yTop": 11,
          "yBottom": 138
        }
      ],
      "frictionZones": [
        {
          "id": "friction_zone_3178",
          "x1": 333,
          "x2": 496,
          "yMin": 521,
          "yMax": 645,
          "requireCrawl": false,
          "standFriction": 5,
          "intenseSparks": true
        },
        {
          "id": "friction_zone_6666",
          "x1": 1825,
          "x2": 2005,
          "yMin": 690,
          "yMax": 800,
          "requireCrawl": false,
          "standFriction": 5,
          "intenseSparks": true
        }
      ],
      "doors": [
        {
          "id": "door_A_993",
          "linkedDoorId": "door_B_993",
          "x": 716,
          "y": 148,
          "width": 72,
          "height": 110,
          "promptText": "進入傳送門 A",
          "targetRoom": "main",
          "targetX": 1581,
          "targetY": 139,
          "targetDir": -1
        },
        {
          "id": "door_B_993",
          "linkedDoorId": "door_A_993",
          "x": 1533,
          "y": 0,
          "width": 96,
          "height": 139,
          "promptText": "進入傳送門 B",
          "targetRoom": "main",
          "targetX": 752,
          "targetY": 258,
          "targetDir": 1
        }
      ],
      "mechanisms": [
        {
          "width": 162,
          "height": 49,
          "triggerType": "on_condition",
          "videoUrl": "test01.4pm",
          "targetObjectId": "checkpoint_4419",
          "targetParam": "activated",
          "targetValue": "true",
          "hasPlayed": false,
          "type": "cutscene_trigger",
          "id": "cutscene_trigger_7528",
          "x": -5,
          "y": -1
        },
        {
          "width": 620,
          "height": 137,
          "angle": -90,
          "windStrength": 420,
          "blowDuration": 10000,
          "pauseDuration": 1.5,
          "startDelay": 0,
          "isBlowing": true,
          "type": "wind_tunnel",
          "id": "wind_tunnel_0854",
          "x": 260,
          "y": 258,
          "active": false
        },
        {
          "width": 627,
          "height": 224,
          "angle": 179,
          "windStrength": 420,
          "blowDuration": 3,
          "pauseDuration": 0,
          "startDelay": 0,
          "isBlowing": true,
          "type": "wind_tunnel",
          "id": "wind_tunnel_5247",
          "x": 655,
          "y": 577
        },
        {
          "x1": 1041,
          "y1": 262,
          "x2": 1435,
          "y2": 137,
          "slopeSpeedX": 330,
          "slopeDX": 140,
          "slopeDY": 0,
          "speedX": 350,
          "speedY": 0,
          "type": "slide_slope",
          "id": "slide_slope_5624"
        },
        {
          "width": 479,
          "height": 22,
          "deathType": "burned",
          "isKilling": false,
          "killAnimTimer": 0,
          "type": "death_trap",
          "id": "death_trap_9224",
          "x": 1175,
          "y": 574
        },
        {
          "x1": 680,
          "y1": 846,
          "x2": 820,
          "y2": 846,
          "midPoints": "",
          "thickness": 36,
          "showInGame": false,
          "lineColor": "#95a5a6",
          "type": "ceiling_polyline",
          "id": "ceiling_polyline_3934"
        },
        {
          "x1": 405,
          "y1": 13,
          "x2": 853,
          "y2": 12,
          "midPoints": "",
          "thickness": 36,
          "showInGame": false,
          "lineColor": "#95a5a6",
          "type": "ceiling_polyline",
          "id": "ceiling_polyline_4383"
        },
        {
          "x1": 651,
          "y1": 594,
          "x2": 1653,
          "y2": 598,
          "midPoints": "",
          "thickness": 36,
          "showInGame": false,
          "lineColor": "#95a5a6",
          "type": "ceiling_polyline",
          "id": "ceiling_polyline_8584"
        },
        {
          "x1": 10,
          "y1": 502,
          "x2": 493,
          "y2": 504,
          "midPoints": "",
          "thickness": 36,
          "type": "ceiling_polyline",
          "id": "ceiling_polyline_8767"
        },
        {
          "type": "elevator_platform",
          "id": "elevator_429",
          "x": 198,
          "y": 472,
          "width": 76,
          "height": 18,
          "dir": "up",
          "distance": 301,
          "speed": 90,
          "startDelay": 1,
          "waitTime": 0.65,
          "oneWay": false
        },
        {
          "width": 163,
          "height": 124,
          "zoneType": "stand",
          "frictionPower": 5,
          "accumulateMode": "move_only",
          "intenseSparks": true,
          "type": "friction_zone",
          "id": "friction_zone_3178",
          "x": 333,
          "y": 521
        },
        {
          "type": "floor_button",
          "id": "btn_gate_626",
          "targetId": "auto_gate_626",
          "x": 64,
          "y": 466,
          "width": 64,
          "height": 16,
          "speed": 2,
          "closeDelay": 8
        },
        {
          "type": "auto_gate",
          "id": "auto_gate_626",
          "x": 639,
          "y": 62,
          "width": 24,
          "height": 200,
          "openDir": "down",
          "openDistance": 200,
          "texture": "image/wood01.png",
          "closeDelay": 8
        },
        {
          "width": 56,
          "height": 16,
          "targetId": "wind_tunnel_0854",
          "speed": 3.5,
          "closeDelay": 0,
          "setPropKey": "active",
          "setPropVal": true,
          "colorNormal": "#e74c3c",
          "colorPressed": "#54a0ff",
          "rebound": false,
          "type": "floor_button",
          "id": "floor_button_8752",
          "x": 1160,
          "y": 787
        },
        {
          "width": 64,
          "height": 64,
          "spawnDir": -1,
          "texture": "image/flag.png",
          "type": "checkpoint",
          "id": "checkpoint_4419",
          "x": 295,
          "y": 106
        },
        {
          "width": 64,
          "height": 64,
          "spawnDir": 1,
          "texture": "image/flag.png",
          "type": "checkpoint",
          "id": "checkpoint_7249",
          "x": 1136,
          "y": 302
        },
        {
          "width": 94,
          "height": 51,
          "isBurning": false,
          "initialBurning": false,
          "noPlayerDamage": false,
          "igniteDelay": 0,
          "burnDuration": 0,
          "flameAnim": 48.80678778327658,
          "igniteProgress": 0,
          "extinguishTimer": 0,
          "extinguishDuration": 0.65,
          "coolingSmokeTimer": 0,
          "igniteGraceTimer": 0,
          "cooldownTimer": 0,
          "receivedHeatThisFrame": false,
          "currentFlameScale": 0,
          "currentDmgScale": 0,
          "type": "wood_pile",
          "id": "wood_pile_9789",
          "x": 1601,
          "y": 634
        },
        {
          "width": 180,
          "height": 110,
          "zoneType": "stand",
          "frictionPower": 5,
          "accumulateMode": "move_only",
          "intenseSparks": true,
          "type": "friction_zone",
          "id": "friction_zone_6666",
          "x": 1825,
          "y": 690
        },
        {
          "x1": 853,
          "y1": 12,
          "x2": 2008,
          "y2": 0,
          "midPoints": "",
          "thickness": 36,
          "type": "ceiling_polyline",
          "id": "ceiling_polyline_8056"
        },
        {
          "width": 150,
          "height": 49,
          "triggerType": "on_condition",
          "videoUrl": "test02.mp4",
          "targetObjectId": "checkpoint_7249",
          "targetParam": "activated",
          "targetValue": "true",
          "hasPlayed": false,
          "type": "cutscene_trigger",
          "id": "cutscene_trigger_9890",
          "x": -9,
          "y": 51
        },
        {
          "x1": 328,
          "y1": 660,
          "x2": 640,
          "y2": 660,
          "midPoints": "",
          "thickness": 36,
          "type": "ceiling_polyline",
          "id": "ceiling_polyline_4544"
        },
        {
          "x1": 926,
          "y1": 334,
          "x2": 789,
          "y2": 410,
          "slopeSpeedX": 330,
          "slopeDX": 140,
          "slopeDY": 0,
          "speedX": 350,
          "speedY": 0,
          "type": "slide_slope",
          "id": "slide_slope_7760"
        },
        {
          "x1": 644,
          "y1": 438,
          "x2": 910,
          "y2": 568,
          "slopeSpeedX": 330,
          "slopeDX": 140,
          "slopeDY": 0,
          "speedX": 350,
          "speedY": 0,
          "type": "slide_slope",
          "id": "slide_slope_3803"
        }
      ],
      "items": [
        {
          "type": "rope_segment",
          "id": "rope_551_1",
          "x1": 405,
          "y1": 13,
          "x2": 408,
          "y2": 87,
          "pinStart": true,
          "pinEnd": false,
          "ropeLength": 74,
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_551_2",
          "x1": 408,
          "y1": 87,
          "x2": 393,
          "y2": 154,
          "pinStart": false,
          "pinEnd": false,
          "ropeLength": 69,
          "attachStartTo": "rope_551_1",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_551_3",
          "x1": 393,
          "y1": 154,
          "x2": 374,
          "y2": 228,
          "pinStart": false,
          "pinEnd": false,
          "ropeLength": 76,
          "attachStartTo": "rope_551_2",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_551_4",
          "x1": 374,
          "y1": 228,
          "x2": 440,
          "y2": 227,
          "pinStart": false,
          "pinEnd": false,
          "ropeLength": 49,
          "attachStartTo": "rope_551_3",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_551_5",
          "x1": 440,
          "y1": 227,
          "x2": 439,
          "y2": 152,
          "pinStart": false,
          "pinEnd": false,
          "ropeLength": 85,
          "attachStartTo": "rope_551_4",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_551_6",
          "x1": 439,
          "y1": 152,
          "x2": 471,
          "y2": 85,
          "pinStart": false,
          "pinEnd": true,
          "ropeLength": 74,
          "texture": "image/rope01.png",
          "attachStartTo": "rope_551_5"
        },
        {
          "type": "rope_segment",
          "id": "rope_143_1",
          "x1": 1255,
          "y1": 273,
          "x2": 1372,
          "y2": 310,
          "pinStart": true,
          "pinEnd": false,
          "ropeLength": 123,
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_143_2",
          "x1": 1372,
          "y1": 310,
          "x2": 1482,
          "y2": 344,
          "pinStart": false,
          "pinEnd": false,
          "ropeLength": 115,
          "attachStartTo": "rope_143_1",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_143_3",
          "x1": 1482,
          "y1": 344,
          "x2": 1600,
          "y2": 357,
          "pinStart": false,
          "pinEnd": false,
          "ropeLength": 119,
          "attachStartTo": "rope_143_2",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "rope_segment",
          "id": "rope_143_4",
          "x1": 1600,
          "y1": 357,
          "x2": 1702,
          "y2": 372,
          "pinStart": false,
          "pinEnd": true,
          "ropeLength": 106,
          "attachStartTo": "rope_143_3",
          "attachStartPoint": "end",
          "texture": "image/rope01.png"
        },
        {
          "type": "oil_ball",
          "id": "oil_ball_711",
          "x": 1927,
          "y": 765,
          "width": 30,
          "height": 30,
          "respawnOnPickup": true,
          "respawnDelay": 1.2,
          "witherStartTime": 8,
          "burnOutTime": 10
        }
      ]
    }
  }
};
