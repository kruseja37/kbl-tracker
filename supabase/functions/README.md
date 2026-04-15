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

4. Deploy Grok commentary proxy with JWT verification enabled:
   ```sh
   supabase functions deploy grok-commentary --no-verify-jwt false
   ```

5. Deploy Claude column proxy with JWT verification enabled:
   ```sh
   supabase functions deploy claude-column --no-verify-jwt false
   ```

6. Smoke test Grok with an authenticated local session token:
   ```sh
   supabase functions invoke grok-commentary \
     --body '{"model":"grok-4","intensity":"low","purpose":"commentary","messages":[{"role":"user","content":"Write one short baseball line."}]}'
   ```

7. Smoke test Claude with an authenticated local session token:
   ```sh
   supabase functions invoke claude-column \
     --body '{"model":"claude-sonnet-4.6","intensity":"low","purpose":"post_game_column","messages":[{"role":"user","content":"Write one short post-game headline."}]}'
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
