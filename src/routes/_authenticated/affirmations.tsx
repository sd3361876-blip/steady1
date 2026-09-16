import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import affirmationsBanner from "@/assets/page-banners/affirmations.jpg";
import { PageImageBanner } from "@/components/PageImageBanner";
import { affirmationRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/affirmations")({
  head: () => ({
    meta: [
      { title: "Affirmations | SOLACE: BREAKUP RECOVERY" },
      { name: "description", content: "Write the lines you want to hear on the hard days." },
      { property: "og:title", content: "Affirmations | SOLACE: BREAKUP RECOVERY" },
      { property: "og:description", content: "Your own words, saved for the moments you need them." },
    ],
  }),
  component: () => {
    const { t } = useTranslation();
    return (
      <ActivityListScreen
        title={t("affirmations.title")}
        subtitle={t("affirmations.subtitle")}
        banner={<PageImageBanner src={affirmationsBanner} className="mb-0" />}
        cacheKey="affirmations"
        repo={affirmationRepo}
        mainField="body"
        mainPlaceholder={t("affirmations.mainPlaceholder")}
        multiline
        suggestions={t("affirmations.suggestions", { returnObjects: true }) as string[]}
        emptyText={t("affirmations.emptyText")}
      />
    );
  },
});
