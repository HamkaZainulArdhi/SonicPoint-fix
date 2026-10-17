"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Satu hook salin-ke-clipboard untuk semua tombol "Salin" di web.
 * Mengembalikan `copied` (reset otomatis) + `copy(value)`.
 */
export function useCopy(timeoutMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), timeoutMs);
      } catch {
        // Clipboard tidak tersedia (http / izin browser) — tidak ada efek.
      }
    },
    [timeoutMs],
  );

  return { copied, copy };
}
