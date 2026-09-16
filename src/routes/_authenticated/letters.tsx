import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import lettersBanner from "@/assets/page-banners/unsent.jpg";
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
import { letterRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { analytics, humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/letters")({
  head: () => ({
    meta: [
      { title: "Unsent letters | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Write everything you want to say to your ex — privately, and never send it.",
      },
      { property: "og:title", content: "Unsent letters | SOLACE: BREAKUP RECOVERY" },
      { property: "og:description", content: "Say it all here instead of in their inbox." },
    ],
  }),
  component: LettersScreen,
});

function LettersScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    analytics.screen("letters");
  }, []);

  const letters = useQuery({
    queryKey: ["letters", userId],
    queryFn: () => letterRepo.list(userId),
    enabled: Boolean(userId),
  });

  const add = useMutation({
    mutationFn: async () =>
      letterRepo.save(userId, { title: title.trim() || null, body: body.trim(), emotion: null }),
    onSuccess: (rows) => {
      activity.featureUsed("letters");
      queryClient.setQueryData(["letters", userId], rows);
      haptic.success();
      toast(t("letters.savedToast"));
      setTitle("");
      setBody("");
      setOpen(false);
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => letterRepo.remove(userId, id),
    onSuccess: (rows) => queryClient.setQueryData(["letters", userId], rows),
    onError: (error) => toast.error(humanizeError(error)),
  });

  return (
    <AppShell
      title={t("letters.title")}
      subtitle={t("letters.subtitle")}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="press size-11 rounded-full" aria-label={t("letters.writeLetter")}>
              <Plus className="size-5" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>{t("letters.writeLetter")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="letter-title">{t("letters.titleOptional")}</Label>
                <Input
                  id="letter-title"
                  maxLength={80}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-2xl"
                  placeholder={t("letters.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="letter-body">{t("letters.yourLetter")}</Label>
                <Textarea
                  id="letter-body"
                  maxLength={5000}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-48 rounded-2xl"
                  placeholder={t("letters.bodyPlaceholder")}
                />
              </div>
              <Button
                className="press h-12 w-full rounded-2xl"
                disabled={!body.trim() || add.isPending}
                onClick={() => add.mutate()}
              >
                {t("letters.saveLetter")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <PageImageBanner src={lettersBanner} />
      <div className="space-y-3">
        {(letters.data ?? []).length === 0 ? (
          <SoftCard className="bg-lavender">
            <p className="font-medium text-on-tint">{t("letters.nothingWritten")}</p>
            <p className="mt-1 text-sm text-on-tint/75">
              {t("letters.nothingWrittenDesc")}
            </p>
          </SoftCard>
        ) : (
          (letters.data ?? []).map((letter) => (
            <SoftCard key={letter.id} className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-medium">{letter.title ?? t("letters.untitled")}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                  {letter.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {letter.emotion ? `${letter.emotion} · ` : ""}
                  {new Date(letter.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("letters.deleteLetter")}
                className="press text-muted-foreground"
                onClick={() => {
                  haptic.light();
                  remove.mutate(letter.id);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </SoftCard>
          ))
        )}
      </div>
    </AppShell>
  );
}
