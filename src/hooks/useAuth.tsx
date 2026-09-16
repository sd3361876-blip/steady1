import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { getCachedSession } from "@/lib/auth/session";
import { clearCrashUser, setCrashUser } from "@/lib/monitoring/crashlytics";
import { syncNotificationDeviceState } from "@/lib/notifications/deviceState";
import { deactivatePushToken, syncPushRegistration } from "@/lib/notifications/push";
import { isOnline } from "@/lib/offline/network";
import { identifyUser, logOutRevenueCat } from "@/lib/subscription/revenuecat";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Set only by an explicit sign-out so a failed token refresh while offline
  // can never drop the cached session.
  const signingOut = useRef(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession && !signingOut.current && !isOnline()) {
        // Offline refresh failure — keep the user signed in with cached data.
        setLoading(false);
        return;
      }
      setSession(nextSession);
      setLoading(false);
      if (nextSession?.user) {
        // A live session means we're no longer in a sign-out flow.
        endLogout();
        setCrashUser(nextSession.user.id);
        analytics.track("login", { provider: nextSession.user.app_metadata?.provider ?? "unknown" });
        void identifyUser(nextSession.user.id, nextSession.user.email ?? undefined);
        void syncPushRegistration(nextSession.user.id);
        void syncNotificationDeviceState(nextSession.user.id);
      }
    });

    // getCachedSession() falls back to the persisted token when a refresh
    // fails offline, so relaunching without a connection keeps the user in.
    void getCachedSession().then((current) => {
      if (current) {
        setSession(current);
        setCrashUser(current.user.id);
        void syncPushRegistration(current.user.id);
        void syncNotificationDeviceState(current.user.id);
      } else if (!isOnline()) {
        // No network and nothing cached — don't wipe an in-memory session.
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    // Safety net: never leave the splash spinning if the session read stalls
    // (e.g. a hung token refresh while offline).
    const settle = window.setTimeout(() => setLoading(false), 3000);

    return () => {
      window.clearTimeout(settle);
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        signingOut.current = true;
        analytics.track("logout");
        await deactivatePushToken(session?.user?.id ?? null);
        await logOutRevenueCat();
        await supabase.auth.signOut();
        clearCrashUser();
        setSession(null);
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);