# KBL Reporter LLM Edge Functions

G4 moves reporter LLM API keys off device and into Supabase Edge Function secrets. Usage logging remains client-side through the existing `logLlmCall` IndexedDB path; the edge only authenticates, enforces per-request intensity caps, proxies the provider call, and returns token metadata.

## Deploy Checklist

1. Install and authenticate the Supabase CLI:
   ```sh
   supabase login
   ```

2. Link this repo to the existing Supabase project:
   ```sh
   supabase link --project-ref <ref>
   ```

3. Set provider secrets:
   ```sh
   supabase secrets set GROK_API_KEY=<key>
   supabase secrets set ANTHROPIC_API_KEY=<key>
   ```

4. Deploy Grok commentary proxy (JWT verification is enabled by default in CLI v2.x — do NOT pass `--no-verify-jwt`):
   ```sh
   supabase functions deploy grok-commentary
   ```

5. Deploy Claude column proxy (JWT verification enabled by default):
   ```sh
   supabase functions deploy claude-column
   ```

6. Smoke test Grok by POSTing to the deployed edge with a real signed-in user's access token. The CLI in v2.x has no `functions invoke` subcommand, so use `curl`. `USER_JWT` must be a real user token (from `supabase.auth.getSession()` in the running app) — the anon key and publishable key will be rejected by `_shared/auth.ts`.
   ```sh
   curl -sS -X POST "https://<project-ref>.supabase.co/functions/v1/grok-commentary" \
     -H "Authorization: Bearer $USER_JWT" \
     -H "Content-Type: application/json" \
     -d '{"model":"grok-4","intensity":"low","purpose":"commentary","messages":[{"role":"user","content":"Write one short baseball line."}]}'
   ```

7. Smoke test Claude the same way:
   ```sh
   curl -sS -X POST "https://<project-ref>.supabase.co/functions/v1/claude-column" \
     -H "Authorization: Bearer $USER_JWT" \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-sonnet-4-6","intensity":"low","purpose":"post_game_column","messages":[{"role":"user","content":"Write one short post-game headline."}]}'
   ```

8. Rollback, if needed:
   ```sh
   supabase functions delete grok-commentary
   supabase functions delete claude-column
   supabase secrets unset GROK_API_KEY
   supabase secrets unset ANTHROPIC_API_KEY
   git revert <g4-commit-sha>
   ```

## Notes

- Do not deploy these functions without setting `GROK_API_KEY` and `ANTHROPIC_API_KEY`.
- Keep JWT verification enabled; anonymous requests should be rejected.
- Soft monthly budget enforcement remains client-side because the edge cannot read local IndexedDB usage state.
- Per-request token caps live in `_shared/intensity.ts`.
