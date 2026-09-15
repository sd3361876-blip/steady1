import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { GuidedExerciseBar } from "@/components/GuidedExerciseBar";
import { waitForOAuthSession } from "@/lib/auth/oauthHash";
import { getCachedSession } from "@/lib/auth/session";
import { evaluateAccess } from "@/lib/subscription/trialGate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // If we landed here straight from an OAuth redirect, let supabase-js finish
    // parsing the URL fragment (and clean it up) before checking the session.
    await waitForOAuthSession();
    // Auth state comes from the cached session, never from network reachability:
    // getUser() would fail in airplane mode and bounce signed-in users to /auth.
    const session = await getCachedSession();
    if (!session?.user) throw redirect({ to: "/auth" });
    // Every launch re-evaluates trial access from the server, so closing and
    // reopening the app can never bypass the mandatory trial screen.
    const decision = await evaluateAccess(location.pathname, session.user.id);
    if (decision === "trial") throw redirect({ to: "/start-trial", replace: true });
    // App trial used up, no paid plan → paid-plan paywall, never the trial screen.
    if (decision === "paywall") throw redirect({ to: "/paywall", replace: true });
    return { user: session.user };
  },
  component: () => (
    <>
      <GuidedExerciseBar />
      <Outlet />
    </>
  ),
});
