import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, Check, LoaderCircle, Lock, ShieldCheck, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { CommitmentCanvas } from "@/components/CommitmentCanvas";
import { MilestoneIllustration } from "@/components/illustrations";
import { SoftCard } from "@/components/SoftCard";
import { DateTimeField } from "@/components/DateTimeField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { profileRepo, questionnaireRepo, streakRepo } from "@/data/repository";
import type { QuestionnaireAnswers } from "@/data/types";
import { useAuth } from "@/hooks/useAuth";
import { analytics, humanizeError } from "@/lib/analytics";
import { clampToNow, isFutureTimestamp } from "@/lib/datetime";
import { activity } from "@/lib/badgeActivity";
import { haptic } from "@/lib/native/haptics";
import { requestAppReview } from "@/lib/native/inAppReview";
import { suppressInAppMessages } from "@/lib/monitoring/inAppMessaging";
import { requestNotificationPermission, syncReminders } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/questionnaire")({
  validateSearch: (search: Record<string, unknown>): { redo?: boolean } =>
    search["redo"] === true || search["redo"] === "true" || search["redo"] === "1"
      ? { redo: true }
      : {},
  head: () => ({
    meta: [
      { title: "Your reset plan | SOLACE: BREAKUP RECOVERY" },
      {
        name: "description",
        content: "Fifteen quick steps so your no-contact plan fits your breakup.",
      },
      { property: "og:title", content: "Your reset plan | SOLACE: BREAKUP RECOVERY" },
      {
        property: "og:description",
        content: "Personalise your no-contact recovery in two minutes.",
      },
    ],
  }),
  component: Questionnaire,
});

type Answers = Partial<QuestionnaireAnswers>;

const REASON_KEYS = [
  "lied",
  "arguing",
  "disrespected",
  "cheating",
  "pulledAway",
  "differentThings",
  "drainedMe",
  "lostMyself",
] as const;

const STEPS = 16;

function Choice({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value?: string | null | undefined;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            haptic.select();
            onSelect(option);
          }}
          className={cn(
            "press soft-card rounded-3xl px-5 py-4 text-left text-base",
            value === option && "ring-2 ring-primary",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Questionnaire() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { redo } = Route.useSearch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    analytics.screen("questionnaire");
    // Keep a campaign from covering the onboarding controls.
    suppressInAppMessages(true);
    if (!userId) return;
    if (!redo) {
      void profileRepo.get(userId).then((profile) => {
        if (profile?.questionnaire_completed) void navigate({ to: "/home", replace: true });
      });
    }
    void questionnaireRepo.get(userId).then((existing) => {
      if (existing) setAnswers(existing);
    });
    return () => suppressInAppMessages(false);
  }, [userId, navigate, redo]);

  useEffect(() => {
    if (step !== 11) {
      setProcessingStage(0);
      return;
    }

    const timers = [
      window.setTimeout(() => setProcessingStage(1), 450),
      window.setTimeout(() => setProcessingStage(2), 950),
      window.setTimeout(() => setProcessingStage(3), 1450),
      window.setTimeout(() => setProcessingStage(4), 2050),
      window.setTimeout(() => {
        haptic.success();
        setStep(12);
      }, 3400),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [step]);

  const set = (patch: Answers) => setAnswers((current) => ({ ...current, ...patch }));

  // 30-day milestone: signup date + 30 days, shown on the prediction screen.
  const milestoneDate = useMemo(() => {
    const created = user?.created_at ? new Date(user.created_at) : null;
    const base = created && !Number.isNaN(created.getTime()) ? created : new Date();
    const target = new Date(base);
    target.setDate(target.getDate() + 30);
    return target.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }, [user?.created_at]);

  const advance = (patch?: Answers) => {
    // Step 0 (name) is required — reject empty and whitespace-only input.
    if (step === 0) {
      const nickname = (patch?.nickname ?? answers.nickname ?? "").trim();
      if (!nickname) {
        setNameError("Please enter your name or nickname.");
        return;
      }
      setNameError(null);
      patch = { ...patch, nickname };
    }
    // Step 5 (last contact) is required — the counter starts from it.
    if (step === 5) {
      const lastContact = patch?.last_contact_at ?? answers.last_contact_at ?? null;
      if (!lastContact || Number.isNaN(new Date(lastContact).getTime())) {
        setContactError("Please select when you last had contact.");
        return;
      }
      if (isFutureTimestamp(lastContact)) {
        setContactError("Please pick a time that isn't in the future.");
        return;
      }
      setContactError(null);
    }
    if (patch) set(patch);
    haptic.light();
    setStep((current) => Math.min(STEPS - 1, current + 1));
  };

  // Step 10 ("Biggest Goal + Commitment"): saves the goal, the commitment and
  // the optional doodle through the normal onboarding persistence, then moves on.
  const commitGoal = async () => {
    const goal = (answers.biggest_goal ?? "").trim();
    if (!goal) return;
    const patch: Answers = {
      biggest_goal: goal,
      commitment_completed: true,
      commitment_drawing: answers.commitment_drawing ?? null,
    };
    set(patch);
    haptic.success();
    if (userId) {
      try {
        await questionnaireRepo.save(userId, patch);
      } catch (error) {
        // Answers are cached locally and sync later — never block onboarding.
        analytics.error(error, { stage: "questionnaire_commitment" });
      }
    }
    setStep((current) => Math.min(STEPS - 1, current + 1));
  };

  // Rating screen: opens the Google Play in-app review sheet, then continues
  // regardless of whether it appeared, was dismissed or a review was left.
  const rateAndContinue = async () => {
    setReviewing(true);
    try {
      await requestAppReview();
    } finally {
      setReviewing(false);
      advance();
    }
  };

  const finish = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const nickname = (answers.nickname ?? "").trim();
      if (!nickname) {
        setSaving(false);
        setStep(0);
        setNameError("Please enter your name or nickname.");
        return;
      }
      if (!answers.last_contact_at || Number.isNaN(new Date(answers.last_contact_at).getTime())) {
        setSaving(false);
        setStep(5);
        setContactError("Please select when you last had contact.");
        return;
      }
      const lastContactAt = clampToNow(answers.last_contact_at);
      // "Under 18" is no longer an allowed answer.
      const ageRange = answers.age_range === "Under 18" ? null : (answers.age_range ?? null);
      await questionnaireRepo.save(userId, {
        ...answers,
        nickname,
        last_contact_at: lastContactAt,
        age_range: ageRange,
        completed: true,
      });
      const profile = await profileRepo.update(userId, {
        questionnaire_completed: true,
        // Marks this user as onboarded under the mandatory free-trial flow.
        trial_flow_required: true,
        display_name: nickname,
        notifications_enabled: Boolean(answers.wants_reminders),
      });
      // The saved "last contact" moment is the single source of truth for the counter.
      const startedAt = lastContactAt;
      const streak = await streakRepo.ensure(userId, startedAt);
      if (streak.started_at !== startedAt) {
        await streakRepo.setStart(userId, streak, startedAt);
      }
      if (answers.wants_reminders) {
        // Never let a stalled native permission dialog block completion —
        // on some devices this promise simply never settles.
        try {
          const granted = await Promise.race([
            requestNotificationPermission(),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000)),
          ]);
          if (granted) {
            await Promise.race([
              syncReminders({ enabled: true }),
              new Promise<void>((resolve) => setTimeout(resolve, 5000)),
            ]);
          }
        } catch (error) {
          analytics.error(error, { stage: "questionnaire_reminders" });
        }
      }
      queryClient.setQueryData(["profile", userId], profile);
      queryClient.setQueryData(["streak", userId], streak);
      void queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] !== "profile",
      });
      haptic.success();
      analytics.track("questionnaire_completed");
      activity.onboardingDone();
      activity.profileSetupDone();
      // Eligible users must activate their free trial before entering the app;
      // the trial screen forwards everyone else straight to Home.
      void navigate({ to: "/start-trial", replace: true });
    } catch (error) {
      analytics.error(error, { stage: "questionnaire" });
      toast.error(humanizeError(error));
      // Never strand the user on the last step: the answers are cached
      // locally and will sync, so continue into the app regardless.
      void navigate({ to: "/home", replace: true });
    } finally {
      setSaving(false);
    }
  };

  const reasons = answers.reasons ?? [];
  const REASONS = REASON_KEYS.map((key) => t(`questionnaire.reasons.${key}`));

  const content = useMemo(() => {
    switch (step) {
      case 0:
        return {
          title: t("questionnaire.step0.title"),
          hint: t("questionnaire.step0.hint"),
          body: (
            <div className="space-y-3">
              <Label htmlFor="nickname">{t("questionnaire.step0.label")}</Label>
              <Input
                id="nickname"
                maxLength={40}
                value={answers.nickname ?? ""}
                onChange={(event) => {
                  setNameError(null);
                  set({ nickname: event.target.value });
                }}
                className="h-13 rounded-2xl"
                placeholder={t("questionnaire.step0.placeholder")}
                aria-invalid={Boolean(nameError)}
                required
              />
              {nameError ? (
                <p role="alert" className="text-sm text-destructive">
                  {nameError}
                </p>
              ) : null}
            </div>
          ),
        };
      case 1:
        return {
          title: t("questionnaire.step1.title"),
          hint: t("questionnaire.step1.hint"),
          body: (
            <Choice
              options={t("questionnaire.step1.options", { returnObjects: true }) as string[]}
              value={answers.age_range}
              onSelect={(age_range) => set({ age_range })}
            />
          ),
        };
      case 2:
        return {
          title: t("questionnaire.step2.title"),
          hint: t("questionnaire.step2.hint"),
          body: (
            <Choice
              options={t("questionnaire.step2.options", { returnObjects: true }) as string[]}
              value={answers.gender}
              onSelect={(gender) => set({ gender })}
            />
          ),
        };
      case 3:
        return {
          title: t("questionnaire.step3.title"),
          hint: t("questionnaire.step3.hint"),
          body: (
            <Choice
              options={t("questionnaire.step3.options", { returnObjects: true }) as string[]}
              value={answers.relationship_length}
              onSelect={(relationship_length) => set({ relationship_length })}
            />
          ),
        };
      case 4:
        return {
          title: t("questionnaire.step4.title"),
          hint: t("questionnaire.step4.hint"),
          body: (
            <Choice
              options={t("questionnaire.step4.options", { returnObjects: true }) as string[]}
              value={answers.who_ended}
              onSelect={(who_ended) => set({ who_ended })}
            />
          ),
        };
      case 5:
        return {
          title: t("questionnaire.step5.title"),
          hint: t("questionnaire.step5.hint"),
          body: (
            <div className="space-y-3">
              <Label htmlFor="last-contact">
                {t("questionnaire.step5.label")}{" "}
                <span aria-hidden className="text-destructive">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </Label>
              <DateTimeField
                id="last-contact"
                value={answers.last_contact_at ?? null}
                invalid={Boolean(contactError)}
                disableFuture
                onChange={(iso) => {
                  setContactError(null);
                  set({ last_contact_at: iso });
                }}
              />
              {contactError ? (
                <p role="alert" className="text-sm text-destructive">
                  {contactError}
                </p>
              ) : null}
              <button
                type="button"
                className="press text-sm text-primary"
                onClick={() => {
                  setContactError(null);
                  set({ last_contact_at: new Date().toISOString() });
                }}
              >
                {t("questionnaire.step5.justNow")}
              </button>
            </div>
          ),
        };
      case 6:
        return {
          title: t("questionnaire.step6.title"),
          hint: t("questionnaire.step6.hint"),
          body: (
            <div className="flex flex-wrap gap-2">
              {REASONS.map((reason) => {
                const active = reasons.includes(reason);
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      haptic.select();
                      set({
                        reasons: active
                          ? reasons.filter((item) => item !== reason)
                          : [...reasons, reason],
                      });
                    }}
                    className={cn(
                      "press rounded-full border border-border px-4 py-2 text-sm",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card",
                    )}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          ),
        };
      case 7:
        return {
          title: t("questionnaire.step7.title"),
          hint: t("questionnaire.step7.hint"),
          body: (
            <Choice
              options={t("questionnaire.step7.options", { returnObjects: true }) as string[]}
              value={answers.checks_social}
              onSelect={(checks_social) => set({ checks_social })}
            />
          ),
        };
      case 8:
        return {
          title: t("questionnaire.step8.title"),
          hint: t("questionnaire.step8.hint"),
          body: (
            <div className="space-y-6 py-4">
              <p className="text-center text-5xl font-semibold tabular-nums">
                {answers.difficulty_today ?? 5}
              </p>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[answers.difficulty_today ?? 5]}
                onValueChange={([value]) => set({ difficulty_today: value ?? 5 })}
              />
            </div>
          ),
        };
      case 9: {
        const goal = (answers.biggest_goal ?? "").trim();
        return {
          title: t("questionnaire.step9.title"),
          hint: t("questionnaire.step9.hint"),
          body: (
            <div className="space-y-5">
              <Textarea
                maxLength={280}
                value={answers.biggest_goal ?? ""}
                onChange={(event) => set({ biggest_goal: event.target.value })}
                placeholder={t("questionnaire.step9.placeholder")}
                className="min-h-32 rounded-3xl"
              />
              {goal ? (
                <div className="animate-step-in space-y-5">
                  <SoftCard className="bg-sky">
                    <p className="text-xs font-medium tracking-wide text-on-tint/80 uppercase">
                      {t("questionnaire.step9.workingToward")}
                    </p>
                    <p className="mt-2 text-base leading-snug text-on-tint">{goal}</p>
                  </SoftCard>
                  <div className="space-y-2">
                    <p className="text-base font-semibold">
                      {t("questionnaire.step9.commitPrompt")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("questionnaire.step9.commitHint")}
                    </p>
                    <CommitmentCanvas
                      clearLabel={t("questionnaire.step9.clearDrawing")}
                      onChange={(dataUrl) => set({ commitment_drawing: dataUrl })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ),
        };
      }
      case 10: {
        // "Goal Achievement / Personalized Prediction" — shown after the
        // commitment step, using the saved name, goal and signup date.
        const name = (answers.nickname ?? "").trim();
        const goal = (answers.biggest_goal ?? "").trim();
        return {
          title: t("questionnaire.milestone.title", { name: name || "Friend" }),
          hint: t("questionnaire.milestone.encouragement"),
          body: (
            <div className="space-y-5">
              <MilestoneIllustration className="mx-auto h-28 w-48" />
              <SoftCard className="bg-sky text-center">
                <p className="text-base leading-snug font-semibold text-on-tint">
                  {t("questionnaire.milestone.milestoneLine", { date: milestoneDate })}
                </p>
              </SoftCard>
              {goal ? (
                <SoftCard>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("questionnaire.step9.workingToward")}
                  </p>
                  <p className="mt-2 text-base leading-snug">{goal}</p>
                </SoftCard>
              ) : null}
            </div>
          ),
        };
      }
      case 11: {
        const checklist = [
          t("questionnaire.processing.goal"),
          t("questionnaire.processing.startingPoint"),
          t("questionnaire.processing.journey"),
        ];
        return {
          title: t("questionnaire.processing.title"),
          hint: t("questionnaire.processing.hint"),
          body: (
            <div className="space-y-6" aria-live="polite">
              <div className="space-y-3">
                {checklist.map((label, index) => {
                  const complete = processingStage > index;
                  return (
                    <div
                      key={label}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 transition-all duration-300",
                        complete ? "translate-y-0 opacity-100" : "translate-y-1 opacity-45",
                      )}
                    >
                      {complete ? (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-4" strokeWidth={3} aria-hidden />
                        </span>
                      ) : (
                        <LoaderCircle className="size-7 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                      )}
                      <span className="font-medium">{label}</span>
                    </div>
                  );
                })}
              </div>

              <div
                className={cn(
                  "text-center transition-all duration-500",
                  processingStage >= 4 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                )}
              >
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Star className="size-7 fill-current" aria-hidden />
                  <span className="text-3xl font-semibold">4.9</span>
                </div>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {t("questionnaire.processing.trustedBy")}
                </p>
              </div>
            </div>
          ),
        };
      }
      case 12:
        // "Would you rate Steady?" — optional, never incentivised. Both
        // buttons continue to the next onboarding screen.
        return {
          title: t("questionnaire.rate.title"),
          hint: t("questionnaire.rate.hint"),
          body: (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-1 text-primary">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star key={index} className="size-8 fill-current" aria-hidden />
                ))}
              </div>
              <div className="space-y-3">
                <Button
                  className="press h-13 w-full rounded-2xl text-base"
                  disabled={reviewing}
                  onClick={() => void rateAndContinue()}
                >
                  {t("questionnaire.rate.cta")}
                </Button>
                <Button
                  variant="ghost"
                  className="press h-13 w-full rounded-2xl"
                  disabled={reviewing}
                  onClick={() => advance()}
                >
                  {t("questionnaire.rate.later")}
                </Button>
              </div>
            </div>
          ),
        };
      case 13: {
        // "PRIVACY / NO-ADS / TRUST" — informational, Continue advances.
        const points = [
          {
            icon: <Lock className="size-5" aria-hidden />,
            title: t("questionnaire.privacy.privateTitle"),
            body: t("questionnaire.privacy.privateBody"),
          },
          {
            icon: <Ban className="size-5" aria-hidden />,
            title: t("questionnaire.privacy.noAdsTitle"),
            body: t("questionnaire.privacy.noAdsBody"),
          },
          {
            icon: <ShieldCheck className="size-5" aria-hidden />,
            title: t("questionnaire.privacy.dataTitle"),
            body: t("questionnaire.privacy.dataBody"),
          },
        ];
        return {
          title: t("questionnaire.privacy.title"),
          hint: t("questionnaire.privacy.hint"),
          body: (
            <div className="space-y-3">
              {points.map((point) => (
                <SoftCard key={point.title}>
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky text-on-tint">
                      {point.icon}
                    </span>
                    <div>
                      <p className="font-semibold">{point.title}</p>
                      <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                        {point.body}
                      </p>
                    </div>
                  </div>
                </SoftCard>
              ))}
            </div>
          ),
        };
      }
      case 14:
        return {
          title: t("questionnaire.step10.title"),
          hint: t("questionnaire.step10.hint"),
          body: (
            <div className="space-y-3">
              <Choice
                options={[t("questionnaire.step10.yes"), t("questionnaire.step10.no")]}
                value={
                  answers.wants_reminders === null || answers.wants_reminders === undefined
                    ? null
                    : answers.wants_reminders
                      ? t("questionnaire.step10.yes")
                      : t("questionnaire.step10.no")
                }
                onSelect={(option) =>
                  set({ wants_reminders: option === t("questionnaire.step10.yes") })
                }
              />
              <SoftCard className="bg-sky">
                <p className="text-sm text-on-tint">{t("questionnaire.step10.note")}</p>
              </SoftCard>
            </div>
          ),
        };
      default:
        return {
          title: t("questionnaire.step11.title"),
          hint: t("questionnaire.step11.hint"),
          body: (
            <Choice
              options={t("questionnaire.step11.options", { returnObjects: true }) as string[]}
              value={answers.referral_source}
              onSelect={(referral_source) => set({ referral_source })}
            />
          ),
        };
    }
  }, [step, answers, reasons, t, nameError, contactError, milestoneDate, processingStage, reviewing]);

  const canContinue = (() => {
    switch (step) {
      case 0:
        return Boolean((answers.nickname ?? "").trim());
      case 1:
        return Boolean(answers.age_range);
      case 2:
        return Boolean(answers.gender);
      case 3:
        return Boolean(answers.relationship_length);
      case 4:
        return Boolean(answers.who_ended);
      case 5:
        return Boolean(
          answers.last_contact_at &&
            !Number.isNaN(new Date(answers.last_contact_at).getTime()) &&
            !isFutureTimestamp(answers.last_contact_at),
        );
      case 7:
        return Boolean(answers.checks_social);
      case 9:
        return Boolean((answers.biggest_goal ?? "").trim());
      case 14:
        return answers.wants_reminders !== null && answers.wants_reminders !== undefined;
      default:
        return true;
    }
  })();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {step + 1}/{STEPS}
        </span>
      </div>

      <div key={step} className="animate-step-in mt-10 flex-1">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
          {content.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{content.hint}</p>
        <div className="mt-8">{content.body}</div>
      </div>

      {step !== 11 && step !== 12 ? <div className="mt-8 flex items-center gap-3">
        {step > 0 ? (
          <Button
            variant="ghost"
            className="press h-13 rounded-2xl"
            onClick={() => setStep((current) => current - 1)}
          >
            {t("common.back")}
          </Button>
        ) : null}
        <Button
          className="press h-13 flex-1 rounded-2xl text-base"
          disabled={saving || !canContinue}
          onClick={() => {
            if (step === STEPS - 1) return void finish();
            if (step === 9) return void commitGoal();
            advance();
          }}
        >
          {step === STEPS - 1
            ? t("questionnaire.start")
            : step === 9
              ? t("questionnaire.step9.commitCta")
              : t("questionnaire.continue")}
        </Button>
      </div> : null}
    </div>
  );
}
