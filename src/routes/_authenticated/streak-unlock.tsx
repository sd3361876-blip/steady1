import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Download, Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { ColoringGarden } from "@/components/illustrations/ColoringGarden";
import { Button } from "@/components/ui/button";
import { profileRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import { downloadColoringPage } from "@/lib/coloringPage";
import { haptic } from "@/lib/native/haptics";
import {
  STREAK_UNLOCK_ENABLED,
  STREAK_UNLOCK_TARGET,
  peekAppStreak,
  registerAppStreakVisit,
} from "@/lib/streakUnlock";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/streak-unlock")({
  head: () => ({
    meta: [
      { title: "7-Day Streak Unlock | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content:
          "Watch your garden gain colour with every no contact day and unlock a printable coloring page at day 7.",
      },
      { property: "og:title", content: "7-Day Streak Unlock | SOLACE: BREAKUP RECOVERY" },
      {
        property: "og:description",
        content: "Every streak day adds a splash of colour to your garden.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { auto?: boolean } =>
    search["auto"] === true || search["auto"] === "1" ? { auto: true } : {},
  component: StreakUnlockScreen,
});

function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StreakUnlockScreen() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const { auto } = Route.useSearch();
  const printRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmed, setConfirmed] = useState<{ day: number; unlocked: boolean } | null>(null);

  // Read-only look at today's state — never mutates, so the eligibility check
  // below can decide before anything is rendered or recorded.
  // The no-contact timestamp is the single source of truth for this screen.
  const streak = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.ensure(userId),
    enabled: Boolean(userId),
  });
  const startedAt = streak.data?.started_at ?? null;

  const peek = useQuery({
    queryKey: ["app-streak", userId, startedAt],
    queryFn: () => peekAppStreak(userId, startedAt),
    enabled: Boolean(userId) && Boolean(startedAt),
    staleTime: 0,
    gcTime: 0,
  });

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileRepo.get(userId),
    enabled: Boolean(userId) && Boolean(auto),
  });

  const resolved =
    !authLoading && Boolean(userId) && peek.isSuccess && (!auto || !profile.isLoading);
  const onboarded = profile.data?.questionnaire_completed !== false;
  // Last contact must be recent, and the screen shows once per calendar day.
  const eligible =
    STREAK_UNLOCK_ENABLED &&
    resolved &&
    peek.data!.eligible &&
    (!auto || (onboarded && !peek.data!.seenToday));

  useEffect(() => {
    analytics.screen("streak_unlock");
  }, []);

  useEffect(() => {
    // Disabled feature: anyone landing here (old link, bookmark) goes to Home.
    if (!STREAK_UNLOCK_ENABLED || (resolved && !eligible)) {
      void navigate({ to: "/home", replace: true });
    }
  }, [resolved, eligible, navigate]);

  // Record today's usage exactly once, only when the screen actually shows.
  useEffect(() => {
    if (!eligible || confirmed) return;
    let cancelled = false;
    void registerAppStreakVisit(userId, startedAt).then((state) => {
      if (cancelled) return;
      setConfirmed({ day: state.day, unlocked: state.unlocked });
      if (state.unlocked) void celebrate();
    });
    return () => {
      cancelled = true;
    };
  }, [eligible, confirmed, userId, startedAt]);

  const totalDays = confirmed?.day ?? peek.data?.day ?? 1;
  const stage = Math.min(STREAK_UNLOCK_TARGET, Math.max(1, totalDays));
  const unlocked = confirmed?.unlocked ?? peek.data?.unlocked ?? false;

  const dismiss = () => {
    haptic.light();
    void navigate({ to: "/home", replace: true });
  };

  // Initialization state — prevents the screen from flashing before we know
  // whether it should be shown at all.
  if (!eligible || !confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }


  return (
    <div className="animate-in fade-in mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] duration-500">
      <p className="text-center text-sm text-muted-foreground">{formatToday()}</p>

      <AppLogo className="mx-auto mt-3 size-10" />

      <h1 className="animate-rise mt-2 text-center text-[2rem] font-semibold tracking-tight">
        Day {totalDays}
      </h1>

      <ol className="mt-5 flex items-center justify-center gap-2">
        {Array.from({ length: STREAK_UNLOCK_TARGET }, (_, index) => index + 1).map((day) => {
          const done = day < stage || (day === STREAK_UNLOCK_TARGET && totalDays >= STREAK_UNLOCK_TARGET);
          const current = day === stage && !done;
          return (
            <li
              key={day}
              aria-label={`Day ${day}${done ? " complete" : current ? " today" : " locked"}`}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-500",
                done && "border-transparent bg-primary text-primary-foreground",
                current && "border-primary bg-primary-soft text-foreground ring-4 ring-primary/15",
                !done && !current && "border-border text-muted-foreground/70",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : day}
            </li>
          );
        })}
      </ol>

      <div className="soft-card animate-rise mt-6 overflow-hidden rounded-3xl p-3">
        <ColoringGarden stage={stage} className="text-foreground/70" />
      </div>

      <p className="mt-5 text-center text-sm leading-relaxed text-muted-foreground">
        {unlocked
          ? "Your garden is fully in bloom — the downloadable coloring page is unlocked. Enjoy it, then keep the streak going."
          : "Every streak day adds a splash of color. Complete a 7-day streak to unlock a downloadable coloring page."}
      </p>

      {unlocked ? (
        <p className="animate-scale-in mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-xs font-semibold text-on-tint">
          <Check className="size-3.5" aria-hidden /> Reward unlocked
        </p>
      ) : (
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5" aria-hidden /> Unlocks on day {STREAK_UNLOCK_TARGET}
        </p>
      )}

      <div className="mt-auto space-y-3 pt-8">
        {unlocked ? (
          <Button
            className="h-12 w-full rounded-2xl"
            disabled={downloading}
            onClick={async () => {
              haptic.medium();
              setDownloading(true);
              await downloadColoringPage(printRef.current);
              setDownloading(false);
            }}
          >
            <Download className="mr-2 size-4" aria-hidden />
            {downloading ? "Preparing…" : "Download Coloring Page"}
          </Button>
        ) : null}
        <Button
          variant={unlocked ? "secondary" : "default"}
          className="h-12 w-full rounded-2xl"
          onClick={dismiss}
        >
          Continue
        </Button>
      </div>

      {/* Hidden printable line-art version used for the download. */}
      <div className="pointer-events-none absolute -z-10 size-0 overflow-hidden" aria-hidden>
        <ColoringGarden ref={printRef} stage={0} monochrome />
      </div>
    </div>
  );
}
