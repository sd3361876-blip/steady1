import { isNative } from "@/lib/native/platform";

/**
 * Thin wrapper over the platform biometric prompt (Android BiometricPrompt via
 * @aparajita/capacitor-biometric-auth). STEADY only ever receives success or
 * failure — it never reads, stores or transmits biometric data.
 */
export type BiometryStatus = {
  /** Fingerprint / face unlock usable right now. */
  available: boolean;
  /** Device has a PIN, pattern or password screen lock. */
  deviceIsSecure: boolean;
  /** Human-readable reason biometrics can't be used (empty when available). */
  reason: string;
};

const UNAVAILABLE: BiometryStatus = {
  available: false,
  deviceIsSecure: false,
  reason: "Biometrics are not available on this device.",
};

export async function checkBiometry(): Promise<BiometryStatus> {
  if (!isNative()) {
    return {
      available: false,
      deviceIsSecure: false,
      reason: "Biometric unlock is only available in the STEADY Android app.",
    };
  }
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const result = await BiometricAuth.checkBiometry();
    return {
      available: Boolean(result.isAvailable),
      deviceIsSecure: Boolean(result.deviceIsSecure),
      reason: result.isAvailable ? "" : result.reason || UNAVAILABLE.reason,
    };
  } catch (error) {
    console.warn("[journal-lock] biometry check failed", error);
    return UNAVAILABLE;
  }
}

export type BiometricAttempt = { ok: boolean; cancelled: boolean; message: string };

/**
 * Prompts the user. `allowDeviceCredential` lets the system fall back to the
 * device PIN/pattern/password — used for the "Forgot PIN?" reset, which must be
 * gated by a secure device authentication.
 */
export async function promptBiometric(options: {
  reason: string;
  title: string;
  subtitle?: string;
  allowDeviceCredential?: boolean;
}): Promise<BiometricAttempt> {
  if (!isNative()) {
    return { ok: false, cancelled: false, message: UNAVAILABLE.reason };
  }
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason: options.reason,
      androidTitle: options.title,
      androidSubtitle: options.subtitle,
      allowDeviceCredential: options.allowDeviceCredential ?? false,
      cancelTitle: "Cancel",
      androidConfirmationRequired: false,
    });
    return { ok: true, cancelled: false, message: "" };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code ?? "";
    const cancelled = code === "userCancel" || code === "appCancel" || code === "systemCancel";
    const messages: Record<string, string> = {
      biometryLockout: "Too many attempts. Use your Journal PIN instead.",
      biometryNotEnrolled: "No biometrics are enrolled on this device.",
      biometryNotAvailable: "Biometrics are unavailable right now.",
      noDeviceCredential: "This device has no screen lock set.",
      passcodeNotSet: "This device has no screen lock set.",
      authenticationFailed: "We couldn't recognise you. Try again or use your Journal PIN.",
    };
    return {
      ok: false,
      cancelled,
      message: cancelled ? "" : (messages[code] ?? "Biometric authentication failed."),
    };
  }
}

/**
 * Secure device authentication used to authorise a PIN reset: biometrics with
 * the system's device-credential fallback. When neither exists there is no
 * weaker path — the caller tells the user the PIN can't be reset.
 */
export async function promptDeviceAuth(reason: string): Promise<BiometricAttempt> {
  return promptBiometric({
    reason,
    title: "Verify it's you",
    subtitle: reason,
    allowDeviceCredential: true,
  });
}
