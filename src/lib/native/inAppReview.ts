import { InAppReview } from "@capacitor-community/in-app-review";

import { openExternalUrl } from "@/lib/openExternal";
import { isNative, safeNative } from "@/lib/native/platform";

const PLAY_URL = "https://play.google.com/store/apps/details?id=com.nocontacttracker.app";

/**
 * Asks for a rating using the official Google Play In-App Review API on
 * Android. Never rejects and never blocks the caller: whatever Play decides
 * (dialog shown, dismissed, quota exhausted) the promise resolves so the
 * onboarding flow can continue. On the web it simply opens the store listing.
 */
export async function requestAppReview(): Promise<void> {
  if (!isNative()) {
    try {
      await openExternalUrl(PLAY_URL);
    } catch {
      // Ignore — rating is always optional.
    }
    return;
  }
  await safeNative(async () => {
    await InAppReview.requestReview();
  });
}
