import { featureCards } from "@/lib/landing";
import { featureIcons } from "@/components/icons";
import { Badge, IconOrb, Section } from "@/components/ui";

const cardClass = {
  key: "key-card",
  amber: "key-card-amber",
  gold: "key-card-gold",
} as const;

/** Enam kartu "keycap" — satu kartu amber sebagai aksen, sisanya netral. */
export function FeatureGrid() {
  return (
    <Section
      id="features"
      sec="SEC // 03 · CORE_CAPABILITIES"
      eyebrow="Core Capabilities"
      title="Dibangun untuk alur kerja yang nyata."
      description="Bukan sekadar hit endpoint: SonicPoint memahami kode, schema, dan data milikmu — lalu melaporkan apa adanya."
      bg="grid"
      glow={
        <div className="absolute left-1/2 top-[55%] h-[340px] w-[920px] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full bg-gradient-to-r from-lightning-yellow/[0.05] via-amber-depth/[0.06] to-ok/[0.04] blur-[90px]" />
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureCards.map((card) => {
          const Icon = featureIcons[card.icon];

          return (
            <article key={card.title} className={cardClass[card.variant]}>
              <div className="flex items-start justify-between gap-4">
                <IconOrb>
                  <Icon className="size-6" />
                </IconOrb>
                <Badge tone={card.badgeTone}>{card.badge}</Badge>
              </div>
              <h3 className="mt-6 text-title font-medium text-pure-white">
                {card.title}
              </h3>
              <p className="mt-2 text-body-sm text-ash">{card.body}</p>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
