/**
 * Activation prompt for the one-time 30-day, no-payment Pro trial.
 * Renders only for signed-in users the server reports as eligible.
 */
import { Gift, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { haptic } from "@/lib/native/haptics";
import { activateTrial, fetchTrialStatus } from "@/lib/subscription/trial";

export function FreeTrialCard() {
  const { isPremium, refresh } = useSubscription();
  const [eligible, setEligible] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchTrialStatus()
      .then((status) => {
        if (!cancelled) setEligible(status.eligible);
      })
      .catch(() => {
        if (!cancelled) setEligible(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!eligible || isPremium) return null;

  const start = async () => {
    setWorking(true);
    try {
      await activateTrial();
      setEligible(false);
      haptic.success();
      await refresh();
      toast.success("Your 30-day Pro trial has started!");
    } catch (error) {
      toast.error((error as Error)?.message ?? "We couldn't start your trial.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <SoftCard className="mt-6 space-y-3 animate-rise">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15">
          <Gift className="size-4 text-primary" aria-hidden />
        </span>
        <h2 className="text-base font-semibold">Start Your 30-Day Free Pro Trial</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Get full Pro access for 30 days. No payment required.
      </p>
      <Button className="w-full" onClick={() => void start()} disabled={working}>
        {working ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Start Free Trial
      </Button>
    </SoftCard>
  );
}
