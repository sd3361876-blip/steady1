import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { JournalLockSetup } from "@/components/journalLock/JournalLockSetup";
import { JournalUnlockPanel } from "@/components/journalLock/JournalUnlockPanel";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { pinCryptoAvailable } from "@/lib/journalLock/pin";
import {
  clearJournalUnlocked,
  DEFAULT_CONFIG,
  loadJournalLockConfig,
  saveJournalLockConfig,
  type JournalLockConfig,
} from "@/lib/journalLock/state";
import { haptic } from "@/lib/native/haptics";

/**
 * Settings → Privacy & Security → Journal Lock.
 * Turning the lock off first requires unlocking, so the switch itself can never
 * be used to bypass the lock.
 */
export function JournalLockSetting() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [config, setConfig] = useState<JournalLockConfig | null>(null);
  const [dialog, setDialog] = useState<"none" | "setup" | "disable">("none");

  useEffect(() => {
    let alive = true;
    void loadJournalLockConfig(userId).then((next) => {
      if (alive) setConfig(next);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const enabled = Boolean(config?.enabled);

  const disable = async () => {
    await saveJournalLockConfig(userId, DEFAULT_CONFIG);
    clearJournalUnlocked();
    setConfig(DEFAULT_CONFIG);
    setDialog("none");
    toast("Journal Lock turned off.");
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
        <div className="flex-1">
          <p className="font-medium">Journal Lock</p>
          <p className="text-sm text-muted-foreground">
            Protect your private journal with a 4-digit PIN or biometrics.
          </p>
        </div>
        <Switch
          checked={enabled}
          aria-label="Journal Lock"
          disabled={!config || !userId}
          onCheckedChange={(checked) => {
            haptic.light();
            if (checked) {
              if (!pinCryptoAvailable()) {
                toast("This device can't securely protect a PIN, so Journal Lock is unavailable.");
                return;
              }
              setDialog("setup");
              return;
            }
            setDialog("disable");
          }}
        />
      </div>

      <Dialog open={dialog !== "none"} onOpenChange={(open) => !open && setDialog("none")}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogTitle className="sr-only">Journal Lock</DialogTitle>
          <DialogDescription className="sr-only">
            Set up or turn off the lock that protects your journal.
          </DialogDescription>
          {dialog === "setup" ? (
            <JournalLockSetup
              userId={userId}
              onCancel={() => setDialog("none")}
              onDone={(next) => {
                setConfig(next);
                setDialog("none");
                toast("Journal Lock is on.");
              }}
            />
          ) : null}
          {dialog === "disable" && config?.pin ? (
            <JournalUnlockPanel
              userId={userId}
              config={config}
              onConfigChange={setConfig}
              onUnlocked={() => void disable()}
              onCancel={() => setDialog("none")}
              cancelLabel="Keep Journal Lock on"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
