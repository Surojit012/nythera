create table if not exists public.user_storage_accounts (
  id uuid primary key default gen_random_uuid(),
  privy_user_id text,
  wallet_address text not null unique,
  email text,
  credits_balance integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_records (
  id uuid primary key default gen_random_uuid(),
  local_vault_id text,
  cdr_uuid integer not null unique,
  creator_wallet text not null,
  content_type text not null check (content_type in ('text', 'walrus-file')),
  status text not null default 'active',
  renewal_mode text not null default 'notify' check (renewal_mode in ('notify', 'autoRenew')),
  renewal_status text not null default 'active',
  walrus_blob_id text,
  walrus_object_id text,
  walrus_start_epoch integer,
  walrus_end_epoch integer,
  walrus_end_date timestamptz,
  file_name text,
  file_size integer,
  mime_type text,
  cdr_allocate_tx text,
  cdr_write_tx text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_recipients (
  id uuid primary key default gen_random_uuid(),
  vault_record_id uuid not null references public.vault_records(id) on delete cascade,
  kind text not null check (kind in ('wallet', 'email')),
  value text not null,
  resolved_wallet text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  delta integer not null,
  reason text not null,
  vault_record_id uuid references public.vault_records(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  vault_record_id uuid references public.vault_records(id) on delete cascade,
  recipient_email text not null,
  type text not null,
  status text not null default 'pending',
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists vault_records_creator_wallet_idx on public.vault_records (lower(creator_wallet));
create index if not exists vault_records_expiry_idx on public.vault_records (walrus_end_date) where walrus_end_date is not null;
create index if not exists vault_recipients_wallet_idx on public.vault_recipients (lower(resolved_wallet));
create index if not exists notification_events_due_idx on public.notification_events (status, scheduled_for);
create unique index if not exists notification_events_once_idx
  on public.notification_events (vault_record_id, recipient_email, type);
