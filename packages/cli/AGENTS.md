# AGENTS.md — sonic-point v2

From-scratch rewrite. Express scanner + tester + Supabase publisher. Dashboard: `../../apps/web`.

## Commands (jalankan dari root `SonicPoint/`, pakai pnpm)

```bash
pnpm --filter sonic-point dev              # tsx bin/index.ts
pnpm --filter sonic-point build            # clean + tsc
pnpm --filter sonic-point typecheck        # tsc -p tsconfig.test.json (src + bin + tests)
pnpm --filter sonic-point test             # tsx --test tests/*.test.ts (node:test, TAP output)
```

## Architecture (layers only point down)

```
bin/index.ts → src/cli/program.ts (commander wiring, thin)
src/cli/commands.ts      # one handler per command; ONLY place that prints (via output.ts)
src/cli/output.ts        # all console code. Domain/run/report never print.
src/cli/selection.ts     # send target filter (GET default; --method needs target)
src/scan/                # per fitur: core/ (findFiles, parseAst), routes/ (collectRoutes, resolveTree, scanEndpoints),
                         # schemas/ (scanSchemas, buildApiGraph), knowledge/ (indexSymbols, buildKnowledge),
                         # snippets/ (collectSnippets), reports/ (formatSchema, formatContext — pure, dipakai CLI+TUI)
src/tui/                 # shell/ (runTui, ReplApp, Home), repl/ (commandRegistry, dispatchCommands, transcript),
                         # views/ (scanView, schemaView, contextView — shaping per command, tanpa business logic)
src/run/                 # runner returns TestSession (data, no console); http/auth/params/resources/refs/payloads
src/report/              # store.ts (ReportStore port) + publish.ts; Supabase impl per new schema
src/config/              # app (.sonic-point.json), providers (env > file > legacy), sessions (cache)
src/ai/                  # GeminiClient (key injected, no env/disk/console inside)
src/domain/              # pure types, zero imports
tests/                   # node:test suites (fixtures generic!) + helpers/ (tmp project, fake HTTP server, factories)
```

## Rules that matter

- `runSession()` returns data; spinners/progress only via `RunOptions.events`. Never `console.*` in scan/run/report/ai/config.
- Library functions throw (`ScanError`, `RunError`); only `cli/commands.ts` catches and sets `exitCode`.
- Test results are a single `TestResult[]` with `kind: "executed" | "skipped"` — no parallel results/skipped arrays.
- Warnings are data (`Resolved<T>.warnings`); only CLI prints them.
- Foreign keys in request bodies (`lahanId`) are **sampled, never invented**: `run/refs.ts` resolves them from the user's own GET collections and caches them in `.sonic-point.json` `refs` (flat per noun + `host`). Resolved values win over AI output (`payloads.ts` pins them). Never create data to satisfy a reference — no sampled id means the payload is left as-is and the endpoint's 404 is reported honestly. Persist via `saveRefs` (read-modify-write) only, once per run.
- Route-tree walk has a visited set (circular imports terminate); entry = mount files nobody mounts.
- Supabase contract: `../../supabase/migrations/`. Tables `projects` (upsert by slug) → `sessions` (open running → close) → `endpoints` (insert, `payload` JSONB, `"SKIPPED"` status for skips). Writes need service_role; report base from `SONIC_POINT_REPORT_BASE_URL` (`/report/:id`), undefined when unset.
- Tests use `node:test` + `node:assert/strict`; shared infra in `tests/helpers/` (tmp project + fake HTTP server + value factories) — **fixtures must stay generic** (`item`/`order`, never the author's app names; public repo). `pnpm typecheck` = `tsc -p tsconfig.test.json` (src + bin + **tests**); `build` stays src-only. `cli.test.ts` spawns real CLI via `bin/index.ts`. Isolate provider file writes with `SONIC_POINT_HOME` pointing at tmp.
