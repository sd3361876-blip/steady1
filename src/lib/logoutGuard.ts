/**
 * Logout suppression flag.
 *
 * Signing out clears the query cache and the local activity/badge cache, which
 * momentarily makes the badge engine see "no owned badges" while stats are
 * still present — it then re-announces unlocks with toasts and confetti.
 * Everything that celebrates checks this flag so the logout flow shows only
 * its own confirmation message.
 */

let loggingOut = false;

export function beginLogout(): void {
  loggingOut = true;
}

/** Cleared if logout fails and the user stays signed in. */
export function endLogout(): void {
  loggingOut = false;
}

export function isLoggingOut(): boolean {
  return loggingOut;
}
