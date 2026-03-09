import React from 'react';

/**
 * Screenshot-matched Fenway scoreboard handoff.
 *
 * Purpose:
 * - Recreate the original theatrical Fenway-style scoreboard layout the user referenced.
 * - Use fixed pixel geometry so Figma can rebuild it precisely.
 * - This is a design artifact, not wired app code.
 *
 * Notes:
 * - Historical code recovered from older GameTracker versions proved the old board was a
 *   full-width header treatment, but the exact screenshot layout was not preserved as a
 *   single git revision. This file is a literal screenshot-matched reconstruction.
 * - All measurements are intentionally explicit.
 */

const COLORS = {
  sky: '#7EA6D0',
  frame: '#163326',
  grass: '#6B9462',
  board: '#5C7156',
  boardDark: '#48604A',
  boardCell: '#425844',
  boardCell2: '#3E5340',
  cream: '#E8E8D8',
  gold: '#C4A853',
  blue: '#005EF0',
  red: '#FF1B0F',
  white: '#F4F4F0',
  blackish: '#1E2C23',
  yellow: '#F2BF16',
  greenDot: '#00D66B',
  greenDotBorder: '#009E52',
  redDot: '#FF3C3C',
  redDotBorder: '#BE1E1E',
  dimDot: '#3B4F56',
};

const textShadow = '1px 1px 0 rgba(0,0,0,0.28)';

function Dot({
  fill,
  border,
}: {
  fill: string;
  border: string;
}) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        background: fill,
        border: `4px solid ${border}`,
        boxSizing: 'border-box',
      }}
    />
  );
}

function Cell({
  children,
  width,
  align = 'center',
  bold = true,
}: {
  children?: React.ReactNode;
  width?: number;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}) {
  return (
    <div
      style={{
        width,
        minHeight: 26,
        background: COLORS.boardCell,
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        paddingLeft: align === 'left' ? 8 : 0,
        paddingRight: align === 'right' ? 8 : 0,
        color: COLORS.cream,
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
        fontWeight: bold ? 800 : 600,
        fontSize: 13,
        lineHeight: 1,
        boxSizing: 'border-box',
        textShadow,
      }}
    >
      {children}
    </div>
  );
}

export function FenwayScoreboardExactLayout() {
  return (
    <div
      style={{
        width: 2048,
        height: 311,
        background: COLORS.grass,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: COLORS.sky,
          border: `6px solid ${COLORS.frame}`,
          boxSizing: 'border-box',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          top: 18,
          bottom: 18,
          border: `4px solid ${COLORS.frame}`,
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      />

      <button
        style={{
          position: 'absolute',
          left: 38,
          top: 122,
          width: 122,
          height: 48,
          background: COLORS.blackish,
          border: `3px solid ${COLORS.cream}`,
          color: COLORS.cream,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          fontSize: 18,
          fontWeight: 800,
          boxSizing: 'border-box',
          textShadow,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>↗</span>
        <span>MINI</span>
      </button>

      <div
        style={{
          position: 'absolute',
          left: 162,
          top: 88,
          width: 281,
          height: 116,
          background: COLORS.white,
          border: `6px solid ${COLORS.blue}`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: COLORS.blue,
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: -0.8,
          }}
        >
          SUPER MEGA
        </div>
        <div
          style={{
            color: COLORS.red,
            fontSize: 41,
            lineHeight: 1,
            fontWeight: 900,
            marginTop: 3,
            letterSpacing: -1,
          }}
        >
          BASEBALL
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 462,
          top: 20,
          width: 1485,
          height: 252,
          background: COLORS.board,
          border: `5px solid ${COLORS.boardDark}`,
          boxSizing: 'border-box',
          padding: '14px 16px 12px 16px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: COLORS.cream,
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 1.5,
            marginBottom: 14,
            textShadow,
          }}
        >
          BALLPARK
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 160px repeat(10, 40px) 48px 48px 48px 14px 84px 16px 1fr',
            rowGap: 4,
            columnGap: 0,
            alignItems: 'stretch',
          }}
        >
          <div style={{ color: COLORS.cream, fontSize: 19, fontWeight: 900, textShadow }}>P</div>
          <div />
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((inning) => (
            <div
              key={inning}
              style={{
                color: COLORS.cream,
                fontSize: 18,
                fontWeight: 900,
                textAlign: 'center',
                textShadow,
              }}
            >
              {inning}
            </div>
          ))}
          {['R', 'H', 'E'].map((label) => (
            <div
              key={label}
              style={{
                color: COLORS.cream,
                fontSize: 18,
                fontWeight: 900,
                textAlign: 'center',
                textShadow,
              }}
            >
              {label}
            </div>
          ))}
          <div />
          <div
            style={{
              color: COLORS.cream,
              fontSize: 18,
              fontWeight: 900,
              textAlign: 'center',
              textShadow,
            }}
          >
            REC
          </div>
          <div />
          <div />

          <Cell>{'▶'}</Cell>
          <Cell align="left">VISITORS</Cell>
          {[0, 2, 0, 1, 0, 1, 0, 0, 0, ''].map((value, index) => (
            <Cell key={`away-${index}`}>{value}</Cell>
          ))}
          <Cell>4</Cell>
          <Cell>8</Cell>
          <Cell>1</Cell>
          <div />
          <Cell width={84}>45-38</Cell>
          <div />
          <Cell align="left" bold={true}>
            CONCESSIONS / HOT DOG / PEANUTS / CRACKER JACK
          </Cell>

          <Cell>1</Cell>
          <Cell align="left">HOME TEAM</Cell>
          {[1, 0, 2, 0, 0, 0, 0, 0, 0, ''].map((value, index) => (
            <Cell key={`home-${index}`}>{value}</Cell>
          ))}
          <Cell>3</Cell>
          <Cell>7</Cell>
          <Cell>0</Cell>
          <div />
          <Cell width={84}>52-31</Cell>
          <div />
          <Cell align="left" bold={true}>
            KRUSE COLA
          </Cell>
        </div>

        <div
          style={{
            height: 3,
            background: COLORS.cream,
            marginTop: 12,
            marginBottom: 12,
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            color: COLORS.cream,
            fontWeight: 900,
            textShadow,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 18 }}>AT BAT</div>
            <div
              style={{
                minWidth: 144,
                height: 32,
                background: COLORS.boardCell2,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                boxSizing: 'border-box',
                fontSize: 17,
              }}
            >
              JOHNSON #24
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 18 }}>BALL</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Dot fill={COLORS.greenDot} border={COLORS.greenDotBorder} />
              <Dot fill={COLORS.greenDot} border={COLORS.greenDotBorder} />
              <Dot fill={COLORS.dimDot} border={COLORS.boardDark} />
              <Dot fill={COLORS.dimDot} border={COLORS.boardDark} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 18 }}>STRIKE</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Dot fill={COLORS.yellow} border={'#C08C00'} />
              <Dot fill={COLORS.dimDot} border={COLORS.boardDark} />
              <Dot fill={COLORS.dimDot} border={COLORS.boardDark} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 18 }}>OUT</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Dot fill={COLORS.redDot} border={COLORS.redDotBorder} />
              <Dot fill={COLORS.dimDot} border={COLORS.boardDark} />
              <Dot fill={COLORS.dimDot} border={COLORS.boardDark} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 4 }}>
            <div style={{ fontSize: 18 }}>(H)</div>
            <div
              style={{
                width: 38,
                height: 32,
                background: COLORS.boardCell2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              -
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 18 }}>(E)</div>
            <div
              style={{
                width: 38,
                height: 32,
                background: COLORS.boardCell2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              -
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: COLORS.cream,
            fontSize: 12,
            fontWeight: 800,
            textShadow,
          }}
        >
          <div>SUN MAR 8, 2026</div>
          <div>TIME: 0:02:25</div>
        </div>
      </div>

      <button
        style={{
          position: 'absolute',
          right: 42,
          top: 120,
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: COLORS.blackish,
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ≡
      </button>
    </div>
  );
}

export default FenwayScoreboardExactLayout;
