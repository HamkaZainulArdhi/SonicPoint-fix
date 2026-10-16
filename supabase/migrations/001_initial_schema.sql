-- Sonic Point redesigned schema.
-- Run migrations in filename order against a fresh Supabase project.
-- Public read (anon SELECT) is intended: report URLs are shareable without login.
-- CLI publishes with the service_role key — never expose it in the frontend.

-- ============ projects ============
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ sessions ============
-- One row per `sonic-point send` run published via `sonic-point report`.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null,
  finished_at timestamptz,
  total_tested integer not null default 0,
  total_success integer not null default 0,
  total_failed integer not null default 0,
  total_skipped integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sessions_project_id_idx
  on sessions (project_id);

-- ============ endpoints ============
-- One row per tested endpoint per session (full history, no upsert).
-- Replaces the old endpoints + report_session_results pair.
create table if not exists endpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  method text not null,
  path text not null,
  resolved_path text not null,
  status_code text,
  success boolean not null default false,
  latency_ms integer not null default 0,
  payload jsonb,
  response_preview text,
  auth_used text not null default 'none',
  ai_generated boolean not null default false,
  error_message text,
  execution_order integer not null,
  tested_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists endpoints_session_order_idx
  on endpoints (session_id, execution_order);

create index if not exists endpoints_project_id_idx
  on endpoints (project_id);

-- ============ schemas ============
-- Optional: validation schemas (Joi/Zod/Yup) linked to a project/endpoint.
create table if not exists schemas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  type text not null,
  definition jsonb not null,
  endpoint_id uuid references endpoints(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists schemas_project_id_idx
  on schemas (project_id);

-- ============ RLS: public read, no public write ============
alter table projects enable row level security;
alter table sessions enable row level security;
alter table endpoints enable row level security;
alter table schemas enable row level security;

create policy "public read projects"
  on projects for select to anon using (true);

create policy "public read sessions"
  on sessions for select to anon using (true);

create policy "public read endpoints"
  on endpoints for select to anon using (true);

create policy "public read schemas"
  on schemas for select to anon using (true);

-- Writes go through the service_role key from the CLI only.
-- No insert/update/delete policies for anon or authenticated.

-- ============ Data API exposure ============
-- Tables created via SQL are not always auto-exposed to the Data (REST) API.
-- Grant USAGE on schema + SELECT on tables explicitly (RLS policies above
-- still control which rows are visible).
grant usage on schema public to anon;
grant select on projects to anon;
grant select on sessions to anon;
grant select on endpoints to anon;
grant select on schemas to anon;
