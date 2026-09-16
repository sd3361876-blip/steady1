import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Flame,
  Footprints,
  Headphones,
  Inbox,
  Palette,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import healingBanner from "@/assets/page-banners/healing.jpg";
import { PageImageBanner } from "@/components/PageImageBanner";
import { HEALING_AUDIO_TAGLINE } from "@/lib/healingAudio";
import { haptic } from "@/lib/native/haptics";
import { STREAK_UNLOCK_ENABLED } from "@/lib/streakUnlock";

export const Route = createFileRoute("/_authenticated/healing-tools")({
  head: () => ({
    meta: [
      { title: "Healing Tools | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Gentle tools — guides, audio, walks and more — to support you during no contact.",
      },
      { property: "og:title", content: "Healing Tools | SOLACE: BREAKUP RECOVERY" },
      {
        property: "og:description",
        content: "Open the healing tools for gentle reminders that keep your streak alive.",
      },
    ],
  }),
  component: HealingToolsScreen,
});

const ALL_CARDS = [
  {
    to: "/streak-unlock",
    icon: Palette,
    title: "7-Day Streak Unlock",
    tagline: "Watch your garden gain colour and unlock a printable coloring page",
    tint: "bg-lavender",
  },
  {
    to: "/motivation/guide",
    icon: Flame,
    title: "Motivational Guide",
    tagline: "Short guides written for the moments the urge feels loudest.",
    tint: "bg-mint",
  },
  {
    to: "/motivation/healing-audio",
    icon: Headphones,
    title: "Healing Audio",
    tagline: HEALING_AUDIO_TAGLINE,
    tint: "bg-lavender",
  },
  {
    to: "/motivation/walk",
    icon: Footprints,
    title: "Outdoor Walk",
    tagline: "Go for a walk and record it for physical and mental well-being",
    tint: "bg-sand",
  },
  {
    to: "/motivation/worry-box",
    icon: Inbox,
    title: "Worry Box",
    tagline: "Put your worries down somewhere safe when anxiety feels loud",
    tint: "bg-sky",
  },
  {
    to: "/motivation/gratitude-jar",
    icon: Sparkles,
    title: "Gratitude Jar",
    tagline: "Collect the small good things, one candy, heart or leaf at a time",
    tint: "bg-blush",
  },
] as const;

// The 7-Day Streak Unlock card is hidden while the feature is disabled.
const CARDS = ALL_CARDS.filter(
  (card) => STREAK_UNLOCK_ENABLED || card.to !== "/streak-unlock",
);

function HealingToolsScreen() {
  return (
    <AppShell title="Healing Tools" subtitle="A little reminder to keep choosing yourself.">
      <PageImageBanner src={healingBanner} />
      <ul className="space-y-3">
        {CARDS.map(({ to, icon: Icon, title, tagline, tint }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={() => haptic.select()}
              className="press soft-card flex items-center gap-4 rounded-3xl p-5"
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="size-5 text-on-tint" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{tagline}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
