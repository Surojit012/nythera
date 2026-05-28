alter table public.vault_records
  add column if not exists vault_name text;
