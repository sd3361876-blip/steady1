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
 * Returns true when the caller must be redirected to /start-trial.
 * Any failure (offline, server error) allows access — the gate must never
 * lock a signed-in user out of their own app.
 */
export async function needsTrialActivation(pathname: string, userId: string): Promise<boolean> {
  if (allowed || EXEMPT.has(pathname)) return false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("questionnaire_completed, trial_flow_required")
      .eq("id", userId)
      .maybeSingle();

    // Not onboarded yet, or onboarded before this feature existed.
    if (!profile?.questionnaire_completed || !profile.trial_flow_required) {
      allowed = true;
      return false;
    }

    // Active Pro (paid subscription or a running trial grant) → straight in.
    const entitlement = await refreshEntitlement();
    if (entitlement.isPremium) {
      allowed = true;
      return false;
    }

    const status = await fetchTrialStatus();
    if (status.eligible) return true;

    // Claimed already (trial expired) → the existing paywall flow handles it.
    allowed = true;
    return false;
  } catch {
    return false;
  }
}
