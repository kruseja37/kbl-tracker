/**
 * FranchiseLensSeed — DEV/TEST-ONLY verification harness (not a shipped deliverable).
 *
 * Seeds a DETERMINISTIC demo franchise (no games) via the shared seedDemoFranchise so the real-data
 * lens (/__preview/franchise-lens/:franchiseId) can be browser-verified reproducibly. For a PLAYED
 * season (populated stats + soul surfaces), use /__preview/franchise-lens-seed-played instead.
 *
 * The franchise DATA is deterministic; the generated franchiseId string is fresh per run — the lens
 * route works for any id, so a script reads it from data-testid="seeded-franchise-id". Dev/test only.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { seedDemoFranchise } from "../utils/franchiseLensDemoSeed";

export function FranchiseLensSeed() {
  const [status, setStatus] = useState("starting…");
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("seeding deterministic league + franchise…");
        const seeded = await seedDemoFranchise();
        if (cancelled) return;
        setFranchiseId(seeded.franchiseId);
        setStatus("ready");
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : String(caught));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#3F563F", color: "#E8E8D8", padding: 24, fontFamily: "monospace" }}>
      <h1 style={{ fontSize: 16 }}>Franchise Lens — demo seed (dev only)</h1>
      <div data-testid="seed-status" style={{ marginTop: 12 }}>
        Status: {status}
      </div>
      <div style={{ marginTop: 8, opacity: 0.75 }}>
        (For a populated season, use{" "}
        <Link to="/__preview/franchise-lens-seed-played" style={{ color: "#FFEFB5" }}>
          /__preview/franchise-lens-seed-played
        </Link>
        .)
      </div>
      {error ? (
        <div data-testid="seed-error" style={{ marginTop: 12, color: "#FFB4A8" }}>
          {error}
        </div>
      ) : null}
      {franchiseId ? (
        <div style={{ marginTop: 16 }}>
          <div>
            Seeded franchiseId: <strong data-testid="seeded-franchise-id">{franchiseId}</strong>
          </div>
          <Link
            data-testid="seeded-franchise-link"
            to={`/__preview/franchise-lens/${franchiseId}`}
            style={{ display: "inline-block", marginTop: 12, color: "#FFEFB5" }}
          >
            → open the real-data lens
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default FranchiseLensSeed;
