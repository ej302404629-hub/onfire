// 由火柴棒大逃亡：視覺化關卡設計工具自動生成
window.STAGE_COLLISION = {
  "worldWidth": 2048,
  "worldHeight": 1004,
  "actions": [
    "run_and_slide",
    "rope_climb",
    "switch_char",
    "ignite_item"
  ],
  "playerSpawn": {
    "x": 1930,
    "y": 792,
    "dir": -1
  },
  "goalArea": {
    "xMax": 245,
    "yMax": 575
  },
  "groundPolylines": [
    {
      "pts": [
        [
          14,
          859
        ],
        [
          340,
          864
        ],
        [
          450,
          825
        ],
        [
          580,
          818
        ],
        [
          750,
          830
        ],
        [
          950,
          830
        ],
        [
          1180,
          820
        ],
        [
          1380,
          810
        ],
        [
          1650,
          812
        ],
        [
          1850,
          800
        ],
        [
          2048,
          792
        ]
      ]
    },
    {
      "pts": [
        [
          445,
          618
        ],
        [
          600,
          616
        ],
        [
          760,
          612
        ],
        [
          985,
          455
        ],
        [
          1120,
          430
        ],
        [
          1265,
          432
        ]
      ]
    },
    {
      "pts": [
        [
          0,
          554
        ],
        [
          120,
          550
        ],
        [
          220,
          545
        ],
        [
          315,
          550
        ],
        [
          375,
          552
        ]
      ]
    }
  ],
  "ladders": [
    {
      "x1": 1180,
      "x2": 1260,
      "yTop": 432,
      "yBottom": 820,
      "topCenterX": 1218,
      "botCenterX": 1220,
      "exitNudgeX": -14
    },
    {
      "x1": 280,
      "x2": 410,
      "yTop": 550,
      "yBottom": 864,
      "topCenterX": 312,
      "botCenterX": 358,
      "exitNudgeX": -18
    }
  ],
  "solidWalls": [
    {
      "x1": 0,
      "x2": 280,
      "yTop": 575,
      "yBottom": 950
    },
    {
      "x1": 1150,
      "x2": 1180,
      "yTop": 455,
      "yBottom": 620
    },
    {
      "id": "wall_445",
      "x": 60,
      "yTop": 721,
      "yBottom": 877
    }
  ],
  "frictionZones": [],
  "mechanisms": [
    {
      "type": "friction_zone",
      "id": "BLUE",
      "x": 1330,
      "y": 680,
      "width": 525,
      "height": 160,
      "zoneType": "crawl",
      "frictionPower": 2.2,
      "accumulateMode": "move_only",
      "intenseSparks": false
    },
    {
      "type": "friction_zone",
      "id": "RED",
      "x": 448,
      "y": 680,
      "width": 717,
      "height": 170,
      "zoneType": "crawl",
      "frictionPower": 4.8,
      "accumulateMode": "move_only",
      "intenseSparks": true
    },
    {
      "type": "friction_zone",
      "id": "GREEN",
      "x": 910,
      "y": 380,
      "width": 300,
      "height": 160,
      "zoneType": "stand",
      "frictionPower": 1,
      "accumulateMode": "move_only",
      "intenseSparks": false
    },
    {
      "type": "friction_zone",
      "id": "YELLOW",
      "x": 720,
      "y": 430,
      "width": 190,
      "height": 210,
      "zoneType": "crawl",
      "frictionPower": 1,
      "accumulateMode": "move_only",
      "intenseSparks": false
    }
  ],
  "items": []
};
