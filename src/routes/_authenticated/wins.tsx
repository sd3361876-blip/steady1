import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import winsBanner from "@/assets/page-banners/wins.jpg";
import { PageImageBanner } from "@/components/PageImageBanner";
import { SoftCard } from "@/components/SoftCard";
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
import { localDayKey, winRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { analytics, humanizeError } from "@/lib/analytics";
import { celebrate } from "@/lib/celebrate";
import { WIN_SUGGESTIONS } from "@/lib/content";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/wins")({
  head: () => ({
    meta: [
      { title: "Wins | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Celebrate the small wins that add up to a life without them.",
      },
      { property: "og:title", content: "Wins | SOLACE: BREAKUP RECOVERY" },
      { property: "og:description", content: "Proof that you are moving forward." },
    ],
  }),
  component: WinsScreen,
});

function WinsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    analytics.screen("wins");
  }, []);

  const wins = useQuery({
    queryKey: ["wins", userId],
    queryFn: () => winRepo.list(userId),
    enabled: Boolean(userId),
  });

  const add = useMutation({
    mutationFn: async (input: string | { title: string; note: string | null }) => {
      const payload = typeof input === "string" ? { title: input, note: null } : input;
      return winRepo.save(userId, {
        title: payload.title.trim(),
        note: payload.note?.trim() || null,
      });
    },
    onSuccess: (rows) => {
      activity.featureUsed("wins");
      queryClient.setQueryData(["wins", userId], rows);
      haptic.success();
      void celebrate();
      setTitle("");
      setNote("");
      setOpen(false);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => winRepo.remove(userId, id),
    onSuccess: (rows) => queryClient.setQueryData(["wins", userId], rows),
    onError: (error) => toast.error(humanizeError(error)),
  });

  const allWins = wins.data ?? [];
  const today = localDayKey();
  const todaysWins = allWins.filter((win) => win.achieved_on === today);
  const earlierWins = allWins.filter((win) => win.achieved_on !== today);
  const loggedTitlesToday = new Set(
    todaysWins.map((win) => win.title.trim().toLowerCase()),
  );

  const handleDelete = (id: string, title: string) => {
    haptic.light();
    remove.mutate(id);
    void title;
  };

  return (
    <AppShell
      title={t("wins.title")}
      subtitle={t("wins.subtitle")}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="press size-11 rounded-full" aria-label={t("wins.addWin")}>
              <Plus className="size-5" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t("wins.customTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="win-title">{t("wins.whatWentWell")}</Label>
                <Input
                  id="win-title"
                  maxLength={120}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder={t("wins.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="win-note">{t("wins.howFeelOptional")}</Label>
                <Textarea
                  id="win-note"
                  maxLength={600}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-24 rounded-2xl"
                />
              </div>
              <Button
                className="press h-12 w-full rounded-2xl"
                disabled={!title.trim() || add.isPending}
                onClick={() => add.mutate({ title, note })}
              >
                {t("wins.celebrateIt")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <PageImageBanner src={winsBanner} />
      <div className="space-y-6">
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold">{t("wins.quickWins")}</p>
            <p className="text-xs text-muted-foreground">{t("wins.tapToLog")}</p>
          </div>
          {WIN_SUGGESTIONS.map((suggestion) => {
            const done = loggedTitlesToday.has(suggestion.toLowerCase());
            return (
              <button
                key={suggestion}
                type="button"
                disabled={done || add.isPending}
                aria-label={done ? t("wins.alreadyLogged", { suggestion }) : t("wins.logWinNamed", { suggestion })}
                className="press w-full text-left disabled:cursor-default"
                onClick={() => add.mutate(suggestion)}
              >
                <SoftCard
                  className={`flex items-center gap-3 transition-opacity ${done ? "bg-mint opacity-70" : ""}`}
                >
                  {done ? (
                    <Check className="size-4 shrink-0 text-on-tint" aria-hidden />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <p className={`text-sm ${done ? "text-on-tint" : ""}`}>{suggestion}</p>
                </SoftCard>
              </button>
            );
          })}
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold">{t("wins.todaysWins")}</p>
            <p className="text-xs text-muted-foreground">
              {todaysWins.length === 0
                ? t("wins.nothingYet")
                : t("wins.loggedTodayCount", { count: todaysWins.length })}
            </p>
          </div>
          {todaysWins.length === 0 ? (
            <SoftCard className="bg-mint">
              <p className="font-medium text-on-tint">{t("wins.firstWinHere")}</p>
              <p className="mt-1 text-sm text-on-tint/75">
                {t("wins.firstWinDesc")}
              </p>
            </SoftCard>
          ) : (
            todaysWins.map((win) => <WinRow key={win.id} win={win} onDelete={handleDelete} />)
          )}
        </section>

        {earlierWins.length > 0 ? (
          <section className="space-y-3">
            <p className="text-sm font-semibold">{t("wins.earlierWins")}</p>
            {earlierWins.map((win) => (
              <WinRow key={win.id} win={win} onDelete={handleDelete} />
            ))}
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function WinRow({
  win,
  onDelete,
}: {
  win: { id: string; title: string; note: string | null; achieved_on: string };
  onDelete: (id: string, title: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <SoftCard className="bg-mint flex items-start gap-3">
      <Check className="mt-0.5 size-4 shrink-0 text-on-tint" aria-hidden />
      <div className="flex-1">
        <p className="font-medium text-on-tint">{win.title}</p>
        {win.note ? <p className="mt-1 text-sm text-on-tint/75">{win.note}</p> : null}
        <p className="mt-2 text-xs text-on-tint/60">{win.achieved_on}</p>
      </div>
      <button
        type="button"
        aria-label={t("wins.deleteWin", { title: win.title })}
        className="press text-on-tint/60"
        onClick={() => onDelete(win.id, win.title)}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </SoftCard>
  );
}
