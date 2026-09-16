import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import {
  getCachedEntitlement,
  loadOfferings,
  presentPaywall,
  purchasePackageById,
  refreshEntitlement,
  restorePurchases,
  setEntitlementUser,
  type EntitlementState,
  type OfferingPackage,
} from "@/lib/subscription/revenuecat";

type OfferingsState =
  | { status: "loading" }
  | { status: "ok"; packages: OfferingPackage[] }
  | { status: "unavailable" }
  | { status: "error"; message: string };

type SubscriptionValue = {
  entitlement: EntitlementState | null;
  isPremium: boolean;
  busy: boolean;
  subscribe: () => Promise<void>;
  restore: () => Promise<void>;
  /** Re-reads the entitlement from RevenueCat (e.g. after a server-side grant). */
  refresh: () => Promise<void>;
  offerings: OfferingsState;
  reloadOfferings: () => Promise<void>;
  purchase: (packageId: string) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionValue>({
  entitlement: null,
  isPremium: false,
  busy: false,
  subscribe: async () => {},
  restore: async () => {},
  refresh: async () => {},
  offerings: { status: "loading" },
  reloadOfferings: async () => {},
  purchase: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [entitlement, setEntitlement] = useState<EntitlementState | null>(null);
  const [busy, setBusy] = useState(false);
  const [offerings, setOfferings] = useState<OfferingsState>({ status: "loading" });

  // Entitlement state is per Supabase user: switching accounts drops the
  // previous user's state before anything is read for the new one.
  useEffect(() => {
    let cancelled = false;
    setEntitlement(null);
    void (async () => {
      await setEntitlementUser(userId ?? null);
      if (cancelled || !userId) return;
      const cached = await getCachedEntitlement();
      if (!cancelled) setEntitlement(cached);
      const fresh = await refreshEntitlement();
      if (!cancelled) setEntitlement(fresh);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const reloadOfferings = useCallback(async () => {
    setOfferings({ status: "loading" });
    const result = await loadOfferings();
    setOfferings(
      result.status === "ok"
        ? { status: "ok", packages: result.packages }
        : result.status === "error"
          ? { status: "error", message: result.message }
          : { status: "unavailable" },
    );
  }, []);

  useEffect(() => {
    void reloadOfferings();
  }, [reloadOfferings]);

  const handleOutcome = useCallback(
    (result: Awaited<ReturnType<typeof purchasePackageById>>) => {
      if (result.status === "success") {
        setEntitlement(result.state);
        haptic.success();
        toast.success("Welcome to Pro. Everything is unlocked.");
      } else if (result.status === "cancelled") {
        toast("No worries — the free tools are still yours.");
      } else if (result.status === "pending") {
        toast("Purchase pending. We'll unlock Pro as soon as it clears.");
      } else if (result.status === "unavailable") {
        toast(
          isNative()
            ? "That plan isn't available right now."
            : "Purchases run in the Android build — this preview shows the Pro screen only.",
        );
      } else {
        toast.error(result.message);
      }
    },
    [],
  );

  const purchase = useCallback(
    async (packageId: string) => {
      setBusy(true);
      try {
        const result = await purchasePackageById(packageId);
        handleOutcome(result);
        if (result.status === "success" || result.status === "pending") {
          setEntitlement(await refreshEntitlement());
        }
      } catch (error) {
        analytics.error(error, { stage: "purchase" });
        toast.error("We couldn't reach the store. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [handleOutcome],
  );

  const subscribe = useCallback(async () => {
    setBusy(true);
    try {
      const result = await presentPaywall();
      if (result.status === "success") {
        setEntitlement(result.state);
        haptic.success();
        toast.success("Welcome to Premium. Your trial has started.");
      } else if (result.status === "cancelled") {
        toast("No worries — the free tools are still yours.");
      } else if (result.status === "pending") {
        toast("Purchase pending. We'll unlock Premium as soon as it clears.");
      } else if (result.status === "unavailable") {
        toast(
          isNative()
            ? "No subscription offering is available right now."
            : "Purchases run in the Android build — this preview shows the paywall UI only.",
        );
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      analytics.error(error, { stage: "subscribe" });
      toast.error("We couldn't reach the store. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    // Called after a server-side grant, so the native cache must be dropped.
    setEntitlement(await refreshEntitlement({ invalidate: true }));
  }, []);

  const restore = useCallback(async () => {
    setBusy(true);
    try {
      const result = await restorePurchases();
      if (result.status === "success") {
        setEntitlement(result.state);
        toast.success(result.state.isPremium ? "Premium restored." : "No previous purchases found.");
      } else if (result.status === "unavailable") {
        toast("Restore runs in the Android build.");
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        entitlement,
        isPremium: Boolean(entitlement?.isPremium),
        busy,
        subscribe,
        restore,
        refresh,
        offerings,
        reloadOfferings,
        purchase,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);