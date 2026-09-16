import { toast } from "sonner";

import { isLoggingOut } from "@/lib/logoutGuard";

/** The only message allowed to appear while signing out. */
const LOGOUT_TOAST_IDS = new Set(["logged-out", "logout-error"]);

/**
 * Toast de-duplication.
 *
 * React 18 StrictMode double-invokes effects, and several screens mount the
 * same badge engine, so the naive `toast(...)` call could fire the identical
 * message two or three times. Every notification in the app goes through this
 * helper: sonner collapses same-id toasts into one visible toast, and the
 * cooldown map stops repeats fired from separate mounts/effects.
 */

const COOLDOWN_MS = 4000;
const lastShown = new Map<string, number>();

function allow(id: string): boolean {
  const now = Date.now();
  const previous = lastShown.get(id);
  if (previous !== undefined && now - previous < COOLDOWN_MS) return false;
  lastShown.set(id, now);
  // Keep the map small.
  if (lastShown.size > 50) {
    for (const [key, stamp] of lastShown) {
      if (now - stamp > COOLDOWN_MS) lastShown.delete(key);
    }
  }
  return true;
}

type Variant = "default" | "success" | "error";

/** Shows a message at most once per cooldown window, per id. */
export function toastOnce(id: string, message: string, variant: Variant = "default"): void {
  if (isLoggingOut() && !LOGOUT_TOAST_IDS.has(id)) return;
  if (!allow(id)) return;
  if (variant === "success") toast.success(message, { id });
  else if (variant === "error") toast.error(message, { id });
  else toast(message, { id });
}

/** Runs a side effect (confetti, haptics, native notification) at most once. */
export function onceWithin(id: string, run: () => void): void {
  if (isLoggingOut()) return;
  if (!allow(`fx:${id}`)) return;
  run();
}