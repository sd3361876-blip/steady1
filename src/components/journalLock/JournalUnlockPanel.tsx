import { Fingerprint, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { JournalLockSetup } from "@/components/journalLock/JournalLockSetup";
import { PinEntry } from "@/components/journalLock/PinEntry";
import { Button } from "@/components/ui/button";
import {
  checkBiometry,
  promptBiometric,
  promptDeviceAuth,
  type BiometryStatus,
} from "@/lib/journalLock/biometrics";
import { verifyPin } from "@/lib/journalLock/pin";
import { markJournalUnlocked, type JournalLockConfig } from "@/lib/journalLock/state";
import { haptic } from "@/lib/native/haptics";

/**
 * "Journal Locked" authentication UI. Used full-screen in front of the journal
 * and inside the Settings dialog when turning Journal Lock off.
 */
export function JournalUnlockPanel({
  userId,
  config,
  onConfigChange,
  onUnlocked,
  onCancel,
  cancelLabel,
}: {
  userId: string;
  config: JournalLockConfig;
  onConfigChange: (config: JournalLockConfig) => void;
  onUnlocked: () => void;
  onCancel?: (() => void) | undefined;
  cancelLabel?: string | undefined;
}) {
  const [biometry, setBiometry] = useState<BiometryStatus | null>(null);
  const [mode, setMode] = useState<"choose" | "pin" | "reset">("choose");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  const biometricUsable = Boolean(config.biometricEnabled && biometry?.available);

  const succeed = useCallback(() => {
    markJournalUnlocked(userId);
    onUnlocked();
  }, [onUnlocked, userId]);

  const runBiometric = useCallback(async () => {
    setBusy(true);
    const attempt = await promptBiometric({
      reason: "Unlock your journal",
      title: "Journal Locked",
      subtitle: "Use your biometric to continue.",
    });
    setBusy(false);
    if (attempt.ok) {
      haptic.light();
      succeed();
      return;
    }
    setError(attempt.message || undefined);
    if (!attempt.cancelled) setMode("pin");
  }, [succeed]);

  useEffect(() => {
    let alive = true;
    void checkBiometry().then((status) => {
      if (!alive) return;
      setBiometry(status);
      // Offer biometrics automatically once, then leave the user in control.
      if (config.biometricEnabled && status.available && !autoTried.current) {
        autoTried.current = true;
        void runBiometric();
      }
    });
    return () => {
      alive = false;
    };
  }, [config.biometricEnabled, runBiometric]);

  const submitPin = async (pin: string) => {
    setBusy(true);
    const ok = await verifyPin(pin, config.pin);
    setBusy(false);
    if (ok) {
      haptic.light();
      succeed();
      return;
    }
    haptic.light();
    setPinError("That PIN isn't right. Try again.");
    setResetKey((n) => n + 1);
  };

  const startForgot = async () => {
    setError(undefined);
    const attempt = await promptDeviceAuth("Verify it's you to reset your Journal PIN");
    if (attempt.ok) {
      setMode("reset");
      return;
    }
    if (attempt.cancelled) return;
    setError(
      attempt.message ||
        "Resetting your PIN needs your device's biometric or screen lock. Without one, the PIN can't be reset.",
    );
  };

  if (mode === "reset") {
    return (
      <JournalLockSetup
        userId={userId}
        mode="reset"
        existing={config}
        onCancel={() => setMode("choose")}
        onDone={(next) => {
          onConfigChange(next);
          succeed();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <Lock className="mx-auto size-10 text-primary" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight">Journal Locked</h2>
        <p className="text-sm text-muted-foreground">
          Use your biometric or Journal PIN to continue.
        </p>
      </div>

      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {mode === "choose" ? (
        <div className="space-y-2">
          {biometricUsable ? (
            <Button
              className="press h-12 w-full rounded-2xl"
              disabled={busy}
              onClick={() => {
                haptic.light();
                void runBiometric();
              }}
            >
              <Fingerprint className="size-5" aria-hidden />
              Use Biometrics
            </Button>
          ) : null}
          <Button
            variant={biometricUsable ? "secondary" : "default"}
            className="press h-12 w-full rounded-2xl"
            disabled={busy}
            onClick={() => {
              haptic.light();
              setError(undefined);
              setMode("pin");
            }}
          >
            Use PIN
          </Button>
          <Button
            variant="ghost"
            className="press h-11 w-full rounded-2xl text-sm"
            onClick={() => void startForgot()}
          >
            Forgot PIN?
          </Button>
          {onCancel ? (
            <Button
              variant="ghost"
              className="press h-11 w-full rounded-2xl text-sm text-muted-foreground"
              onClick={onCancel}
            >
              {cancelLabel ?? "Cancel"}
            </Button>
          ) : null}
        </div>
      ) : (
        <PinEntry
          title="Enter your Journal PIN"
          error={pinError}
          busy={busy}
          resetKey={`unlock-${resetKey}`}
          onSubmit={submitPin}
          footer={
            <>
              {biometricUsable ? (
                <Button
                  variant="secondary"
                  className="press h-11 w-full rounded-2xl"
                  disabled={busy}
                  onClick={() => void runBiometric()}
                >
                  <Fingerprint className="size-4" aria-hidden />
                  Use Biometrics
                </Button>
              ) : null}
              <Button
                variant="ghost"
                className="press h-11 w-full rounded-2xl text-sm"
                onClick={() => void startForgot()}
              >
                Forgot PIN?
              </Button>
              {onCancel ? (
                <Button
                  variant="ghost"
                  className="press h-11 w-full rounded-2xl text-sm text-muted-foreground"
                  onClick={onCancel}
                >
                  {cancelLabel ?? "Cancel"}
                </Button>
              ) : null}
            </>
          }
        />
      )}
    </div>
  );
}
