import { AstLab } from "@/components/landing/AstLab";
import { BottomCta } from "@/components/landing/BottomCta";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { Faq } from "@/components/landing/Faq";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Hero } from "@/components/landing/Hero";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { SlashCommands } from "@/components/landing/SlashCommands";
import { TerminalWorkbench } from "@/components/landing/TerminalWorkbench";

/**
 * Landing statis (prerender saat build, tanpa Supabase).
 * Setiap section punya file sendiri + data terpusat di `lib/landing.ts`.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TerminalWorkbench />
      <AstLab />
      <FeatureGrid />
      <ReportPreview />
      <ComparisonTable />
      <SlashCommands />
      <Faq />
      <BottomCta />
    </>
  );
}
