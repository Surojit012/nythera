-- Create table to track vault recovery events in the database
create table if not exists public.vault_recoveries (
  id uuid primary key default gen_random_uuid(),
  vault_record_id uuid not null references public.vault_records(id) on delete cascade,
  recovered_by_wallet text not null, -- The wallet address of the user who performed the recovery
  recovered_at timestamptz not null default now()
);

-- Indexes for performance and lookup
create index if not exists vault_recoveries_vault_record_id_idx on public.vault_recoveries (vault_record_id);
create index if not exists vault_recoveries_recovered_by_idx on public.vault_recoveries (lower(recovered_by_wallet));

-- View to easily count and list which addresses or email/gmail accounts recovered
-- with the proper supabase UUIDs and metadata
create or replace view public.vault_recovery_summary as
select
  vr.id as vault_record_uuid,
  vr.cdr_uuid,
  vr.creator_wallet as vault_owner_wallet,
  owner_acc.email as vault_owner_email,
  r.recovered_by_wallet as recovered_by_wallet,
  recoverer_acc.email as recovered_by_email,
  r.recovered_at,
  r.id as recovery_event_uuid
from public.vault_recoveries r
join public.vault_records vr on r.vault_record_id = vr.id
left join public.user_storage_accounts owner_acc on lower(vr.creator_wallet) = lower(owner_acc.wallet_address)
left join public.user_storage_accounts recoverer_acc on lower(r.recovered_by_wallet) = lower(recoverer_acc.wallet_address);
