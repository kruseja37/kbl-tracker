# Field Zone Input System Specification

> **Purpose**: Define touch-based zone input system for recording batted ball locations
> **Replaces**: Directional buttons (Pull/Center/Oppo, Shallow/Medium/Deep)
> **Integration**: Feeds into CLUTCH_ATTRIBUTION_SPEC.md (Contact Quality) and spray charts
> **UI Style**: GameChanger-like visual baseball diamond

---

## Table of Contents

1. [Overview](#1-overview)
2. [Zone Definitions](#2-zone-definitions)
3. [Zone → Data Mapping](#3-zone--data-mapping)
4. [UI Layout & Design](#4-ui-layout--design)
5. [Touch Interaction](#5-touch-interaction)
6. [Integration with Contact Quality](#6-integration-with-contact-quality)
7. [Fielder Auto-Assignment](#7-fielder-auto-assignment)
8. [Spray Chart Generation](#8-spray-chart-generation)
9. [Implementation](#9-implementation)

---

## 1. Overview

### Why Zone-Based Input?

The current button-based system requires multiple taps:
- Direction: Pull / Center / Oppo
- Depth: Shallow / Medium / Deep
- Fielder: Manual selection

Zone-based input captures all three in **one tap**:
- Tap where the ball landed or was fielded
- System infers direction, depth, and likely fielder

### Design Philosophy

| Principle | Implementation |
|-----------|---------------|
| **Speed** | Single tap captures location |
| **Accuracy** | 25 zones (18 fair + 7 foul) balance precision vs complexity |
| **Intuitive** | Visual field matches real baseball positions |
| **Forgiving** | Tap anywhere, system finds nearest zone |
| **Complete** | Covers all playable territory including foul ground |

---

## 2. Zone Definitions

### 2.1 The 25-Zone System

The field is divided into **25 zones** covering fair territory AND foul territory:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FOUL                         OUTFIELD                               FOUL    │
│ [F05]                                                               [F00]   │
│  │     ┌───────────┬───────────┬───────────┬───────────┬───────┐      │     │
│  │     │    LF     │   LCF     │    CF     │   RCF     │  RF   │      │     │
│  │     │  WALL/WT  │           │  WALL/WT  │           │ WALL  │      │     │
│  │     │   [Z17]   │   [Z16]   │   [Z15]   │   [Z14]   │ [Z13] │      │     │
│  │     └───────────┴───────────┴───────────┴───────────┴───────┘      │     │
│ [F04]  ┌───────────┬───────────┬───────────┬───────────┬───────┐   [F01]   │
│  │     │    LF     │   LCF     │    CF     │   RCF     │  RF   │      │     │
│  │     │   DEEP    │   DEEP    │   DEEP    │   DEEP    │ DEEP  │      │     │
│  │     │   [Z12]   │   [Z11]   │   [Z10]   │   [Z09]   │ [Z08] │      │     │
│  │     └───────────┴───────────┴───────────┴───────────┴───────┘      │     │
│ [F03]      ┌─────────┬───────────────────┬─────────┐              [F02]    │
│  │         │  LF     │       CF          │   RF    │                 │     │
│  │         │ SHALLOW │     SHALLOW       │ SHALLOW │                 │     │
│  │         │  [Z07]  │      [Z06]        │  [Z05]  │                 │     │
│  │         └─────────┴───────────────────┴─────────┘                 │     │
│  │                                                                    │     │
│  │                         INFIELD                                   │     │
│  │                                                                    │     │
│  │          ┌─────┐                       ┌─────┐                    │     │
│  │          │ 3B  │                       │ 1B  │                    │     │
│  │          │[Z04]│    ┌─────────┐        │[Z01]│                    │     │
│  │          └─────┘    │   P     │        └─────┘                    │     │
│  │                     │  [Z00]  │                                    │     │
│  │      ┌─────┐        └─────────┘        ┌─────┐                    │     │
│  │      │ SS  │                           │ 2B  │                    │     │
│  │      │[Z03]│                           │[Z02]│                    │     │
│  │      └─────┘                           └─────┘                    │     │
│  │                                                                    │     │
│  │                          ┌─────┐                                  │     │
│  │                          │  C  │                                  │     │
│  │                          │     │                                  │     │
│  │                          └─────┘                                  │     │
│  │                                                                    │     │
│  └─ FOUL LINE (3B) ─────────── ◇ ────────────── FOUL LINE (1B) ─────┘     │
│                             HOME                                           │
│                                                                            │
│                      ┌─────────────────┐                                   │
│                      │   CATCHER FOUL  │                                   │
│                      │      [F06]      │                                   │
│                      └─────────────────┘                                   │
└────────────────────────────────────────────────────────────────────────────┘

FOUL ZONES:
F00 = RF Foul Line (deep)     F03 = LF Foul Line (shallow/infield)
F01 = RF Foul Line (medium)   F04 = LF Foul Line (medium)
F02 = RF Foul Line (shallow)  F05 = LF Foul Line (deep)
F06 = Behind Home Plate (catcher popup)
```

### 2.2 Zone ID Reference

```javascript
const FIELD_ZONES = {
  // ============================================
  // FAIR TERRITORY (Z00-Z17)
  // ============================================

  // Infield (0-4)
  Z00: { id: 'Z00', name: 'Pitcher', area: 'infield', position: 'P', isFoul: false },
  Z01: { id: 'Z01', name: '1B Area', area: 'infield', position: '1B', isFoul: false },
  Z02: { id: 'Z02', name: '2B Area', area: 'infield', position: '2B', isFoul: false },
  Z03: { id: 'Z03', name: 'SS Area', area: 'infield', position: 'SS', isFoul: false },
  Z04: { id: 'Z04', name: '3B Area', area: 'infield', position: '3B', isFoul: false },

  // Shallow Outfield (5-7)
  Z05: { id: 'Z05', name: 'Shallow RF', area: 'shallow_outfield', position: 'RF', isFoul: false },
  Z06: { id: 'Z06', name: 'Shallow CF', area: 'shallow_outfield', position: 'CF', isFoul: false },
  Z07: { id: 'Z07', name: 'Shallow LF', area: 'shallow_outfield', position: 'LF', isFoul: false },

  // Deep Outfield (8-12)
  Z08: { id: 'Z08', name: 'Deep RF', area: 'deep_outfield', position: 'RF', isFoul: false },
  Z09: { id: 'Z09', name: 'Deep RCF', area: 'deep_outfield', position: 'CF', isFoul: false },
  Z10: { id: 'Z10', name: 'Deep CF', area: 'deep_outfield', position: 'CF', isFoul: false },
  Z11: { id: 'Z11', name: 'Deep LCF', area: 'deep_outfield', position: 'CF', isFoul: false },
  Z12: { id: 'Z12', name: 'Deep LF', area: 'deep_outfield', position: 'LF', isFoul: false },

  // Warning Track / Wall (13-17)
  Z13: { id: 'Z13', name: 'RF Wall', area: 'wall', position: 'RF', isFoul: false },
  Z14: { id: 'Z14', name: 'RCF Wall', area: 'wall', position: 'CF', isFoul: false },
  Z15: { id: 'Z15', name: 'CF Wall', area: 'wall', position: 'CF', isFoul: false },
  Z16: { id: 'Z16', name: 'LCF Wall', area: 'wall', position: 'CF', isFoul: false },
  Z17: { id: 'Z17', name: 'LF Wall', area: 'wall', position: 'LF', isFoul: false },

  // ============================================
  // FOUL TERRITORY (F00-F06)
  // ============================================

  // Right Field Foul Line (1B side)
  F00: { id: 'F00', name: 'RF Foul Deep', area: 'foul_deep', position: 'RF', isFoul: true, foulSide: 'right' },
  F01: { id: 'F01', name: 'RF Foul Medium', area: 'foul_medium', position: 'RF', isFoul: true, foulSide: 'right' },
  F02: { id: 'F02', name: 'RF Foul Shallow', area: 'foul_shallow', position: '1B', isFoul: true, foulSide: 'right' },

  // Left Field Foul Line (3B side)
  F03: { id: 'F03', name: 'LF Foul Shallow', area: 'foul_shallow', position: '3B', isFoul: true, foulSide: 'left' },
  F04: { id: 'F04', name: 'LF Foul Medium', area: 'foul_medium', position: 'LF', isFoul: true, foulSide: 'left' },
  F05: { id: 'F05', name: 'LF Foul Deep', area: 'foul_deep', position: 'LF', isFoul: true, foulSide: 'left' },

  // Behind Home Plate
  F06: { id: 'F06', name: 'Catcher Foul', area: 'foul_catcher', position: 'C', isFoul: true, foulSide: 'back' }
};
```

### 2.3 Zone Geometry (SVG Coordinates)

The field uses a normalized coordinate system (0-100 for both axes):

```javascript
const ZONE_POLYGONS = {
  // Home plate at (50, 95), center field at (50, 5)

  // ============================================
  // FAIR TERRITORY
  // ============================================

  // Infield zones - pentagon/quadrilateral shapes
  Z00: { path: 'M 50,75 L 55,70 L 55,60 L 45,60 L 45,70 Z' },  // Pitcher
  Z01: { path: 'M 70,85 L 80,75 L 70,65 L 60,75 Z' },           // 1B
  Z02: { path: 'M 60,70 L 70,60 L 60,50 L 50,60 Z' },           // 2B
  Z03: { path: 'M 50,60 L 40,50 L 30,60 L 40,70 Z' },           // SS
  Z04: { path: 'M 40,75 L 30,65 L 20,75 L 30,85 Z' },           // 3B

  // Shallow outfield - arc segments
  Z05: { path: 'M 75,55 L 85,45 L 75,35 L 65,45 Z' },           // Shallow RF
  Z06: { path: 'M 65,45 L 75,35 L 50,25 L 25,35 L 35,45 Z' },   // Shallow CF
  Z07: { path: 'M 35,45 L 25,35 L 15,45 L 25,55 Z' },           // Shallow LF

  // Deep outfield - arc segments
  Z08: { path: 'M 85,45 L 95,30 L 85,20 L 75,35 Z' },           // Deep RF
  Z09: { path: 'M 75,35 L 85,20 L 65,12 L 60,25 Z' },           // Deep RCF
  Z10: { path: 'M 60,25 L 65,12 L 35,12 L 40,25 Z' },           // Deep CF
  Z11: { path: 'M 40,25 L 35,12 L 15,20 L 25,35 Z' },           // Deep LCF
  Z12: { path: 'M 25,35 L 15,20 L 5,30 L 15,45 Z' },            // Deep LF

  // Wall zones - thin strips at outer edge
  Z13: { path: 'M 95,30 L 98,18 L 90,12 L 85,20 Z' },           // RF Wall
  Z14: { path: 'M 85,20 L 90,12 L 70,5 L 65,12 Z' },            // RCF Wall
  Z15: { path: 'M 65,12 L 70,5 L 30,5 L 35,12 Z' },             // CF Wall
  Z16: { path: 'M 35,12 L 30,5 L 10,12 L 15,20 Z' },            // LCF Wall
  Z17: { path: 'M 15,20 L 10,12 L 2,18 L 5,30 Z' },             // LF Wall

  // ============================================
  // FOUL TERRITORY
  // ============================================

  // Right Field Foul Line (1B side) - runs along right edge
  F00: { path: 'M 98,18 L 100,5 L 100,20 L 98,18 Z' },          // RF Foul Deep (corner)
  F01: { path: 'M 95,30 L 100,20 L 100,45 L 90,50 Z' },         // RF Foul Medium
  F02: { path: 'M 80,75 L 90,50 L 100,45 L 100,80 L 85,90 Z' }, // RF Foul Shallow (1B side)

  // Left Field Foul Line (3B side) - runs along left edge
  F03: { path: 'M 20,75 L 15,90 L 0,80 L 0,45 L 10,50 Z' },     // LF Foul Shallow (3B side)
  F04: { path: 'M 5,30 L 10,50 L 0,45 L 0,20 Z' },              // LF Foul Medium
  F05: { path: 'M 2,18 L 0,20 L 0,5 L 2,18 Z' },                // LF Foul Deep (corner)

  // Behind Home Plate
  F06: { path: 'M 15,90 L 50,95 L 85,90 L 100,100 L 0,100 Z' }  // Catcher Foul (behind home)
};
```

---

## 3. Zone → Data Mapping

### 3.1 Direction Mapping

Each zone maps to a spray direction based on batter handedness:

```javascript
/**
 * Get spray direction from zone for a batter
 * Pull = towards batter's same side (L→RF, R→LF)
 * Oppo = towards opposite side
 * Center = middle zones
 * Foul zones return 'foul_left', 'foul_right', or 'foul_back'
 */
function getDirectionFromZone(zoneId, batterHand) {
  const ZONE_TO_DIRECTION = {
    // Right side of field (pull for lefties, oppo for righties)
    Z01: 'right', Z05: 'right', Z08: 'right', Z13: 'right',
    Z02: 'center_right', Z09: 'center_right', Z14: 'center_right',

    // Center
    Z00: 'center', Z06: 'center', Z10: 'center', Z15: 'center',

    // Left side of field (pull for righties, oppo for lefties)
    Z03: 'center_left', Z11: 'center_left', Z16: 'center_left',
    Z04: 'left', Z07: 'left', Z12: 'left', Z17: 'left',

    // Foul territory (always returns foul direction, no pull/oppo conversion)
    F00: 'foul_right', F01: 'foul_right', F02: 'foul_right',  // 1B/RF line
    F03: 'foul_left', F04: 'foul_left', F05: 'foul_left',     // 3B/LF line
    F06: 'foul_back'                                           // Behind home
  };

  const rawDirection = ZONE_TO_DIRECTION[zoneId] || 'center';

  // Foul zones don't convert to pull/oppo - they stay as foul
  if (rawDirection.startsWith('foul_')) {
    return rawDirection;
  }

  // Convert to pull/center/oppo based on handedness
  if (batterHand === 'L') {
    return {
      right: 'pull',
      center_right: 'pull_center',
      center: 'center',
      center_left: 'oppo_center',
      left: 'oppo'
    }[rawDirection];
  } else {  // Right-handed or unknown
    return {
      left: 'pull',
      center_left: 'pull_center',
      center: 'center',
      center_right: 'oppo_center',
      right: 'oppo'
    }[rawDirection];
  }
}
```

### 3.2 Depth Mapping

```javascript
const ZONE_TO_DEPTH = {
  // ============================================
  // FAIR TERRITORY
  // ============================================

  // Infield
  Z00: 'infield', Z01: 'infield', Z02: 'infield',
  Z03: 'infield', Z04: 'infield',

  // Shallow outfield
  Z05: 'shallow', Z06: 'shallow', Z07: 'shallow',

  // Deep outfield
  Z08: 'medium', Z09: 'medium', Z10: 'medium',
  Z11: 'medium', Z12: 'medium',

  // Warning track / wall
  Z13: 'deep', Z14: 'deep', Z15: 'deep',
  Z16: 'deep', Z17: 'deep',

  // ============================================
  // FOUL TERRITORY
  // ============================================

  // RF Foul Line (1B side)
  F00: 'foul_deep',     // Corner near RF wall
  F01: 'foul_medium',   // Along line in OF
  F02: 'foul_shallow',  // Near 1B dugout area

  // LF Foul Line (3B side)
  F03: 'foul_shallow',  // Near 3B dugout area
  F04: 'foul_medium',   // Along line in OF
  F05: 'foul_deep',     // Corner near LF wall

  // Behind home
  F06: 'foul_catcher'   // Catcher popup territory
};

/**
 * Get depth category from zone
 */
function getDepthFromZone(zoneId) {
  return ZONE_TO_DEPTH[zoneId] || 'medium';
}

/**
 * Check if zone is foul territory
 */
function isFoulZone(zoneId) {
  return zoneId.startsWith('F');
}
```

### 3.3 Complete Zone Data Export

```javascript
/**
 * Get all data from a zone tap
 */
function getZoneData(zoneId, batterHand) {
  const zone = FIELD_ZONES[zoneId];

  return {
    zoneId: zoneId,
    zoneName: zone.name,

    // For spray charts
    direction: getDirectionFromZone(zoneId, batterHand),
    depth: getDepthFromZone(zoneId),

    // For fielder assignment
    area: zone.area,
    likelyFielder: zone.position,

    // Foul territory info
    isFoul: zone.isFoul || false,
    foulSide: zone.foulSide || null,  // 'left', 'right', 'back', or null

    // For CQ inference
    isInfield: zone.area === 'infield',
    isWall: zone.area === 'wall'
  };
}
```

---

## 4. UI Layout & Design

### 4.1 Visual Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     TAP WHERE BALL LANDED                       │
│                                                                 │
│                          ╭─────────╮                            │
│                       ╭──┤  WALL   ├──╮                         │
│                    ╭──┤  └─────────┘  ├──╮                      │
│                 ╭──┤      DEEP OF       ├──╮                    │
│              ╭──┤  └───────────────────┘  ├──╮                  │
│           ╭──┤       SHALLOW OF             ├──╮                │
│        ╭──┤  └───────────────────────────┘  ├──╮               │
│     ╭──┤                                       ├──╮             │
│    │   │  3B ●              ● 1B                 │  │           │
│    │   │       ●SS      P●      ●2B              │  │           │
│    │   └─────────────────●C────────────────────┘   │           │
│    │                      ◇                        │           │
│    └──────────────────────────────────────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Selected: [None]           Fielder: [Auto-assign]       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│          [FOUL LEFT]     [POPUP]     [FOUL RIGHT]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Visual States

```javascript
const ZONE_VISUAL_STATES = {
  idle: {
    fill: 'transparent',
    stroke: '#444',
    strokeWidth: 1
  },
  hover: {
    fill: 'rgba(100, 150, 255, 0.2)',
    stroke: '#6699ff',
    strokeWidth: 2
  },
  selected: {
    fill: 'rgba(255, 200, 50, 0.4)',
    stroke: '#ffcc33',
    strokeWidth: 3
  },
  disabled: {
    fill: 'rgba(100, 100, 100, 0.1)',
    stroke: '#333',
    strokeWidth: 1
  }
};
```

### 4.3 Color Coding by Area

```javascript
const AREA_COLORS = {
  infield: {
    base: '#8B4513',      // Brown (dirt)
    highlight: '#CD853F'
  },
  shallow_outfield: {
    base: '#228B22',      // Green (grass)
    highlight: '#32CD32'
  },
  deep_outfield: {
    base: '#006400',      // Darker green
    highlight: '#228B22'
  },
  wall: {
    base: '#4169E1',      // Blue (warning track indicator)
    highlight: '#6495ED'
  },

  // Foul territory - grayed out to distinguish from fair
  foul_shallow: {
    base: '#A9A9A9',      // Dark gray
    highlight: '#C0C0C0'
  },
  foul_medium: {
    base: '#808080',      // Gray
    highlight: '#A9A9A9'
  },
  foul_deep: {
    base: '#696969',      // Dim gray
    highlight: '#808080'
  },
  foul_catcher: {
    base: '#778899',      // Light slate gray
    highlight: '#B0C4DE'
  }
};
```

---

## 5. Touch Interaction

### 5.1 Tap Detection

```javascript
/**
 * Handle tap on field SVG
 */
function handleFieldTap(event, svgElement) {
  const point = getSVGPoint(event, svgElement);
  const zoneId = findZoneAtPoint(point);

  if (zoneId) {
    selectZone(zoneId);
  }
}

/**
 * Convert screen coordinates to SVG coordinates
 */
function getSVGPoint(event, svg) {
  const rect = svg.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  return { x, y };
}

/**
 * Find which zone contains a point
 */
function findZoneAtPoint(point) {
  for (const [zoneId, zone] of Object.entries(ZONE_POLYGONS)) {
    if (pointInPolygon(point, zone.path)) {
      return zoneId;
    }
  }

  // If no exact match, find nearest zone
  return findNearestZone(point);
}
```

### 5.2 Nearest Zone Fallback

```javascript
/**
 * Find nearest zone if tap is outside all polygons
 */
function findNearestZone(point) {
  let nearestZone = null;
  let nearestDistance = Infinity;

  const ZONE_CENTERS = {
    // Fair territory
    Z00: { x: 50, y: 67 },
    Z01: { x: 70, y: 75 },
    Z02: { x: 60, y: 60 },
    Z03: { x: 40, y: 60 },
    Z04: { x: 30, y: 75 },
    Z05: { x: 75, y: 45 },
    Z06: { x: 50, y: 38 },
    Z07: { x: 25, y: 45 },
    Z08: { x: 85, y: 32 },
    Z09: { x: 68, y: 22 },
    Z10: { x: 50, y: 18 },
    Z11: { x: 32, y: 22 },
    Z12: { x: 15, y: 32 },
    Z13: { x: 92, y: 20 },
    Z14: { x: 75, y: 10 },
    Z15: { x: 50, y: 8 },
    Z16: { x: 25, y: 10 },
    Z17: { x: 8, y: 20 },

    // Foul territory
    F00: { x: 98, y: 12 },   // RF foul deep (corner)
    F01: { x: 95, y: 38 },   // RF foul medium
    F02: { x: 88, y: 70 },   // RF foul shallow (1B side)
    F03: { x: 12, y: 70 },   // LF foul shallow (3B side)
    F04: { x: 5, y: 38 },    // LF foul medium
    F05: { x: 2, y: 12 },    // LF foul deep (corner)
    F06: { x: 50, y: 98 }    // Catcher foul (behind home)
  };

  for (const [zoneId, center] of Object.entries(ZONE_CENTERS)) {
    const dist = Math.hypot(point.x - center.x, point.y - center.y);
    if (dist < nearestDistance) {
      nearestDistance = dist;
      nearestZone = zoneId;
    }
  }

  return nearestZone;
}
```

### 5.3 Quick Tap Shortcuts

For common plays, provide quick-tap buttons below the field:

```javascript
const QUICK_TAP_BUTTONS = [
  { id: 'foul_left', label: 'Foul L', zone: null, special: 'foul_left' },
  { id: 'popup', label: 'Popup', zone: 'Z00', exitType: 'Popup' },
  { id: 'foul_right', label: 'Foul R', zone: null, special: 'foul_right' },
  { id: 'hr_left', label: 'HR L', zone: 'Z17', result: 'HR' },
  { id: 'hr_center', label: 'HR C', zone: 'Z15', result: 'HR' },
  { id: 'hr_right', label: 'HR R', zone: 'Z13', result: 'HR' }
];
```

---

## 6. Integration with Contact Quality

### 6.1 Zone → CQ Depth Mapping

The zone directly informs the Contact Quality inference from CLUTCH_ATTRIBUTION_SPEC.md:

```javascript
/**
 * Get CQ trajectory info from zone tap
 * Integrates with getContactQualityFromUI() from Clutch spec
 */
function getCQTrajectoryFromZone(zoneId, exitType) {
  const depth = getDepthFromZone(zoneId);

  // Map zone depth to CQ inference parameters
  if (exitType === 'Fly Ball') {
    return {
      depth: {
        'infield': 'shallow',    // Popup territory
        'shallow': 'shallow',
        'medium': 'medium',
        'deep': 'deep'
      }[depth]
    };
  }

  if (exitType === 'Ground Ball') {
    // Ground balls in outfield = through hole = hard
    // Ground balls in infield with out = routine
    return {
      speed: {
        'infield': 'medium',
        'shallow': 'hard',       // Got through infield
        'medium': 'hard',
        'deep': 'hard'
      }[depth]
    };
  }

  // Line drives don't need depth modification
  return {};
}

/**
 * Complete CQ resolution from zone + exit type
 */
function getContactQualityFromZone(zoneId, exitType, result) {
  const trajectory = getCQTrajectoryFromZone(zoneId, exitType);

  // Use the function from CLUTCH_ATTRIBUTION_SPEC.md
  return getContactQualityFromUI(exitType, trajectory, result);
}
```

### 6.2 Foul Territory Contact Quality

Foul balls that result in outs still have Contact Quality for clutch attribution:

```javascript
/**
 * Get CQ for foul territory catches
 * Foul popups are generally weak contact; foul flies down line vary
 */
function getFoulContactQuality(zoneId, exitType) {
  const FOUL_CQ = {
    // Catcher foul popup - always weak (mishit)
    F06: 0.15,

    // Shallow foul (near dugout) - usually weak popup
    F02: 0.20,
    F03: 0.20,

    // Medium foul - could be decent fly ball
    F01: 0.35,
    F04: 0.35,

    // Deep foul corner - often hard foul ball
    F00: 0.50,
    F05: 0.50
  };

  // Override for line drives in foul territory (hard but foul)
  if (exitType === 'Line Drive') {
    return 0.70;  // Hard contact, just foul
  }

  return FOUL_CQ[zoneId] || 0.25;
}
```

### 6.3 Example CQ Calculations

| Tap Zone | Exit Type | Result | CQ | Reasoning |
|----------|-----------|--------|-----|-----------|
| Z15 (CF Wall) | Fly Ball | Out | 0.75 | Deep fly = hard contact |
| Z06 (Shallow CF) | Fly Ball | Out | 0.35 | Shallow fly = weak contact |
| Z03 (SS Area) | Ground Ball | Out | 0.50 | Routine grounder |
| Z07 (Shallow LF) | Ground Ball | Single | 0.70 | Through hole = hard contact |
| Z10 (Deep CF) | Line Drive | Out | 0.85 | Line drive always = hard |
| Z13 (RF Wall) | Fly Ball | HR | 1.0 | Home run always = barrel |
| **F06 (Catcher Foul)** | Popup | Out | 0.15 | Weak popup = mishit |
| **F00 (RF Corner Foul)** | Fly Ball | Out | 0.50 | Deep foul = decent contact |
| **F03 (3B Foul Shallow)** | Popup | Out | 0.20 | Foul popup = weak |

---

## 7. Fielder Auto-Assignment

### 7.1 Default Fielder by Zone

```javascript
/**
 * Get most likely fielder for a zone
 */
function getDefaultFielder(zoneId) {
  return FIELD_ZONES[zoneId]?.position || null;
}
```

### 7.2 Fielder Override UI

After zone selection, show fielder chips for override:

```
┌─────────────────────────────────────────────────────────────────┐
│  FIELDER: CF (auto)                                             │
│                                                                 │
│  [P] [C] [1B] [2B] [SS] [3B] [LF] [●CF] [RF]                    │
│                                                                 │
│  Tap to change if different fielder made the play               │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Smart Fielder Suggestions

Based on zone, suggest plausible fielders:

```javascript
/**
 * Get fielder suggestions for a zone (primary + alternates)
 */
function getFielderSuggestions(zoneId) {
  const suggestions = {
    // ============================================
    // FAIR TERRITORY
    // ============================================

    // Infield zones - primary + adjacent
    Z00: ['P', 'C', '1B', '3B'],
    Z01: ['1B', '2B', 'P'],
    Z02: ['2B', 'SS', '1B'],
    Z03: ['SS', '3B', '2B'],
    Z04: ['3B', 'SS', 'P'],

    // Shallow outfield - could be infielder going back or OF coming in
    Z05: ['RF', '2B', '1B'],
    Z06: ['CF', 'SS', '2B'],
    Z07: ['LF', 'SS', '3B'],

    // Deep outfield - OF only but could be adjacent
    Z08: ['RF'],
    Z09: ['CF', 'RF'],
    Z10: ['CF'],
    Z11: ['CF', 'LF'],
    Z12: ['LF'],

    // Wall - OF only
    Z13: ['RF'],
    Z14: ['CF', 'RF'],
    Z15: ['CF'],
    Z16: ['CF', 'LF'],
    Z17: ['LF'],

    // ============================================
    // FOUL TERRITORY
    // ============================================

    // RF Foul Line (1B side)
    F00: ['RF'],                    // Deep foul corner - RF
    F01: ['RF', '1B'],              // Medium foul - RF or 1B
    F02: ['1B', 'C', '2B'],         // Shallow foul near dugout - 1B, C, or 2B

    // LF Foul Line (3B side)
    F03: ['3B', 'C', 'SS'],         // Shallow foul near dugout - 3B, C, or SS
    F04: ['LF', '3B'],              // Medium foul - LF or 3B
    F05: ['LF'],                    // Deep foul corner - LF

    // Behind Home Plate
    F06: ['C', 'P', '1B', '3B']     // Catcher popup - C primarily, corners possible
  };

  return suggestions[zoneId] || ['CF'];
}
```

---

## 8. Spray Chart Generation

> **See STADIUM_ANALYTICS_SPEC.md** for stadium-level spray chart tracking, aggregation, and visualization.

### 8.1 Zone-to-Spray-Point Mapping

Each zone tap converts to a spray chart point with slight randomization:

```javascript
/**
 * Generate spray chart point from zone
 */
function generateSprayPoint(zoneId, randomize = true) {
  const center = ZONE_CENTERS[zoneId];

  if (!randomize) {
    return { x: center.x, y: center.y };
  }

  // Add small random offset within zone
  const jitter = 3;  // ±3 units
  return {
    x: center.x + (Math.random() - 0.5) * jitter * 2,
    y: center.y + (Math.random() - 0.5) * jitter * 2
  };
}

/**
 * Spray chart point with metadata
 */
function createSprayChartEntry(zoneId, batterHand, result, exitType) {
  const point = generateSprayPoint(zoneId);
  const zoneData = getZoneData(zoneId, batterHand);

  return {
    x: point.x,
    y: point.y,
    zoneId: zoneId,
    direction: zoneData.direction,
    depth: zoneData.depth,
    result: result,           // 'single', 'double', 'out', 'HR', etc.
    exitType: exitType,       // 'Line Drive', 'Fly Ball', etc.

    // For spray chart coloring
    isHit: ['single', 'double', 'triple', 'HR'].includes(result),
    isHR: result === 'HR'
  };
}
```

### 8.2 Stadium Spray Chart Integration

Zone data feeds into both player spray charts AND stadium spray charts:

```javascript
/**
 * Create batted ball event for stadium analytics
 * Maps our 25-zone system to STADIUM_ANALYTICS_SPEC spray zones
 */
function createStadiumBattedBallEvent(
  zoneId: string,
  gameContext: GameContext,
  batterHand: 'L' | 'R',
  result: string,
  exitType: string
): BattedBallEvent {
  const zoneData = getZoneData(zoneId, batterHand);
  const sprayPoint = generateSprayPoint(zoneId);

  // Map our zones to stadium analytics spray zones
  const stadiumZone = mapToStadiumSprayZone(zoneId);

  return {
    gameId: gameContext.gameId,
    inning: gameContext.inning,
    batterId: gameContext.batterId,
    pitcherId: gameContext.pitcherId,
    batterHandedness: batterHand,

    // Location
    zone: stadiumZone,           // Stadium spray zone (7 zones)
    inputZone: zoneId,           // Our 25-zone ID for detail
    distance: estimateDistance(zoneId, result),
    angle: estimateAngle(zoneId),

    // Outcome
    outcome: mapResultToOutcome(result),
    outType: exitType === 'Ground Ball' ? 'GROUND' :
             exitType === 'Line Drive' ? 'LINE' :
             exitType === 'Fly Ball' ? 'FLY' : 'POP',

    // Coordinates for visualization
    x: sprayPoint.x,
    y: sprayPoint.y
  };
}

/**
 * Map 25-zone system to 7 stadium spray zones
 */
function mapToStadiumSprayZone(zoneId: string): SprayZone {
  const ZONE_TO_SPRAY_ZONE = {
    // Left line
    Z04: 'LEFT_LINE', Z17: 'LEFT_LINE', F03: 'LEFT_LINE', F04: 'LEFT_LINE', F05: 'LEFT_LINE',

    // Left field
    Z07: 'LEFT_FIELD', Z12: 'LEFT_FIELD',

    // Left-center
    Z11: 'LEFT_CENTER', Z16: 'LEFT_CENTER',

    // Center
    Z00: 'CENTER', Z06: 'CENTER', Z10: 'CENTER', Z15: 'CENTER',

    // Right-center
    Z02: 'RIGHT_CENTER', Z03: 'RIGHT_CENTER', Z09: 'RIGHT_CENTER', Z14: 'RIGHT_CENTER',

    // Right field
    Z05: 'RIGHT_FIELD', Z08: 'RIGHT_FIELD',

    // Right line
    Z01: 'RIGHT_LINE', Z13: 'RIGHT_LINE', F00: 'RIGHT_LINE', F01: 'RIGHT_LINE', F02: 'RIGHT_LINE',

    // Catcher foul - map to center for simplicity
    F06: 'CENTER'
  };

  return ZONE_TO_SPRAY_ZONE[zoneId] || 'CENTER';
}

/**
 * Estimate HR distance from zone (for stadium records)
 */
function estimateDistance(zoneId: string, result: string): number {
  if (result !== 'HR') return 0;

  // Base distances for HR zones (wall zones)
  const HR_DISTANCES = {
    Z13: 330,  // RF wall - shorter
    Z14: 375,  // RCF wall
    Z15: 400,  // CF wall - deepest
    Z16: 375,  // LCF wall
    Z17: 340,  // LF wall
  };

  const base = HR_DISTANCES[zoneId] || 370;

  // Add randomness for variety (±30 feet)
  return base + Math.floor((Math.random() - 0.3) * 60);
}
```

### 8.3 Post-Play Stadium Update

After each batted ball is recorded:

```javascript
/**
 * Called after recording a batted ball play
 * Updates both player and stadium spray charts
 */
async function recordBattedBallToStadium(
  stadiumId: string,
  event: BattedBallEvent
): Promise<void> {
  // From STADIUM_ANALYTICS_SPEC.md
  const stadium = await getStadium(stadiumId);

  // Add to spray chart
  recordBattedBall(stadium, event);

  // Check for stadium records (HR distance, etc.)
  if (event.outcome === 'HOME_RUN') {
    await checkHRDistanceRecord(stadium, event);
  }

  // Recalculate park factors if needed
  if (shouldRecalculateParkFactors(stadium)) {
    await updateParkFactors(stadium);
  }
}
```

### 8.2 Spray Chart Visualization

```javascript
/**
 * Spray chart color coding
 */
const SPRAY_COLORS = {
  HR: '#FF4444',          // Red
  triple: '#FF8800',      // Orange
  double: '#FFCC00',      // Yellow
  single: '#44FF44',      // Green
  out: '#888888',         // Gray
  error: '#8844FF'        // Purple
};

/**
 * Spray point size by result
 */
const SPRAY_SIZES = {
  HR: 12,
  triple: 10,
  double: 9,
  single: 8,
  out: 6,
  error: 8
};
```

---

## 9. Implementation

### 9.1 React Component Structure

```typescript
// Types
interface ZoneTapResult {
  zoneId: string;
  zoneName: string;
  direction: 'pull' | 'pull_center' | 'center' | 'oppo_center' | 'oppo'
           | 'foul_left' | 'foul_right' | 'foul_back';
  depth: 'infield' | 'shallow' | 'medium' | 'deep'
       | 'foul_shallow' | 'foul_medium' | 'foul_deep' | 'foul_catcher';
  likelyFielder: string;
  area: 'infield' | 'shallow_outfield' | 'deep_outfield' | 'wall'
      | 'foul_shallow' | 'foul_medium' | 'foul_deep' | 'foul_catcher';
  isFoul: boolean;
  foulSide: 'left' | 'right' | 'back' | null;
}

interface FieldZoneInputProps {
  batterHand: 'L' | 'R';
  onZoneSelect: (result: ZoneTapResult) => void;
  onFielderOverride?: (position: string) => void;
  selectedZone?: string;
  disabled?: boolean;
}
```

### 9.2 Component Hierarchy

```
<FieldZoneInput>
  ├── <FieldSVG>                    // The visual field
  │   ├── <FairZonePolygon> × 18    // Fair territory zones (Z00-Z17)
  │   ├── <FoulZonePolygon> × 7     // Foul territory zones (F00-F06)
  │   ├── <FoulLines>               // Visual foul lines
  │   ├── <PositionMarkers>         // P, C, 1B, etc labels
  │   └── <SelectedZoneHighlight>   // Selection indicator
  │
  ├── <ZoneInfo>                    // Shows selected zone info
  │   ├── <FoulIndicator>           // Shows "FOUL" badge if foul zone
  │   └── <FielderChips>            // Override fielder selection
  │
  └── <QuickTapButtons>             // Popup, HR shortcuts (removed foul buttons - now tappable)
```

### 9.3 State Management

```javascript
const fieldZoneReducer = (state, action) => {
  switch (action.type) {
    case 'SELECT_ZONE':
      return {
        ...state,
        selectedZone: action.zoneId,
        fielder: FIELD_ZONES[action.zoneId].position,
        fielderOverridden: false
      };

    case 'OVERRIDE_FIELDER':
      return {
        ...state,
        fielder: action.position,
        fielderOverridden: true
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedZone: null,
        fielder: null,
        fielderOverridden: false
      };

    default:
      return state;
  }
};
```

### 9.4 Integration with Play Entry

```javascript
/**
 * When recording a batted ball play, call this to get zone data
 */
function recordBattedBall(playData, zoneState, exitType, result) {
  const { selectedZone, fielder } = zoneState;
  const zoneData = getZoneData(selectedZone, playData.batterHand);

  return {
    ...playData,

    // Zone data
    zoneId: selectedZone,
    direction: zoneData.direction,
    depth: zoneData.depth,

    // Fielder (possibly overridden)
    fielderPosition: fielder,

    // Contact Quality (for clutch calculation)
    contactQuality: getContactQualityFromZone(selectedZone, exitType, result),

    // Spray chart point
    sprayPoint: generateSprayPoint(selectedZone),

    // Exit type from separate UI
    exitType: exitType,
    result: result
  };
}
```

---

## Appendix A: Zone Coordinate Reference

### Fair Territory (Z00-Z17)

| Zone ID | Center (x, y) | Area | Primary Fielder |
|---------|---------------|------|-----------------|
| Z00 | (50, 67) | infield | P |
| Z01 | (70, 75) | infield | 1B |
| Z02 | (60, 60) | infield | 2B |
| Z03 | (40, 60) | infield | SS |
| Z04 | (30, 75) | infield | 3B |
| Z05 | (75, 45) | shallow_outfield | RF |
| Z06 | (50, 38) | shallow_outfield | CF |
| Z07 | (25, 45) | shallow_outfield | LF |
| Z08 | (85, 32) | deep_outfield | RF |
| Z09 | (68, 22) | deep_outfield | CF |
| Z10 | (50, 18) | deep_outfield | CF |
| Z11 | (32, 22) | deep_outfield | CF |
| Z12 | (15, 32) | deep_outfield | LF |
| Z13 | (92, 20) | wall | RF |
| Z14 | (75, 10) | wall | CF |
| Z15 | (50, 8) | wall | CF |
| Z16 | (25, 10) | wall | CF |
| Z17 | (8, 20) | wall | LF |

### Foul Territory (F00-F06)

| Zone ID | Center (x, y) | Area | Primary Fielder | Side |
|---------|---------------|------|-----------------|------|
| F00 | (98, 12) | foul_deep | RF | Right (1B line) |
| F01 | (95, 38) | foul_medium | RF | Right (1B line) |
| F02 | (88, 70) | foul_shallow | 1B | Right (1B line) |
| F03 | (12, 70) | foul_shallow | 3B | Left (3B line) |
| F04 | (5, 38) | foul_medium | LF | Left (3B line) |
| F05 | (2, 12) | foul_deep | LF | Left (3B line) |
| F06 | (50, 98) | foul_catcher | C | Back (behind home) |

### Foul Zone CQ Reference

| Zone | Typical Contact Quality | Common Play Type |
|------|------------------------|------------------|
| F06 (Catcher) | 0.15 | Popup behind plate |
| F02, F03 (Shallow) | 0.20 | Foul popup near dugout |
| F01, F04 (Medium) | 0.35 | Foul fly down line |
| F00, F05 (Deep) | 0.50 | Deep foul to corner |

---

*Last Updated: January 22, 2026*
*Version: 1.1 - Added foul territory zones (F00-F06)*
