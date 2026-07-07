# Reference Fixtures

`iv_oracle.json` is the frozen IV oracle used by engine reference tests. It
contains 440 SMB4 reference players, 21 anchor cases, and cached raw/kbl IV
component totals.

Verify it with:

```bash
npm run verify:iv-oracle
```

Do not edit the fixture manually without re-verifying the hash and test suite.
