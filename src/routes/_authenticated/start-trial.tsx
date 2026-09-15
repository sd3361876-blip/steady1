/**
 * Mandatory 30-day Pro trial activation screen shown right after onboarding.
 *
 * Eligibility is decided by the server (/api/public/pro-trial); users who have
 * already claimed the trial, or who already subscribe, are sent straight to
 * Home and continue with the existing paywall flow.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookHeart,
  Crown,
  HeartHandshake,
  LifeBuoy,
  Loader2,
  Mic,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { activateTrial, fetchTrialStatus } from "@/lib/subscription/trial";
import { markTrialActivated } from "@/lib/subscription/trialGate";

export const Route = createFileRoute("/_authenticated/start-trial")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Start Your Free Trial | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content:
          "Start your 30-day Pro trial of SOLACE. No payment and no credit card required.",
      },
      { property: "og:title", content: "Your Healing Starts Today" },
      {
        property: "og:description",
        content: "30 days of full Pro access. No payment details required.",
      },
    ],
  }),
  component: StartTrial,
});

const BENEFITS = [
  { icon: BookHeart, label: "Unlimited journaling" },
  { icon: Mic, label: "Voice notes & unsent letters" },
  { icon: Target, label: "Set your breakup recovery journey" },
  { icon: LifeBuoy, label: "Emergency toolkit" },
  { icon: HeartHandshake, label: "Guided healing" },
  { icon: Sparkles, label: "All future Pro tools during the trial" },
] as const;

function StartTrial() {
  const navigate = useNavigate();
  const { isPremium, refresh } = useSubscription();
  const [checking, setChecking] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => analytics.screen("start_trial"), []);

  // Anyone who isn't eligible never sees this screen.
  useEffect(() => {
    let cancelled = false;
    const skip = () => {
      markTrialActivated();
      if (!cancelled) void navigate({ to: "/home", replace: true });
    };
    if (isPremium) {
      skip();
      return () => {
        cancelled = true;
      };
    }
    void fetchTrialStatus()
      .then((status) => {
        if (cancelled) return;
        if (!status.eligible) skip();
        else setChecking(false);
      })
      .catch(skip);
    return () => {
      cancelled = true;
    };
  }, [isPremium, navigate]);

  const start = async () => {
    setWorking(true);
    try {
      await activateTrial();
      haptic.success();
      await refresh();
      markTrialActivated();
      toast.success("Your 30-day Pro trial has started!");
      void navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error((error as Error)?.message ?? "We couldn't start your trial.");
    } finally {
      setWorking(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lavender px-3 py-1 text-xs font-semibold tracking-wide text-on-tint uppercase">
        <Crown className="size-3.5" aria-hidden /> Pro
      </span>

      <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-gradient">
        Your Healing Starts Today
      </h1>
      <p className="mt-3 text-muted-foreground">
        Start your 30-day Pro trial. No payment. No credit card. Cancel anytime because nothing is
        being charged.
      </p>

      <SoftCard className="mt-6 space-y-4 animate-rise">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/15">
              <Icon className="size-4 text-primary" aria-hidden />
            </span>
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </SoftCard>

      <div className="mt-auto pt-8">
        <Button
          className="press h-14 w-full rounded-2xl text-base"
          disabled={working}
          onClick={() => {
            haptic.light();
            void start();
          }}
        >
          {working ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          Start My 30-Day Free Trial
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          30 days free. No payment details required.
        </p>
      </div>
    </div>
  );
}
