---
title: CLI Map
tags:
  - sonicpoint
  - cli
  - map
status: active
source:
  - src/cli/program.ts
  - src/cli/commands.ts
  - src/cli/output.ts
  - src/cli/selection.ts
---

# CLI Map — dari command sampai output

>Vault CLI. Kontrak DB global TIDAK diduplikat — canonical di `SonicPoint/knowledge/03-contracts.md` (Vault Root).

CLI `sonic-point@2.0.0`: scan Express → test HTTP auth-aware + AI payload → publish ke Supabase.

```
bin/index.ts → cli/program.ts (thin commander)
  → cli/commands.ts (satu-satunya catch + print via output.ts)
  → scan/ run/ report/ config/ ai/ → domain/ (pure)
```

## Commands (`program.ts`)

| Command | Handler | Lihat |
|---|---|---|
| `scan [--schema\|--context\|--snippets]` | `scanEndpoints / buildApiGraph / buildKnowledgeGraph / collectSnippets` → `renderEndpoints / renderSchemaReport / renderContextReport / renderSchemas` | [[01-scan]] |
| `schema` | `scanSchemas` → `renderSchemas` | [[01-scan]] |
| `init` | `askCredentials → saveCredentials (.sonic-point.json) → resolveGeminiKey/Supabase → saveProviders (~/.sonic-point/providers.json)` | [[04-config]] |
| `send [endpoint] [--method M]` | `scanEndpoints → selectTargets → runSession → renderSession` | [[02-run]] |
| `report [method] [endpoint]` | `SessionStore.load → publishSession → renderPublishOutcome` | [[03-report]] |

`selection.ts`: tanpa `--method` → semua GET; dengan `--method` wajib path eksplisit, match `METHOD + normalized path`. Referensi lengkap tiap flag: [[06-commands-flags]].

## Interactive REPL (`sonic-point` tanpa argumen)

`program.ts` fallback argv kosong → `cli/commands.ts:interactiveCommand` → `tui/shell/runTui.ts` → `<ReplApp/>` (Ink). Slash commands (`/scan /schema /context /test /report /config /clear /quit`) dispatch via `tui/repl/dispatchCommands.ts` ke core yang SAMA. Detail + status: [[07-tui-repl]].

> [!warning] Layering
> `runSession()` return data; spinner hanya via `RunOptions.events`. Library throw `ScanError/RunError`; hanya `commands.ts` catch + set `exitCode`. `console.*` hanya di `cli/`.

## AI guide

- Ubah scan → [[01-scan]]. Ubah test → [[02-run]]. Ubah publish → [[03-report]] + kontrak Root. Ubah kredensial → [[04-config]].
- Butuh kolom DB baru → baca kontrak Root dulu, jangan tambah di sini saja.
