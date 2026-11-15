// 由火柴棒大逃亡：視覺化關卡設計工具自動生成
window.STAGE_COLLISION = {
  "worldWidth": 2560,
  "worldHeight": 620,
  "actions": [
    "run_and_slide",
    "rope_climb",
    "switch_char",
    "ignite_item",
    "z_slope_physics_manager"
  ],
  "playerSpawn": {
    "x": 2454,
    "y": 100,
    "dir": -1
  },
  "goalArea": {
    "xMin": -33,
    "xMax": 217,
    "yMin": 99,
    "yMax": 579
  },
  "stageHelp": [],
  "groundPolylines": [
    {
      "pts": [
        [
          2331,
          248
        ],
        [
          2539,
          236
        ]
      ]
    },
    {
      "pts": [
        [
          2110,
          203
        ],
        [
          2331,
          168
        ]
      ]
    },
    {
      "pts": [
        [
          1515,
          145
        ],
        [
          1650,
          144
        ],
        [
          1820,
          154
        ],
        [
          2082,
          156
        ]
      ]
    },
    {
      "pts": [
        [
          1352,
          382
        ],
        [
          1442,
          382
        ],
        [
          1455,
          356
        ],
        [
          1535,
          356
        ],
        [
          1582,
          416
        ]
      ]
    },
    {
      "pts": [
        [
          2015,
          470
        ],
        [
          2115,
          460
        ],
        [
          2180,
          478
        ]
      ]
    },
    {
      "pts": [
        [
          2180,
          534
        ],
        [
          2265,
          552
        ]
      ]
    },
    {
      "pts": [
        [
          2275,
          550
        ],
        [
          2325,
          550
        ]
      ]
    },
    {
      "pts": [
        [
          2015,
          590
        ],
        [
          2532,
          590
        ]
      ]
    },
    {
      "pts": [
        [
          1745,
          385
        ],
        [
          1830,
          385
        ]
      ]
    },
    {
      "pts": [
        [
          1865,
          382
        ],
        [
          1938,
          382
        ]
      ]
    },
    {
      "pts": [
        [
          1700,
          425
        ],
        [
          2015,
          425
        ]
      ]
    },
    {
      "pts": [
        [
          1565,
          574
        ],
        [
          1700,
          574
        ]
      ]
    },
    {
      "pts": [
        [
          1200,
          548
        ],
        [
          1700,
          574
        ]
      ]
    },
    {
      "pts": [
        [
          1135,
          485
        ],
        [
          1175,
          490
        ],
        [
          1200,
          515
        ],
        [
          1235,
          515
        ],
        [
          1308,
          500
        ]
      ]
    },
    {
      "pts": [
        [
          1075,
          535
        ],
        [
          1135,
          535
        ]
      ]
    },
    {
      "pts": [
        [
          968,
          482
        ],
        [
          1075,
          470
        ]
      ]
    },
    {
      "pts": [
        [
          912,
          546
        ],
        [
          968,
          546
        ]
      ]
    },
    {
      "pts": [
        [
          752,
          404
        ],
        [
          912,
          398
        ]
      ]
    },
    {
      "pts": [
        [
          88,
          569
        ],
        [
          635,
          556
        ],
        [
          752,
          556
        ]
      ]
    }
  ],
  "ladders": [
    {
      "x1": 2348,
      "x2": 2405,
      "yTop": 250,
      "yBottom": 591,
      "topCenterX": 2377,
      "botCenterX": 2377,
      "exitNudgeX": -18
    },
    {
      "x1": 1525,
      "x2": 1598,
      "yTop": 145,
      "yBottom": 186,
      "topCenterX": 1562,
      "botCenterX": 1562,
      "exitNudgeX": -16
    }
  ],
  "solidWalls": [
    {
      "x": 1515,
      "yTop": 20,
      "yBottom": 145
    },
    {
      "x": 2532,
      "yTop": 32,
      "yBottom": 590
    },
    {
      "x": 2325,
      "yTop": 550,
      "yBottom": 600
    },
    {
      "x": 2275,
      "yTop": 550,
      "yBottom": 600
    },
    {
      "x": 2180,
      "yTop": 478,
      "yBottom": 534
    },
    {
      "x": 2265,
      "yTop": 552,
      "yBottom": 570
    },
    {
      "x": 2015,
      "yTop": 425,
      "yBottom": 576
    },
    {
      "x": 1700,
      "yTop": 425,
      "yBottom": 574
    },
    {
      "x": 1745,
      "yTop": 385,
      "yBottom": 412
    },
    {
      "x": 1830,
      "yTop": 385,
      "yBottom": 410
    },
    {
      "x": 1865,
      "yTop": 382,
      "yBottom": 409
    },
    {
      "x": 1938,
      "yTop": 382,
      "yBottom": 407
    },
    {
      "x": 1308,
      "yTop": 500,
      "yBottom": 546
    },
    {
      "x": 1135,
      "yTop": 484,
      "yBottom": 535
    },
    {
      "x": 1075,
      "yTop": 470,
      "yBottom": 535
    },
    {
      "x": 968,
      "yTop": 482,
      "yBottom": 546
    },
    {
      "x": 912,
      "yTop": 398,
      "yBottom": 546
    },
    {
      "x": 752,
      "yTop": 404,
      "yBottom": 556
    },
    {
      "id": "wall_521",
      "x": 2331,
      "yTop": 168,
      "yBottom": 248
    }
  ],
  "frictionZones": [
    {
      "id": "friction_zone_3480",
      "x1": 1652,
      "x2": 2059,
      "yMin": 49,
      "yMax": 173,
      "requireCrawl": true,
      "crawlFriction": 2,
      "intenseSparks": true
    }
  ],
  "mechanisms": [
    {
      "type": "duct_auto_crawl_helper",
      "id": "duct_auto_crawl"
    },
    {
      "type": "fire_trap",
      "id": "waiter_cart_fire",
      "x": 800,
      "y": 386,
      "width": 64,
      "height": 16,
      "flameHeight": 75,
      "heatRate": 85
    },
    {
      "width": 407,
      "height": 124,
      "zoneType": "crawl",
      "frictionPower": 2,
      "accumulateMode": "move_only",
      "intenseSparks": true,
      "type": "friction_zone",
      "id": "friction_zone_3480",
      "x": 1652,
      "y": 49
    },
    {
      "width": 160,
      "height": 160,
      "nodeCount": 3,
      "angleOffset": -90,
      "opacityWhenInside": 0.75,
      "texture": "",
      "type": "polygon_mask",
      "id": "polygon_mask_9931",
      "x": 2049,
      "y": 209,
      "pts": [
        [
          1681,
          42
        ],
        [
          1686,
          74
        ],
        [
          1682,
          105
        ],
        [
          1668,
          138
        ],
        [
          1676,
          153
        ],
        [
          1712,
          173
        ],
        [
          2043,
          175
        ],
        [
          2066,
          151
        ],
        [
          2076,
          122
        ],
        [
          2077,
          88
        ],
        [
          2055,
          54
        ],
        [
          1662,
          14
        ]
      ]
    },
    {
      "width": 160,
      "height": 160,
      "nodeCount": 3,
      "angleOffset": -90,
      "opacityWhenInside": 1,
      "texture": "",
      "type": "polygon_mask",
      "id": "polygon_mask_8049",
      "x": 1522,
      "y": 157,
      "pts": [
        [
          1434,
          169
        ],
        [
          1517,
          148
        ],
        [
          1500,
          119
        ],
        [
          1493,
          82
        ],
        [
          1500,
          50
        ],
        [
          1527,
          10
        ],
        [
          1428,
          11
        ]
      ]
    }
  ],
  "items": [
    {
      "type": "water_ball",
      "id": "corner_water_ball",
      "x": 2480,
      "y": 530,
      "width": 28,
      "height": 28,
      "respawn": true
    }
  ]
};
