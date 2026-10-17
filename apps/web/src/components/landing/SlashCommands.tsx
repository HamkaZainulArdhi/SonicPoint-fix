"use client";

import { slashCommands, type SlashCommand } from "@/lib/landing";
import { useCopy } from "@/lib/use-copy";
import { Section } from "@/components/ui";

/** Grid slash command REPL — klik untuk menyalin. */
export function SlashCommands() {
  return (
    <Section
      id="commands"
      sec="SEC // 06 · SLASH_EXTENSIONS"
      eyebrow="Slash Commands"
      title="Slash commands di dalam REPL."
      aside={
        <p className="font-mono text-mono text-smoke">
          Klik salah satu command untuk menyalinnya.
        </p>
      }
      bg="dots"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {slashCommands.map((command) => (
          <CommandTile key={command.cmd} {...command} />
        ))}
      </div>
    </Section>
  );
}

function CommandTile({ cmd, abbr, desc }: SlashCommand) {
  const { copied, copy } = useCopy();

  return (
    <button
      type="button"
      onClick={() => void copy(cmd)}
      className="group flex items-center justify-between gap-3 rounded-lg border border-hairline bg-ink/60 p-2.5 text-left transition-colors hover:border-amber-depth/60 hover:bg-obsidian"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate bg-obsidian font-mono text-mono text-lightning-yellow">
          {abbr}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body-sm font-medium text-pure-white">
            {cmd}
          </span>
          <span className="block truncate text-mono text-smoke">{desc}</span>
        </span>
      </span>
      <span className="shrink-0 font-mono text-micro text-smoke transition-colors group-hover:text-pure-white">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
