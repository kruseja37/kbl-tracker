import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";
import { LlmProxyHttpError } from "./types.ts";

export interface VerifiedUser {
  id: string;
  email?: string;
}

export async function verifyJwt(request: Request): Promise<VerifiedUser> {
  const authHeader = request.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new LlmProxyHttpError(401, "missing_authorization", "Missing Authorization bearer token.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new LlmProxyHttpError(500, "missing_supabase_env", "Supabase Edge auth environment is not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${match[1]}`,
      },
    },
  });
  const { data, error } = await supabase.auth.getUser(match[1]);

  if (error || !data.user) {
    throw new LlmProxyHttpError(401, "invalid_token", "Invalid or expired Supabase access token.");
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
}
