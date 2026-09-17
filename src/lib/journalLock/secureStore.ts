import { SecureStorage } from "@aparajita/capacitor-secure-storage";

import { isNative } from "@/lib/native/platform";

/**
 * Storage for Journal Lock secret material.
 *
 * Native (Android): @aparajita/capacitor-secure-storage, which is backed by
 * EncryptedSharedPreferences with an Android Keystore master key. Nothing is
 * ever sent to a server.
 *
 * Web: browser localStorage. This is NOT equivalent to the Android Keystore —
 * the setup UI says so explicitly — but it keeps the feature working instead of
 * breaking it in the browser.
 */
const PREFIX = "steady_journal_lock_";

/**
 * NOTE: the plugin's `setKeyPrefix` is a JS-only helper that is NOT implemented
 * as a native Android method, so we prefix keys ourselves and only call methods
 * that really exist natively (get/set/removeItem).
 */
const nativeKey = (key: string) => PREFIX + key;

export const journalLockStore = {
  async get(key: string): Promise<string | null> {
    try {
      if (isNative()) return await SecureStorage.getItem(nativeKey(key));
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(PREFIX + key);
    } catch (error) {
      console.warn("[journal-lock] read failed", error);
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (isNative()) {
      await SecureStorage.setItem(nativeKey(key), value);
      return;
    }
    if (typeof window !== "undefined") window.localStorage.setItem(PREFIX + key, value);
  },
  async remove(key: string): Promise<void> {
    try {
      if (isNative()) {
        await SecureStorage.removeItem(nativeKey(key));
        return;
      }
      if (typeof window !== "undefined") window.localStorage.removeItem(PREFIX + key);
    } catch (error) {
      console.warn("[journal-lock] remove failed", error);
    }
  },
};

/** True when the device gives us real hardware-backed secret storage. */
export const hasHardwareBackedStorage = (): boolean => isNative();
