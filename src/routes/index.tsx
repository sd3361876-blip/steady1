import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { TAGLINE } from "@/lib/content";
import { STREAK_UNLOCK_ENABLED } from "@/lib/streakUnlock";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "STEADY: BREAKUP RECOVERY" },
      {
        name: "description",
        content:
          "Track your no-contact streak in real time, log red flags and wins, unlock badges and get through urges with an offline emergency toolkit.",
      },
      { property: "og:title", content: "STEADY: BREAKUP RECOVERY" },
      { property: "og:description", content: TAGLINE },
    ],
  }),
  component: Splash,
});

function Splash() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    analytics.screen("splash");
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (loading || cancelled) return;
      if (!session) {
        void navigate({ to: "/auth", replace: true });
        return;
      }
      if (STREAK_UNLOCK_ENABLED) {
        // The streak screen decides for itself whether today needs celebrating;
        // if not, it forwards straight to Home.
        void navigate({ to: "/streak-unlock", search: { auto: true }, replace: true });
        return;
      }
      void navigate({ to: "/home", replace: true });
    }, 2400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="animate-soft-pulse absolute inset-0 -z-10 rounded-full bg-mint blur-3xl"
        />
        <Mascot size="hero" reveal />
      </div>
      <h1 className="animate-rise mt-10 text-2xl font-semibold tracking-tight">
        {t("landing.title", "STEADY")}
      </h1>
      <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
        {t("landing.subtitle", "Breakup Recovery")}
      </p>
      <p className="animate-rise mt-6 max-w-xs text-sm text-muted-foreground">{TAGLINE}</p>
    </div>
  );
}
