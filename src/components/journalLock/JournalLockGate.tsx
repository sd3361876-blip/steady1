import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { JournalUnlockPanel } from "@/components/journalLock/JournalUnlockPanel";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  clearJournalUnlocked,
  ensureBackgroundWatcher,
  isJournalUnlocked,
  loadJournalLockConfig,
  type JournalLockConfig,
} from "@/lib/journalLock/state";
import {
  describeJournalLockError,
  getJournalLockDiagnostic,
  subscribeJournalLockDiagnostics,
  type JournalLockDiagnostic,
} from "@/lib/journalLock/secureStore";

/**
 * Shows the Journal Lock screen in place of the journal until the user
 * authenticates. Only the journal is gated — the rest of STEADY is untouched.
 * The unlocked session lives in memory and ends when this screen unmounts
 * (leaving the journal) or after the app has been backgrounded too long.
 */
export function JournalLockGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [config, setConfig] = useState<JournalLockConfig | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  // TEMPORARY diagnostics for the blank Android Journal — remove after the fix.
  const [loadPhase, setLoadPhase] = useState<"pending" | "done" | "failed">("pending");
  const [loadError, setLoadError] = useState<{
    name: string;
    message: string;
    stack?: string | undefined;
  } | null>(null);
  const [storageDiagnostic, setStorageDiagnostic] = useState<JournalLockDiagnostic | null>(
    getJournalLockDiagnostic(),
  );

  useEffect(
    () => subscribeJournalLockDiagnostics((diagnostic) => setStorageDiagnostic(diagnostic)),
    [],
  );

  useEffect(() => {
    ensureBackgroundWatcher();
    let alive = true;
    setConfig(null);
    setLoadPhase("pending");
    setLoadError(null);
    void loadJournalLockConfig(userId)
      .then((next) => {
        if (!alive) return;
        setLoadPhase("done");
        setConfig(next);
        setUnlocked(!next.enabled || isJournalUnlocked(userId));
      })
      .catch((error) => {
        if (!alive) return;
        setLoadPhase("failed");
        setLoadError(describeJournalLockError(error));
      });
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

  // TEMPORARY: instead of a blank screen, show the live load status + any
  // secure-storage error while the Journal Lock configuration is unresolved.
  // Security behavior is unchanged — nothing is unlocked or bypassed here.
  if (!config) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-10">
        <h1 className="text-lg font-semibold">Journal — temporary diagnostic</h1>
        <p className="text-sm text-muted-foreground">
          Journal Lock configuration load:{" "}
          <span className="font-mono font-semibold text-foreground">
            {loadPhase === "pending" ? "PENDING" : loadPhase === "failed" ? "FAILED" : "SUCCESS"}
          </span>
        </p>
        {loadPhase === "pending" && (
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-semibold">The secure-storage operation is still pending.</p>
            <p className="mt-2 text-muted-foreground">
              No result and no error has been returned yet — the call appears to be hanging.
            </p>
          </div>
        )}
        {loadError && (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">
              loadJournalLockConfig threw: {loadError.name}
            </p>
            <p className="mt-1 break-words font-mono text-xs">{loadError.message}</p>
            {loadError.stack && (
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-muted-foreground">
                {loadError.stack}
              </pre>
            )}
          </div>
        )}
        {storageDiagnostic && (
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Secure-storage layer (live)</p>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px]">
              {JSON.stringify(storageDiagnostic, null, 2)}
            </pre>
          </div>
        )}
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
