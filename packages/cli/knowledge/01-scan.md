---
title: Scan Pipeline
tags:
  - sonicpoint
  - cli
  - scan
status: active
source:
  - src/scan/core/findFiles.ts
  - src/scan/core/parseAst.ts
  - src/scan/routes/collectRoutes.ts
  - src/scan/routes/resolveTree.ts
  - src/scan/routes/scanEndpoints.ts
  - src/scan/schemas/scanSchemas.ts
  - src/scan/schemas/buildApiGraph.ts
  - src/scan/knowledge/indexSymbols.ts
  - src/scan/knowledge/buildKnowledge.ts
  - src/scan/snippets/collectSnippets.ts
  - src/scan/reports/formatSchema.ts
  - src/scan/reports/formatContext.ts
---

# Scan Pipeline

> Penjelasan santai per folder/file: `src/scan/README.md`.

`files → AST → routes → resolve → scanner → apiGraph`

## Alur

1. **files.ts `findCodeFiles`**: DFS stack `rootDir`, skip `node_modules,.git,dist,build,coverage,.next`, kumpul `*.js/*.ts`, `sort()` deterministik.
2. **ast.ts `parseFile`**: `fs.readFileSync` + `@babel/parser` (`sourceType:unambiguous`, plugins `typescript,jsx`, `allowImportExportEverywhere`). Return `null` jika gagal.
3. **routes.ts `collectRouteFile`** (satu traverse per file): `ImportDeclaration` + `require()` → `imports`; `app/router.use(prefix, routerVar)` → `mounts`; `get|post|put|delete|patch|options|head(path,...handlers)` → `endpoints`; `router.route(path).get()...` via unwrap. `splitHandlers()`: identifier terakhir = controller, sisanya = middleware, `CallExpression` dengan arg `*schema|validator|validation|dto` = schemas.
4. **resolve.ts**: `resolveImportFile` hanya relatif (`./`), coba `base, base.{js,ts}, base/index.{js,ts}`. `buildRouteTree`: DFS `walk(file,prefix)` + `visited Set` (circular aman), compose `prefix+path`.
5. **scanner.ts `scanEndpoints`**: `mounted` = file yang di-mount; `roots` = mount-files yang tak di-mount siapapun (fallback semua jika pure cycle); walk tiap entry; dedup `endpointId(METHOD path)`; throw `ScanError` jika 0 entry/endpoint.
6. **schemas.ts `scanSchemas`**: hanya `root/src/{validation,validators,schemas,schema,validations}/*`; `detectFramework` via content-string (`Joi.`/`from "joi"`, `z.`/`from "zod"`, `Yup.`/`from "yup"`) fallback cek import AST; per-file try/catch (debug via `SONIC_DEBUG_SCHEMA=true`); `Joi.object / z.object / Yup.object().shape()` + unwrap `.required()/.min()`; Zod default `required=true`.
7. **apiGraph.ts `buildApiGraph`**: `scanEndpoints + scanSchemas` → link by normalized name (`[^a-z0-9]→lower`), hanya referensi eksplisit middleware. Link `{endpointId, schemaName, confidence:100, reason:"explicit-validation-middleware"}` (threshold 50 untuk future fuzzy) + `links[]` + node `id/link/requiredFields`. `schemaStatus: detected | none (GET/DELETE) | unknown (POST/PUT/PATCH tanpa schema)`.

## Pendukung

- **symbols.ts `indexProject`**: imports + `FunctionDeclaration` + `var fn/arrow` + `objectMethods` + `calls[]` via manual `walk()`.
- **knowledge.ts `buildKnowledgeGraph`**: endpoint → schema (`validates_with` 100) → auth (`requires_auth` 80 jika middleware match `auth|jwt|passport|token|login`) → controller (`handled_by` 92) → DFS `traceCalls` → service (`calls` 88) + model (`uses_model` 70-90) ; gap → `unresolved[]`.
- **snippets.ts `collectSnippets`**: window ±4 baris endpoint, ±3 baris definisi, id `base64url(abs:symbol:start:end)`.

## Batasan (jangan diperlebar tanpa ADR)

Hanya Express. Hanya import relatif. Hanya dir validasi di atas. Lihat kontrak Root untuk U-01.

## AI guide

- Tambah framework → sentuh `routes.ts + resolve.ts + scanner.ts` + test `node:test` fixture di `os.tmpdir()`.
- Hasil scan = data (throw on fail). Render teks/rows murni di `scan/reports/formatSchema.ts` + `scan/reports/formatContext.ts`; `cli/output.ts` hanya print (chalk), `tui/views/schemaView.ts` + `tui/views/contextView.ts` hanya map kind→tone. Lihat [[05-decisions-todo]] C-ADR-08.
