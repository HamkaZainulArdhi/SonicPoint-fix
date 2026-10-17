import { comparisonRows } from "@/lib/landing";
import { Segs } from "@/components/Segs";
import { Section } from "@/components/ui";

/** Tabel perbandingan — kolom SonicPoint pakai ✓ amber (hijau tetap eksklusif status tes). */
export function ComparisonTable() {
  return (
    <Section
      id="compare"
      sec="SEC // 05 · COMPARISON_MATRIX"
      eyebrow="Workflow Comparison"
      title="Berhenti memelihara dua sumber kebenaran."
      description="Koleksi Postman cepat kedaluwarsa saat schema berubah, sedangkan anotasi OpenAPI memakan ratusan baris komentar di atas route Express-mu."
      bg="grid"
    >
      <div className="overflow-x-auto rounded-xl border border-hairline bg-ink">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate bg-obsidian font-mono text-tiny uppercase tracking-[0.05em] text-ash">
              <th className="whitespace-nowrap px-5 py-3.5 font-normal">
                Dimensi Pengujian
              </th>
              <th className="whitespace-nowrap px-5 py-3.5 font-normal text-pure-white">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-[7px] rotate-45 bg-lightning-yellow" />
                  SonicPoint CLI
                </span>
              </th>
              <th className="whitespace-nowrap px-5 py-3.5 font-normal">
                Koleksi Postman / Bruno Manual
              </th>
              <th className="whitespace-nowrap px-5 py-3.5 font-normal">
                Swagger / OpenAPI JSDoc
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-graphite text-body-sm">
            {comparisonRows.map((row) => (
              <tr key={row.dim}>
                <td className="whitespace-nowrap px-5 py-3.5 font-medium text-mist">
                  {row.dim}
                </td>
                <td className="px-5 py-3.5 font-mono text-mono">
                  <span className="text-electric-gold">✓ </span>
                  <Segs segs={row.sonic} />
                </td>
                <td className="px-5 py-3.5 text-ash">
                  <Segs segs={row.postman} />
                </td>
                <td className="px-5 py-3.5 text-ash">
                  <Segs segs={row.swagger} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
