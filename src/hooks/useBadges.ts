import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import {
  badgeRepo,
  flagRepo,
  journalRepo,
  letterRepo,
  localDayKey,
  moodRepo,
  pictureRepo,
  profileRepo,
  streakRepo,
  triggerRepo,
  winRepo,
} from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import {
  consecutiveDayStreak,
  getActivity,
  subscribeActivity,
  TRACKED_FEATURES,
  TRACKED_TABS,
  type ActivityState,
} from "@/lib/badgeActivity";
import {
  BADGES,
  earnedBadgeKeys,
  evaluateBadges,
  EMPTY_BADGE_STATS,
  badgeByKey,
  type BadgeProgress,
  type BadgeStats,
} from "@/lib/badges";
import { celebrate } from "@/lib/celebrate";
import { isLoggingOut } from "@/lib/logoutGuard";
import { onceWithin, toastOnce } from "@/lib/toastOnce";
import { daysSince } from "@/lib/streak";

const EMPTY_ACTIVITY = getActivity();
const EMPTY_LIST: never[] = [];

/**
 * Module-level so every mount of this hook (Home + Badges) shares one record
 * of what has already been announced. Without it the same unlock is toasted
 * once per mounted screen and again on every StrictMode effect replay.
 */
const announcedKeys = new Set<string>();
let unlockInFlight = false;

/** Reactive view of the local activity counters. */
export function useActivity(): ActivityState {
  return useSyncExternalStore(
    subscribeActivity,
    getActivity,
    () => EMPTY_ACTIVITY,
  );
}

export type BadgeState = {
  stats: BadgeStats;
  progress: BadgeProgress[];
  owned: Set<string>;
  unlockedCount: number;
  total: number;
};

/**
 * Single place where badge stats are gathered, evaluated, and persisted.
 * Any screen can call this; the unlock side-effect is idempotent.
 */
export function useBadges(options: { autoUnlock?: boolean } = {}): BadgeState {
  const { autoUnlock = false } = options;
  const { user } = useAuth();
  const { t } = useTranslation();
  const userId = user?.id ?? "";
  const enabled = Boolean(userId);
  const queryClient = useQueryClient();
  const activity = useActivity();

  const streak = useQuery({ queryKey: ["streak", userId], queryFn: () => streakRepo.get(userId), enabled }).data ?? null;
  const profile = useQuery({ queryKey: ["profile", userId], queryFn: () => profileRepo.get(userId), enabled }).data ?? null;
  const flags = useQuery({ queryKey: ["flags", userId], queryFn: () => flagRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const wins = useQuery({ queryKey: ["wins", userId], queryFn: () => winRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const letters = useQuery({ queryKey: ["letters", userId], queryFn: () => letterRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const journal = useQuery({ queryKey: ["journal", userId], queryFn: () => journalRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const pictures = useQuery({ queryKey: ["pictures", userId], queryFn: () => pictureRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const triggers = useQuery({ queryKey: ["triggers", userId], queryFn: () => triggerRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const moods = useQuery({ queryKey: ["moods", userId], queryFn: () => moodRepo.list(userId), enabled }).data ?? EMPTY_LIST;
  const badges = useQuery({ queryKey: ["badges", userId], queryFn: () => badgeRepo.list(userId), enabled }).data ?? EMPTY_LIST;

  const stats = useMemo<BadgeStats>(() => {
    if (!enabled) return EMPTY_BADGE_STATS;
    const journalDays = (journal as { created_at: string }[]).map((entry) =>
      localDayKey(new Date(entry.created_at)),
    );
    return {
      days: streak?.started_at ? daysSince(streak.started_at) : 0,
      journalEntries: journal.length,
      journalStreak: consecutiveDayStreak(journalDays),
      pictures: pictures.length,
      triggers: triggers.length,
      moods: moods.length,
      wins: wins.length,
      flags: flags.length,
      letters: letters.length,
      sosUses: activity.sosUses,
      sosSessions: activity.sosSessions,
      popItSessions: activity.popItSessions,
      dailyTaskDays: activity.dailyTaskDays.length,
      dailyTaskStreak: consecutiveDayStreak(activity.dailyTaskDays),
      notificationReturns: activity.notificationReturns,
      returnedAfterGap: activity.returnedAfterGap,
      morningStreak: consecutiveDayStreak(activity.morningDays),
      tabsVisited: activity.tabs.filter((tab) =>
        (TRACKED_TABS as readonly string[]).includes(tab),
      ).length,
      featuresUsed: activity.features.filter((feature) =>
        (TRACKED_FEATURES as readonly string[]).includes(feature),
      ).length,
      appOpenDays: activity.openDays.length,
      relapses: streak?.relapse_count ?? 0,
      onboarded: activity.onboarded || Boolean(profile?.questionnaire_completed),
      profileSetup: activity.profileSetup || Boolean(profile?.display_name),
    };
  }, [enabled, streak, profile, flags, wins, letters, journal, pictures, triggers, moods, activity]);

  const progress = useMemo(() => evaluateBadges(stats), [stats]);
  const owned = useMemo(
    () => new Set(badges.map((row) => row.badge_key)),
    [badges],
  );

  const announced = useRef(false);
  useEffect(() => {
    if (!autoUnlock || !enabled || unlockInFlight || isLoggingOut()) return;
    const keys = earnedBadgeKeys(stats);
    const fresh = keys.filter(
      (key) => !owned.has(key) && !announcedKeys.has(`${userId}:${key}`),
    );
    if (fresh.length === 0) {
      announced.current = true;
      return;
    }
    const isFirstLoad = !announced.current && owned.size === 0;
    announced.current = true;
    // Claim the keys synchronously so a parallel mount can't announce them too.
    fresh.forEach((key) => announcedKeys.add(`${userId}:${key}`));
    unlockInFlight = true;
    void badgeRepo
      .unlock(userId, keys)
      .then((rows) => {
        queryClient.setQueryData(["badges", userId], rows);
        if (isFirstLoad) return;
        const named = fresh.map((key) => badgeByKey(key)?.label).filter(Boolean) as string[];
        if (named.length === 0) return;
        const id = `badge:${fresh.slice().sort().join("|")}`;
        onceWithin(id, () => void celebrate());
        toastOnce(
          id,
          named.length === 1
            ? t("toast.badgeUnlocked", { name: named[0] })
            : t("toast.badgesUnlocked", { count: named.length, names: named.join(", ") }),
        );
      })
      .finally(() => {
        unlockInFlight = false;
      });
  }, [autoUnlock, enabled, stats, owned, userId, queryClient, t]);

  const unlockedCount = progress.filter(
    (item) => item.unlocked || owned.has(item.badge.key),
  ).length;

  return { stats, progress, owned, unlockedCount, total: BADGES.length };
}
