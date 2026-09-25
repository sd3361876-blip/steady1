import i18n from "i18next";
import { initReactI18next, setI18n } from "react-i18next";

import { resources } from "./resources";

/** Deep lookup used so a raw key is never rendered, even pre-init. */
function lookupEnglish(key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = resources.en.translation;
  for (const part of parts) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

if (!i18n.isInitialized) {
  // Synchronous init (initImmediate: false) so the very first render already
  // has copy — otherwise components would flash raw keys. English only.
  const initOptions = {
    resources,
    lng: "bn-IN",
    fallbackLng: "en",
    supportedLngs: ["en", "bn-IN"],
    nonExplicitSupportedLngs: true,
    initImmediate: false,
    react: { useSuspense: false },
    // A caller-supplied default (t("a.b", "Nice Label")) always wins over the
    // raw key — otherwise the UI renders things like "redoOnboarding".
    parseMissingKeyHandler: (key: string, defaultValue?: string) =>
      defaultValue ?? lookupEnglish(key) ?? key.split(".").pop() ?? key,
    interpolation: { escapeValue: false },
    returnNull: false,
  };

  void i18n
  .use(initReactI18next)
  .init(initOptions as Parameters<typeof i18n.init>[0])
  .then(() => {
    console.log("STEADY i18n language:", i18n.language);
  });

  // A code-split chunk can evaluate its own copy of react-i18next before this
  // module runs; setting the default instance makes evaluation order irrelevant.
  setI18n(i18n);
}

export default i18n;
