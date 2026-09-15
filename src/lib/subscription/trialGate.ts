/**
 * Launch-time access gate for the mandatory 30-day Pro trial.
 *
 * Eligibility never comes from React state or local storage: the server
 * (/api/public/pro-trial) owns the `pro_trial_claims` record, and Pro status
 * comes from RevenueCat's CustomerInfo. Only people who finished the *new*
 * onboarding (profiles.trial_flow_required) are ever sent to the screen, so
 * users who onboarded before this feature are untouched.
 */
import { supabase } from "@/integrations/supabase/client";
import { refreshEntitlement } from "@/lib/subscription/revenuecat";
import { fetchTrialStatus } from "@/lib/subscription/trial";

/** Screens the gate must never redirect away from. */
const EXEMPT = new Set(["/start-trial", "/questionnaire", "/paywall", "/auth"]);

/** Cached "allowed" decision, so the checks run once per app launch. */
let allowed = false;

export function markTrialActivated(): void {
  allowed = true;
}

/**
 * Where the launch-time gate must send the user.
 * - "allow": active Pro (paid or running app trial), or a legacy user.
 * - "trial": the one-time app trial is still unclaimed → /start-trial.
 * - "paywall": the app trial is used up and there is no paid plan → /paywall.
 */
export type GateDecision = "allow" | "trial" | "paywall";

/**
 * The gate fails CLOSED: if the access state cannot be verified (offline,
 * server error, unexpected failure) the user stays on the trial screen.
 * Verified active Pro entitlements are still let through.
 */
export async function evaluateAccess(pathname: string, userId: string): Promise<GateDecision> {
  if (allowed || EXEMPT.has(pathname)) return "allow";
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("questionnaire_completed, trial_flow_required")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;

    // Not onboarded yet, or onboarded before this feature existed.
    if (!profile?.questionnaire_completed || !profile.trial_flow_required) {
      allowed = true;
      return "allow";
    }

    // Active Pro (paid subscription or a running trial grant) → straight in.
    const entitlement = await refreshEntitlement();
    if (entitlement.isPremium) {
      allowed = true;
      return "allow";
    }

    const status = await fetchTrialStatus();
    // Never used the app trial → activate it first.
    if (status.eligible) return "trial";

    // App trial already used and no active paid plan → must choose a paid plan.
    return "paywall";
  } catch {
    // Unverifiable state → block, never grant access by default.
    return "trial";
  }
}
