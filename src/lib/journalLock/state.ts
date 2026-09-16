import { isNative } from "@/lib/native/platform";
import { journalLockStore } from "./secureStore";
import type { PinRecord } from "./pin";

export type JournalLockConfig = {
  enabled: boolean;
  biometricEnabled: boolean;
  pin: PinRecord | null;
};

export const DEFAULT_CONFIG: JournalLockConfig = {
  enabled: false,
  biometricEnabled: false,
  pin: null,
};

const configKey = (userId: string) => `config:${userId}`;

export async function loadJournalLockConfig(userId: string): Promise<JournalLockConfig> {
  if (!userId) return DEFAULT_CONFIG;
  const raw = await journalLockStore.get(configKey(userId));
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<JournalLockConfig>;
    const pin = parsed.pin && parsed.pin.hash && parsed.pin.salt ? parsed.pin : null;
    // A lock without a PIN verifier can never be satisfied — treat as off.
    if (!pin) return DEFAULT_CONFIG;
    return {
      enabled: Boolean(parsed.enabled),
      biometricEnabled: Boolean(parsed.biometricEnabled),
      pin,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveJournalLockConfig(
  userId: string,
  config: JournalLockConfig,
): Promise<void> {
  if (!userId) return;
  await journalLockStore.set(configKey(userId), JSON.stringify(config));
}

export async function clearJournalLockConfig(userId: string): Promise<void> {
  if (!userId) return;
  await journalLockStore.remove(configKey(userId));
}

/* ------------------------------------------------------------------ *
 * Unlocked session — memory only, so an app restart always re-locks.
 * ------------------------------------------------------------------ */

const BACKGROUND_GRACE_MS = 60_000;

let unlockedFor: string | null = null;
let hiddenAt: number | null = null;
let watcherReady = false;

export function markJournalUnlocked(userId: string): void {
  unlockedFor = userId;
  hiddenAt = null;
}

export function clearJournalUnlocked(): void {
  unlockedFor = null;
  hiddenAt = null;
}

export function isJournalUnlocked(userId: string): boolean {
  if (!unlockedFor || unlockedFor !== userId) return false;
  if (hiddenAt !== null && Date.now() - hiddenAt > BACKGROUND_GRACE_MS) {
    clearJournalUnlocked();
    return false;
  }
  return true;
}

/** Locks the Journal again when the app has been in the background too long. */
export function ensureBackgroundWatcher(): void {
  if (watcherReady || typeof window === "undefined") return;
  watcherReady = true;

  const onHide = () => {
    if (unlockedFor) hiddenAt = Date.now();
  };
  const onShow = () => {
    if (hiddenAt !== null && Date.now() - hiddenAt > BACKGROUND_GRACE_MS) clearJournalUnlocked();
    else hiddenAt = null;
  };

  if (isNative()) {
    void import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) onShow();
          else onHide();
        }),
      )
      .catch(() => undefined);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") onHide();
    else onShow();
  });
}
