import { Fragment } from "react";

import { FAME_TIER_LABEL, type FameTier } from "../../../types/reporter";
import { FamePip } from "../components/FamePip";

const TIERS: FameTier[] = [1, 2, 3, 4, 5];
const SIZES = [
  { key: "sm", label: "Small", size: "sm" as const },
  { key: "md", label: "Medium", size: "md" as const },
  { key: "lg", label: "Large", size: "lg" as const },
];

const pageStyle = {
  minHeight: "100vh",
  padding: "40px 24px 56px",
  background:
    "radial-gradient(circle at top, #4A5B46 0%, #2E3A2C 48%, #1B231B 100%)",
  color: "#F5E8CF",
  fontFamily: "'Moms Typewriter', monospace",
};

const panelStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "28px",
  border: "3px solid rgba(245, 232, 207, 0.44)",
  background:
    "linear-gradient(180deg, rgba(17, 22, 16, 0.78) 0%, rgba(25, 31, 24, 0.94) 100%)",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.34)",
};

export function FamePipPreview() {
  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div
          style={{
            marginBottom: "26px",
            fontFamily: "'Tox Typewriter', monospace",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#CBB89C", marginBottom: "10px" }}>
            Editorial Fame Preview
          </div>
          <h1 style={{ margin: 0, fontSize: "1.85rem", color: "#F2C041" }}>
            FamePip isolated render matrix
          </h1>
        </div>

        <div
          data-testid="fame-pip-preview-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "170px repeat(3, minmax(0, 1fr))",
            gap: "14px 18px",
            alignItems: "center",
          }}
        >
          <div />
          {SIZES.map(({ key, label }) => (
            <div
              key={key}
              style={{
                textAlign: "center",
                color: "#CBB89C",
                fontFamily: "'Tox Typewriter', monospace",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          ))}

          {TIERS.map((tier) => (
            <Fragment key={tier}>
              <div
                style={{
                  padding: "12px 14px",
                  border: "1px solid rgba(245, 232, 207, 0.18)",
                  background: "rgba(255, 255, 255, 0.03)",
                }}
              >
                <div
                  style={{
                    color: "#F2C041",
                    fontFamily: "'Tox Typewriter', monospace",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Tier {tier}
                </div>
                <div style={{ fontSize: "0.88rem", color: "#F5E8CF" }}>
                  {FAME_TIER_LABEL[tier]}
                </div>
              </div>

              {SIZES.map(({ key, size }) => (
                <div
                  key={`${tier}-${key}`}
                  style={{
                    minHeight: "90px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(245, 232, 207, 0.12)",
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.08) 100%)",
                  }}
                >
                  <FamePip size={size} tier={tier} showCount />
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </section>
    </main>
  );
}
