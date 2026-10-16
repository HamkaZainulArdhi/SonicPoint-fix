# ⚡ sonic-point

AI-powered CLI: scan Express codebases, test endpoints, publish shareable reports.

## Quick start

```bash
npm install
sonic-point init      # configure target backend + provider credentials
sonic-point scan      # discover endpoints
sonic-point send      # test endpoints (GET by default)
sonic-point report    # publish cached session to Supabase
```

## Commands

| Command | Description |
|---|---|
| `scan` | List endpoints. Flags: `--schema`, `--context`, `--snippets` |
| `schema` | Extract validation schemas (Joi/Zod/Yup) |
| `send [endpoint] [--method M]` | Auth-aware testing, AI payloads for writes |
| `report [method] [endpoint]` | Publish cached session, print shareable URL |
| `init` | Interactive setup, writes `.sonic-point.json` |

## Config

- `.sonic-point.json` — base URL, login endpoint, credentials, cached token
- Providers (Gemini, Supabase) — `SONIC_POINT_*` env or `~/.sonic-point/providers.json` (override with `SONIC_POINT_HOME` in tests)
- Report link base — `SONIC_POINT_REPORT_BASE_URL` env, path `/report/:sessionId`

## Develop

```bash
npm run dev     # run CLI from source (tsx)
npm run build   # clean + tsc → dist/
npm test        # node:test suites via tsx
```

## Code map

- `src/scan/README.md` — peta pipeline scan per fitur (core, routes, schemas, knowledge, snippets, reports)
- `src/tui/README.md` — peta REPL per fungsi (shell, repl, views)
