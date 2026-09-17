import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { JournalUnlockPanel } from "@/components/journalLock/JournalUnlockPanel";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  clearJournalUnlocked,
  DEFAULT_CONFIG,
  ensureBackgroundWatcher,
  isJournalUnlocked,
  loadJournalLockConfig,
  type JournalLockConfig,
} from "@/lib/journalLock/state";

/**
 * Shows the Journal Lock screen in place of the journal until the user
 * authenticates. Only the journal is gated — the rest of STEADY is untouched.
 * The unlocked session lives in memory and ends when this screen unmounts
 * (leaving the journal) or after the app has been backgrounded too long.
 *
 * The lock is OFF by default; the saved configuration is what keeps it ON
 * across app restarts until the user turns it off.
 */
export function JournalLockGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [config, setConfig] = useState<JournalLockConfig | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    ensureBackgroundWatcher();
    let alive = true;
    setConfig(null);
    const apply = (next: JournalLockConfig) => {
      if (!alive) return;
      setConfig(next);
      setUnlocked(!next.enabled || isJournalUnlocked(userId));
    };
    void loadJournalLockConfig(userId)
      .then(apply)
      .catch(() => apply(DEFAULT_CONFIG));
    return () => {
      alive = false;
      // Leaving the journal ends the unlocked session.
      clearJournalUnlocked();
    };
  }, [userId]);

  // Re-lock if the app came back from a long background while mounted.
  useEffect(() => {
    if (!config?.enabled || !unlocked) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && !isJournalUnlocked(userId)) setUnlocked(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [config?.enabled, unlocked, userId]);

  if (!config) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5">
        <div
          className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-label="Loading"
          role="status"
        />
      </div>
    );
  }
  if (!config.enabled || unlocked) return <>{children}</>;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-10">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Back"
        className="press absolute left-5 top-[calc(env(safe-area-inset-top)+1.5rem)] rounded-full"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Button>
      <SoftCard className="space-y-4">
        <JournalUnlockPanel
          userId={userId}
          config={config}
          onConfigChange={setConfig}
          onUnlocked={() => setUnlocked(true)}
        />
      </SoftCard>
    </div>
  );
}
