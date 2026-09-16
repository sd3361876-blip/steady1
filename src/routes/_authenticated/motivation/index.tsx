import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Leaf } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import journeyBanner from "@/assets/page-banners/journey.jpg";
import { GoalsRoutines } from "@/components/goals/GoalsRoutines";
import { MotivationIllustration } from "@/components/illustrations";
import { PageImageBanner } from "@/components/PageImageBanner";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/motivation/")({
  head: () => ({
    meta: [
      { title: "Journey | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Small guided steps, goals and routines to help you heal during no contact.",
      },
      { property: "og:title", content: "Journey | SOLACE: BREAKUP RECOVERY" },
      {
        property: "og:description",
        content: "Your healing journey: guided levels plus goals and routines that keep you moving forward.",
      },
    ],
  }),
  component: JourneyHomeScreen,
});

function JourneyHomeScreen() {
  return (
    <AppShell title="Journey" subtitle="Small steps to help you heal, grow, and reconnect with yourself.">
      <PageImageBanner src={journeyBanner} />
      <MotivationIllustration className="mx-auto mb-5 mt-1 w-40" />
      <ul className="space-y-3">
        <li>
          <Link
            to="/motivation/journey"
            onClick={() => haptic.select()}
            className="press soft-card flex items-center gap-4 rounded-3xl p-5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-mint">
              <Leaf className="size-5 text-on-tint" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Journey</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Small steps to help you heal, grow, and reconnect with yourself.
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      </ul>

      <GoalsRoutines />
    </AppShell>
  );
}
