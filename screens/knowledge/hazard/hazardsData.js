// screens/knowledge/hazard/hazardsData.js

export const HAZARDS = {
  Flood: {
    key: 'Flood',
    title: 'Flood',
    cover: require('../../../assets/quiz_images/flood.jpg'),
    tagline: 'Power off. Move up.',
    sectionsOrder: ['essentials', 'before', 'during', 'after', 'local', 'myths', 'vulnerable', 'checklist'],
    sections: {
      essentials: [
        'Stay away from swift / unknown-depth water.',
        'Move to higher floors or elevated areas; avoid basements and underpasses.',
        'Do not use elevators during flooding.',
        'Turn off power only in safe dry conditions.',
        'Follow official alerts (NEA/PUB/Gov.sg).'
      ],
      before: [
        'Clear balcony/gutter/drains; prepare door draft stoppers or sandbags.',
        'Elevate valuables and sockets; prepare flashlight & power bank.',
        'Plan vertical evacuation routes and a family meet point.'
      ],
      during: {
        outdoor: [
          'Head to higher ground immediately; avoid manholes and fast currents.',
          'Do not attempt to cross floodwater on foot.'
        ],
        indoor: [
          'Cut power if safe; move items up; do not use elevators.',
          'Prepare drinking water and keep shoes dry & non-slip.'
        ],
        driving: [
          'Never drive into flooded roads; turn around and find another route.',
          'If the vehicle stalls in rising water, abandon the car and move to safety.'
        ],
        transit: [
          'Follow staff instructions; avoid crossing waterlogged paths and underpasses.'
        ]
      },
      after: [
        'Wear non-slip shoes & gloves when cleaning; avoid bare feet.',
        'Ventilate before turning power back on; call an electrician if in doubt.',
        'Boil uncertain water or use bottled water; disinfect contaminated surfaces.'
      ],
      local: [
        { name: 'NEA myENV', desc: 'Weather & lightning alerts' },
        { name: 'PUB Water Level', desc: 'Water level / ponding information' },
        { name: 'SCDF 995', desc: 'Fire & ambulance' },
        { name: 'Police 999', desc: 'Emergency police assistance' }
      ],
      myths: [
        { myth: '“Shallow water is fine to cross.”', fact: 'Flow speed, hidden holes and electric hazards make it dangerous.' },
        { myth: '“Under bridges is safer during rain.”', fact: 'Low-lying areas can flood first.' }
      ],
      vulnerable: {
        seniors: [
          'Keep essential meds above ground level.',
          'Ensure non-slip footwear and walking aids are dry.'
        ],
        kids: ['Keep children close and away from floodwater.'],
        pets: ['Use leashes and avoid wading; prep pet carriers.']
      },
      checklist: [
        'Door stoppers / sandbags',
        'Flashlight & batteries',
        'Power bank',
        'Gloves & masks',
        'Disinfectant wipes',
        'Waterproof pouches for IDs',
        'Non-slip footwear'
      ]
    }
  },

  StormsLightning: {
    key: 'StormsLightning',
    title: 'Lightning',
    cover: require('../../../assets/quiz_images/lightning.jpg'),
    tagline: 'Shelter indoors.',
    sectionsOrder: ['essentials', 'before', 'during', 'after', 'myths', 'vulnerable', 'checklist', 'local'],
    sections: {
      essentials: [
        'If you hear thunder, lightning is close — go indoors/into vehicle.',
        'Avoid open fields, tall isolated trees and metal objects.',
        'Indoors: avoid showers/taps and wired equipment.',
        'Use 30/30 rule: seek shelter when thunder follows lightning within 30s.'
      ],
      before: [
        'Prepare lighting and power banks; ensure offline materials are available.',
        'Secure balcony items and check window sealing.'
      ],
      during: {
        outdoor: [
          'Move to a substantial building or metal-roof car immediately.',
          'Do not shelter under isolated trees, pergolas or open shelters.'
        ],
        indoor: [
          'Avoid using wired devices or plumbing; stay away from windows.'
        ],
        driving: [
          'Stay inside the vehicle, pull over safely, avoid touching metal frames.'
        ]
      },
      after: [
        'Check for tripped breakers or burnt smells; cut power and call electrician if needed.',
        'If someone is struck, ensure scene safety, then call 995.'
      ],
      myths: [
        { myth: '“Light rain means low risk.”', fact: 'Thunderstorms are about lightning, not rain amount.' },
        { myth: '“Tree shade is safe in a storm.”', fact: 'Trees attract lightning; dangerous.' }
      ],
      vulnerable: {
        seniors: ['Keep hearing aids and phones charged for alerts.'],
        kids: ['Bring kids indoors at first sound of thunder.'],
        pets: ['Keep pets indoors; avoid metal leashes outside.']
      },
      checklist: [
        'Flashlight',
        'Power bank',
        'Waterproof pouch',
        'Printed emergency contacts'
      ],
      local: [
        { name: 'NEA Lightning Alerts', desc: 'Lightning map & warnings' }
      ]
    }
  },

  Haze: {
    key: 'Haze',
    title: 'Haze',
    cover: require('../../../assets/quiz_images/airquality.jpg'),
    tagline: 'Mask up. Purify air.',
    sectionsOrder: ['essentials', 'before', 'during', 'after', 'myths', 'vulnerable', 'checklist', 'local'],
    sections: {
      essentials: [
        'Monitor PM2.5/PSI; sensitive groups take extra precautions.',
        'Reduce outdoor strenuous activity; consider appropriate masks.',
        'Close windows; use purifier or AC with recirculation.',
        'Stay hydrated and seek medical help if unwell.'
      ],
      before: [
        'Prepare air purifier & spare filters; check window sealing.',
        'Prepare masks and meds for sensitive groups.'
      ],
      during: {
        outdoor: [
          'Limit exposure time; wear suitable mask if needed.',
          'Wash hands/face after returning home.'
        ],
        indoor: [
          'Run purifier at suitable setting; keep hydrated.'
        ]
      },
      after: [
        'Ventilate when AQ improves; do a light dust clean.'
      ],
      myths: [
        { myth: '“Cloth masks suffice for haze.”', fact: 'They have limited particulate filtration.' },
        { myth: '“Closing windows alone solves it.”', fact: 'Filtration still needed to reduce indoor PM2.5.' }
      ],
      vulnerable: {
        seniors: ['Keep routine meds & inhalers accessible.'],
        kids: ['Reduce outdoor play during poor AQ.'],
        pregnancy: ['Avoid exposure; consult care provider if symptomatic.']
      },
      checklist: [
        'Air purifier & filters',
        'Appropriate masks',
        'Eye drops / lozenges',
        'Drinking water'
      ],
      local: [
        { name: 'NEA Air Quality', desc: 'PSI/PM2.5 readings & guidance' }
      ]
    }
  },

  Heatwave: {
    key: 'Heatwave',
    title: 'Heatwave',
    cover: require('../../../assets/quiz_images/heatwave.jpg'),
    tagline: 'Hydrate. Stay cool.',
    sectionsOrder: ['essentials', 'before', 'during', 'after', 'myths', 'vulnerable', 'checklist'],
    sections: {
      essentials: [
        'Hydrate, seek shade, cool down; avoid heavy exertion at peak heat.',
        'Watch for signs: dizziness, nausea, hot dry skin, confusion.',
        'Never leave children/pets in cars.'
      ],
      before: [
        'Plan cool schedule; prepare hats, cooling towels, small fans/ice packs.',
        'Service AC/fans; use curtains or window films.'
      ],
      during: {
        outdoor: [
          'Find shade/AC spaces; light-colored breathable clothing; drink water frequently.'
        ],
        indoor: [
          'Ventilate/cool rooms; consider oral rehydration solutions as needed.'
        ]
      },
      after: [
        'Resume activities gradually; hydrate; seek care if symptoms persist.'
      ],
      myths: [
        { myth: '“Coffee/energy drinks hydrate well.”', fact: 'Caffeine may worsen dehydration.' },
        { myth: '“Sun exposure builds heat tolerance quickly.”', fact: 'Risk of heat injury rises; go gradual and cautious.' }
      ],
      vulnerable: {
        seniors: ['Check on elders twice daily; ensure cool spaces.'],
        kids: ['Offer water frequently; use shade and light clothing.'],
        outdoorWorkers: ['Schedule breaks; buddy system; cooling stations.']
      },
      checklist: [
        'Water bottle',
        'Sun hat/umbrella',
        'Electrolyte solution',
        'Cooling towel/spray',
        'Portable fan',
        'Thermometer'
      ]
    }
  },

  CoastalFlooding: {
    key: 'CoastalFlooding',
    title: 'Coastal',
    cover: require('../../../assets/quiz_images/coastal.jpg'),
    tagline: 'Watch tides. Stay back.',
    sectionsOrder: ['essentials', 'before', 'during', 'after', 'myths', 'vulnerable', 'checklist', 'local'],
    sections: {
      essentials: [
        'Keep distance from seawalls, wave breakers and slippery rocks.',
        'Avoid low-lying carparks & quays during high tide/storm surge.',
        'Do not sit on the edge for photos; rogue waves can knock you over.'
      ],
      before: [
        'Check tide & weather; plan alternative inland routes.',
        'Prepare waterproof bags; bring non-slip footwear.'
      ],
      during: {
        outdoor: [
          'If water rises fast or waves strengthen, move inland to higher ground.',
          'Avoid coasts at night/low visibility.'
        ]
      },
      after: [
        'Clean and disinfect seawater-soaked wounds; do not power wet appliances.'
      ],
      myths: [
        { myth: '“Seawalls are safe to sit on.”', fact: 'Splash zones & rogue waves are hazardous.' },
        { myth: '“Holding a child is enough.”', fact: 'Sudden surges can sweep both away.' }
      ],
      vulnerable: {
        kids: ['Keep at safe distance; use non-slip shoes.'],
        seniors: ['Avoid slippery paths; bring walking aids.']
      },
      checklist: [
        'Non-slip footwear',
        'Waterproof bag',
        'Flashlight',
        'Compact first-aid kit'
      ],
      local: [
        { name: 'Tide Tables', desc: 'Check high tide timings before visiting coasts' }
      ]
    }
  }
};

export const HAZARD_KEYS = ['Flood', 'StormsLightning', 'Haze', 'Heatwave', 'CoastalFlooding'];
