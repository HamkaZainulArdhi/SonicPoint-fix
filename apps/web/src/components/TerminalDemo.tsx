import type { ReactNode } from "react";

/**
 * Demo terminal statis — meniru output asli CLI (output.ts) supaya
 * pengunjung langsung paham bentuk kerja SonicPoint. Tanpa animasi.
 */
function Ok({ children }: { children: ReactNode }) {
  return <span className="text-ok">{children}</span>;
}

function Amber({ children }: { children: ReactNode }) {
  return <span className="text-lightning-yellow">{children}</span>;
}

function Gold({ children }: { children: ReactNode }) {
  return <span className="text-electric-gold">{children}</span>;
}

function Snow({ children }: { children: ReactNode }) {
  return <span className="text-snow">{children}</span>;
}

function Dim({ children }: { children: ReactNode }) {
  return <span className="text-smoke">{children}</span>;
}

export function TerminalDemo() {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-charcoal bg-ink">
      <div className="flex items-center gap-2 border-b border-charcoal px-5 py-3">
        <span className="size-2.5 rounded-full bg-slate" />
        <span className="size-2.5 rounded-full bg-slate" />
        <span className="size-2.5 rounded-full bg-slate" />
        <span className="ml-3 font-mono text-caption text-smoke">~/proyek-express</span>
      </div>

      <pre className="overflow-x-auto p-5 font-mono text-code text-silver-mist">
        <Amber>$</Amber> <Snow>sonic-point scan</Snow>
        {"\n\n"}
        <Ok>✔</Ok> Found 5 route files
        {"\n\n"}
        📂 <Snow>src/routes/items.js</Snow>
        {"\n"}
        GET      /api/items
        {"\n"}
        POST     /api/items
        {"\n"}
        GET      /api/items/:id
        {"\n\n"}
        📂 <Snow>src/routes/orders.js</Snow>
        {"\n"}
        GET      /api/orders
        {"\n"}
        POST     /api/orders
        {"\n\n"}
        <Amber>$</Amber> <Snow>sonic-point send --method POST /api/orders</Snow>
        {"\n"}
        <Dim>↳ refs.item = 7f3a2b (saved)</Dim>
        {"\n\n"}
        <Dim>┌──────────┬─────────────────┬─────────────┐</Dim>
        {"\n"}
        <Dim>│</Dim> <Snow>METHOD  </Snow> <Dim>│</Dim> <Snow>ENDPOINT       </Snow> <Dim>│</Dim> <Snow>STATUS     </Snow> <Dim>│</Dim>
        {"\n"}
        <Dim>├──────────┼─────────────────┼─────────────┤</Dim>
        {"\n"}
        <Dim>│</Dim> <Snow>POST    </Snow> <Dim>│</Dim> /api/orders     <Dim>│</Dim> <Ok>✔ (201)    </Ok> <Dim>│</Dim>
        {"\n"}
        <Dim>└──────────┴─────────────────┴─────────────┘</Dim>
        {"\n\n"}
        Tested 1: <Ok>1 passed</Ok> · <span className="text-err">0 failed</span> ·{" "}
        <span className="text-amber-depth">0 skipped</span>
        {"\n\n"}
        <Amber>$</Amber> <Snow>sonic-point report</Snow>
        {"\n"}
        <Ok>✔ Published 1 endpoints via supabase.</Ok>
        {"\n"}
        Session Report: <Gold>https://sonicpoint.vercel.app/report/8f2c1d3e-…</Gold>
      </pre>
    </div>
  );
}
