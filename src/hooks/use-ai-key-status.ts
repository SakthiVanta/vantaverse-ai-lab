"use client";

import { useCallback, useEffect, useState } from "react";

export type AiKeyStatus = { hasKey: boolean; last4: string | null };

export function useAiKeyStatus() {
  const [status, setStatus] = useState<AiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/onboarding/ai-key", { cache: "no-store" });
        const data = res.ok
          ? ((await res.json()) as AiKeyStatus)
          : { hasKey: false, last4: null };
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ hasKey: false, last4: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  return { status, loading, refresh };
}
