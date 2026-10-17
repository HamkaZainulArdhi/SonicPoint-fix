import type { ReactNode } from "react";
import type { FeatureIconKey } from "@/lib/landing";

/** Ikon garis 24px — bahasa visual diagram teknis (tanpa isi/fill). */
function Line({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/* ── Ikon UI umum ────────────────────────────────────────────────────────── */

export function IconPackage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M2.5 3.5A1.5 1.5 0 0 1 4 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5v-9ZM4.75 6a.75.75 0 0 0-.53 1.28L5.94 9l-1.72 1.72a.75.75 0 1 0 1.06 1.06l2.25-2.25a.75.75 0 0 0 0-1.06L5.28 6.22A.75.75 0 0 0 4.75 6Zm3.5 4.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z" />
    </svg>
  );
}

export function IconPlay({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4.75a.75.75 0 0 1 1.14-.64l3.25 2a.75.75 0 0 1 0 1.28l-3.25 2a.75.75 0 0 1-1.14-.64v-4Z" />
    </svg>
  );
}

export function IconCode({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 4 1.5 8 5 12M11 4l3.5 4-3.5 4M9 2.5 7 13.5" />
    </svg>
  );
}

export function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}

/* ── Ikon kartu fitur ────────────────────────────────────────────────────── */

export const featureIcons: Record<
  FeatureIconKey,
  (props: { className?: string }) => ReactNode
> = {
  scan: ({ className }) => (
    <Line className={className}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M8 12h8M8 9h5" />
    </Line>
  ),
  schema: ({ className }) => (
    <Line className={className}>
      <path d="M12 3v4M12 17v4M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </Line>
  ),
  link: ({ className }) => (
    <Line className={className}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
    </Line>
  ),
  key: ({ className }) => (
    <Line className={className}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="m10.5 12.5 7-7M15 5.5 17.5 8M17.5 3 20 5.5" />
    </Line>
  ),
  terminal: ({ className }) => (
    <Line className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7 9.5 3 2.5-3 2.5M13 15h4" />
    </Line>
  ),
  share: ({ className }) => (
    <Line className={className}>
      <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
      <path d="M12 3v11M8 6.5 12 3l4 3.5" />
    </Line>
  ),
};
