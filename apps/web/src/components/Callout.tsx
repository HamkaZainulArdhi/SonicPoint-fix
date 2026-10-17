import type { ReactNode } from "react";

/** Kotak catatan di dalam konten MDX. `warn` = aksen amber tipis. */
export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: "note" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const border = kind === "warn" ? "border-amber-depth/50" : "border-charcoal";
  const heading = kind === "warn" ? "text-electric-gold" : "text-snow";

  return (
    <div className={`mt-6 rounded-lg border ${border} bg-ash/40 p-4 [&>p]:mt-0`}>
      {title ? (
        <div className={`text-body-sm font-medium ${heading}`}>{title}</div>
      ) : null}
      <div className={`text-body-sm text-silver-mist [&>p]:mt-0 [&>ul]:mt-0 ${title ? "mt-1.5" : ""}`}>
        {children}
      </div>
    </div>
  );
}
