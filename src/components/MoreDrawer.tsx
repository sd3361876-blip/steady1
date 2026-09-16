import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bug,
  CalendarClock,
  ChevronDown,
  Crown,
  FileText,
  Info,
  LogOut,
  MessageSquareHeart,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Settings,
  Share2,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateTimeField } from "@/components/DateTimeField";
import { JournalLockSetting } from "@/components/journalLock/JournalLockSetting";
import { clampToNow } from "@/lib/datetime";
import { cancelCelebration } from "@/lib/celebrate";
import { beginLogout, endLogout } from "@/lib/logoutGuard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { clearUserCache, profileRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { shareApp } from "@/lib/share";
import { PRIVACY_URL, TERMS_URL, openExternalUrl } from "@/lib/openExternal";
import { SUPPORT_EMAIL, copySupportEmail, openFeedbackEmail } from "@/lib/feedback";
import { toastOnce } from "@/lib/toastOnce";
import { cn } from "@/lib/utils";



export function MoreDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { restore, busy, isPremium } = useSubscription();
  const [resetOpen, setResetOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [redoOpen, setRedoOpen] = useState(false);
  const [noEmailOpen, setNoEmailOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => new Date().toISOString());

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileRepo.get(userId),
    enabled: Boolean(userId),
  });

  const applyDate = useMutation({
    mutationFn: async (input: string) => {
      // Never store a moment in the future, whatever the picker returned.
      const iso = clampToNow(input);
      const current = await streakRepo.ensure(userId, iso);
      return streakRepo.save(userId, {
        ...current,
        started_at: iso,
        relapse_count: current.relapse_count + 1,
      });
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["streak", userId], next);
      toastOnce("reset-date", t("reset.done"), "success");
      setDateOpen(false);
      onOpenChange(false);
    },
    onError: () => toastOnce("reset-date-error", t("reset.failed"), "error"),
  });

  const name = profile.data?.display_name ?? user?.email?.split("@")[0] ?? "Friend";

  const logOut = async () => {
    haptic.light();
    // Suppress badge/celebration side effects for the whole sign-out flow:
    // clearing the caches otherwise makes the badge engine re-announce unlocks.
    beginLogout();
    cancelCelebration();
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await clearUserCache(userId);
      await signOut();
      toastOnce("logged-out", t("toast.loggedOut"), "success");
      void navigate({ to: "/auth", replace: true });
    } catch (error) {
      endLogout();
      toastOnce("logout-error", humanizeError(error), "error");
    }
  };

  const directItems = [
    {
      icon: CalendarClock,
      label: t("drawer.resetDate"),
      onClick: () => setResetOpen(true),
    },
    {
      icon: Share2,
      label: t("drawer.invite"),
      onClick: () => void shareApp(),
    },
    {
      icon: Star,
      label: "Rate Us on Google",
      onClick: () =>
        void openExternalUrl(
          "https://play.google.com/store/apps/details?id=com.nocontacttracker.app",
        ),
    },
  ];

  const helpItems = [
    {
      icon: MessageSquareHeart,
      label: t("drawer.feedback", "Give Feedback"),
      onClick: () => {
        void (async () => {
          const opened = await openFeedbackEmail();
          if (!opened) setNoEmailOpen(true);
        })();
      },
    },
    {
      icon: Bug,
      label: t("drawer.submitBug", "Submit Bug"),
      onClick: () => {
        onOpenChange(false);
        void navigate({ to: "/submit-bug" });
      },
    },
    {
      icon: RotateCcw,
      label: t("drawer.redoOnboarding", "Redo Onboarding"),
      onClick: () => setRedoOpen(true),
    },
    {
      icon: RefreshCw,
      label: t("drawer.restore"),
      onClick: () => {
        if (!busy) void restore();
      },
    },
  ];

  const infoItems = [
    {
      icon: FileText,
      label: t("drawer.privacy"),
      onClick: () => void openExternalUrl(PRIVACY_URL),
    },
    { icon: Info, label: t("drawer.about"), onClick: () => setAboutOpen(true) },
    {
      icon: ScrollText,
      label: t("drawer.terms"),
      onClick: () => void openExternalUrl(TERMS_URL),
    },
  ];

  const logoutItem = {
    icon: LogOut,
    label: t("common.logOut"),
    onClick: () => setLogoutOpen(true),
  };

  const renderMenuItem = ({ icon: Icon, label, onClick }: (typeof directItems)[number]) => (
    <button
      key={label}
      type="button"
      onClick={() => {
        haptic.light();
        onClick();
      }}
      className={cn(
        "press flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left",
        "transition-colors hover:bg-muted active:bg-muted",
      )}
    >
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          hideClose
          className="w-[86%] max-w-xs border-r border-border bg-background p-0"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                {profile.data?.avatar_url ? (
                  <AvatarImage src={profile.data.avatar_url} alt={name} />
                ) : null}
                <AvatarFallback className="bg-mint text-on-tint">
                  {name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{name}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("common.settings")}
              onClick={() => {
                haptic.select();
                onOpenChange(false);
                void navigate({ to: "/profile" });
              }}
              className="press mt-1 flex size-10 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <Settings className="size-5" aria-hidden />
            </button>
          </div>

          <nav className="mt-6 px-3 pb-6">
            <button
              type="button"
              onClick={() => {
                haptic.light();
                onOpenChange(false);
                void navigate({ to: "/paywall" });
              }}
              className={cn(
                "press mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left",
                isPremium ? "border border-border bg-muted" : "bg-lavender text-on-tint",
              )}
            >
              <Crown className={cn("size-5", isPremium && "text-muted-foreground")} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-wide uppercase">
                  {isPremium ? "Pro Active" : "Pro"}
                </span>
                <span
                  className={cn(
                    "block text-xs",
                    isPremium ? "text-muted-foreground" : "text-on-tint/80",
                  )}
                >
                  {isPremium
                    ? "Manage or restore your subscription"
                    : "Unlock all premium features"}
                </span>
              </span>
            </button>
            {directItems.map((item, index) => (
              <div key={item.label}>
                {index > 0 ? <div className="mx-4 h-px bg-border" /> : null}
                {renderMenuItem(item)}
              </div>
            ))}

            <div className="mx-4 h-px bg-border" />
            <div className="px-4 py-3.5">
              <JournalLockSetting />
            </div>

            <div className="mx-4 h-px bg-border" />
            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="press h-auto w-full justify-between rounded-2xl px-4 py-3.5 text-left"
                >
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    HELP &amp; ACCOUNT
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      helpOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-3">
                {helpItems.map(renderMenuItem)}
              </CollapsibleContent>
            </Collapsible>

            <div className="mx-4 h-px bg-border" />
            <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="press h-auto w-full justify-between rounded-2xl px-4 py-3.5 text-left"
                >
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    INFO &amp; LEGAL
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      infoOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-3">
                {infoItems.map(renderMenuItem)}
              </CollapsibleContent>
            </Collapsible>

            <div className="mx-4 h-px bg-border" />
            {renderMenuItem(logoutItem)}
          </nav>
        </SheetContent>
      </Sheet>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reset.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("reset.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-2xl" onClick={() => setDateOpen(true)}>
              {t("reset.action")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dateOpen} onOpenChange={setDateOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("reset.pickNew")}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="reset-date">{t("reset.since")}</Label>
          <DateTimeField id="reset-date" value={newDate} disableFuture onChange={setNewDate} />
          <Button
            className="press h-12 w-full rounded-2xl"
            disabled={applyDate.isPending}
            onClick={() => applyDate.mutate(newDate)}
          >
            {t("reset.saveNewDate")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>STEADY: NO CONTACT & BREAKUP RECOVERY</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              STEADY: NO CONTACT & BREAKUP RECOVERY is your private companion for getting
              through a breakup and staying committed to your healing journey.
            </p>
            <p>
              Track your No Contact streak, journal your thoughts, monitor your progress, set
              helpful reminders, and celebrate the small wins along the way.
            </p>
            <p className="font-medium text-foreground">
              No Contact. One day at a time. One step closer to healing.
            </p>
            <p className="text-muted-foreground">{t("drawer.privacyNote")}</p>
            <Button
              variant="secondary"
              className="press h-11 w-full rounded-2xl"
              onClick={() => setAboutOpen(false)}
            >
              {t("common.close", "Close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={noEmailOpen} onOpenChange={setNoEmailOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>No Email App Found</AlertDialogTitle>
            <AlertDialogDescription>
              We couldn&apos;t find an email application on your device. You can contact us anytime
              at: {SUPPORT_EMAIL}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => {
                void (async () => {
                  const ok = await copySupportEmail();
                  toastOnce(
                    "copy-support-email",
                    ok ? "Email address copied." : "Couldn't copy the address.",
                    ok ? "success" : "error",
                  );
                })();
              }}
            >
              Copy Email Address
            </Button>
            <AlertDialogCancel className="rounded-2xl">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.logOut")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.logOutQuestion")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <Button className="rounded-2xl" onClick={() => void logOut()}>
              {t("common.logOut")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={redoOpen} onOpenChange={setRedoOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Redo Onboarding</AlertDialogTitle>
            <AlertDialogDescription>
              This will take you through the onboarding steps again so you can update your
              preferences and recovery plan. Your in-app data will remain unchanged. Do you want to
              continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={() => {
                setRedoOpen(false);
                onOpenChange(false);
                void navigate({ to: "/questionnaire", search: { redo: true } });
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
