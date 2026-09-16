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

/* ==================================================================== *
 * TEMPORARY DIAGNOSTICS — added only to debug the blank Android Journal.
 * Records what the secure-storage layer is doing so the gate can render
 * the live status on screen. No behavior change: every code path below
 * returns/resolves exactly as before.
 * ==================================================================== */

export type JournalLockDiagnostic = {
  phase: "pending" | "success" | "failed";
  step: string;
  isNative: boolean;
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  updatedAt: string;
};

let lastDiagnostic: JournalLockDiagnostic | null = null;
let diagnosticVersion = 0;
const diagnosticListeners = new Set<
  (diagnostic: JournalLockDiagnostic | null, version: number) => void
>();

function recordDiagnostic(diagnostic: JournalLockDiagnostic): void {
  lastDiagnostic = diagnostic;
  diagnosticVersion += 1;
  diagnosticListeners.forEach((listener) => listener(diagnostic, diagnosticVersion));
}

export function getJournalLockDiagnostic(): JournalLockDiagnostic | null {
  return lastDiagnostic;
}

export function subscribeJournalLockDiagnostics(
  listener: (diagnostic: JournalLockDiagnostic | null, version: number) => void,
): () => void {
  diagnosticListeners.add(listener);
  return () => {
    diagnosticListeners.delete(listener);
  };
}

export function describeJournalLockError(error: unknown): {
  name: string;
  message: string;
  stack?: string | undefined;
} {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === "string") return { name: "StringError", message: error };
  try {
    return { name: "UnknownError", message: JSON.stringify(error) };
  } catch {
    return { name: "UnknownError", message: String(error) };
  }
}

/**
 * NOTE: the plugin's `setKeyPrefix` is a JS-only helper that is NOT implemented
 * as a native Android method. Calling it on Android dispatches a bridge call
 * that Capacitor only logs and never settles, so the awaited promise hangs
 * forever. We therefore prefix keys ourselves and only call methods that really
 * exist natively (internalGetItem/SetItem/RemoveItem via get/set/removeItem).
 */
async function nativeStore() {
  const { SecureStorage } = await import("@aparajita/capacitor-secure-storage");
  return SecureStorage;
}

const nativeKey = (key: string) => PREFIX + key;

const baseDiagnostic = (step: string): JournalLockDiagnostic => ({
  phase: "pending",
  step,
  isNative: isNative(),
  updatedAt: new Date().toISOString(),
});

export const journalLockStore = {
  async get(key: string): Promise<string | null> {
    const native = isNative();
    recordDiagnostic(baseDiagnostic(native ? "native SecureStorage.getItem — starting" : "web localStorage.getItem — starting"));
    try {
      let result: string | null;
      if (native) {
        const store = await nativeStore();
        recordDiagnostic(baseDiagnostic("awaiting native SecureStorage.getItem"));
        result = await store.getItem(nativeKey(key));
      } else {
        if (typeof window === "undefined") result = null;
        else result = window.localStorage.getItem(PREFIX + key);
      }
      recordDiagnostic({
        ...baseDiagnostic("read complete"),
        phase: "success",
      });
      return result;
    } catch (error) {
      const described = describeJournalLockError(error);
      recordDiagnostic({
        ...baseDiagnostic("read threw"),
        phase: "failed",
        errorName: described.name,
        errorMessage: described.message,
        errorStack: described.stack,
      });
      console.warn("[journal-lock] read failed", error);
      return null;
    }
  },
  async set(key: string, value: string): Promise<void> {
    const native = isNative();
    recordDiagnostic(baseDiagnostic(native ? "native SecureStorage.setItem — starting" : "web localStorage.setItem — starting"));
    try {
      if (native) {
        const store = await nativeStore();
        recordDiagnostic(baseDiagnostic("awaiting native SecureStorage.setItem"));
        await store.setItem(nativeKey(key), value);
      } else {
        if (typeof window !== "undefined") window.localStorage.setItem(PREFIX + key, value);
      }
      recordDiagnostic({
        ...baseDiagnostic("write complete"),
        phase: "success",
      });
    } catch (error) {
      const described = describeJournalLockError(error);
      recordDiagnostic({
        ...baseDiagnostic("write threw"),
        phase: "failed",
        errorName: described.name,
        errorMessage: described.message,
        errorStack: described.stack,
      });
      throw error;
    }
  },
  async remove(key: string): Promise<void> {
    const native = isNative();
    recordDiagnostic(baseDiagnostic(native ? "native SecureStorage.removeItem — starting" : "web localStorage.removeItem — starting"));
    try {
      if (native) {
        const store = await nativeStore();
        recordDiagnostic(baseDiagnostic("awaiting native SecureStorage.removeItem"));
        await store.removeItem(nativeKey(key));
      } else {
        if (typeof window !== "undefined") window.localStorage.removeItem(PREFIX + key);
      }
      recordDiagnostic({
        ...baseDiagnostic("remove complete"),
        phase: "success",
      });
    } catch (error) {
      const described = describeJournalLockError(error);
      recordDiagnostic({
        ...baseDiagnostic("remove threw"),
        phase: "failed",
        errorName: described.name,
        errorMessage: described.message,
        errorStack: described.stack,
      });
      console.warn("[journal-lock] remove failed", error);
    }
  },
};

/** True when the device gives us real hardware-backed secret storage. */
export const hasHardwareBackedStorage = (): boolean => isNative();
