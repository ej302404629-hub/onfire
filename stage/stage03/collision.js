// 由火柴棒大逃亡：視覺化關卡設計工具自動生成
window.STAGE_COLLISION = {
  "worldWidth": 2560,
  "worldHeight": 580,
  "actions": [
    "run_and_slide",
    "rope_climb",
    "switch_char",
    "ignite_item",
    "z_slope_physics_manager"
  ],
  "playerSpawn": {
    "x": 2511,
    "y": 347,
    "dir": -1
  },
  "goalArea": {
    "xMin": 10,
    "xMax": 150,
    "yMin": 180,
    "yMax": 325
  },
  "stageHelp": [],
  "groundPolylines": [
    {
      "pts": [
        [
          0,
          315
        ],
        [
          195,
          315
        ]
      ]
    },
    {
      "pts": [
        [
          0,
          490
        ],
        [
          340,
          490
        ],
        [
          585,
          345
        ],
        [
          685,
          345
        ],
        [
          815,
          365
        ],
        [
          960,
          365
        ],
        [
          1073,
          468
        ]
      ]
    },
    {
      "pts": [
        [
          900,
          470
        ],
        [
          1305,
          470
        ]
      ]
    },
    {
      "pts": [
        [
          1145,
          145
        ],
        [
          1283,
          145
        ]
      ]
    },
    {
      "pts": [
        [
          1420,
          225
        ],
        [
          1535,
          225
        ]
      ]
    },
    {
      "pts": [
        [
          1496,
          373
        ],
        [
          1741,
          373
        ]
      ]
    },
    {
      "pts": [
        [
          1625,
          290
        ],
        [
          1770,
          290
        ],
        [
          1930,
          305
        ],
        [
          2090,
          290
        ],
        [
          2105,
          255
        ],
        [
          2285,
          255
        ]
      ]
    },
    {
      "pts": [
        [
          2033,
          501
        ],
        [
          2111,
          442
        ],
        [
          2259,
          428
        ]
      ]
    },
    {
      "pts": [
        [
          2285,
          305
        ],
        [
          2385,
          305
        ]
      ]
    },
    {
      "pts": [
        [
          2385,
          278
        ],
        [
          2550,
          278
        ]
      ]
    },
    {
      "pts": [
        [
          2445,
          222
        ],
        [
          2535,
          222
        ]
      ]
    },
    {
      "pts": [
        [
          2486,
          172
        ],
        [
          2516,
          172
        ]
      ]
    },
    {
      "pts": [
        [
          2250,
          142
        ],
        [
          2462,
          142
        ]
      ]
    },
    {
      "pts": [
        [
          2259,
          472
        ],
        [
          2560,
          455
        ]
      ]
    }
  ],
  "ladders": [
    {
      "x1": 145,
      "x2": 205,
      "yTop": 315,
      "yBottom": 490,
      "topCenterX": 175,
      "botCenterX": 175,
      "exitNudgeX": -18
    },
    {
      "x1": 1145,
      "x2": 1235,
      "yTop": 145,
      "yBottom": 470,
      "topCenterX": 1192,
      "botCenterX": 1167,
      "exitNudgeX": 18
    },
    {
      "x1": 2175,
      "x2": 2221,
      "yTop": 255,
      "yBottom": 434,
      "topCenterX": 2198,
      "botCenterX": 2198,
      "exitNudgeX": -16
    }
  ],
  "solidWalls": [
    {
      "x": 10,
      "yTop": 0,
      "yBottom": 580
    },
    {
      "x": 2550,
      "yTop": 100,
      "yBottom": 580
    },
    {
      "x": 580,
      "yTop": 345,
      "yBottom": 580
    },
    {
      "x": 900,
      "yTop": 470,
      "yBottom": 580
    },
    {
      "x": 1283,
      "yTop": 145,
      "yBottom": 470
    },
    {
      "x": 1430,
      "yTop": 225,
      "yBottom": 470
    },
    {
      "x": 1540,
      "yTop": 225,
      "yBottom": 385
    },
    {
      "x": 1697,
      "yTop": 307,
      "yBottom": 502
    },
    {
      "x": 2259,
      "yTop": 428,
      "yBottom": 472
    },
    {
      "x": 2285,
      "yTop": 255,
      "yBottom": 305
    },
    {
      "x": 2385,
      "yTop": 278,
      "yBottom": 305
    },
    {
      "x": 2445,
      "yTop": 222,
      "yBottom": 278
    },
    {
      "x": 2535,
      "yTop": 222,
      "yBottom": 278
    },
    {
      "x": 2486,
      "yTop": 172,
      "yBottom": 222
    },
    {
      "x": 2516,
      "yTop": 172,
      "yBottom": 222
    },
    {
      "x": 2250,
      "yTop": 50,
      "yBottom": 142
    },
    {
      "x": 350,
      "yTop": 0,
      "yBottom": 160
    },
    {
      "x": 900,
      "yTop": 0,
      "yBottom": 180
    }
  ],
  "frictionZones": [
    {
      "id": "ROOF_LEFT_BRIDGE",
      "x1": 580,
      "x2": 987,
      "yMin": 180,
      "yMax": 355,
      "requireCrawl": true,
      "crawlFriction": 1.8,
      "intenseSparks": true
    },
    {
      "id": "ROOF_RIGHT_BRIDGE",
      "x1": 1750,
      "x2": 2114,
      "yMin": 150,
      "yMax": 293,
      "requireCrawl": true,
      "crawlFriction": 2,
      "intenseSparks": true
    }
  ],
  "mechanisms": [
    {
      "type": "room_door",
      "id": "room_door_manager",
      "initialRoom": "corridor",
      "x": 0,
      "y": 0,
      "width": 10,
      "height": 10
    },
    {
      "type": "friction_zone",
      "id": "ROOF_LEFT_BRIDGE",
      "x": 580,
      "y": 180,
      "width": 407,
      "height": 175,
      "zoneType": "crawl",
      "frictionPower": 1.8,
      "accumulateMode": "move_only",
      "intenseSparks": true,
      "room": "corridor"
    },
    {
      "type": "friction_zone",
      "id": "ROOF_RIGHT_BRIDGE",
      "x": 1750,
      "y": 150,
      "width": 364,
      "height": 143,
      "zoneType": "crawl",
      "frictionPower": 2,
      "accumulateMode": "move_only",
      "intenseSparks": true,
      "room": "corridor"
    },
    {
      "type": "stage03_controller",
      "id": "stage03_ctrl",
      "room": "corridor"
    },
    {
      "type": "elevator_platform",
      "id": "main_elevator_2",
      "room": "corridor",
      "x": 1535,
      "y": 350,
      "width": 65,
      "height": 20,
      "dir": "up",
      "distance": 125,
      "speed": 95,
      "startDelay": 0,
      "waitTime": 0.75
    },
    {
      "type": "elevator_platform",
      "id": "main_falling_elevator_3",
      "room": "corridor",
      "x": 1320.5,
      "y": 176,
      "width": 65,
      "height": 22,
      "dir": "down",
      "distance": 340,
      "speed": 550,
      "startDelay": 0.3,
      "oneWay": true,
      "retriggerAtStart": false,
      "resetDelayOnLeave": false
    },
    {
      "type": "fire_trap",
      "id": "main_pillar_fire",
      "room": "corridor",
      "x": 1455,
      "y": 210,
      "width": 60,
      "height": 16,
      "flameHeight": 85
    },
    {
      "width": 234,
      "height": 66,
      "deathType": "burned",
      "type": "death_trap",
      "id": "death_trap_7604",
      "x": 1838,
      "y": 472,
      "room": "corridor"
    },
    {
      "width": 235,
      "height": 73,
      "deathType": "burned",
      "type": "death_trap",
      "id": "death_trap_6166",
      "x": 1281,
      "y": 456,
      "room": "corridor"
    },
    {
      "width": 250,
      "height": 76,
      "deathType": "burned",
      "type": "death_trap",
      "id": "death_trap_9400",
      "x": 650,
      "y": 509,
      "room": "corridor"
    },
    {
      "type": "elevator_platform",
      "id": "cave_elevator_2",
      "room": "room_cave",
      "x": 680,
      "y": 420,
      "width": 100,
      "height": 20,
      "dir": "up",
      "distance": 175,
      "speed": 115,
      "startDelay": 0.2,
      "waitTime": 0.5,
      "resetDelayOnLeave": true,
      "smooth": true,
      "isLocked": true
    },
    {
      "width": 56,
      "height": 16,
      "targetId": "cave_elevator_2",
      "speed": 3.5,
      "closeDelay": 0,
      "setPropKey": "isLocked",
      "setPropVal": false,
      "colorNormal": "#c0392b",
      "colorPressed": "#3498db",
      "rebound": false,
      "type": "floor_button",
      "id": "floor_button_7824",
      "x": 2333,
      "y": 427,
      "room": "room_cave"
    },
    {
      "width": 1978,
      "height": 55,
      "deathType": "burned",
      "type": "death_trap",
      "id": "death_trap_1996",
      "x": 270,
      "y": 507,
      "room": "room_cave"
    }
  ],
  "items": [
    {
      "type": "water_ball",
      "id": "cave_water_ball_3",
      "room": "room_cave",
      "x": 165,
      "y": 205,
      "width": 28,
      "height": 28,
      "respawn": true
    }
  ],
  "rooms": {
    "corridor": {
      "worldWidth": 2560,
      "worldHeight": 580,
      "bgCandidates": [
        "bg",
        "bg.jpg"
      ],
      "goalArea": {
        "xMin": 10,
        "xMax": 150,
        "yMin": 180,
        "yMax": 325
      },
      "stageHelp": [],
      "groundPolylines": [
        {
          "pts": [
            [
              0,
              315
            ],
            [
              195,
              315
            ]
          ]
        },
        {
          "pts": [
            [
              0,
              490
            ],
            [
              340,
              490
            ],
            [
              585,
              345
            ],
            [
              685,
              345
            ],
            [
              815,
              365
            ],
            [
              960,
              365
            ],
            [
              1073,
              468
            ]
          ]
        },
        {
          "pts": [
            [
              900,
              470
            ],
            [
              1305,
              470
            ]
          ]
        },
        {
          "pts": [
            [
              1145,
              145
            ],
            [
              1283,
              145
            ]
          ]
        },
        {
          "pts": [
            [
              1420,
              225
            ],
            [
              1535,
              225
            ]
          ]
        },
        {
          "pts": [
            [
              1496,
              373
            ],
            [
              1741,
              373
            ]
          ]
        },
        {
          "pts": [
            [
              1625,
              290
            ],
            [
              1770,
              290
            ],
            [
              1930,
              305
            ],
            [
              2090,
              290
            ],
            [
              2105,
              255
            ],
            [
              2285,
              255
            ]
          ]
        },
        {
          "pts": [
            [
              2033,
              501
            ],
            [
              2111,
              442
            ],
            [
              2259,
              428
            ]
          ]
        },
        {
          "pts": [
            [
              2285,
              305
            ],
            [
              2385,
              305
            ]
          ]
        },
        {
          "pts": [
            [
              2385,
              278
            ],
            [
              2550,
              278
            ]
          ]
        },
        {
          "pts": [
            [
              2445,
              222
            ],
            [
              2535,
              222
            ]
          ]
        },
        {
          "pts": [
            [
              2486,
              172
            ],
            [
              2516,
              172
            ]
          ]
        },
        {
          "pts": [
            [
              2250,
              142
            ],
            [
              2462,
              142
            ]
          ]
        },
        {
          "pts": [
            [
              2259,
              472
            ],
            [
              2560,
              455
            ]
          ]
        }
      ],
      "ladders": [
        {
          "x1": 145,
          "x2": 205,
          "yTop": 315,
          "yBottom": 490,
          "topCenterX": 175,
          "botCenterX": 175,
          "exitNudgeX": -18
        },
        {
          "x1": 1145,
          "x2": 1235,
          "yTop": 145,
          "yBottom": 470,
          "topCenterX": 1192,
          "botCenterX": 1167,
          "exitNudgeX": 18
        },
        {
          "x1": 2175,
          "x2": 2221,
          "yTop": 255,
          "yBottom": 434,
          "topCenterX": 2198,
          "botCenterX": 2198,
          "exitNudgeX": -16
        }
      ],
      "solidWalls": [
        {
          "x": 10,
          "yTop": 0,
          "yBottom": 580
        },
        {
          "x": 2550,
          "yTop": 100,
          "yBottom": 580
        },
        {
          "x": 580,
          "yTop": 345,
          "yBottom": 580
        },
        {
          "x": 900,
          "yTop": 470,
          "yBottom": 580
        },
        {
          "x": 1283,
          "yTop": 145,
          "yBottom": 470
        },
        {
          "x": 1430,
          "yTop": 225,
          "yBottom": 470
        },
        {
          "x": 1540,
          "yTop": 225,
          "yBottom": 385
        },
        {
          "x": 1697,
          "yTop": 307,
          "yBottom": 502
        },
        {
          "x": 2259,
          "yTop": 428,
          "yBottom": 472
        },
        {
          "x": 2285,
          "yTop": 255,
          "yBottom": 305
        },
        {
          "x": 2385,
          "yTop": 278,
          "yBottom": 305
        },
        {
          "x": 2445,
          "yTop": 222,
          "yBottom": 278
        },
        {
          "x": 2535,
          "yTop": 222,
          "yBottom": 278
        },
        {
          "x": 2486,
          "yTop": 172,
          "yBottom": 222
        },
        {
          "x": 2516,
          "yTop": 172,
          "yBottom": 222
        },
        {
          "x": 2250,
          "yTop": 50,
          "yBottom": 142
        },
        {
          "x": 350,
          "yTop": 0,
          "yBottom": 160
        },
        {
          "x": 900,
          "yTop": 0,
          "yBottom": 180
        }
      ],
      "frictionZones": [
        {
          "id": "ROOF_LEFT_BRIDGE",
          "x1": 580,
          "x2": 987,
          "yMin": 180,
          "yMax": 355,
          "requireCrawl": true,
          "crawlFriction": 1.8,
          "intenseSparks": true
        },
        {
          "id": "ROOF_RIGHT_BRIDGE",
          "x1": 1750,
          "x2": 2114,
          "yMin": 150,
          "yMax": 293,
          "requireCrawl": true,
          "crawlFriction": 2,
          "intenseSparks": true
        }
      ],
      "doors": [
        {
          "x": 2282,
          "y": 40,
          "width": 129,
          "height": 102,
          "promptText": "進入深邃洞穴",
          "targetRoom": "room_cave",
          "targetX": 2310,
          "targetY": 275,
          "targetDir": -1
        }
      ],
      "mechanisms": [
        {
          "type": "friction_zone",
          "id": "ROOF_LEFT_BRIDGE",
          "x": 580,
          "y": 180,
          "width": 407,
          "height": 175,
          "zoneType": "crawl",
          "frictionPower": 1.8,
          "accumulateMode": "move_only",
          "intenseSparks": true,
          "room": "corridor"
        },
        {
          "type": "friction_zone",
          "id": "ROOF_RIGHT_BRIDGE",
          "x": 1750,
          "y": 150,
          "width": 364,
          "height": 143,
          "zoneType": "crawl",
          "frictionPower": 2,
          "accumulateMode": "move_only",
          "intenseSparks": true,
          "room": "corridor"
        },
        {
          "type": "stage03_controller",
          "id": "stage03_ctrl",
          "room": "corridor"
        },
        {
          "type": "elevator_platform",
          "id": "main_elevator_2",
          "room": "corridor",
          "x": 1535,
          "y": 350,
          "width": 65,
          "height": 20,
          "dir": "up",
          "distance": 125,
          "speed": 95,
          "startDelay": 0,
          "waitTime": 0.75
        },
        {
          "type": "elevator_platform",
          "id": "main_falling_elevator_3",
          "room": "corridor",
          "x": 1320.5,
          "y": 176,
          "width": 65,
          "height": 22,
          "dir": "down",
          "distance": 340,
          "speed": 550,
          "startDelay": 0.3,
          "oneWay": true,
          "retriggerAtStart": false,
          "resetDelayOnLeave": false
        },
        {
          "type": "fire_trap",
          "id": "main_pillar_fire",
          "room": "corridor",
          "x": 1455,
          "y": 210,
          "width": 60,
          "height": 16,
          "flameHeight": 85
        },
        {
          "width": 234,
          "height": 66,
          "deathType": "burned",
          "type": "death_trap",
          "id": "death_trap_7604",
          "x": 1838,
          "y": 472,
          "room": "corridor"
        },
        {
          "width": 235,
          "height": 73,
          "deathType": "burned",
          "type": "death_trap",
          "id": "death_trap_6166",
          "x": 1281,
          "y": 456,
          "room": "corridor"
        },
        {
          "width": 250,
          "height": 76,
          "deathType": "burned",
          "type": "death_trap",
          "id": "death_trap_9400",
          "x": 650,
          "y": 509,
          "room": "corridor"
        }
      ],
      "items": []
    },
    "room_cave": {
      "worldWidth": 2560,
      "worldHeight": 580,
      "bgCandidates": [
        "room1",
        "room1.jpg"
      ],
      "goalArea": {
        "xMin": -9999,
        "xMax": -9990,
        "yMin": -9999,
        "yMax": -9990
      },
      "stageHelp": [],
      "groundPolylines": [
        {
          "pts": [
            [
              65,
              245
            ],
            [
              765,
              245
            ],
            [
              795,
              235
            ],
            [
              975,
              235
            ]
          ]
        },
        {
          "pts": [
            [
              2100,
              420
            ],
            [
              2440,
              450
            ]
          ]
        },
        {
          "pts": [
            [
              495,
              445
            ],
            [
              660,
              445
            ],
            [
              715,
              420
            ],
            [
              929,
              430
            ],
            [
              1088,
              408
            ],
            [
              1310,
              397
            ],
            [
              1425,
              332
            ],
            [
              1825,
              315
            ],
            [
              1980,
              320
            ],
            [
              2165,
              275
            ],
            [
              2440,
              275
            ]
          ]
        }
      ],
      "ladders": [
        {
          "x1": 2210,
          "x2": 2270,
          "yTop": 275,
          "yBottom": 435,
          "topCenterX": 2240,
          "botCenterX": 2230,
          "exitNudgeX": -15
        }
      ],
      "solidWalls": [
        {
          "x": 65,
          "yTop": 0,
          "yBottom": 250
        },
        {
          "x": 2440,
          "yTop": 0,
          "yBottom": 580
        }
      ],
      "frictionZones": [],
      "doors": [
        {
          "x": 2260,
          "y": 155,
          "width": 145,
          "height": 120,
          "promptText": "返回主洞窟",
          "targetRoom": "corridor",
          "targetX": 2295,
          "targetY": 142,
          "targetDir": 1
        }
      ],
      "mechanisms": [
        {
          "type": "elevator_platform",
          "id": "cave_elevator_2",
          "room": "room_cave",
          "x": 680,
          "y": 420,
          "width": 100,
          "height": 20,
          "dir": "up",
          "distance": 175,
          "speed": 115,
          "startDelay": 0.2,
          "waitTime": 0.5,
          "resetDelayOnLeave": true,
          "smooth": true,
          "isLocked": true
        },
        {
          "width": 56,
          "height": 16,
          "targetId": "cave_elevator_2",
          "speed": 3.5,
          "closeDelay": 0,
          "setPropKey": "isLocked",
          "setPropVal": false,
          "colorNormal": "#c0392b",
          "colorPressed": "#3498db",
          "rebound": false,
          "type": "floor_button",
          "id": "floor_button_7824",
          "x": 2333,
          "y": 427,
          "room": "room_cave"
        },
        {
          "width": 1978,
          "height": 55,
          "deathType": "burned",
          "type": "death_trap",
          "id": "death_trap_1996",
          "x": 270,
          "y": 507,
          "room": "room_cave"
        }
      ],
      "items": [
        {
          "type": "water_ball",
          "id": "cave_water_ball_3",
          "room": "room_cave",
          "x": 165,
          "y": 205,
          "width": 28,
          "height": 28,
          "respawn": true
        }
      ]
    }
  }
};
