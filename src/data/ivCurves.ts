/**
 * ivCurves.ts — IV Engine salary-curve parameter table (DATA ONLY, generated).
 *
 * Source workbook: spec-docs/reference/Team_Builder_Archetype_Logic_Template.xlsx (sheet: 'Salary Cap', cols A:N)
 * Extracted: 2026-06-10 by scripts/extract-iv-data.py.
 * KBL re-blesses:
 *   - D16 (2026-07-04): pitcher role blocks carry SP-shaped arm repricing.
 *   - D17 (2026-07-04): 8 primary fielder blocks carry the KBL positional-scarcity
 *     ladder below. These are deliberate divergences from the source workbook; do NOT
 *     blindly re-run extraction over the repriced blocks.
 * Spec: spec-docs/IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §3.2 (AttributeCurve), §3.3 (position rows), §3.4 (sub-min reverse curve)
 *
 * POSITION_ROW_MAP (workbook Lists!AN2:AO19 — first attribute row of each block;
 * the block's position label sits one row above):
 *   C->5, 1B->11, 2B->17, SS->23, 3B->29, LF->35, CF->41, RF->47, IF->53, OF->59,
 *   IF/OF->65, '-'->71, SP->77, SP/RP->85, RP->93, CP->101, 1B/OF->109, EXTRA->117
 *
 * Block shapes as found in the workbook:
 *   - 13 hitter-shaped blocks (POW/CON/SPD/FLD/ARM): C 1B 2B SS 3B LF CF RF IF OF IF/OF '-' 1B/OF
 *   - 5 pitcher-shaped blocks (POW/CON/SPD/FLD/VEL/JNK/ACC): SP SP/RP RP CP EXTRA
 *   - Sub-minimum reverse params (cols I-N, 'Below Midpoint Velo') exist ONLY on the
 *     VEL rows of SP, SP/RP, RP, CP. No other attribute carries them — recorded as-is.
 */

// Spec §3.2 — verbatim interface shape
export interface AttributeCurve {
  min: number;      // rating floor where cost begins
  curve1: number;   // exponent, segment 1 (min->mid)
  mid: number;      // rating where segments meet
  midSal: number;   // $ at mid
  curve2: number;   // exponent, segment 2 (mid->100)
  sal100: number;   // $ at rating 100
}

export type IVAttr = 'POW' | 'CON' | 'SPD' | 'FLD' | 'ARM' | 'VEL' | 'JNK' | 'ACC';

export type PositionKey =
  | 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF'
  | 'IF' | 'OF' | 'IF/OF' | '-' | 'SP' | 'SP/RP' | 'RP' | 'CP' | '1B/OF' | 'EXTRA';

export interface AttributeCurveEntry {
  primary: AttributeCurve;          // workbook cols C-H
  /** Sub-minimum reverse curve, workbook cols I-N (spec §3.4). Present only where the
   *  workbook defines it: the VEL row of SP, SP/RP, RP, CP. */
  subMin?: AttributeCurve;
}

export interface PositionCurveBlock {
  // Partial: hitter blocks carry 5 attrs (no VEL/JNK/ACC), pitcher blocks 7 (no ARM)
  attributes: Partial<Record<IVAttr, AttributeCurveEntry>>;
}

export const IV_CURVES: Record<PositionKey, PositionCurveBlock> = {
  C: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 8960, curve2: 1.5, sal100: 62720 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 7840, curve2: 2, sal100: 35280 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 6160, curve2: 3, sal100: 38080 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1568, curve2: 2, sal100: 6272 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2856, curve2: 2, sal100: 11424 } },
    },
  },
  '1B': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 7040, curve2: 1.5, sal100: 49280 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 6160, curve2: 2, sal100: 27720 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 4840, curve2: 3, sal100: 29920 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1232, curve2: 2, sal100: 4928 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2244, curve2: 2, sal100: 8976 } },
    },
  },
  '2B': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 8240, curve2: 1.5, sal100: 57680 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 7210, curve2: 2, sal100: 32445 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 5665, curve2: 3, sal100: 35020 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1442, curve2: 2, sal100: 5768 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2626.5, curve2: 2, sal100: 10506 } },
    },
  },
  SS: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 8800, curve2: 1.5, sal100: 61600 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 7700, curve2: 2, sal100: 34650 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 6050, curve2: 3, sal100: 37400 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1540, curve2: 2, sal100: 6160 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2805, curve2: 2, sal100: 11220 } },
    },
  },
  '3B': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 7760, curve2: 1.5, sal100: 54320 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 6790, curve2: 2, sal100: 30555 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 5335, curve2: 3, sal100: 32980 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1358, curve2: 2, sal100: 5432 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2473.5, curve2: 2, sal100: 9894 } },
    },
  },
  LF: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 7200, curve2: 1.5, sal100: 50400 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 6300, curve2: 2, sal100: 28350 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 4950, curve2: 3, sal100: 30600 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1260, curve2: 2, sal100: 5040 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2295, curve2: 2, sal100: 9180 } },
    },
  },
  CF: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 8480, curve2: 1.5, sal100: 59360 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 7420, curve2: 2, sal100: 33390 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 5830, curve2: 3, sal100: 36040 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1484, curve2: 2, sal100: 5936 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2703, curve2: 2, sal100: 10812 } },
    },
  },
  RF: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 50, midSal: 7520, curve2: 1.5, sal100: 52640 } },
      CON: { primary: { min: 0, curve1: 1, mid: 55, midSal: 6580, curve2: 2, sal100: 29610 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 55, midSal: 5170, curve2: 3, sal100: 31960 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 1316, curve2: 2, sal100: 5264 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2397, curve2: 2, sal100: 9588 } },
    },
  },
  IF: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 65, midSal: 10000, curve2: 1, sal100: 40000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 65, midSal: 9000, curve2: 1, sal100: 36000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 8000, curve2: 1, sal100: 32000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
    },
  },
  OF: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 65, midSal: 10000, curve2: 1, sal100: 40000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 65, midSal: 9000, curve2: 1, sal100: 36000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 8000, curve2: 1, sal100: 32000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
    },
  },
  'IF/OF': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 65, midSal: 10000, curve2: 1, sal100: 40000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 65, midSal: 9000, curve2: 1, sal100: 36000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 8000, curve2: 1, sal100: 32000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
    },
  },
  '-': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 100, midSal: 0, curve2: 1, sal100: 0 } },
      CON: { primary: { min: 0, curve1: 1, mid: 100, midSal: 0, curve2: 1, sal100: 0 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 100, midSal: 0, curve2: 1, sal100: 0 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 100, midSal: 0, curve2: 1, sal100: 0 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 100, midSal: 0, curve2: 1, sal100: 0 } },
    },
  },
  SP: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 30, midSal: 500, curve2: 2, sal100: 100000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 30, midSal: 400, curve2: 2, sal100: 80000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 550, curve2: 2, sal100: 100000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 50, midSal: 500, curve2: 2, sal100: 3500 } },
      VEL: {
        primary: { min: 50, curve1: 1.2, mid: 65, midSal: 10500, curve2: 2, sal100: 63000 },
        subMin: { min: 0, curve1: 1.2, mid: 30, midSal: 7500, curve2: 1.3, sal100: 18000 },
      },
      JNK: { primary: { min: 0, curve1: 1, mid: 60, midSal: 5000, curve2: 2, sal100: 20000 } },
      ACC: { primary: { min: 0, curve1: 1, mid: 50, midSal: 7700, curve2: 2, sal100: 34650 } },
    },
  },
  'SP/RP': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 30, midSal: 500, curve2: 2, sal100: 100000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 30, midSal: 400, curve2: 2, sal100: 80000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 550, curve2: 2, sal100: 100000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 50, midSal: 500, curve2: 2, sal100: 3500 } },
      VEL: {
        primary: { min: 50, curve1: 1.2, mid: 65, midSal: 8400, curve2: 2, sal100: 50400 },
        subMin: { min: 0, curve1: 1.2, mid: 30, midSal: 6000, curve2: 1.3, sal100: 14400 },
      },
      JNK: { primary: { min: 0, curve1: 1, mid: 60, midSal: 4000, curve2: 2, sal100: 16000 } },
      ACC: { primary: { min: 0, curve1: 1, mid: 50, midSal: 6160, curve2: 2, sal100: 27720 } },
    },
  },
  RP: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 30, midSal: 500, curve2: 2, sal100: 100000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 30, midSal: 400, curve2: 2, sal100: 80000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 550, curve2: 2, sal100: 100000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 50, midSal: 500, curve2: 2, sal100: 3500 } },
      VEL: {
        primary: { min: 50, curve1: 1.2, mid: 65, midSal: 5775, curve2: 2, sal100: 34650 },
        subMin: { min: 0, curve1: 1.2, mid: 30, midSal: 4125, curve2: 1.3, sal100: 9900 },
      },
      JNK: { primary: { min: 0, curve1: 1, mid: 60, midSal: 2750, curve2: 2, sal100: 11000 } },
      ACC: { primary: { min: 0, curve1: 1, mid: 50, midSal: 4235, curve2: 2, sal100: 19060 } },
    },
  },
  CP: {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 30, midSal: 500, curve2: 2, sal100: 100000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 30, midSal: 400, curve2: 2, sal100: 80000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 60, midSal: 550, curve2: 2, sal100: 100000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 50, midSal: 500, curve2: 2, sal100: 3500 } },
      VEL: {
        primary: { min: 50, curve1: 1.2, mid: 65, midSal: 6825, curve2: 2, sal100: 40950 },
        subMin: { min: 0, curve1: 1.2, mid: 30, midSal: 4875, curve2: 1.3, sal100: 11700 },
      },
      JNK: { primary: { min: 0, curve1: 1, mid: 60, midSal: 3250, curve2: 2, sal100: 13000 } },
      ACC: { primary: { min: 0, curve1: 1, mid: 50, midSal: 5005, curve2: 2, sal100: 22525 } },
    },
  },
  '1B/OF': {
    attributes: {
      POW: { primary: { min: 0, curve1: 1, mid: 65, midSal: 10000, curve2: 1, sal100: 40000 } },
      CON: { primary: { min: 0, curve1: 1, mid: 65, midSal: 9000, curve2: 1, sal100: 36000 } },
      SPD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 8000, curve2: 1, sal100: 32000 } },
      FLD: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
      ARM: { primary: { min: 0, curve1: 1, mid: 65, midSal: 5000, curve2: 1, sal100: 20000 } },
    },
  },
  EXTRA: {
    attributes: {
      POW: { primary: { min: 30, curve1: 1, mid: 60, midSal: 10000, curve2: 1, sal100: 40000 } },
      CON: { primary: { min: 30, curve1: 1, mid: 60, midSal: 9000, curve2: 1, sal100: 36000 } },
      SPD: { primary: { min: 30, curve1: 1, mid: 60, midSal: 8000, curve2: 1, sal100: 32000 } },
      FLD: { primary: { min: 30, curve1: 1, mid: 60, midSal: 5000, curve2: 1, sal100: 20000 } },
      VEL: { primary: { min: 35, curve1: 1, mid: 65, midSal: 12500, curve2: 1, sal100: 50000 } },
      JNK: { primary: { min: 35, curve1: 1, mid: 65, midSal: 10000, curve2: 1, sal100: 40000 } },
      ACC: { primary: { min: 35, curve1: 1, mid: 65, midSal: 7500, curve2: 1, sal100: 30000 } },
    },
  },
};
