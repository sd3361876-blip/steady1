import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { lazy, Suspense, useEffect } from "react";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { JournalLockGate } from "@/components/journalLock/JournalLockGate";
import { journalRepo } from "@/data/repository";
import journalBanner from "@/assets/journal-banner.jpg";

const importSuccessAnimation = () => import("@/components/SuccessLottieAnimation");
const SuccessLottieAnimation = lazy(importSuccessAnimation);

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal | SOLACE: BREAKUP RECOVERY" },
      { name: "description", content: "A private place to empty your head, one day at a time." },
      { property: "og:title", content: "Journal | SOLACE: BREAKUP RECOVERY" },
      { property: "og:description", content: "Private daily entries that stay on your device first." },
    ],
  }),
  component: () => {
    const { t } = useTranslation();
    // Warm the animation chunk so the overlay shows instantly on the first save.
    useEffect(() => {
      void importSuccessAnimation().catch(() => {});
    }, []);
    return (
      <JournalLockGate>
      <ActivityListScreen
        title={t("journal.title")}
        subtitle={t("journal.subtitle")}
        banner={
          <img
            src={journalBanner}
            alt=""
            loading="eager"
            decoding="async"
            className="h-48 w-full object-cover"
          />
        }
        cacheKey="journal"
        repo={journalRepo}
        mainField="body"
        mainPlaceholder={t("journal.mainPlaceholder")}
        noteField="title"
        notePlaceholder={t("journal.notePlaceholder")}
        multiline
        emptyText={t("journal.emptyText")}
        successAnimation={({ onComplete }) => (
          <Suspense fallback={null}>
            <SuccessLottieAnimation onComplete={onComplete} />
          </Suspense>
        )}
        />
      </JournalLockGate>
    );
  },
});
