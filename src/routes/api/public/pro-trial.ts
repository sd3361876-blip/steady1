/**
 * One-time 30-day, no-payment Pro trial.
 *
 * The RevenueCat secret key is read only here, on the server. The app never
 * sees it and never grants Pro itself: it calls this endpoint with the
 * signed-in user's Supabase bearer token.
 *
 * Lives under /api/public/* so the native Android build (a static bundle with
 * no server runtime of its own) can call it over https; the caller is
 * authenticated inside the handler.
 *
 * Actions:
 *  - "status"   → has the caller claimed it / are they eligible?
 *  - "activate" → claim once and grant the existing entitlement for 30 days.
 */
import { createFileRoute } from "@tanstack/react-router";

const ENTITLEMENT_ID = "No Contact Tracker: Move On Pro";
const TRIAL_DAYS = 30;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Verifies the caller's Supabase access token and returns their user id. */
async function authenticate(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length);
  if (token.split(".").length !== 3) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Supabase environment variables are missing");
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { id?: string };
  return body.id ?? null;
}

type Claim = { started_at: string; expires_at: string };

export const Route = createFileRoute("/api/public/pro-trial")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const userId = await authenticate(request);
          if (!userId) return json({ error: "Unauthorized" }, 401);

          const { action } = (await request.json().catch(() => ({}))) as { action?: string };
          const rcSecret = process.env["REVENUECAT_SECRET_API_KEY"] ?? "";
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const readClaim = async (): Promise<Claim | null> => {
            const { data } = await supabaseAdmin
              .from("pro_trial_claims")
              .select("started_at, expires_at")
              .eq("user_id", userId)
              .maybeSingle();
            return (data as Claim | null) ?? null;
          };

          /** True when RevenueCat already has a real (non-promotional) subscription. */
          const hasActiveSubscription = async (): Promise<boolean> => {
            if (!rcSecret) return false;
            const res = await fetch(
              `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
              { headers: { Authorization: `Bearer ${rcSecret}` } },
            );
            if (!res.ok) return false;
            const body = (await res.json().catch(() => null)) as
              | { subscriber?: { entitlements?: Record<string, Record<string, unknown>> } }
              | null;
            const now = Date.now();
            for (const value of Object.values(body?.subscriber?.entitlements ?? {})) {
              const expires = value?.["expires_date"];
              const product = String(value?.["product_identifier"] ?? "");
              const active = !expires || Date.parse(String(expires)) > now;
              // Promotional grants (this trial) use an "rc_promo_" product id.
              if (active && !product.startsWith("rc_promo")) return true;
            }
            return false;
          };

          if (action === "status") {
            const claim = await readClaim();
            return json({
              claimed: Boolean(claim),
              startedAt: claim?.started_at ?? null,
              expiresAt: claim?.expires_at ?? null,
              eligible: !claim && Boolean(rcSecret) && !(await hasActiveSubscription()),
            });
          }

          if (action !== "activate") return json({ error: "Unknown action" }, 400);
          if (!rcSecret) return json({ error: "The free trial isn't available right now." }, 503);

          if (await readClaim()) {
            return json({ error: "You've already used your free trial." }, 409);
          }
          if (await hasActiveSubscription()) {
            return json({ error: "You already have an active subscription." }, 409);
          }

          const startedAt = new Date();
          const expiresAt = new Date(startedAt.getTime() + TRIAL_DAYS * 86_400_000);

          // Claim first: the table's primary key makes a second claim impossible.
          const { error: claimError } = await supabaseAdmin
            .from("pro_trial_claims")
            .insert({
              user_id: userId,
              started_at: startedAt.toISOString(),
              expires_at: expiresAt.toISOString(),
            });
          if (claimError) return json({ error: "You've already used your free trial." }, 409);

          const granted = await grantEntitlement(rcSecret, userId, expiresAt.getTime());

          if (!granted.ok) {
            // Release the claim so the user can retry.
            await supabaseAdmin.from("pro_trial_claims").delete().eq("user_id", userId);
            console.error(
              "pro-trial grant failed",
              JSON.stringify({
                operation: granted.operation,
                status: granted.status,
                reason: granted.reason.slice(0, 300),
              }),
            );
            return json({ error: "We couldn't start your trial. Please try again." }, 502);
          }

          return json({
            ok: true,
            startedAt: startedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
          });
        } catch (error) {
          console.error("pro-trial failed", (error as Error)?.message);
          return json({ error: "Something went wrong." }, 500);
        }
      },
    },
  },
});
