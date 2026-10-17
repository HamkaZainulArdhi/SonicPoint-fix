/**
 * Kelas tombol pill — satu sumber lintas halaman (DESIGN.md: pill 9999px).
 * Primary = fill amber + teks obsidian; teks putih TIDAK terbaca di #ffe600.
 * Ghost = transparan + border slate; hover border graphite + wash 4%.
 */
const base = "inline-flex items-center justify-center gap-2 rounded-full transition-colors";

export function pill(kind: "primary" | "ghost", size: "md" | "sm" = "md"): string {
  const sizing = size === "sm" ? "px-3 py-1.5 text-body-sm" : "px-4 py-2 text-body-sm";

  if (kind === "primary") {
    return `${base} ${sizing} border border-lightning-yellow bg-lightning-yellow font-medium text-obsidian hover:border-amber-depth hover:bg-electric-gold`;
  }

  return `${base} ${sizing} border border-slate text-snow hover:border-graphite hover:bg-white/5`;
}

/** Kartu standar: sama dengan kanvas, hanya didefinisikan oleh border. */
export const card = "rounded-2xl border border-charcoal bg-obsidian";

/** Well gelap untuk kode/terminal (satu tier di bawah kanvas). */
export const well = "rounded-lg border border-charcoal bg-ink";
