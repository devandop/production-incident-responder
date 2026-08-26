"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key) return;
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_exceptions: true,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { posthog };
