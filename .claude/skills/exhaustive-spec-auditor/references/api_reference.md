# Audit Classification Reference

## Finding Types

| Type | Code | Meaning | Action |
|------|------|---------|--------|
| Match | MATCH | Code correctly implements spec | Log as verified |
| Mismatch | MISMATCH | Code differs from spec | Log with file:line + both values |
| Gap | GAP | Spec defines, code doesn't implement | Log as implementation gap |
| Undocumented | UNDOC | Code does something spec doesn't cover | Log as needs spec coverage |

## Contradiction Types

| Type | Example | Resolution |
|------|---------|------------|
| Hard | Spec A: "RPW = 10", Spec B: "RPW = 9" | USER DECIDES |
| Soft | Spec A implies mojo decays weekly, Spec B implies daily | USER DECIDES |
| Temporal | Jan spec says X, Feb spec says Y | Usually newer wins, but USER DECIDES |
| Duplicate | Both specs define same formula differently | Consolidate into one, USER DECIDES which |

## Severity Levels

| Level | Criteria |
|-------|----------|
| CRITICAL | Wrong formula/constant that affects calculations |
| HIGH | Feature gap — spec defines something that doesn't exist |
| MEDIUM | Minor constant mismatch or incomplete implementation |
| LOW | Documentation-only issue, no functional impact |
