/**
 * 7-Day Streak Unlock state.
 *
 * SINGLE SOURCE OF TRUTH: the user's "When did you last have contact?"
 * timestamp (`public.streaks.started_at`) — the very same value the No
 * Contact Counter uses. There is no separate streak clock here; the day
 * number is derived from that timestamp, so resetting the no-contact date
 * automatically updates this screen.
 *
 * Eligibility: only users whose last contact was within the last 3 days see
 * the screen, and only once per calendar day. The "seen today" marker is
 * stored in Supabase (`public.app_streaks.last_active_date`) with a
 * localStorage mirror so it survives reinstalls and works offline.
 */
import { supabase } from "@/integrations/supabase/client";
import { elapsedSince } from "@/lib/streak";

/**
 * Master switch for the whole 7-Day Streak Unlock feature.
 * Set back to `true` to re-enable it everywhere (splash auto-open, the
 * /streak-unlock screen, and the Healing Tools card). While false the feature
 * never activates or displays; all of its code stays intact.
 */
export const STREAK_UNLOCK_ENABLED = false;

export const STREAK_UNLOCK_TARGET = 7;

/** Last contact must be within this many days for the screen to show. */
export const STREAK_UNLOCK_MAX_DAYS = 3;

const MIRROR_KEY = "nc:app-streak-v2";

export type AppStreak = {
  /** Day number derived from the last-contact timestamp, 1-based. */
  day: number;
  /** True when the screen was already shown/counted today. */
  seenToday: boolean;
  /** True once the 7-day no-contact mark has been reached. */
  unlocked: boolean;
  /** False when the last contact is older than the allowed window. */
  eligible: boolean;
};

type Row = {
  user_id: string;
  start_date: string;
  last_active_date: string;
  current_day: number;
  best_day: number;
  coloring_unlocked: boolean;
};

/* ------------------------------------------------------------------ dates */

function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today's date in the device's local calendar (YYYY-MM-DD). */
export function todayLocal(): string {
  return toLocalDate(new Date());
}

/* ----------------------------------------------------------------- mirror */

function readMirror(userId: string): Row | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${MIRROR_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as Row) : null;
  } catch {
    return null;
  }
}

function writeMirror(userId: string, row: Row): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${MIRROR_KEY}:${userId}`, JSON.stringify(row));
  } catch {
    /* storage unavailable — remote row still holds the truth */
  }
}

/* ------------------------------------------------------------------- data */

const table = () => (supabase as unknown as {
  from: (name: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Row | null; error: unknown }>;
      };
    };
    upsert: (
      values: Row,
      options: { onConflict: string },
    ) => Promise<{ error: unknown }>;
  };
}).from("app_streaks");

async function fetchRow(userId: string): Promise<Row | null> {
  try {
    const { data, error } = await table().select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (data) writeMirror(userId, data);
    return data ?? readMirror(userId);
  } catch {
    return readMirror(userId);
  }
}

async function persist(userId: string, row: Row): Promise<void> {
  writeMirror(userId, row);
  try {
    await table().upsert(row, { onConflict: "user_id" });
  } catch {
    /* offline — mirror keeps the marker until the next successful write */
  }
}

/* ------------------------------------------------------------------ logic */

/** Day number + unlock state derived purely from the last-contact timestamp. */
export function deriveStreak(startedAt: string | null | undefined): {
  day: number;
  elapsedDays: number;
  unlocked: boolean;
  eligible: boolean;
} {
  if (!startedAt) return { day: 1, elapsedDays: 0, unlocked: false, eligible: false };
  const elapsedDays = elapsedSince(startedAt).days;
  return {
    day: elapsedDays + 1,
    elapsedDays,
    unlocked: elapsedDays + 1 >= STREAK_UNLOCK_TARGET,
    eligible: elapsedDays <= STREAK_UNLOCK_MAX_DAYS,
  };
}

/** Read-only look at today's state. Never mutates. */
export async function peekAppStreak(
  userId: string,
  startedAt: string | null | undefined,
): Promise<AppStreak> {
  const derived = deriveStreak(startedAt);
  const row = await fetchRow(userId);
  return {
    day: derived.day,
    seenToday: row?.last_active_date === todayLocal(),
    unlocked: derived.unlocked,
    eligible: derived.eligible,
  };
}

/** Marks the screen as seen for today (idempotent per calendar day). */
export async function registerAppStreakVisit(
  userId: string,
  startedAt: string | null | undefined,
): Promise<AppStreak> {
  const derived = deriveStreak(startedAt);
  const row = await fetchRow(userId);
  const today = todayLocal();
  if (row?.last_active_date === today) {
    return { day: derived.day, seenToday: true, unlocked: derived.unlocked, eligible: derived.eligible };
  }
  await persist(userId, {
    user_id: userId,
    start_date: row?.start_date ?? today,
    last_active_date: today,
    current_day: derived.day,
    best_day: Math.max(row?.best_day ?? 0, derived.day),
    coloring_unlocked: (row?.coloring_unlocked ?? false) || derived.unlocked,
  });
  return { day: derived.day, seenToday: false, unlocked: derived.unlocked, eligible: derived.eligible };
}
