alter table public.vault_records
  add column if not exists vault_description text,
  add column if not exists vault_tags text[] not null default '{}';
