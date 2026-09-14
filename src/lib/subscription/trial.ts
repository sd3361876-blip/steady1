/**
 * Client side of the one-time 30-day no-payment Pro trial.
 *
 * All decisions happen on the server (/api/public/pro-trial); nothing about
 * trial status is trusted from local storage.
 */
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_ORIGIN } from "@/lib/drive/client";
import { isNative } from "@/lib/native/platform";

export type TrialStatus = {
  eligible: boolean;
  claimed: boolean;
  startedAt: string | null;
  expiresAt: string | null;
};

function endpoint(): string {
  return isNative() ? `${PUBLIC_ORIGIN}/api/public/pro-trial` : "/api/public/pro-trial";
}

async function call<T>(action: "status" | "activate"): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be signed in.");
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(body?.error ?? "Something went wrong.");
  return body as T;
}

export async function fetchTrialStatus(): Promise<TrialStatus> {
  return call<TrialStatus>("status");
}

export async function activateTrial(): Promise<{ expiresAt: string }> {
  return call<{ expiresAt: string }>("activate");
}
