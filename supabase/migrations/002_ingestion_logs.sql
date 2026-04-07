-- Tabla de logs de ingestion para monitoreo
create table if not exists public.ingestion_logs (
  id uuid default uuid_generate_v4() primary key,
  source text not null,
  fetched integer default 0,
  inserted integer default 0,
  updated integer default 0,
  duration_seconds numeric(8,2),
  error text,
  ran_at timestamptz default now()
);

-- Solo service role puede escribir/leer logs
alter table public.ingestion_logs enable row level security;
create policy "Service role manages logs"
  on public.ingestion_logs for all
  using (auth.role() = 'service_role');
