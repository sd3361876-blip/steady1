import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import redFlagSuccessVideo from "@/assets/red-flag-success.mp4";
import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { FlagsIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { flagRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { analytics, humanizeError } from "@/lib/analytics";
import { FLAG_CATEGORIES, FLAG_SUGGESTIONS } from "@/lib/content";
import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

/** Sensible default category for each predefined flag. */
const SUGGESTION_CATEGORY: Record<string, string> = {
  "Lied to me": "dishonesty",
  Cheated: "betrayal",
  "Ghosted me": "neglect",
  "Manipulated me": "control",
  "Gaslighted me": "control",
  "Ignored my boundaries": "boundaries",
  "Broke promises": "dishonesty",
};

function formatFlagDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const Route = createFileRoute("/_authenticated/flags")({
  head: () => ({
    meta: [
      { title: "Red flags | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Keep a private list of the reasons you left, ready for the moments you forget.",
      },
      { property: "og:title", content: "Red flags | SOLACE: BREAKUP RECOVERY" },
      { property: "og:description", content: "Remember why you left, in your own words." },
    ],
  }),
  component: FlagsScreen,
});

function FlagsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<string>(FLAG_CATEGORIES[0]?.key ?? "other");
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    analytics.screen("flags");
  }, []);

  useEffect(() => {
    if (!showSuccess) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    return () => {
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
    };
  }, [showSuccess]);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const dismissSuccess = () => {
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = null;
    setShowSuccess(false);
  };

  const flags = useQuery({
    queryKey: ["flags", userId],
    queryFn: () => flagRepo.list(userId),
    enabled: Boolean(userId),
  });

  const add = useMutation({
    mutationFn: async (input?: { title: string; note: string | null; category: string }) => {
      const payload = input ?? { title, note, category };
      return flagRepo.save(userId, {
        title: payload.title.trim(),
        note: payload.note?.trim() || null,
        category: payload.category,
      });
    },
    onSuccess: (rows) => {
      setShowSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(dismissSuccess, 8000);
      activity.featureUsed("flags");
      queryClient.setQueryData(["flags", userId], rows);
      haptic.success();
      setTitle("");
      setNote("");
      setOpen(false);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => flagRepo.remove(userId, id),
    onSuccess: (rows) => queryClient.setQueryData(["flags", userId], rows),
    onError: (error) => toast.error(humanizeError(error)),
  });

  const allFlags = flags.data ?? [];
  const loggedTitles = new Set(allFlags.map((flag) => flag.title.trim().toLowerCase()));

  return (
    <AppShell
      title={t("flags.title")}
      subtitle={t("flags.subtitle")}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="press size-11 rounded-full" aria-label={t("flags.addFlag")}>
              <Plus className="size-5" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t("flags.customTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="flag-title">{t("flags.whatHappened")}</Label>
                <Input
                  id="flag-title"
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder={t("flags.titlePlaceholder")}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FLAG_CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item.key)}
                    className={cn(
                      "press rounded-full border border-border px-3 py-1.5 text-sm",
                      category === item.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-note">{t("flags.detailsOptional")}</Label>
                <Textarea
                  id="flag-note"
                  maxLength={600}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-24 rounded-2xl"
                />
              </div>
              <Button
                className="press h-12 w-full rounded-2xl"
                disabled={!title.trim() || add.isPending}
                onClick={() => add.mutate(undefined)}
              >
                {t("flags.saveFlag")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <FlagsIllustration className="mx-auto mb-5 mt-1 w-40" />
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold">{t("flags.commonFlags")}</p>
            <p className="text-xs text-muted-foreground">{t("flags.tapToAdd")}</p>
          </div>
          {FLAG_SUGGESTIONS.map((suggestion) => {
            const done = loggedTitles.has(suggestion.toLowerCase());
            return (
              <button
                key={suggestion}
                type="button"
                disabled={done || add.isPending}
                aria-label={done ? t("flags.alreadyAdded", { suggestion }) : t("flags.addFlagNamed", { suggestion })}
                className="press w-full text-left disabled:cursor-default"
                onClick={() =>
                  add.mutate({
                    title: suggestion,
                    note: null,
                    category: SUGGESTION_CATEGORY[suggestion] ?? "other",
                  })
                }
              >
                <SoftCard
                  className={cn(
                    "flex items-center gap-3 transition-opacity",
                    done && "bg-coral opacity-70",
                  )}
                >
                  {done ? (
                    <Check className="size-4 shrink-0 text-on-tint" aria-hidden />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <p className={cn("text-sm", done && "text-on-tint")}>{suggestion}</p>
                </SoftCard>
              </button>
            );
          })}
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold">{t("flags.myFlags")}</p>
            <p className="text-xs text-muted-foreground">
              {allFlags.length === 0
                ? t("flags.nothingYet")
                : t("flags.savedCount", { count: allFlags.length })}
            </p>
          </div>
          {allFlags.length === 0 ? (
            <SoftCard className="bg-coral">
              <p className="font-medium text-on-tint">{t("flags.startHonest")}</p>
              <p className="mt-1 text-sm text-on-tint/75">
                {t("flags.startHonestDesc")}
              </p>
            </SoftCard>
          ) : (
            allFlags.map((flag) => (
              <SoftCard key={flag.id} className="bg-coral flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-on-tint" aria-hidden />
                <div className="flex-1">
                  <p className="font-medium text-on-tint">{flag.title}</p>
                  {flag.note ? <p className="mt-1 text-sm text-on-tint/75">{flag.note}</p> : null}
                  <p className="mt-2 text-xs text-on-tint/60">
                    <span className="uppercase">
                      {FLAG_CATEGORIES.find((item) => item.key === flag.category)?.label ?? t("flags.other")}
                    </span>
                    {flag.created_at ? ` · ${formatFlagDate(flag.created_at)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("flags.deleteFlag", { title: flag.title })}
                  className="press text-on-tint/60"
                  onClick={() => {
                    haptic.light();
                    remove.mutate(flag.id);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </SoftCard>
            ))
          )}
        </section>
      </div>
      {showSuccess && typeof document !== "undefined"
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              style={{ zIndex: 2147483647 }}
              className="fixed inset-0 isolate flex items-center justify-center overflow-hidden bg-background/85 backdrop-blur-md animate-fade-in dark:bg-background/90"
              onPointerDown={(event) => event.preventDefault()}
              onTouchMove={(event) => event.preventDefault()}
            >
              <video
                src={redFlagSuccessVideo}
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={dismissSuccess}
                className="max-h-full max-w-full bg-transparent object-contain"
                style={{ borderRadius: 0, border: "none" }}
                aria-hidden
              />
            </div>,
            document.body,
          )
        : null}
    </AppShell>
  );
}
