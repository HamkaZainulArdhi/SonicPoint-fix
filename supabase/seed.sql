-- Seed data untuk local development. Jalankan setelah 001_initial_schema.sql.
-- IDs fixed agar URL report predictable saat dev.

insert into projects (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Demo Project', 'demo-project')
on conflict (slug) do nothing;

insert into sessions (id, project_id, status, started_at, finished_at, total_tested, total_success, total_failed, total_skipped)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'completed',
  now() - interval '1 hour',
  now(),
  3, 2, 1, 0
)
on conflict (id) do nothing;

insert into endpoints (project_id, session_id, method, path, resolved_path, status_code, success, latency_ms, auth_used, ai_generated, execution_order, tested_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'GET', '/api/items', '/api/items', '200', true, 42, 'bearer', false, 1, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'GET', '/api/items/:itemId', '/api/items/item-42', '200', true, 35, 'bearer', false, 2, now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'POST', '/api/items', '/api/items', '500', false, 120, 'bearer', true, 3, now());
