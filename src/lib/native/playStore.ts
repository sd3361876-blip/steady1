import { openExternalUrl } from "@/lib/openExternal";
import { isNative } from "@/lib/native/platform";

const PACKAGE_ID = "com.nocontacttracker.app";

/** The exact Google Play Store listing URL for the app. */
export const PLAY_LISTING_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;

/** Native Play Store intent scheme — handled by the Play Store app on Android. */
const PLAY_MARKET_URL = `market://details?id=${PACKAGE_ID}`;

/**
 * Opens the app's Google Play Store listing.
 *
 * Native (Android): the Capacitor bridge turns a `market://` navigation into a
 * standard ACTION_VIEW intent, which the Play Store app handles directly — the
 * same proven pattern the feedback screen uses for `mailto:`. If the Play Store
 * app is unavailable the app never leaves the foreground, so we fall back to
 * opening the exact HTTPS listing URL in the browser (Custom Tab).
 *
 * Web: the HTTPS listing URL opens in a new browser tab.
 */
export async function openPlayStoreListing(): Promise<void> {
  if (!isNative()) {
    await openExternalUrl(PLAY_LISTING_URL);
    return;
  }

  let leftApp = false;
  const onVisibility = () => {
    if (document.visibilityState === "hidden") leftApp = true;
  };
  document.addEventListener("visibilitychange", onVisibility);

  // An anchor click keeps the user gesture, which some WebViews require before
  // handing an external scheme to the OS.
  try {
    const link = document.createElement("a");
    link.href = PLAY_MARKET_URL;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    await openExternalUrl(PLAY_LISTING_URL);
    document.removeEventListener("visibilitychange", onVisibility);
    return;
  }

  // Give the Play Store intent a moment to move the app to the background; if
  // we are still here, no handler for `market://` exists — use the browser.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  document.removeEventListener("visibilitychange", onVisibility);
  if (!leftApp && document.visibilityState === "visible") {
    await openExternalUrl(PLAY_LISTING_URL);
  }
}
