import { Fingerprint, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { PinEntry } from "@/components/journalLock/PinEntry";
import { Button } from "@/components/ui/button";
import { checkBiometry, type BiometryStatus } from "@/lib/journalLock/biometrics";
import { createPinRecord, pinCryptoAvailable } from "@/lib/journalLock/pin";
import { hasHardwareBackedStorage } from "@/lib/journalLock/secureStore";
import {
  markJournalUnlocked,
  saveJournalLockConfig,
  type JournalLockConfig,
} from "@/lib/journalLock/state";
import { haptic } from "@/lib/native/haptics";

type Step = "intro" | "create" | "confirm" | "biometric";

/**
 * Creates (or replaces) the Journal PIN and optionally turns on biometrics.
 * `mode="reset"` skips the intro and keeps the existing biometric choice.
 */
export function JournalLockSetup({
  userId,
  mode = "enable",
  existing,
  onCancel,
  onDone,
}: {
  userId: string;
  mode?: "enable" | "reset";
  existing?: JournalLockConfig;
  onCancel: () => void;
  onDone: (config: JournalLockConfig) => void;
}) {
  const [step, setStep] = useState<Step>(mode === "reset" ? "create" : "intro");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [resetKey, setResetKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [biometry, setBiometry] = useState<BiometryStatus | null>(null);
  const [pending, setPending] = useState<JournalLockConfig | null>(null);

  useEffect(() => {
    let alive = true;
    void checkBiometry().then((status) => {
      if (alive) setBiometry(status);
    });
    return () => {
      alive = false;
    };
  }, []);

  const finish = async (config: JournalLockConfig) => {
    await saveJournalLockConfig(userId, config);
    markJournalUnlocked(userId);
    onDone(config);
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== first) {
      haptic.light();
      setError("Those PINs didn't match. Let's try again.");
      setFirst("");
      setStep("create");
      setResetKey((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      const record = await createPinRecord(pin);
      const config: JournalLockConfig = {
        enabled: true,
        biometricEnabled: existing?.biometricEnabled ?? false,
        pin: record,
      };
      if (mode === "reset" || !biometry?.available) {
        await finish(config);
        return;
      }
      setPending(config);
      setError(undefined);
      setStep("biometric");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save that PIN.");
      setResetKey((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  if (step === "intro") {
    return (
      <div className="space-y-5">
        <div className="space-y-2 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">Protect Your Journal</h2>
          <p className="text-sm text-muted-foreground">
            Keep your private thoughts protected with a Journal Lock.
          </p>
        </div>
        <p className="rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
          {hasHardwareBackedStorage()
            ? "Your PIN is never stored — only a scrambled check value kept in this phone's secure storage. Biometrics stay with Android; STEADY never sees them."
            : "In the browser this check value is kept in browser storage, which is less secure than the Android app's device-secured storage. Biometric unlock is only available in the Android app."}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="press h-12 flex-1 rounded-2xl" onClick={onCancel}>
            Not now
          </Button>
          <Button
            className="press h-12 flex-1 rounded-2xl"
            disabled={!pinCryptoAvailable()}
            onClick={() => {
              haptic.light();
              setStep("create");
            }}
          >
            Continue
          </Button>
        </div>
        {!pinCryptoAvailable() ? (
          <p className="text-center text-xs text-destructive">
            This device can't securely protect a PIN, so Journal Lock is unavailable here.
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "create") {
    return (
      <PinEntry
        title={mode === "reset" ? "Create a new Journal PIN" : "Create a 4-digit PIN"}
        description="Choose 4 digits you'll remember."
        error={error}
        resetKey={`create-${resetKey}`}
        onSubmit={(pin) => {
          setFirst(pin);
          setError(undefined);
          setStep("confirm");
        }}
        footer={
          <Button variant="ghost" className="press h-11 w-full rounded-2xl" onClick={onCancel}>
            Cancel
          </Button>
        }
      />
    );
  }

  if (step === "confirm") {
    return (
      <PinEntry
        title="Confirm your 4-digit PIN"
        description="Enter the same PIN once more."
        error={error}
        busy={busy}
        resetKey={`confirm-${resetKey}`}
        onSubmit={handleConfirm}
        footer={
          <Button
            variant="ghost"
            className="press h-11 w-full rounded-2xl"
            onClick={() => {
              setFirst("");
              setError(undefined);
              setStep("create");
            }}
          >
            Back
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2 text-center">
        <Fingerprint className="mx-auto size-10 text-primary" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight">Use biometrics for faster access</h2>
        <p className="text-sm text-muted-foreground">
          Unlock your journal with your fingerprint or face. Your 4-digit PIN keeps working too.
        </p>
      </div>
      <Button
        className="press h-12 w-full rounded-2xl"
        disabled={busy}
        onClick={() => {
          haptic.light();
          if (!pending) return;
          setBusy(true);
          void finish({ ...pending, biometricEnabled: true }).finally(() => setBusy(false));
        }}
      >
        Enable biometrics
      </Button>
      <Button
        variant="secondary"
        className="press h-12 w-full rounded-2xl"
        disabled={busy}
        onClick={() => {
          if (!pending) return;
          setBusy(true);
          void finish({ ...pending, biometricEnabled: false }).finally(() => setBusy(false));
        }}
      >
        Use PIN only
      </Button>
    </div>
  );
}
